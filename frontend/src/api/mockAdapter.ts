import MockAdapter from 'axios-mock-adapter';
import apiClient from './client';

// 500ms realistic mock response delay to simulate network latency
export const mock = new MockAdapter(apiClient, { delayResponse: 500 });

// Fallback logic so we only mock undefined routes or we mock these specifically
mock.onGet('/cost/summary').reply(200, {
  totalCost: 1248900,
  deltas: {
    totalCost: { value: 15000, direction: 'up', percent: 1.2 },
    costPerWafer: { value: 1.4, direction: 'down', percent: 0.5 },
    costPerDie: { value: 0.0003, direction: 'down', percent: 0.8 },
    testTimeAvg: { value: 380, direction: 'up', percent: 2.1 },
    yield: { value: 0.3, direction: 'up', percent: 0.3 }
  },
  costPerWafer: 284.70,
  costPerDie: 0.042,
  testTimeAvg: 18340,
  yield: 93.7,
  roiImprovement: 47200
});

mock.onGet('/cost/trend').reply(200, {
  days: Array.from({length: 30}).map(() => ({
    type: Math.random() > 0.8 ? 'spike' : Math.random() > 0.6 ? 'post-opt' : 'normal',
    heightPct: 30 + Math.random() * 60
  }))
});

mock.onGet('/cost/breakdown').reply(200, {
  categories: [
    { name: 'Test time', amount: 840000, pct: 67, color: 'var(--accent-blue)' },
    { name: 'Yield loss', amount: 280000, pct: 22, color: 'var(--accent-red)' },
    { name: 'Depreciation', amount: 128900, pct: 11, color: 'var(--accent-purple)' }
  ],
  testTypes: [
    { name: 'Scan Chain', pct: 45, color: '#534AB7', ms: 8200, cost: 0.018 },
    { name: 'ATPG', pct: 30, color: '#185FA5', ms: 5500, cost: 0.012 },
    { name: 'MBIST', pct: 15, color: '#1D9E75', ms: 2700, cost: 0.006 },
    { name: 'Other', pct: 10, color: '#854F0B', ms: 1940, cost: 0.006 }
  ],
  lots: [
    { id: 'LOT-001', fab: 'Fab A', totalCost: 12400, costPerDie: 0.041, testTimeMs: 18000, yield: 94, yieldLossUsd: 1200, topDriver: 'Scan chain' },
    { id: 'LOT-002', fab: 'Fab B', totalCost: 14200, costPerDie: 0.045, testTimeMs: 19500, yield: 88, yieldLossUsd: 3400, topDriver: 'Yield loss' },
    { id: 'LOT-003', fab: 'Fab C', totalCost: 11800, costPerDie: 0.038, testTimeMs: 16500, yield: 95, yieldLossUsd: 900, topDriver: 'ATPG time' },
  ]
});

mock.onGet('/cost/heatmap').reply(200, {
  grid: Array.from({length: 20}).map(() => Array.from({length: 20}).map(() => Math.floor(Math.random() * 8))),
  cells: Array.from({length: 20}).flatMap((_, x) => Array.from({length: 20}).map((_, y) => ({
    x,
    y,
    cost: parseFloat((100 + Math.random() * 400).toFixed(2)),
    normalized: parseFloat(Math.random().toFixed(2))
  }))),
  clusters: [
    { zone: 'Edge defect', cost: 0.082 },
    { zone: 'Center cluster', cost: 0.061 },
    { zone: 'Defect cluster', cost: 0.120 },
  ]
});

mock.onGet('/cost/patterns').reply(200, {
  total: 1284,
  patterns: Array.from({length: 5}).map((_, i) => ({
    id: `PT_${String(77+i).padStart(3,'0')}`,
    type: ['ATPG', 'MBIST', 'Scan'][Math.floor(Math.random()*3)],
    testTimeMs: 400 + Math.random()*800,
    costUsd: 0.001 + Math.random()*0.002,
    failRate: 1 + Math.random()*8,
    detectPct: 98 + Math.random()*2,
    power: ['High','Med','Low'][Math.floor(Math.random()*3)],
    roiScore: Math.random(),
    recommendation: ['Remove', 'Monitor', 'Keep'][Math.floor(Math.random()*3)]
  }))
});

