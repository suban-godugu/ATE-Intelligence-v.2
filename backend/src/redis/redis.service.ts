import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;

    this.client = new Redis({
      host,
      port,
      maxRetriesPerRequest: null, // Critical for BullMQ
      enableOfflineQueue: false,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });

    this.client.on('connect', () => {
      this.logger.log(`Successfully connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection error (non-fatal): ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value);
  }

  async setBuffer(key: string, value: Buffer, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds) {
      return this.client.set(key, value as any, 'EX', ttlSeconds);
    }
    return this.client.set(key, value as any);
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    return this.client.getBuffer(key);
  }

  async delWildcard(pattern: string): Promise<void> {
    const client = this.client;
    let cursor = '0';
    do {
      const reply = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
