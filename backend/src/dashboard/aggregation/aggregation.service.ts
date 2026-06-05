import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as cron from 'node-cron';
import { Prisma } from '@prisma/client';

@Injectable()
export class AggregationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AggregationService.name);
  private cronJob!: cron.ScheduledTask;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.logger.log('Initializing background data aggregation pipeline...');
    // Run every 30 seconds
    this.cronJob = cron.schedule('*/30 * * * * *', async () => {
      this.logger.log('Cron triggered: Starting background data aggregation...');
      try {
        await this.runAggregation();
      } catch (err) {
        this.logger.error('CRITICAL: Aggregation pipeline error:', err);
      }
    });
  }

  onModuleDestroy() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }

  async runAggregation() {
    const start = Date.now();

    // 1. Fetch all unique (fabId, lotId) combinations from Lots
    const lots = await this.prisma.lot.findMany({
      select: {
        lotId: true,
        fabId: true,
      },
      distinct: ['lotId', 'fabId'],
    });

    this.logger.log(`Found ${lots.length} lot configurations to aggregate.`);

    // 2. Loop through each combination and run computeSnapshot
    let successCount = 0;
    for (const lot of lots) {
      try {
        await this.computeAndSaveSnapshot(lot.fabId, lot.lotId);
        successCount++;
      } catch (err) {
        // Aggregation must be resilient: catch and log error per combination
        this.logger.error(
          `Failed to aggregate snapshot for fab: ${lot.fabId}, lot: ${lot.lotId}:`,
          err,
        );
      }
    }

    // 3. Publish snapshot:updated event to Redis Pub/Sub if any succeeded
    if (successCount > 0) {
      this.logger.log('Publishing "snapshot:updated" event to Redis Pub/Sub.');
      await this.redis.getClient().publish(
        'snapshot:updated',
        JSON.stringify({
          event: 'snapshots_aggregated',
          timestamp: new Date().toISOString(),
          count: successCount,
        }),
      );
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    this.logger.log(`Aggregation cycle finished: ${successCount}/${lots.length} snapshots updated in ${duration}s.`);
  }

  private async computeAndSaveSnapshot(fabId: string, lotId: string): Promise<void> {
    this.logger.log(`Computing snapshot metrics for Fab ${fabId}, Lot ${lotId}...`);

    // Dynamic parameterized raw aggregate query
    const aggregateQuery = `
      SELECT
        l."fabId",
        l."lotId",
        COALESCE(SUM(tr."costUsd"), 0)::float as "totalTestCost",
        COUNT(DISTINCT w.id)::int as "waferCount",
        COUNT(d.id)::int as "totalDies",
        COUNT(CASE WHEN NOT tr.passed THEN 1 END)::int as "failedDies",
        COALESCE(AVG(tr."testTimeMs"), 0)::float as "testTimeAvgMs",
        COUNT(DISTINCT p.id)::int as "patternCount"
      FROM "Lot" l
      JOIN "Wafer" w ON w."lotId" = l.id
      JOIN "Die" d ON d."waferId" = w.id
      JOIN "TestResult" tr ON tr."dieId" = d.id
      JOIN "Pattern" p ON p.id = tr."patternId"
      WHERE l."lotId" = $1 AND l."fabId" = $2
      GROUP BY l."fabId", l."lotId"
    `;

    const aggResults = await this.prisma.$queryRawUnsafe<any[]>(aggregateQuery, lotId, fabId);
    const row = aggResults[0];

    if (!row) {
      this.logger.warn(`No aggregate records found for Fab ${fabId}, Lot ${lotId}. Skipping.`);
      return;
    }

    const totalTestCost = row.totalTestCost;
    const waferCount = row.waferCount || 1;
    const totalDies = row.totalDies || 1;
    const failedDies = row.failedDies;
    const testTimeAvgMs = row.testTimeAvgMs;
    const patternCount = row.patternCount;

    // Derived fields
    const passingDies = totalDies - failedDies;
    const costPerWafer = totalTestCost / waferCount;
    const costPerDie = totalTestCost / totalDies;
    const yieldOverall = (passingDies / totalDies) * 100;

    // Query redundant pattern details: count of patterns with killRatio < 0.65
    // and sum of costs for these low-ROI patterns
    const redundantQuery = `
      SELECT
        COUNT(DISTINCT p.id)::int as "redundantCount",
        COALESCE(SUM(tr."costUsd"), 0)::float as "redundantCost"
      FROM "TestResult" tr
      JOIN "Pattern" p ON p.id = tr."patternId"
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w."waferId" = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE l."lotId" = $1 AND l."fabId" = $2 AND p."killRatio" < 0.65
    `;

    const redundantRes = await this.prisma.$queryRawUnsafe<any[]>(redundantQuery, lotId, fabId);
    const redundantPatternCount = redundantRes[0]?.redundantCount || 0;
    const roiImprovement = redundantRes[0]?.redundantCost || 0;

    // Save snapshot in DB via Prisma
    await this.prisma.dashboardSnapshot.create({
      data: {
        snapshotAt: new Date(),
        fabId,
        lotId,
        totalTestCost: new Prisma.Decimal(totalTestCost.toFixed(2)),
        costPerWafer: new Prisma.Decimal(costPerWafer.toFixed(4)),
        costPerDie: new Prisma.Decimal(costPerDie.toFixed(6)),
        testTimeAvgMs: new Prisma.Decimal(testTimeAvgMs.toFixed(2)),
        yieldOverall: new Prisma.Decimal(yieldOverall.toFixed(2)),
        roiImprovement: new Prisma.Decimal(roiImprovement.toFixed(2)),
        totalDies,
        passingDies,
        failedDies,
        patternCount,
        redundantPatternCount,
      },
    });

    this.logger.log(`Successfully saved dashboard snapshot for Fab ${fabId}, Lot ${lotId}.`);
  }
}
