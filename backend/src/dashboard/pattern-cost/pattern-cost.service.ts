import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PatternCostQueryDto, PatternCostResponseDto, PatternRow } from './pattern-cost.dto';
import { getDetectPower, getRecommendation } from './roi.util';

@Injectable()
export class PatternCostService {
  private readonly logger = new Logger(PatternCostService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPatterns(query: PatternCostQueryDto): Promise<PatternCostResponseDto> {
    const conditions: string[] = [];
    const params: any[] = [];

    // Filters
    if (query.from && query.to) {
      conditions.push(`tr."testedAt" BETWEEN $${params.length + 1} AND $${params.length + 2}`);
      params.push(new Date(query.from), new Date(query.to));
    }
    if (query.fabId && !query.fabId.startsWith('fab-')) {
      conditions.push(`l."fabId" = $${params.length + 1}`);
      params.push(query.fabId);
    }
    if (query.lotId && !query.lotId.startsWith('lot-')) {
      conditions.push(`l."lotId" = $${params.length + 1}`);
      params.push(query.lotId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total matched pattern count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id)::int as total
      FROM "Pattern" p
      JOIN "TestResult" tr ON tr."patternId" = p.id
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      ${whereClause}
    `;

    const countResult = await this.prisma.$queryRawUnsafe<any[]>(countQuery, ...params);
    const total = countResult[0]?.total || 0;

    // Sorting map
    const sortMap = {
      roiScore: '"roiScore"',
      costUsd: '"costUsd"',
      testTime: '"testTimeMs"',
      failRate: '"failRate"',
    };
    const sortCol = sortMap[query.sortBy] || '"roiScore"';
    const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';

    // Main parameterized analytical query
    const limit = query.limit;
    const offset = query.offset;
    const limitPlaceholder = `$${params.length + 1}`;
    const offsetPlaceholder = `$${params.length + 2}`;
    params.push(limit, offset);

    const mainQuery = `
      SELECT
        p."patternId" as "patternId",
        p."patternType" as "patternType",
        AVG(tr."testTimeMs")::float as "testTimeMs",
        AVG(tr."costUsd")::float as "costUsd",
        (COUNT(CASE WHEN NOT tr.passed THEN 1 END) * 100.0 / COUNT(*))::float as "failRate",
        p."killRatio"::float as "killRatio",
        COALESCE(
          LEAST(100, GREATEST(0, ROUND(
            (
              (COUNT(CASE WHEN NOT tr.passed THEN 1 END) * 100.0 / COUNT(*)) * p."killRatio" * 101
            ) / NULLIF(AVG(tr."testTimeMs") * AVG(tr."costUsd") * 1000, 0)
          ))),
          0
        )::int as "roiScore"
      FROM "Pattern" p
      JOIN "TestResult" tr ON tr."patternId" = p.id
      JOIN "Die" d ON d.id = tr."dieId"
      JOIN "Wafer" w ON w.id = d."waferId"
      JOIN "Lot" l ON l.id = w."lotId"
      ${whereClause}
      GROUP BY p.id, p."patternId", p."patternType", p."killRatio"
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
    `;

    const rawRows = await this.prisma.$queryRawUnsafe<any[]>(mainQuery, ...params);

    // 5. Post-process to calculate recommendation and detect power labels
    const data: PatternRow[] = rawRows.map((r) => ({
      patternId: r.patternId,
      patternType: r.patternType,
      testTimeMs: parseFloat(r.testTimeMs.toFixed(1)),
      costUsd: parseFloat(r.costUsd.toFixed(4)),
      failRate: parseFloat(r.failRate.toFixed(2)),
      detectPower: getDetectPower(r.failRate),
      roiScore: r.roiScore,
      recommendation: getRecommendation(r.roiScore),
    }));

    return {
      data,
      total,
      limit,
      offset,
    };
  }
}