mock.onPost('/cost/simulate').reply(200, {
  annualSaving: 214000,
  dieSaving: 0.0125,
  paybackMonths: 3.2,
  implementationCost: 45000,
  netRoi12mo: 169000
});

// Equipment Mocks
mock.onGet(/\/equipment\/fleet.*/).reply(200, {
  summary: { online: 24, maintenance: 3, fault: 1, avgUtil: 82, avgHealth: 91, faultsThisWeek: 4, mtbfHrs: 840, mttrHrs: 4.2 },
  testers: Array.from({length: 10}).map((_, i) => ({
    id: `ATE-${String(i+1).padStart(2,'0')}`,
    fab: ['Fab A', 'Fab B', 'Fab C'][Math.floor(Math.random()*3)],
    model: 'SmarTest 93000',
    status: i===6 ? 'fault' : i===4 ? 'maintenance' : i===2 ? 'warning' : 'online',
    healthScore: i===6 ? null : Math.floor(85 + Math.random()*15),
    temperature: i===6 ? 91 : Math.floor(45 + Math.random()*20),
    powerW: Math.floor(12000 + Math.random()*3000),
    uptimePct: Math.floor(92 + Math.random()*7),
    utilisation7d: Math.floor(70 + Math.random()*25)
  }))
});

mock.onGet('/equipment/utilisation').reply(200, {
  idleBreakdown: { plannedMaintenance: 120, unplannedFault: 42, queueWait: 34, calibration: 18, totalHrs: 214 },
  byFab: [
    { fab: 'Fab A', avgPct: 86 },
    { fab: 'Fab B', avgPct: 82 },
    { fab: 'Fab C', avgPct: 74 },
  ]
});

mock.onGet('/equipment/maintenance').reply(200, {
  scheduled: [
    { id: '1', testerId: 'ATE-05', fab: 'Fab B', taskType: 'Preventive', description: 'Monthly fluid replace', scheduledAt: 'Today', estimatedHours: 4, engineerName: 'J. Smith', status: 'inprogress' },
    { id: '2', testerId: 'ATE-07', fab: 'Fab C', taskType: 'Corrective', description: 'Thermal calib fault', scheduledAt: 'ASAP', estimatedHours: 8, engineerName: 'A. Chen', status: 'upcoming' },
  ],
  history: [
    { id: '3', testerId: 'ATE-01', fab: 'Fab A', taskType: 'Calibration', actualHours: 2, downtime: 2, engineerName: 'M. Patel', outcome: 'Passed calib' }
  ]
});

mock.onGet('/equipment/alerts').reply(200, {
  summary: { critical: 1, warning: 3, info: 12, resolvedToday: 5 },
  alerts: [
    { id: 'a1', testerId: 'ATE-07', fab: 'Fab C', severity: 'critical', message: 'Thermal calibration failure 0x4F' },
    { id: 'a2', testerId: 'ATE-03', fab: 'Fab A', severity: 'warning', message: 'Temperature approaching upper limit (61C)' }
  ]
});

// Lots - removed to allow real backend fetch
// mock.onGet('/lots').reply(200, {
//   data: [
//     { id: 'lot-001', lotNumber: 'LOT-2024-042', product: 'CHIP-7NM-HPC', tester: 'ATE-01', createdAt: new Date().toISOString(), _count: { patterns: 1284 } },
//   ]
// });

// ── Pattern Analysis Mocks ─────────────────────────────────────────────────
const DOMAINS = ['SCAN', 'MBIST', 'LBIST', 'IDDQ', 'FUNCTIONAL', 'AT_SPEED'];
const FAULT_CLASSES = ['STUCK_AT', 'TRANSITION', 'BRIDGE', 'CELL_AWARE'];

