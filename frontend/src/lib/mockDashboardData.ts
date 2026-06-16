// ─── Realistic Mock Data for Executive Dashboard ───────────────────────────────
// Swap apiClient calls for these when the backend is not running.

import type {
  SummaryResponse, KpiMetric,
  HeatmapResponse, DieCell, Cluster,
  PatternCostResponse, PatternRow,
  CostTrendResponse, TrendPoint,
  Lot, LotContext,
  OptimizationJob,
} from '@/types/dashboard.types';

// ── KPI Metrics ───────────────────────────────────────────────────────────────
export const mockKpis: KpiMetric[] = [
  {
    id: 'total-test-cost',
    label: 'Total Test Cost',
    value: 1240000,
    formatted: '$1.24M',
    delta: -12.6,
    deltaFormatted: '12.6%',
    trend: 'down',
    format: 'currency',
    colorAccent: 'accent-purple',
  },
  {
    id: 'cost-per-wafer',
    label: 'Cost per Wafer',
    value: 58.42,
    formatted: '$58.42',
    delta: -8.3,
    deltaFormatted: '8.3%',
    trend: 'down',
    format: 'currency',
    colorAccent: 'accent-blue',
  },
  {
    id: 'cost-per-die',
    label: 'Cost per Die',
    value: 0.0213,
    formatted: '$0.0213',
    delta: -9.7,
    deltaFormatted: '9.7%',
    trend: 'down',
    format: 'currency',
    colorAccent: 'accent-green',
  },
  {
    id: 'test-time',
    label: 'Test Time (Avg)',
    value: 42.6,
    formatted: '42.6 ms',
    delta: -7.1,
    deltaFormatted: '7.1%',
    trend: 'down',
    format: 'ms',
    colorAccent: 'accent-amber',
  },
  {
    id: 'yield',
    label: 'Yield (Overall)',
    value: 98.34,
    formatted: '98.34%',
    delta: 1.8,
    deltaFormatted: '1.8%',
    trend: 'up',
    format: 'percent',
    colorAccent: 'accent-green',
  },
  {
    id: 'roi-improvement',
    label: 'ROI Improvement',
    value: 320000,
    formatted: '$320K',
    delta: 14.2,
    deltaFormatted: '14.2%',
    trend: 'up',
    format: 'currency',
    colorAccent: 'accent-pink',
  },
];

export const mockSummary: SummaryResponse = {
  fabId: 'fab-001',
  fabName: 'Fab Alpha — Node 7nm',
  periodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
  periodEnd:   new Date().toISOString(),
  metrics: mockKpis,
  alertCount: 3,
  lastUpdatedAt: new Date().toISOString(),
};

