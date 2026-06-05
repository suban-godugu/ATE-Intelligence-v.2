import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { LotsQueryDto, LotSelectorItemDto, LotContextResponseDto } from './lots.dto';
import Redis from 'ioredis';

@Injectable()
export class LotsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LotsService.name);
  private subscriber!: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    this.subscriber = new Redis({ host, port });

    await this.subscriber.subscribe('LOT_STATUS_CHANGE');
    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'LOT_STATUS_CHANGE') {
        try {
          const payload = JSON.parse(message);
          const lotId = payload.lotId;
          this.logger.log(`Redis event "LOT_STATUS_CHANGE" received for lot: ${lotId}. Cleaving caches...`);

          // Invalidate on LOT_STATUS_CHANGE pub/sub event using SCAN + DEL with wildcard prefix
          await this.redis.delWildcard('lots:*');
          await this.redis.delWildcard('summary:*');
          await this.redis.delWildcard('patterns:*');

          // 2. Invalidate specific lot context
          const contextKey = `dashboard:lot-context:${lotId}`;
          await this.redis.del(contextKey);

          this.logger.log('Successfully invalidated lot, summary, and pattern caches.');
        } catch (err) {
          this.logger.error('Failed to parse LOT_STATUS_CHANGE payload or delete keys:', err);
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }

  private getListCacheKey(query: LotsQueryDto): string {
    const fabId = query.fabId || 'all';
    const filterData = JSON.stringify({
      status: query.status,
      limit: query.limit,
    });
    const statusHash = require('crypto').createHash('md5').update(filterData).digest('hex');
    return `lots:${fabId}:${statusHash}`;
  }

  async getLots(query: LotsQueryDto): Promise<{ lots: LotSelectorItemDto[] }> {
    const cacheKey = this.getListCacheKey(query);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Lots list cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.log(`Lots list cache miss. Computing for key: ${cacheKey}`);
    const result = await this.computeLots(query);
    await this.redis.set(cacheKey, JSON.stringify(result), 15); // 15s TTL
    return result;
  }

  private async computeLots(query: LotsQueryDto): Promise<{ lots: LotSelectorItemDto[] }> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (query.fabId && !query.fabId.startsWith('fab-')) {
      conditions.push(`l."fabId" = $${params.length + 1}`);
      params.push(query.fabId);
    }

    if (query.status) {
      const dbStatus = query.status.toUpperCase().replace('-', '_');
      conditions.push(`l.status = $${params.length + 1}::"LotStatus"`);
      params.push(dbStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitPlaceholder = `$${params.length + 1}`;
    params.push(query.limit);

    const sql = `
      SELECT
        l."lotId",
        l."fabId",
        l.status::text as status,
        l."completedAt",
        COUNT(DISTINCT w.id)::int as "waferCount",
        COUNT(d.id)::int as "totalDies",
        COUNT(CASE WHEN d.bin = 1 THEN 1 END)::int as "passingDies"
      FROM "Lot" l
      LEFT JOIN "Wafer" w ON w."lotId" = l.id
      LEFT JOIN "Die" d ON d."waferId" = w.id
      ${whereClause}
      GROUP BY l.id, l."lotId", l."fabId", l.status, l."completedAt"
      ORDER BY
        CASE
          WHEN l.status = 'ACTIVE' THEN 1
          WHEN l.status = 'IN_TEST' THEN 2
          ELSE 3
        END ASC,
        l."completedAt" DESC NULLS FIRST
      LIMIT ${limitPlaceholder}
    `;

    const rawLots = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

    const lots: LotSelectorItemDto[] = rawLots.map((r) => {
      const totalDies = r.totalDies;
      const passingDies = r.passingDies;
      const yieldPct =
        r.status === 'COMPLETED' && totalDies > 0
          ? parseFloat(((passingDies / totalDies) * 100).toFixed(2))
          : null;

      return {
        lotId: r.lotId,
        fabId: r.fabId,
        status: r.status,
        completedAt: r.completedAt,
        waferCount: r.waferCount,
        yieldPct,
      };
    });

    return { lots };
  }

  async getLotContext(lotId: string): Promise<LotContextResponseDto> {
    const cacheKey = `dashboard:lot-context:${lotId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Lot context cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.log(`Lot context cache miss. Computing for lot: ${lotId}`);
    const context = await this.computeLotContext(lotId);
    await this.redis.set(cacheKey, JSON.stringify(context), 30); // 30s TTL
    return context;
  }

  private async computeLotContext(lotId: string): Promise<LotContextResponseDto> {
    const sql = `
      SELECT
        l."lotId",
        l."fabId",
        l."testerId",
        l."startedAt",
        l."completedAt",
        COUNT(DISTINCT w.id)::int as "waferCount",
        COUNT(d.id)::int as "totalDies"
      FROM "Lot" l
      LEFT JOIN "Wafer" w ON w."lotId" = l.id
      LEFT JOIN "Die" d ON d."waferId" = w.id
      WHERE l."lotId" = $1
      GROUP BY l.id, l."lotId", l."fabId", l."testerId", l."startedAt", l."completedAt"
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(sql, lotId);
    const row = results[0];

    if (!row) {
      throw new Error(`Lot not found with ID: ${lotId}`);
    }

    const startedAt = new Date(row.startedAt);
    const diff = Date.now() - startedAt.getTime();
    let activeSince = '0s ago';

    if (diff < 60000) {
      activeSince = `${Math.floor(diff / 1000)}s ago`;
    } else if (diff < 3600000) {
      activeSince = `${Math.floor(diff / 60000)}m ago`;
    } else {
      activeSince = `${Math.floor(diff / 3600000)}h ago`;
    }

    return {
      lotId: row.lotId,
      fabId: row.fabId,
      testerId: row.testerId,
      startedAt,
      completedAt: row.completedAt,
      waferCount: row.waferCount,
      totalDies: row.totalDies,
      activeSince,
    };
  }
}
