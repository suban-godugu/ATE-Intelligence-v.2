export function calcRoiScore(
  failRate: number,
  killRatio: number,
  testTimeMs: number,
  costUsd: number,
): number {
  if (testTimeMs === 0 || costUsd === 0) return 0;
  // ROI = (failRate × killRatio × 101) / (testTimeMs × costUsd × 1000)
  const raw = (failRate * killRatio * 101) / (testTimeMs * costUsd * 1000);
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function getRecommendation(roiScore: number): 'KEEP' | 'REVIEW' | 'REMOVE' {
  if (roiScore >= 70) return 'KEEP';
  if (roiScore >= 40) return 'REVIEW';
  return 'REMOVE';
}

export function getDetectPower(failRate: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (failRate >= 5) return 'HIGH';
  if (failRate >= 1) return 'MEDIUM';
  return 'LOW';
}