// ── Lots ───────────────────────────────────────────────────────────────────────
export const mockLots: Lot[] = [
  { id: 'lot-001', lotNumber: 'LOT-2024-042', product: 'CHIP-7NM-HPC', fabId: 'fab-001', status: 'IN_PROCESS',  waferCount: 25, startedAt: '2024-05-20T08:00:00Z', yieldPct: 93.7,  totalCost: 58920  },
  { id: 'lot-002', lotNumber: 'LOT-2024-041', product: 'CHIP-7NM-STD', fabId: 'fab-001', status: 'COMPLETE',    waferCount: 25, startedAt: '2024-05-18T06:00:00Z', completedAt: '2024-05-22T18:00:00Z', yieldPct: 91.2, totalCost: 61480 },
  { id: 'lot-003', lotNumber: 'LOT-2024-040', product: 'CHIP-5NM-AI',  fabId: 'fab-001', status: 'COMPLETE',    waferCount: 20, startedAt: '2024-05-15T09:00:00Z', completedAt: '2024-05-19T14:00:00Z', yieldPct: 88.5, totalCost: 72300 },
  { id: 'lot-004', lotNumber: 'LOT-2024-039', product: 'CHIP-7NM-HPC', fabId: 'fab-001', status: 'ON_HOLD',     waferCount: 25, startedAt: '2024-05-14T11:00:00Z', yieldPct: 67.2,  totalCost: 43200  },
  { id: 'lot-005', lotNumber: 'LOT-2024-038', product: 'CHIP-5NM-AI',  fabId: 'fab-001', status: 'SCRAPPED',    waferCount: 10, startedAt: '2024-05-10T07:00:00Z', completedAt: '2024-05-11T10:00:00Z', yieldPct: 22.0, totalCost: 96800 },
  { id: 'LOT_1', lotNumber: 'LOT_1', product: 'Center Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_2', lotNumber: 'LOT_2', product: 'Donut Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_3', lotNumber: 'LOT_3', product: 'Edge-Loc Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_4', lotNumber: 'LOT_4', product: 'Edge-Ring Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_5', lotNumber: 'LOT_5', product: 'Scratch Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_6', lotNumber: 'LOT_6', product: 'Near-Full Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_7', lotNumber: 'LOT_7', product: 'Random Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_8', lotNumber: 'LOT_8', product: 'Local Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
  { id: 'LOT_9', lotNumber: 'LOT_9', product: 'Normal Defect', fabId: 'fab-001', status: 'IN_PROCESS', waferCount: 0, startedAt: new Date().toISOString() },
];

export const mockLotContext: LotContext = {
  lot: mockLots[0],
  totalDies: 7245,
  failDies: 456,
  avgTestTimeMs: 18340,
  dominantFaultClass: 'STUCK_AT',
};

// ── Wafer Heatmap ──────────────────────────────────────────────────────────────
function generateDies(rows: number, cols: number): DieCell[] {
  const dies: DieCell[] = [];
  const cx = cols / 2;
  const cy = rows / 2;
  const r  = Math.min(cx, cy) * 0.92;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const inWafer = Math.sqrt(dx * dx + dy * dy) <= r;
      if (!inWafer) continue;

      // Create realistic defect clusters
      const d2center = Math.sqrt(dx * dx + dy * dy);
      const edgeFactor = d2center / r;
      const baseFailProb = 0.06 + edgeFactor * 0.12;
      const isFail = Math.random() < baseFailProb;
      const bin = isFail
        ? (Math.random() < 0.5 ? 2 : Math.random() < 0.5 ? 3 : 4)
        : 1;
      const costNorm = isFail ? 0.6 + Math.random() * 0.4 : Math.random() * 0.35;

      dies.push({
        x, y,
        dieId: `die-${x}-${y}`,
        bin,
        cost: 100 + costNorm * 400,
        testTime: 14000 + Math.random() * 12000,
        failType: isFail
          ? ['STUCK_AT','TRANSITION','BRIDGE','CELL_AWARE'][Math.floor(Math.random()*4)]
          : undefined,
        yieldScore: isFail ? 30 + Math.random() * 40 : 70 + Math.random() * 30,
        inWafer: true,
        clusterIds: [],
      });
    }
  }
  return dies;
}

const heatmapDies = generateDies(23, 21);

export const mockHeatmap: HeatmapResponse = {
  lotId:  'lot-001',
  waferId:'wafer-001-01',
  waferIndex: 1,
  rows: 23,
  cols: 21,
  dies: heatmapDies,
  clusters: [
    { id: 'cl-1', cx: 6,  cy: 5,  radius: 2.5, confidence: 0.91, cause: 'Photolithography',  affectedCount: 18 },
    { id: 'cl-2', cx: 14, cy: 17, radius: 1.8, confidence: 0.84, cause: 'CMP Non-uniformity', affectedCount: 9  },
    { id: 'cl-3', cx: 10, cy: 11, radius: 1.2, confidence: 0.76, cause: 'Random Defect',      affectedCount: 5  },
  ],
  summary: {
    passCount: heatmapDies.filter(d => d.bin === 1).length,
    failCount: heatmapDies.filter(d => d.bin !== 1).length,
    yieldPct: 93.7,
    avgCost: 58.42,
  },
};

