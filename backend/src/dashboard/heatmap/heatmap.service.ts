import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WaferHeatmapQueryDto, HeatmapResponseDto, DieCell, Cluster } from './heatmap.dto';
import { runDBSCAN, classifyCluster, DBSCANPoint } from './dbscan.util';

@Injectable()
export class HeatmapService {
  private readonly logger = new Logger(HeatmapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(lotId: string, waferId: string, colorMode: string): string {
    return `dashboard:heatmap:${lotId}:${waferId}:${colorMode}`;
  }

  async getHeatmap(query: WaferHeatmapQueryDto): Promise<HeatmapResponseDto> {
    const { lotId, waferId, colorMode } = query;
    const cacheKey = this.getCacheKey(lotId, waferId, colorMode);

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.log(`Heatmap cache hit for: ${cacheKey}`);
      return JSON.parse(cached);
    }

    this.logger.log(`Heatmap cache miss. Computing for: ${cacheKey}`);
    const heatmap = await this.computeHeatmap(lotId, waferId, colorMode);
    await this.redis.set(cacheKey, JSON.stringify(heatmap), 300); // 5 mins TTL
    return heatmap;
  }

  private async computeHeatmap(
    lotId: string,
    waferId: string,
    colorMode: string,
  ): Promise<HeatmapResponseDto> {
    // 1. Parameterized PostgreSQL query to get all dies of the wafer
    const queryStr = `
      SELECT
        d.x,
        d.y,
        d.bin::int as bin,
        d."failType" as "failType",
        COALESCE(SUM(tr."costUsd"), 0)::float as "costPerDie"
      FROM "Die" d
      LEFT JOIN "TestResult" tr ON tr."dieId" = d.id
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      WHERE l."lotId" = $1 AND w."waferId" = $2
      GROUP BY d.x, d.y, d.bin, d."failType"
    `;

    const diesRaw = await this.prisma.$queryRawUnsafe<any[]>(queryStr, lotId, waferId);

    const totalDies = diesRaw.length;
    const passingDies = diesRaw.filter((d) => d.bin === 1).length;
    const failedDies = totalDies - passingDies;
    const spatialYield = totalDies > 0 ? parseFloat(((passingDies / totalDies) * 100).toFixed(2)) : 100;

    // 2. Compute P10/P90 cost limits for normalizedCost calculations
    const sortedCosts = diesRaw.map((d) => d.costPerDie).sort((a, b) => a - b);
    const lowCostThreshold = sortedCosts.length > 0 ? sortedCosts[Math.floor(sortedCosts.length * 0.1)] : 0;
    const highCostThreshold = sortedCosts.length > 0 ? sortedCosts[Math.floor(sortedCosts.length * 0.9)] : 0;

    const costDiff = highCostThreshold - lowCostThreshold;

    // 3. Construct Die cells grid
    const dieGrid: DieCell[] = diesRaw.map((d) => {
      let normalizedCost = 0;
      if (costDiff > 0) {
        normalizedCost = (d.costPerDie - lowCostThreshold) / costDiff;
        normalizedCost = Math.max(0, Math.min(1, normalizedCost)); // Clamped 0-1
      }
      return {
        x: d.x,
        y: d.y,
        bin: d.bin,
        costPerDie: parseFloat(d.costPerDie.toFixed(6)),
        failType: d.failType,
        normalizedCost: parseFloat(normalizedCost.toFixed(4)),
      };
    });

    // 4. Cluster analysis using DBSCAN on failed dies (bin > 1)
    const failedPoints: DBSCANPoint[] = dieGrid
      .map((d, index) => ({ x: d.x, y: d.y, index }))
      .filter((_, idx) => dieGrid[idx].bin > 1);

    const dbscanClusters = runDBSCAN(failedPoints, 2, 3);

    // Get maxX and maxY for classification boundaries
    const maxX = diesRaw.reduce((max, d) => Math.max(max, d.x), 0);
    const maxY = diesRaw.reduce((max, d) => Math.max(max, d.y), 0);

    const clusters: Cluster[] = dbscanClusters.map((dieIndices) => {
      const clusterDies = dieIndices.map((idx) => dieGrid[idx]);
      return classifyCluster(clusterDies, maxX, maxY);
    });

    return {
      lotId,
      waferId,
      totalDies,
      passingDies,
      failedDies,
      spatialYield,
      dieGrid,
      clusters,
      colorMode,
      highCostThreshold: parseFloat(highCostThreshold.toFixed(6)),
      lowCostThreshold: parseFloat(lowCostThreshold.toFixed(6)),
    };
  }
}
