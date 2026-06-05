import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SummaryService } from '../summary/summary.service';
import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

interface ClientSubscription {
  ws: any;
  lotId?: string;
  fabId?: string;
  lastPingAt: number;
}

@WebSocketGateway({ path: '/ws/dashboard' })
@Injectable()
export class DashboardGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DashboardGateway.name);
  private subscriptions = new Map<string, ClientSubscription>();
  private subscriber!: Redis;
  private pingInterval!: NodeJS.Timeout;

  constructor(
    private readonly summaryService: SummaryService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    this.subscriber = new Redis({ host, port });

    // 1. Subscribe to Live Redis pub/sub events
    await this.subscriber.subscribe(
      'snapshot:updated',
      'lot:status_changed',
      'alert:fired',
      'heatmap:updated',
    );

    this.subscriber.on('message', async (channel, message) => {
      this.logger.log(`Live Gateway received Redis event on [${channel}]: ${message}`);
      try {
        const payload = JSON.parse(message);
        await this.handlePubSubEvent(channel, payload);
      } catch (err) {
        this.logger.error(`Error handling Pub/Sub event on channel ${channel}:`, err);
      }
    });

    // 2. Schedule 30s Heartbeat PINGs
    this.pingInterval = setInterval(() => {
      this.broadcastPing();
    }, 30000);
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }

  handleConnection(client: any, request?: any) {
    if (this.subscriptions.size >= 1000) {
      this.logger.warn('Connection limit of 1000 exceeded. Rejecting socket.');
      client.close(1008, 'Connection limit exceeded');
      return;
    }

    // JWT Query parameter validation (ws://host/ws/dashboard?token=JWT)
    const req = request || client.upgradeReq || client.request;
    let urlString = '';
    if (req && req.url) {
      urlString = req.url;
    } else if (client.url) {
      urlString = client.url;
    }

    let authenticated = false;
    let userPayload: any = null;

    if (urlString) {
      try {
        const url = new URL(urlString, 'http://localhost');
        const token = url.searchParams.get('token');
        if (token) {
          userPayload = this.jwtService.verify(token);
          authenticated = true;
        }
      } catch (err: any) {
        this.logger.error(`WebSocket query JWT token verification failed: ${err.message}`);
      }
    }

    if (!authenticated) {
      this.logger.warn('Rejecting unauthorized WebSocket handshake connection.');
      client.close(4401, 'Unauthorized');
      return;
    }

    const socketId = randomUUID();
    client.id = socketId;
    client.user = userPayload;

    this.subscriptions.set(socketId, {
      ws: client,
      lastPingAt: Date.now(),
    });

    this.logger.log(`Client authenticated & connected: ${socketId}. Active connections: ${this.subscriptions.size}`);

    // Set connection timeout: terminate if inactive
    client.on('close', () => {
      this.handleDisconnect(client);
    });
  }

  handleDisconnect(client: any) {
    if (client.id) {
      this.subscriptions.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id}. Active connections: ${this.subscriptions.size}`);
    }
  }

  @SubscribeMessage('SUBSCRIBE')
  @UseGuards(WsJwtGuard)
  handleSubscribe(
    @ConnectedSocket() client: any,
    @MessageBody() payload: { lotId?: string; fabId?: string },
  ) {
    const sub = this.subscriptions.get(client.id);
    if (sub) {
      sub.lotId = payload.lotId;
      sub.fabId = payload.fabId;
      sub.lastPingAt = Date.now();

      this.logger.log(`Client ${client.id} subscribed to lot: ${payload.lotId}, fab: ${payload.fabId}`);

      client.send(
        JSON.stringify({
          type: 'SUBSCRIBED',
          lotId: payload.lotId || null,
          fabId: payload.fabId || null,
        }),
      );
    }
  }

  private broadcastPing() {
    const pingPayload = JSON.stringify({
      type: 'PING',
      timestamp: new Date().toISOString(),
    });

    const now = Date.now();
    for (const [id, sub] of this.subscriptions.entries()) {
      // If client missed pings for over 90s, terminate it
      if (now - sub.lastPingAt > 90000) {
        this.logger.warn(`Client ${id} missed pings. Terminating connection.`);
        sub.ws.close();
        this.subscriptions.delete(id);
        continue;
      }

      if (sub.ws.readyState === 1) {
        sub.ws.send(pingPayload);
      }
    }
  }

  private async handlePubSubEvent(channel: string, payload: any) {
    if (channel === 'snapshot:updated') {
      // Broadcast KPI_UPDATE matching fabId subscriptions
      // WebSocket N+1 Resolution: Gather unique active fabIds
      const uniqueFabIds = new Set<string>();
      for (const sub of this.subscriptions.values()) {
        if (sub.ws.readyState === 1) {
          uniqueFabIds.add(sub.fabId || '');
        }
      }

      // Pre-fetch summaries concurrently with a 500ms timeout race-condition
      const summaryMap = new Map<string, any>();
      await Promise.all(
        Array.from(uniqueFabIds).map(async (fabId) => {
          try {
            const summaryPromise = this.summaryService.getSummary({ fabId: fabId || undefined });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Summary pre-fetch timed out')), 500)
            );

            const summary = await Promise.race([summaryPromise, timeoutPromise]);
            summaryMap.set(fabId, summary);
          } catch (err: any) {
            this.logger.error(`Live gateway summary pre-fetch error for fab ${fabId}: ${err.message}`);
          }
        })
      );

      // Distribute messages in-memory from the Map (No DB query loops here!)
      for (const sub of this.subscriptions.values()) {
        if (sub.ws.readyState !== 1) continue;

        const fabId = sub.fabId || '';
        const summary = summaryMap.get(fabId);

        if (summary) {
          sub.ws.send(
            JSON.stringify({
              type: 'KPI_UPDATE',
              payload: summary,
            }),
          );
        }
      }
    } else if (channel === 'lot:status_changed') {
      const { lotId } = payload;
      for (const sub of this.subscriptions.values()) {
        if (sub.ws.readyState === 1 && sub.lotId === lotId) {
          sub.ws.send(
            JSON.stringify({
              type: 'LOT_STATUS_CHANGE',
              payload,
            }),
          );
        }
      }
    } else if (channel === 'alert:fired') {
      const broadcastPayload = JSON.stringify({
        type: 'ALERT_FIRED',
        payload,
      });
      for (const sub of this.subscriptions.values()) {
        if (sub.ws.readyState === 1) {
          sub.ws.send(broadcastPayload);
        }
      }
    } else if (channel === 'heatmap:updated') {
      const { lotId } = payload;
      for (const sub of this.subscriptions.values()) {
        if (sub.ws.readyState === 1 && sub.lotId === lotId) {
          sub.ws.send(
            JSON.stringify({
              type: 'HEATMAP_UPDATE',
              payload,
            }),
          );
        }
      }
    }
  }
}
