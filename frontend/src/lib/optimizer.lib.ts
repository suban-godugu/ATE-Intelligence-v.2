/**
 * optimizer.lib.ts
 * 
 * ATE Test Suite Constraint-Based Pruning Algorithm
 * Ported from: ai model/optimizer.model.ts
 * 
 * Pure TypeScript — runs fully client-side with no server required.
 */

export interface PatternData {
  id: string;
  patternId: string;
  patternType: string;
  killRatio: number;
  testTimeMs: number;
  costUsd: number;
  failRate: number;
  roiScore: number;
}

export interface OptimizationConstraints {
  maxCostPerWafer: number;
  yieldTarget: number;
  maxTestTimeMs: number;
}

export interface OptimizationResult {
  estimatedCostReduction: number;
  estimatedTimeSavings: number;
  projectedYield: number;
  patternsReduced: number;
  patternsReducedPct: number;
  totalSavingsUsd: number;
  optimizedPatternSet: Array<{
    patternId: string;
    patternType: string;
    action: 'keep' | 'remove';
    reason: string;
    impactMs: number;
    impactUsd: number;
  }>;
}

export function runConstraintPruning(
  patterns: PatternData[],
  constraints: OptimizationConstraints,
  waferCount: number = 5,
  diesPerWafer: number = 489,
  originalYield: number = 92.14,
): OptimizationResult {
  const originalCostPerWafer = patterns.reduce((acc, p) => acc + p.costUsd, 0) * diesPerWafer;
  const originalTimeMs = patterns.reduce((acc, p) => acc + p.testTimeMs, 0);

  // 1. Filter patterns by low ROI (< 40)
  const removable = [...patterns]
    .filter((p) => p.roiScore < 40)
    .sort((a, b) => a.roiScore - b.roiScore); // lowest ROI first

  const kept = [...patterns];
  const removed: PatternData[] = [];

  for (const p of removable) {
    const keptWithoutP = kept.filter((k) => k.id !== p.id);
    const projectedCostPerWafer = keptWithoutP.reduce((acc, k) => acc + k.costUsd, 0) * diesPerWafer;
    const projectedTestTime = keptWithoutP.reduce((acc, k) => acc + k.testTimeMs, 0);

    // Defect leakage model: removing a low-ROI pattern slightly lowers yield
    const yieldImpact = p.killRatio * (1 - p.killRatio) * 0.05;
    const projectedYield = originalYield - yieldImpact;

    if (
      projectedYield >= constraints.yieldTarget &&
      projectedCostPerWafer <= constraints.maxCostPerWafer &&
      projectedTestTime <= constraints.maxTestTimeMs
    ) {
      const idx = kept.findIndex((k) => k.id === p.id);
      if (idx > -1) kept.splice(idx, 1);
      removed.push(p);
    }
  }

  const finalCostPerWafer = kept.reduce((acc, k) => acc + k.costUsd, 0) * diesPerWafer;
  const finalTimeMs = kept.reduce((acc, k) => acc + k.testTimeMs, 0);
  const finalYield = originalYield - removed.reduce(
    (acc, r) => acc + r.killRatio * (1 - r.killRatio) * 0.05, 0
  );

  const estimatedCostReduction = ((originalCostPerWafer - finalCostPerWafer) / originalCostPerWafer) * 100;
  const estimatedTimeSavings = ((originalTimeMs - finalTimeMs) / originalTimeMs) * 100;
  const totalSavingsUsd = (originalCostPerWafer - finalCostPerWafer) * waferCount;

  const optimizedPatternSet = patterns.map((p) => {
    const isRemoved = removed.some((r) => r.id === p.id);
    return {
      patternId: p.patternId,
      patternType: p.patternType,
      action: isRemoved ? ('remove' as const) : ('keep' as const),
      reason: isRemoved ? `Low ROI: score ${p.roiScore}` : 'ROI score above threshold',
      impactMs: parseFloat(p.testTimeMs.toFixed(1)),
      impactUsd: parseFloat((p.costUsd * diesPerWafer).toFixed(4)),
    };
  });

  return {
    estimatedCostReduction: parseFloat(estimatedCostReduction.toFixed(1)),
    estimatedTimeSavings: parseFloat(estimatedTimeSavings.toFixed(1)),
    projectedYield: parseFloat(finalYield.toFixed(2)),
    patternsReduced: removed.length,
    patternsReducedPct: parseFloat(((removed.length / patterns.length) * 100).toFixed(1)),
    totalSavingsUsd: parseFloat(totalSavingsUsd.toFixed(2)),
    optimizedPatternSet,
  };
}

// ─── Generate realistic demo pattern dataset ─────────────
export function generateDemoPatterns(count = 24): PatternData[] {
  const PATTERN_TYPES = [
    'ATPG-FULL', 'ATPG-COMPACT', 'SCAN-BASIC', 'SCAN-CHAIN',
    'BIST-MEM', 'BIST-LOGIC', 'STUCK-AT', 'TRANSITION',
    'BRIDGE', 'CELL-AWARE', 'IDDQ', 'POWER-SUPPLY',
  ];

  return Array.from({ length: count }, (_, i) => {
    const patternType = PATTERN_TYPES[i % PATTERN_TYPES.length];
    const roiScore    = parseFloat((10 + Math.random() * 90).toFixed(1));
    const killRatio   = parseFloat((0.05 + Math.random() * 0.7).toFixed(3));
    const testTimeMs  = parseFloat((0.5 + Math.random() * 8).toFixed(2));
    const costUsd     = parseFloat((0.001 + Math.random() * 0.012).toFixed(4));
    const failRate    = parseFloat((0.01 + Math.random() * 0.15).toFixed(3));

    return {
      id:          `pat-${String(i + 1).padStart(3, '0')}`,
      patternId:   `${patternType}-${String(i + 1).padStart(3, '0')}`,
      patternType,
      killRatio,
      testTimeMs,
      costUsd,
      failRate,
      roiScore,
    };
  });
}
