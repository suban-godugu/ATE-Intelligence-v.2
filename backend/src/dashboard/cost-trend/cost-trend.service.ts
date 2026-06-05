import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CostTrendQueryDto, CostTrendResponseDto, TrendPoint, TrendSeries } from './cost-trend.dto';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

@Injectable()
export class CostTrendService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CostTrendService.name);
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

    await this.subscriber.subscribe('lot:completed');
    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'lot:completed') {
        this.logger.log('Redis pub/sub event "lot:completed" received. Clearing cost trend cache...');
        try {
          const keys = await this.redis.getClient().keys('dashboard:trend:*');
          if (keys.length > 0) {
            await this.redis.getClient().del(...keys);
            this.logger.log(`Successfully invalidated ${keys.length} trend cache keys.`);
          }
        } catch (err) {
          this.logger.error('Failed to invalidate trend cache keys:', err);
        }
      }
    });
  }

  onModuleDestroy() {
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
  }

  private getCacheKey(query: CostTrendQueryDto): string {
    const hashInput = JSON.stringify(query);
    const hash = require('crypto').createHash('md5').update(hashInput).digest('hex');
    return `dashboard:trend:${hash}`;
  }

  async getTrend(query: CostTrendQueryDto): Promise<CostTrendResponseDto> {
    const cacheKey = this.getCacheKey(query);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Cost trend cache hit for key: ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.log(`Cost trend cache miss. Computing for key: ${cacheKey}`);
    const trend = await this.computeTrend(query);
    await this.redis.set(cacheKey, JSON.stringify(trend), 3600); // 1 hour TTL
    return trend;
  }

  private async computeTrend(query: CostTrendQueryDto): Promise<CostTrendResponseDto> {
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const conditions: string[] = [];
    const params: any[] = [];

    // testedAt boundaries
    conditions.push(`tr."testedAt" BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(fromDate, toDate);

    if (query.fabId && !query.fabId.startsWith('fab-')) {
      conditions.push(`l."fabId" = $${params.length + 1}`);
      params.push(query.fabId);
    }
    if (query.testerId) {
      conditions.push(`l."testerId" = $${params.length + 1}`);
      params.push(query.testerId);
    }

    const whereClause = conditions.join(' AND ');
    const truncUnit = query.granularity === 'weekly' ? 'week' : 'day';

    const sql = `
      SELECT
        date_trunc('${truncUnit}', tr."testedAt") as period,
        COALESCE(SUM(tr."costUsd"), 0)::float as "totalCost",
        COALESCE(SUM(tr."costUsd") / NULLIF(COUNT(DISTINCT w.id), 0), 0)::float as "costPerWafer"
      FROM "TestResult" tr
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `;

    const rawResults = await this.prisma.$queryRawUnsafe<any[]>(sql, ...params);

    // 1. Generate full date spine at correct granularity
    const spine: Date[] = [];
    let currentSpineDate = new Date(fromDate);
    const stepSizeMs = query.granularity === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Normalizing current date based on granularity
    if (query.granularity === 'weekly') {
      // Align with start of week (Sunday or Monday)
      const day = currentSpineDate.getDay();
      currentSpineDate.setDate(currentSpineDate.getDate() - day);
    }
    currentSpineDate.setHours(0, 0, 0, 0);

    const targetEnd = new Date(toDate);
    targetEnd.setHours(23, 59, 59, 999);

    while (currentSpineDate.getTime() <= targetEnd.getTime()) {
      spine.push(new Date(currentSpineDate));
      currentSpineDate = new Date(currentSpineDate.getTime() + stepSizeMs);
    }

    // 2. Map queries onto spine (Left Join in JS)
    const resultPeriodMap = new Map<string, { totalCost: number; costPerWafer: number }>();
    rawResults.forEach((r) => {
      const d = new Date(r.period);
      d.setHours(0, 0, 0, 0);
      resultPeriodMap.set(d.toISOString(), {
        totalCost: r.totalCost,
        costPerWafer: r.costPerWafer,
      });
    });

    const totalCostPoints: TrendPoint[] = [];
    const costPerWaferPoints: TrendPoint[] = [];

    const nonNullValues: number[] = [];

    spine.forEach((spineDate) => {
      const key = spineDate.toISOString();
      const match = resultPeriodMap.get(key);

      const dateStr = spineDate.toISOString().split('T')[0];

      if (match) {
        const totalVal = parseFloat(match.totalCost.toFixed(2));
        const waferVal = parseFloat(match.costPerWafer.toFixed(2));

        totalCostPoints.push({ date: dateStr, value: totalVal });
        costPerWaferPoints.push({ date: dateStr, value: waferVal });

        nonNullValues.push(totalVal, waferVal);
      } else {
        totalCostPoints.push({ date: dateStr, value: null });
        costPerWaferPoints.push({ date: dateStr, value: null });
      }
    });

    // 3. Compute Min/Max with 10% padding
    let yAxisMin = 0;
    let yAxisMax = 100;

    if (nonNullValues.length > 0) {
      const min = Math.min(...nonNullValues);
      const max = Math.max(...nonNullValues);
      const diff = max - min;
      if (diff > 0) {
        yAxisMin = Math.max(0, parseFloat((min - diff * 0.1).toFixed(2)));
        yAxisMax = parseFloat((max + diff * 0.1).toFixed(2));
      } else {
        yAxisMin = Math.max(0, parseFloat((min * 0.9).toFixed(2)));
        yAxisMax = parseFloat((max * 1.1).toFixed(2));
      }
    }

    const series: TrendSeries[] = [
      {
        key: 'totalCost',
        label: 'Total Cost (USD)',
        points: totalCostPoints,
      },
      {
        key: 'costPerWafer',
        label: 'Cost Per Wafer (USD)',
        points: costPerWaferPoints,
      },
    ];

    return {
      granularity: query.granularity,
      series,
      yAxisMin,
      yAxisMax,
    };
  }
}