// ── Pattern Cost Table ─────────────────────────────────────────────────────────
const domains   = ['SCAN_CHAIN','ATPG_STUCK_AT','ATPG_TRANSITION','MBIST','LBIST','BIST','IDDQ'];
const faults    = ['STUCK_AT','TRANSITION','BRIDGE','CELL_AWARE','PATH_DELAY','IDDQ'];
const recs: PatternRow['recommendation'][] = ['KEEP','OPTIMIZE','ELIMINATE'];

function generatePattern(i: number): PatternRow {
  const domain = domains[i % domains.length];
  const roi    = Math.floor(20 + Math.random() * 80);
  return {
    id:            `pat-${i.toString().padStart(4,'0')}`,
    patternName:   `${domain.toLowerCase().replace(/_/g,'-')}-${(i+1).toString().padStart(3,'0')}`,
    domain,
    execTimeMs:    800 + Math.random() * 8000,
    costPerWafer:  2 + Math.random() * 28,
    detectPower:   0.5 + Math.random() * 0.5,
    redundancy:    Math.random() * 0.8,
    roiScore:      roi,
    recommendation: roi > 65 ? 'KEEP' : roi > 35 ? 'OPTIMIZE' : 'ELIMINATE',
    faultClass:    faults[Math.floor(Math.random() * faults.length)],
  };
}

export const mockPatterns: PatternRow[] = Array.from({length: 150}, (_, i) => generatePattern(i));

export const mockPatternCostPage1: PatternCostResponse = {
  data:     mockPatterns.slice(0, 50),
  total:    150,
  page:     1,
  pageSize: 50,
  hasMore:  true,
};

// ── Cost Trend ─────────────────────────────────────────────────────────────────
function generateTrendSeries(days: number): TrendPoint[] {
  const pts: TrendPoint[] = [];
  let cost = 75;
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    cost = cost + (Math.random() - 0.55) * 2;
    cost = Math.max(45, Math.min(95, cost));
    pts.push({
      date:           d.toISOString().split('T')[0],
      actualCost:     parseFloat(cost.toFixed(2)),
      projectedCost:  i < 3 ? parseFloat((cost * 0.97).toFixed(2)) : null,
      yieldPct:       88 + Math.random() * 8,
      testCount:      1800 + Math.floor(Math.random() * 400),
    });
  }
  return pts;
}

export const mockCostTrend: CostTrendResponse = {
  granularity: 'daily',
  series:      generateTrendSeries(30),
  baseline:    75,
  currentAvg:  58.42,
  improvement: 16.3,
};

// ── Optimization Job ──────────────────────────────────────────────────────────
export const mockOptimizationComplete: OptimizationJob = {
  jobId:       'job-001',
  status:      'complete',
  progress:    100,
  startedAt:   new Date(Date.now() - 58000).toISOString(),
  estimatedMs: 60000,
  results: {
    jobId:             'job-001',
    status:            'complete',
    totalSavings:      3820,
    timeReduction:     4200,
    yieldImpact:       1.7,
    patternsAnalyzed:  150,
    patternsOptimized: 47,
    entries: [
      { patternId:'pat-0011', patternName:'atpg-stuck-at-012', action:'REMOVE',  costSaving:420, timeReduction:1800, yieldImpact: 0.1, confidence:0.93 },
      { patternId:'pat-0023', patternName:'iddq-024',          action:'REMOVE',  costSaving:380, timeReduction:900,  yieldImpact:-0.0, confidence:0.88 },
      { patternId:'pat-0045', patternName:'mbist-046',         action:'REPLACE', costSaving:210, timeReduction:600,  yieldImpact: 0.3, confidence:0.79 },
      { patternId:'pat-0067', patternName:'scan-chain-068',    action:'KEEP',    costSaving:  0, timeReduction:  0,  yieldImpact: 0.8, confidence:0.97 },
      { patternId:'pat-0089', patternName:'lbist-090',         action:'REPLACE',costSaving:145, timeReduction:400,  yieldImpact: 0.2, confidence:0.82 },
    ],
    completedAt: new Date().toISOString(),
  },
};
