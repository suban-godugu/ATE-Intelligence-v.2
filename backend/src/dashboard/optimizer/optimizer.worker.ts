import { Job } from 'bullmq';
import { PrismaClient, JobStatus } from '@prisma/client';
import Redis from 'ioredis';
import { runConstraintPruning } from '../../../../ai model/optimizer.model';

const prisma = new PrismaClient();

interface OptimizerJobData {
  jobId: string;
  lotId: string;
  fabId: string;
  constraints: {
    maxCostPerWafer: number;
    yieldTarget: number;
    maxTestTimeMs: number;
  };
  redisOptions: {
    host: string;
    port: number;
  };
}

export default async function (job: Job<OptimizerJobData>): Promise<any> {
  const { jobId, lotId, constraints, redisOptions } = job.data;
  console.log(`[Sandboxed Worker] Starting optimization job ${jobId} in background process.`);

  // Create a clean standalone Redis connection in the child process
  const redis = new Redis({
    host: redisOptions.host,
    port: redisOptions.port,
    maxRetriesPerRequest: null,
  });

  try {
    // 1. Update status to RUNNING in PostgreSQL
    await prisma.optimizationJob.update({
      where: { jobId },
      data: { status: JobStatus.RUNNING },
    });

    // 2. Fetch all patterns and their metrics for this lot using raw SQL
    const sql = `
      SELECT
        p.id,
        p."patternId" as "patternId",
        p."patternType" as "patternType",
        p."killRatio"::float as "killRatio",
        AVG(tr."testTimeMs")::float as "testTimeMs",
        AVG(tr."costUsd")::float as "costUsd",
        (COUNT(CASE WHEN NOT tr.passed THEN 1 END) * 100.0 / COUNT(*))::float as "failRate"
      FROM "Pattern" p
      JOIN "TestResult" tr ON tr."patternId" = p.id
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE l."lotId" = $1
      GROUP BY p.id, p."patternId", p."patternType", p."killRatio"
    `;

    const patternsRaw = await prisma.$queryRawUnsafe<any[]>(sql, lotId);

    if (patternsRaw.length === 0) {
      throw new Error(`No test results or patterns found for lot ${lotId}`);
    }

    // Fetch lot wafer count for savings calculation
    const lotContextQuery = `
      SELECT COUNT(DISTINCT w.id)::int as "waferCount"
      FROM "Lot" l
      JOIN "Wafer" w ON w."lotId" = l.id
      WHERE l."lotId" = $1
    `;
    const lotRes = await prisma.$queryRawUnsafe<any[]>(lotContextQuery, lotId);
    const waferCount = lotRes[0]?.waferCount || 5;

    // 3. Compute ROI score in memory for all patterns
    const patterns = patternsRaw.map((p) => {
      const testTimeMs = p.testTimeMs || 0;
      const costUsd = p.costUsd || 0;
      const failRate = p.failRate || 0;
      const killRatio = p.killRatio || 1.0;

      let roiScore = 0;
      if (testTimeMs > 0 && costUsd > 0) {
        const raw = (failRate * killRatio * 101) / (testTimeMs * costUsd * 1000);
        roiScore = Math.min(100, Math.max(0, Math.round(raw)));
      }

      return {
        ...p,
        roiScore,
      };
    });

    // 4. Run AI defect-pruning optimization model
    const results = runConstraintPruning(
      patterns as any,
      constraints,
      waferCount,
      489,
      92.14,
    );

    // 5. Update PostgreSQL OptimizationJob to COMPLETE
    await prisma.optimizationJob.update({
      where: { jobId },
      data: {
        status: JobStatus.COMPLETE,
        results: results as any,
      },
    });

    // 6. Publish completion to Redis Pub/Sub
    await redis.publish(
      `optimization:complete:${jobId}`,
      JSON.stringify({
        jobId,
        status: JobStatus.COMPLETE,
        results,
      }),
    );

    console.log(`[Sandboxed Worker] Job ${jobId} completed successfully.`);
    return results;
  } catch (error: any) {
    console.error(`[Sandboxed Worker] Job ${jobId} failed:`, error);

    await prisma.optimizationJob.update({
      where: { jobId },
      data: { status: JobStatus.FAILED },
    });

    await redis.publish(
      `optimization:complete:${jobId}`,
      JSON.stringify({
        jobId,
        status: JobStatus.FAILED,
        error: error.message,
      }),
    );
    throw error;
  } finally {
    // Graceful cleanups inside child process
    await prisma.$disconnect();
    redis.disconnect();
  }
}