// Let the Next.js local dynamic API route handle /patterns to return the correct redesign schema
mock.onGet('/patterns').passThrough();
/*
mock.onGet('/patterns').reply(200, {
  data: Array.from({ length: 20 }).map((_, i) => ({
    id: `pat-${i}`,
    patternName: `${DOMAINS[i % DOMAINS.length].toLowerCase()}-${String(i + 1).padStart(3, '0')}`,
    domain: DOMAINS[i % DOMAINS.length],
    execTimeMs: 200 + Math.random() * 800,
    costPerWafer: 80 + Math.random() * 300,
    detectPower: 0.5 + Math.random() * 0.5,
    roiScore: Math.floor(20 + Math.random() * 80),
    recommendation: ['KEEP', 'OPTIMIZE', 'ELIMINATE'][Math.floor(Math.random() * 3)],
    faultClass: FAULT_CLASSES[Math.floor(Math.random() * FAULT_CLASSES.length)],
    failRate: Math.random() * 5,
  })),
  total: 1284,
});
*/

mock.onGet('/patterns/kpis').reply(200, {
  totalPatterns: 1284,
  faultCoverage: 94.7,
  atpgEfficiency: 87.3,
  totalTestTimeMs: 4820,
  failPatterns: 38,
  redundantPatterns: 12,
});

mock.onGet(/\/patterns\/.+\/analysis/).reply(200, {
  faultClasses: FAULT_CLASSES.map(fc => ({ name: fc, count: Math.floor(50 + Math.random() * 200) })),
  coveragePct: 90 + Math.random() * 9,
});

mock.onGet('/coverage').reply(200, {
  overall: 94.7, stuckAt: 94.2, transitionDelay: 89.1, cellAware: 91.4, bridgeIddq: 82.7,
  history: Array.from({ length: 14 }).map((_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
    coverage: 91 + Math.random() * 5,
  })),
});

mock.onGet('/scan-chains').reply(200, {
  chains: Array.from({ length: 8 }).map((_, i) => ({
    id: `SC-${i + 1}`, length: 1200 + Math.floor(Math.random() * 800),
    faultCoverage: 90 + Math.random() * 9, broken: Math.random() > 0.85,
  })),
  stats: { totalChains: 8, broken: 1, avgLength: 1540, coveragePct: 93.2 },
});

mock.onGet('/mbist').reply(200, {
  controllers: Array.from({ length: 6 }).map((_, i) => ({
    id: `MBIST-${i + 1}`, memType: ['SRAM', 'ROM', 'CAM'][i % 3],
    coverage: 88 + Math.random() * 11, faults: Math.floor(Math.random() * 20),
  })),
  totalCoverage: 92.4,
});

mock.onGet('/lbist').reply(200, {
  domains: Array.from({ length: 4 }).map((_, i) => ({
    id: `LBIST-D${i + 1}`, logicBlocks: 200 + Math.floor(Math.random() * 100),
    coverage: 85 + Math.random() * 12,
  })),
  totalCoverage: 89.1,
});

mock.onGet('/redundancy').reply(200, {
  redundantPatterns: Array.from({ length: 12 }).map((_, i) => ({
    id: `pat-r${i}`, patternName: `${DOMAINS[i % DOMAINS.length].toLowerCase()}-r${i}`,
    duplicateOf: `pat-${Math.floor(Math.random() * 20)}`,
    savingsMs: 50 + Math.floor(Math.random() * 200),
  })),
  totalCount: 12, totalSavingsMs: 1480,
});

mock.onGet('/optimization/kpis').reply(200, {
  pending_count: 3,
  high_priority_count: 3,
  projected_time_saving_pct: 48.2,
  projected_cost_reduction: 0.043,
  confidence_pct: 94,
  lots_analyzed: 1240,
});

mock.onGet('/optimization/pipeline-status').reply(200, {
  flow_optimizer_pct: 71,
  pattern_pruning_pct: 55,
  compression_pct: 88,
  yield_predictor_pct: 62,
});

