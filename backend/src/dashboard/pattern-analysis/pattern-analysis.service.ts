import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { PatternDomain, FaultClass, Prisma } from '@prisma/client';

interface OverviewFilter {
  lotId?: string;
  fabId?: string;
}

interface FailFilter {
  lotId?: string;
  domain?: PatternDomain;
  faultClass?: FaultClass;
}

interface CoverageFilter {
  lotId?: string;
  domain?: PatternDomain;
}

interface ScanChainFilter {
  lotId?: string;
}

interface LotFilter {
  lotId?: string;
}

interface RedundancyFilter {
  lotId?: string;
  waferId?: string;
}

@Injectable()
export class PatternAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  /** Overview: aggregate stats across all domains */
  async getOverview(filter: OverviewFilter) {
    const where: Prisma.PatternAnalysisWhereInput = {};
    if (filter.lotId) where.lotId = filter.lotId;

    const analyses = await this.prisma.patternAnalysis.findMany({
      where,
      orderBy: { analyzedAt: 'desc' },
      take: 500,
    });

    // Aggregate by domain
    const domainMap: Record<string, {
      domain: string;
      totalPatterns: number;
      faultsCovered: number;
      faultsDetected: number;
      faultsUntested: number;
      coveragePct: number[];
      passCount: number;
      failCount: number;
      executionTimeMs: number;
    }> = {};

    for (const a of analyses) {
      if (!domainMap[a.domain]) {
        domainMap[a.domain] = {
          domain: a.domain,
          totalPatterns: 0,
          faultsCovered: 0,
          faultsDetected: 0,
          faultsUntested: 0,
          coveragePct: [],
          passCount: 0,
          failCount: 0,
          executionTimeMs: 0,
        };
      }
      const d = domainMap[a.domain];
      d.totalPatterns += a.totalPatterns;
      d.faultsCovered += a.faultsCovered;
      d.faultsDetected += a.faultsDetected;
      d.faultsUntested += a.faultsUntested;
      d.coveragePct.push(a.coveragePct);
      d.passCount += a.passCount;
      d.failCount += a.failCount;
      d.executionTimeMs += a.executionTimeMs;
    }

    const domains = Object.values(domainMap).map((d) => ({
      ...d,
      avgCoveragePct:
        d.coveragePct.length > 0
          ? d.coveragePct.reduce((s, v) => s + v, 0) / d.coveragePct.length
          : 0,
      coveragePct: undefined,
    }));

    const totalFaults = analyses.reduce((s, a) => s + a.faultsCovered + a.faultsUntested, 0);
    const totalCovered = analyses.reduce((s, a) => s + a.faultsCovered, 0);
    const overallCoverage = totalFaults > 0 ? (totalCovered / totalFaults) * 100 : 0;
    const totalPass = analyses.reduce((s, a) => s + a.passCount, 0);
    const totalFail = analyses.reduce((s, a) => s + a.failCount, 0);

    return {
      totalAnalyses: analyses.length,
      overallCoveragePct: parseFloat(overallCoverage.toFixed(2)),
      totalFaults,
      totalCovered,
      totalPass,
      totalFail,
      passRate: totalPass + totalFail > 0
        ? parseFloat(((totalPass / (totalPass + totalFail)) * 100).toFixed(2))
        : 0,
      domains,
    };
  }

  /** Fail Analysis: per-fault-class distribution with fail sites */
  async getFailAnalysis(filter: FailFilter) {
    const where: Prisma.PatternAnalysisWhereInput = {};
    if (filter.lotId) where.lotId = filter.lotId;
    if (filter.domain) where.domain = filter.domain;
    if (filter.faultClass) where.faultClass = filter.faultClass;

    const analyses = await this.prisma.patternAnalysis.findMany({
      where,
      include: {
        failSites: {
          orderBy: { severity: 'desc' },
          take: 200,
        },
      },
      orderBy: { analyzedAt: 'desc' },
      take: 100,
    });

    // Fault class breakdown
    const faultClassMap: Record<string, { count: number; severity: number; detectedFaults: number }> = {};
    for (const a of analyses) {
      const fc = a.faultClass;
      if (!faultClassMap[fc]) faultClassMap[fc] = { count: 0, severity: 0, detectedFaults: 0 };
      faultClassMap[fc].count += a.failCount;
      faultClassMap[fc].detectedFaults += a.faultsDetected;
      for (const fs of a.failSites) {
        faultClassMap[fc].severity += fs.severity;
      }
    }

    const faultClassBreakdown = Object.entries(faultClassMap).map(([cls, v]) => ({
      faultClass: cls,
      failCount: v.count,
      detectedFaults: v.detectedFaults,
      avgSeverity: v.count > 0 ? parseFloat((v.severity / v.count).toFixed(2)) : 0,
    }));

    // Recent fail sites
    const failSites = analyses.flatMap((a) =>
      a.failSites.map((fs) => ({
        ...fs,
        domain: a.domain,
        patternCoverage: a.coveragePct,
      })),
    ).slice(0, 100);

    return {
      totalFailures: analyses.reduce((s, a) => s + a.failCount, 0),
      faultClassBreakdown,
      failSites,
      analyses: analyses.map((a) => ({
        id: a.id,
        domain: a.domain,
        faultClass: a.faultClass,
        passCount: a.passCount,
        failCount: a.failCount,
        coveragePct: a.coveragePct,
        analyzedAt: a.analyzedAt,
      })),
    };
  }

  /** Coverage: per-coverage-type metrics */
  async getCoverage(filter: CoverageFilter) {
    const paWhere: Prisma.PatternAnalysisWhereInput = {};
    if (filter.lotId) paWhere.lotId = filter.lotId;
    if (filter.domain) paWhere.domain = filter.domain;

    const analyses = await this.prisma.patternAnalysis.findMany({
      where: paWhere,
      include: {
        coverageMetrics: true,
      },
      orderBy: { analyzedAt: 'desc' },
      take: 200,
    });

    // Aggregate by coverageType
    const coverageTypeMap: Record<string, {
      achieved: number[];
      target: number[];
      gap: number[];
      faultCount: number;
      coveredFaults: number;
    }> = {};

    for (const a of analyses) {
      for (const cm of a.coverageMetrics) {
        const ct = cm.coverageType;
        if (!coverageTypeMap[ct]) {
          coverageTypeMap[ct] = { achieved: [], target: [], gap: [], faultCount: 0, coveredFaults: 0 };
        }
        coverageTypeMap[ct].achieved.push(cm.achieved);
        coverageTypeMap[ct].target.push(cm.target);
        coverageTypeMap[ct].gap.push(cm.gap);
        coverageTypeMap[ct].faultCount += cm.faultCount;
        coverageTypeMap[ct].coveredFaults += cm.coveredFaults;
      }
    }

    const coverageByType = Object.entries(coverageTypeMap).map(([type, v]) => {
      const avg = (arr: number[]) =>
        arr.length ? parseFloat((arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(2)) : 0;
      return {
        coverageType: type,
        avgAchieved: avg(v.achieved),
        avgTarget: avg(v.target),
        avgGap: avg(v.gap),
        totalFaults: v.faultCount,
        totalCovered: v.coveredFaults,
      };
    });

    // Timeline of coverage per domain
    const coverageTimeline = analyses.map((a) => ({
      analyzedAt: a.analyzedAt,
      domain: a.domain,
      coveragePct: a.coveragePct,
    }));

    return {
      coverageByType,
      coverageTimeline,
      overallAvgCoverage:
        analyses.length > 0
          ? parseFloat(
              (analyses.reduce((s, a) => s + a.coveragePct, 0) / analyses.length).toFixed(2),
            )
          : 0,
    };
  }

  /** Scan Chain: chain-level pass rates and cell failures */
  async getScanChain(filter: ScanChainFilter) {
    const paWhere: Prisma.PatternAnalysisWhereInput = {
      domain: 'SCAN_CHAIN',
    };
    if (filter.lotId) paWhere.lotId = filter.lotId;

    const analyses = await this.prisma.patternAnalysis.findMany({
      where: paWhere,
      include: { scanChainResults: true },
      orderBy: { analyzedAt: 'desc' },
      take: 100,
    });

    const chains = analyses.flatMap((a) =>
      a.scanChainResults.map((c) => ({
        ...c,
        analyzedAt: a.analyzedAt,
        domain: a.domain,
      })),
    );

    const totalChains = chains.length;
    const failedChains = chains.filter((c) => c.passRate < 100).length;
    const avgPassRate =
      totalChains > 0
        ? parseFloat((chains.reduce((s, c) => s + c.passRate, 0) / totalChains).toFixed(2))
        : 0;

    return {
      totalChains,
      failedChains,
      avgPassRate,
      chains: chains.slice(0, 200),
    };
  }

  /** MBIST: memory built-in self-test results */
  async getMbist(filter: LotFilter) {
    const where: Prisma.MbistResultWhereInput = {};
    if (filter.lotId) where.lotId = filter.lotId;

    const results = await this.prisma.mbistResult.findMany({
      where,
      orderBy: { testedAt: 'desc' },
      take: 200,
    });

    const totalMemories = results.length;
    const failedMemories = results.filter((r) => r.failCount > 0).length;
    const avgCoverage =
      totalMemories > 0
        ? parseFloat(
            (results.reduce((s, r) => s + r.coveragePct, 0) / totalMemories).toFixed(2),
          )
        : 0;

    // Group by algorithm
    const algorithmMap: Record<string, { count: number; pass: number; fail: number; coverage: number[] }> = {};
    for (const r of results) {
      const algo = r.algorithm;
      if (!algorithmMap[algo]) algorithmMap[algo] = { count: 0, pass: 0, fail: 0, coverage: [] };
      algorithmMap[algo].count++;
      algorithmMap[algo].pass += r.passCount;
      algorithmMap[algo].fail += r.failCount;
      algorithmMap[algo].coverage.push(r.coveragePct);
    }

    const byAlgorithm = Object.entries(algorithmMap).map(([algo, v]) => ({
      algorithm: algo,
      instanceCount: v.count,
      totalPass: v.pass,
      totalFail: v.fail,
      avgCoverage: parseFloat((v.coverage.reduce((s, x) => s + x, 0) / v.coverage.length).toFixed(2)),
    }));

    return {
      totalMemories,
      failedMemories,
      passRate: totalMemories > 0
        ? parseFloat((((totalMemories - failedMemories) / totalMemories) * 100).toFixed(2))
        : 0,
      avgCoverage,
      byAlgorithm,
      results: results.slice(0, 100),
    };
  }

  /** LBIST: logic built-in self-test results */
  async getLbist(filter: LotFilter) {
    const where: Prisma.LbistResultWhereInput = {};
    if (filter.lotId) where.lotId = filter.lotId;

    const results = await this.prisma.lbistResult.findMany({
      where,
      orderBy: { testedAt: 'desc' },
      take: 200,
    });

    const totalBlocks = results.length;
    const failedBlocks = results.filter((r) => !r.signaturePassed).length;
    const avgCoverage =
      totalBlocks > 0
        ? parseFloat(
            (results.reduce((s, r) => s + r.coveragePct, 0) / totalBlocks).toFixed(2),
          )
        : 0;

    return {
      totalBlocks,
      failedBlocks,
      passRate:
        totalBlocks > 0
          ? parseFloat((((totalBlocks - failedBlocks) / totalBlocks) * 100).toFixed(2))
          : 0,
      avgCoverage,
      results: results.map((r) => ({
        id: r.id,
        logicBlockId: r.logicBlockId,
        seedValue: r.seedValue,
        clockCycles: r.clockCycles,
        signaturePassed: r.signaturePassed,
        coveragePct: r.coveragePct,
        testedAt: r.testedAt,
      })),
    };
  }

  /** BIST: aggregated BIST results across types */
  async getBist(filter: LotFilter) {
    const where: Prisma.BistResultWhereInput = {};
    if (filter.lotId) where.lotId = filter.lotId;

    const results = await this.prisma.bistResult.findMany({
      where,
      orderBy: { testedAt: 'desc' },
      take: 200,
    });

    const bistTypeMap: Record<string, {
      count: number;
      passCount: number;
      failCount: number;
      coverage: number[];
      durationMs: number;
    }> = {};

    for (const r of results) {
      const t = r.bistType;
      if (!bistTypeMap[t]) bistTypeMap[t] = { count: 0, passCount: 0, failCount: 0, coverage: [], durationMs: 0 };
      bistTypeMap[t].count++;
      bistTypeMap[t].passCount += r.passCount;
      bistTypeMap[t].failCount += r.failCount;
      bistTypeMap[t].coverage.push(r.coveragePct);
      bistTypeMap[t].durationMs += r.durationMs;
    }

    const byType = Object.entries(bistTypeMap).map(([type, v]) => ({
      bistType: type,
      instanceCount: v.count,
      totalPass: v.passCount,
      totalFail: v.failCount,
      avgCoverage: parseFloat((v.coverage.reduce((s, x) => s + x, 0) / v.coverage.length).toFixed(2)),
      totalDurationMs: parseFloat(v.durationMs.toFixed(2)),
    }));

    return {
      totalTests: results.length,
      byType,
      results: results.slice(0, 100),
    };
  }

  /** Redundancy: repair status and element availability */
  async getRedundancy(filter: RedundancyFilter) {
    const where: Prisma.RedundancyMapWhereInput = {};
    if (filter.waferId) where.waferId = filter.waferId;

    // If filtering by lotId, find wafer IDs in that lot
    if (filter.lotId && !filter.waferId) {
      const wafers = await this.prisma.wafer.findMany({
        where: { lotId: filter.lotId },
        select: { id: true },
      });
      where.waferId = { in: wafers.map((w) => w.id) };
    }

    const elements = await this.prisma.redundancyMap.findMany({
      where,
      orderBy: { analyzedAt: 'desc' },
      take: 500,
    });

    const total = elements.length;
    const repaired = elements.filter((e) => e.repaired).length;
    const available = elements.filter((e) => e.available && !e.repaired).length;
    const depleted = elements.filter((e) => !e.available).length;

    // Group by type
    const typeMap: Record<string, { total: number; repaired: number; available: number }> = {};
    for (const e of elements) {
      const rt = e.redundancyType;
      if (!typeMap[rt]) typeMap[rt] = { total: 0, repaired: 0, available: 0 };
      typeMap[rt].total++;
      if (e.repaired) typeMap[rt].repaired++;
      if (e.available && !e.repaired) typeMap[rt].available++;
    }

    const byType = Object.entries(typeMap).map(([type, v]) => ({
      redundancyType: type,
      total: v.total,
      repaired: v.repaired,
      available: v.available,
      utilizationPct: v.total > 0 ? parseFloat(((v.repaired / v.total) * 100).toFixed(2)) : 0,
    }));

    return {
      total,
      repaired,
      available,
      depleted,
      utilizationPct: total > 0 ? parseFloat(((repaired / total) * 100).toFixed(2)) : 0,
      byType,
      elements: elements.slice(0, 200),
    };
  }
}
