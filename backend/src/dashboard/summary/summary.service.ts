import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SummaryQueryDto, SummaryResponseDto, KpiMetric } from './summary.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(query: SummaryQueryDto): string {
    const fabId = query.fabId || 'all';
    const filterData = JSON.stringify({
      from: query.from,
      to: query.to,
      testerId: query.testerId,
      lotId: query.lotId,
    });
    const periodHash = require('crypto').createHash('md5').update(filterData).digest('hex');
    return `summary:${fabId}:${periodHash}`;
  }

  async getSummary(query: SummaryQueryDto): Promise<SummaryResponseDto> {
    const cacheKey = this.getCacheKey(query);
    const cachedData = await this.redis.get(cacheKey);

    if (cachedData) {
      this.logger.log(`Summary cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }

    this.logger.log(`Summary cache miss. Computing for key: ${cacheKey}`);
    const summary = await this.computeSummary(query);
    await this.redis.set(cacheKey, JSON.stringify(summary), 30); // Cache for 30s
    return summary;
  }

  private async computeSummary(query: SummaryQueryDto): Promise<SummaryResponseDto> {
    // 1. Establish date boundaries
    const toDate = query.to ? new Date(query.to) : new Date();
    const fromDate = query.from
      ? new Date(query.from)
      : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevFromDate = new Date(fromDate.getTime() - durationMs);
    const prevToDate = fromDate;

    // 2. Fetch current and previous datasets using raw SQL
    const currentData = await this.fetchPeriodMetrics(query, fromDate, toDate);
    const previousData = await this.fetchPeriodMetrics(query, prevFromDate, prevToDate);

    // 3. Compute Delta Helper
    const calcDelta = (curr: number, prev: number): { deltaPercent: number; deltaDirection: 'up' | 'down' } => {
      if (prev === 0) {
        return { deltaPercent: 0, deltaDirection: curr >= 0 ? 'up' : 'down' };
      }
      const deltaPercent = parseFloat((((curr - prev) / prev) * 100).toFixed(1));
      return {
        deltaPercent,
        deltaDirection: deltaPercent >= 0 ? 'up' : 'down',
      };
    };

    // 4. Construct KPI Metrics
    const totalTestCost: KpiMetric = {
      value: parseFloat(currentData.totalTestCost.toFixed(2)),
      currency: 'USD',
      ...calcDelta(currentData.totalTestCost, previousData.totalTestCost),
    };

    const costPerWafer: KpiMetric = {
      value: parseFloat(currentData.costPerWafer.toFixed(2)),
      currency: 'USD',
      ...calcDelta(currentData.costPerWafer, previousData.costPerWafer),
    };

    const costPerDie: KpiMetric = {
      value: parseFloat(currentData.costPerDie.toFixed(6)),
      currency: 'USD',
      ...calcDelta(currentData.costPerDie, previousData.costPerDie),
    };

    const testTimeAvg: KpiMetric = {
      value: parseFloat(currentData.testTimeAvg.toFixed(2)),
      unit: 'ms',
      ...calcDelta(currentData.testTimeAvg, previousData.testTimeAvg),
    };

    const yieldOverall: KpiMetric = {
      value: parseFloat(currentData.yieldOverall.toFixed(2)),
      unit: '%',
      ...calcDelta(currentData.yieldOverall, previousData.yieldOverall),
    };

    const roiImprovement: KpiMetric = {
      value: parseFloat(currentData.roiImprovement.toFixed(2)),
      currency: 'USD',
      ...calcDelta(currentData.roiImprovement, previousData.roiImprovement),
    };

    return {
      totalTestCost,
      costPerWafer,
      costPerDie,
      testTimeAvg,
      yieldOverall,
      roiImprovement,
    };
  }

  private async fetchPeriodMetrics(
    query: SummaryQueryDto,
    from: Date,
    to: Date,
  ): Promise<{
    totalTestCost: number;
    costPerWafer: number;
    costPerDie: number;
    testTimeAvg: number;
    yieldOverall: number;
    roiImprovement: number;
  }> {
    const conditions: string[] = [];
    const params: any[] = [];

    // testedAt filter
    conditions.push(`tr."testedAt" BETWEEN $${params.length + 1} AND $${params.length + 2}`);
    params.push(from, to);

    if (query.fabId && !query.fabId.startsWith('fab-')) {
      conditions.push(`l."fabId" = $${params.length + 1}`);
      params.push(query.fabId);
    }
    if (query.testerId) {
      conditions.push(`l."testerId" = $${params.length + 1}`);
      params.push(query.testerId);
    }
    if (query.lotId && !query.lotId.startsWith('lot-')) {
      conditions.push(`l."lotId" = $${params.length + 1}`);
      params.push(query.lotId);
    }

    const whereClause = conditions.join(' AND ');

    // Aggregate query
    const aggregateQuery = `
      SELECT
        COALESCE(SUM(tr."costUsd"), 0)::float as "totalTestCost",
        COUNT(DISTINCT w.id)::int as "waferCount",
        COUNT(DISTINCT d.id)::int as "dieCount",
        COUNT(DISTINCT CASE WHEN d.bin = 1 THEN d.id END)::int as "passingDieCount",
        COALESCE(AVG(tr."testTimeMs"), 0)::float as "testTimeAvg"
      FROM "TestResult" tr
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE ${whereClause}
    `;

    const results = await this.prisma.$queryRawUnsafe<any[]>(aggregateQuery, ...params);
    const metrics = results[0] || {
      totalTestCost: 0,
      waferCount: 0,
      dieCount: 0,
      passingDieCount: 0,
      testTimeAvg: 0,
    };

    // Redundant pattern query for ROI Improvement calculation
    // Redundant patterns defined as having killRatio < 0.65
    const roiQuery = `
      SELECT
        COALESCE(SUM(tr."costUsd"), 0)::float as "redundantCost"
      FROM "TestResult" tr
      JOIN "Pattern" p ON p.id = tr."patternId"
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE ${whereClause} AND p."killRatio" < 0.65
    `;

    const roiResults = await this.prisma.$queryRawUnsafe<any[]>(roiQuery, ...params);
    const redundantCost = roiResults[0]?.redundantCost || 0;

    const totalTestCost = metrics.totalTestCost;
    const waferCount = metrics.waferCount || 1; // Prevent division by zero
    const dieCount = metrics.dieCount || 1;
    const passingDieCount = metrics.passingDieCount;

    return {
      totalTestCost,
      costPerWafer: totalTestCost / waferCount,
      costPerDie: totalTestCost / dieCount,
      testTimeAvg: metrics.testTimeAvg,
      yieldOverall: (passingDieCount / dieCount) * 100,
      roiImprovement: redundantCost, // Savings potential based on removing redundant patterns
    };
  }
}