mock.onGet('/optimization/recent-actions').reply(200, [
  { action: 'Flow reorder applied', module: 'Flow Optimizer', status: 'APPLIED', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { action: 'PT_041 removed', module: 'Pattern Pruning', status: 'APPLIED', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { action: '64x compression sim', module: 'Compression Tuner', status: 'PENDING', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { action: 'Yield threshold adj.', module: 'Yield Predictor', status: 'SIMULATED', timestamp: new Date(Date.now() - 172800000).toISOString() }
]);

mock.onGet('/optimization/ai-recommendations').reply(200, [
  {
    rank: 1,
    title: 'Apply 64x EDT compression',
    description: 'Estimated scan-in reduction with low chain imbalance risk.',
    impact_label: 'TIME_SAVING',
    impact_value: 'Save 1,240ms',
    prompt_text: 'Show me the full Compression Tuner spec and apply 64x upgrade'
  },
  {
    rank: 2,
    title: 'Remove 4 redundant patterns',
    description: 'Zero measured coverage loss on the last 3 lots.',
    impact_label: 'COST_REDUCTION',
    impact_value: 'Save $0.021/die',
    prompt_text: 'Show Pattern Pruning details for PT_038 to PT_041'
  },
  {
    rank: 3,
    title: 'Reorder flow: MBIST before ATPG',
    description: 'Reduces false fails on memory-heavy vector loads.',
    impact_label: 'YIELD_GAIN',
    impact_value: '+1.2% yield',
    prompt_text: 'Show me the Flow Optimizer reorder recommendation details'
  }
]);

mock.onGet('/ai/savings-estimate').reply(200, {
  estimatedAnnualSavings: 487200, costPerDieReduction: 0.0124, yieldImprovement: 2.1,
  implementationWeeks: 3,
});

mock.onGet('/savings-dashboard').reply(200, {
  totalSavings: 214800, costReduction: 18.4, timeReduction: 28, yieldImprovement: 1.2,
});

mock.onGet('/fabs').reply(200, {
  data: [
    { id: 'fab-001', name: 'All Fabs' },
    { id: 'fab-002', name: 'Fab Alpha' },
    { id: 'fab-003', name: 'Fab Beta' },
  ],
});

// Stateful mock co-optimizer job polling logic
const activeJobs = new Map<string, { id: string; progress: number; status: 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'FAILED'; startedAt: string }>();

mock.onPost('/optimizer/jobs').reply(() => {
  const jobId = `job-${Date.now()}`;
  const job = {
    jobId,
    status: 'QUEUED' as const,
    progress: 0,
    startedAt: new Date().toISOString(),
    estimatedMs: 30000,
  };
  activeJobs.set(jobId, { id: jobId, progress: 0, status: 'QUEUED', startedAt: job.startedAt });
  return [200, { data: job }];
});

mock.onGet(/\/optimizer\/jobs\/(.+)/).reply((config) => {
  const urlParts = config.url?.split('/') || [];
  const jobId = urlParts[urlParts.length - 1];
  const jobState = activeJobs.get(jobId);

  if (!jobState) {
    return [404, { message: 'Job not found' }];
  }

  // Simulate progress increment on each status poll
  if (jobState.status === 'QUEUED') {
    jobState.status = 'RUNNING';
    jobState.progress = 15;
  } else if (jobState.status === 'RUNNING') {
    jobState.progress = Math.min(100, jobState.progress + 15);
    if (jobState.progress >= 100) {
      jobState.status = 'COMPLETE';
    }
  }

  const results = jobState.status === 'COMPLETE' ? {
    jobId,
    status: 'complete' as const,
    totalSavings: 47200,
    timeReduction: 4820,
    yieldImpact: 1.7,
    patternsAnalyzed: 1284,
    patternsOptimized: 47,
    entries: [
      { patternId: 'pat-0011', patternName: 'atpg-stuck-at-012', action: 'REMOVE' as const, costSaving: 420, timeReduction: 1800, yieldImpact: 0.1, confidence: 0.93 },
      { patternId: 'pat-0023', patternName: 'iddq-024',          action: 'REMOVE' as const, costSaving: 380, timeReduction: 900,  yieldImpact: -0.0, confidence: 0.88 },
      { patternId: 'pat-0045', patternName: 'mbist-046',         action: 'REPLACE' as const, costSaving: 210, timeReduction: 600,  yieldImpact: 0.3, confidence: 0.79 }
    ]
  } : undefined;

  return [200, {
    data: {
      jobId,
      status: jobState.status,
      progress: jobState.progress,
      startedAt: jobState.startedAt,
      estimatedMs: 30000,
      results
    }
  }];
});

// Pass through all other requests so it doesn't break React Query things that might use different endpoints
mock.onAny().passThrough();
