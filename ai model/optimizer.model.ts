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
  const finalYield = originalYield - removed.reduce((acc, r) => acc + r.killRatio * (1 - r.killRatio) * 0.05, 0);

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
