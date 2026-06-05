// Mock data for the Pattern Analysis Platform
// In production this would come from the NestJS API at /dashboard/pattern-analysis/*

export const DOMAINS = ['SCAN_CHAIN', 'ATPG_TRANSITION', 'ATPG_STUCK_AT', 'MBIST', 'LBIST', 'BIST', 'IDDQ', 'BSCA'];
export const FAULT_CLASSES = ['STUCK_AT', 'TRANSITION', 'CELL_AWARE', 'IDDQ', 'BRIDGE', 'PATH_DELAY'];

export const overviewData = {
  totalAnalyses: 1284,
  overallCoveragePct: 94.7,
  totalFaults: 2840000,
  totalCovered: 2688480,
  totalPass: 1189,
  totalFail: 95,
  passRate: 92.6,
  domains: [
    { domain: 'SCAN_CHAIN',     avgCoveragePct: 97.2, totalPatterns: 420000, faultsCovered: 408240, faultsDetected: 380000, faultsUntested: 11760, passCount: 189, failCount: 11, executionTimeMs: 48200 },
    { domain: 'ATPG_TRANSITION', avgCoveragePct: 95.1, totalPatterns: 380000, faultsCovered: 361380, faultsDetected: 340000, faultsUntested: 18620, passCount: 178, failCount: 12, executionTimeMs: 62400 },
    { domain: 'ATPG_STUCK_AT',  avgCoveragePct: 98.4, totalPatterns: 520000, faultsCovered: 511680, faultsDetected: 495000, faultsUntested: 8320, passCount: 220, failCount: 6, executionTimeMs: 55100 },
    { domain: 'MBIST',          avgCoveragePct: 93.8, totalPatterns: 280000, faultsCovered: 262640, faultsDetected: 244000, faultsUntested: 17360, passCount: 198, failCount: 22, executionTimeMs: 38700 },
    { domain: 'LBIST',          avgCoveragePct: 91.2, totalPatterns: 220000, faultsCovered: 200640, faultsDetected: 186000, faultsUntested: 19360, passCount: 164, failCount: 18, executionTimeMs: 29300 },
    { domain: 'BIST',           avgCoveragePct: 89.6, totalPatterns: 180000, faultsCovered: 161280, faultsDetected: 148000, faultsUntested: 18720, passCount: 142, failCount: 15, executionTimeMs: 22100 },
    { domain: 'IDDQ',           avgCoveragePct: 96.3, totalPatterns: 160000, faultsCovered: 154080, faultsDetected: 144000, faultsUntested: 5920, passCount: 68, failCount: 8, executionTimeMs: 17800 },
    { domain: 'BSCA',           avgCoveragePct: 88.2, totalPatterns: 80000,  faultsCovered: 70560,  faultsDetected: 63000, faultsUntested: 9440, passCount: 30, failCount: 3, executionTimeMs: 9200 },
  ],
};

export const failAnalysisData = {
  totalFailures: 95,
  faultClassBreakdown: [
    { faultClass: 'STUCK_AT',   failCount: 28, detectedFaults: 12400, avgSeverity: 2.1 },
    { faultClass: 'TRANSITION', failCount: 22, detectedFaults: 9800,  avgSeverity: 2.8 },
    { faultClass: 'CELL_AWARE', failCount: 18, detectedFaults: 7200,  avgSeverity: 3.4 },
    { faultClass: 'IDDQ',       failCount: 12, detectedFaults: 4300,  avgSeverity: 3.9 },
    { faultClass: 'BRIDGE',     failCount: 10, detectedFaults: 3100,  avgSeverity: 4.2 },
    { faultClass: 'PATH_DELAY', failCount: 5,  detectedFaults: 1800,  avgSeverity: 4.8 },
  ],
  failSites: Array.from({ length: 50 }, (_, i) => ({
    id: `fs-${i}`,
    dieX: Math.floor(Math.random() * 20) - 10,
    dieY: Math.floor(Math.random() * 20) - 10,
    waferId: `WAF-0${Math.floor(i / 10) + 1}`,
    faultClass: FAULT_CLASSES[i % FAULT_CLASSES.length],
    cycleCount: 1000 + Math.floor(Math.random() * 9000),
    failAddress: `0x${Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`,
    severity: 1 + Math.floor(Math.random() * 5),
    domain: DOMAINS[i % DOMAINS.length],
    patternCoverage: 88 + Math.random() * 10,
  })),
};

export const coverageData = {
  overallAvgCoverage: 94.7,
  coverageByType: [
    { coverageType: 'FAULT_COVERAGE',  avgAchieved: 94.7, avgTarget: 98.0, avgGap: 3.3, totalFaults: 1200000, totalCovered: 1136640 },
    { coverageType: 'TOGGLE_COVERAGE', avgAchieved: 91.2, avgTarget: 95.0, avgGap: 3.8, totalFaults: 840000,  totalCovered: 766080 },
    { coverageType: 'STRUCTURAL',      avgAchieved: 97.8, avgTarget: 99.0, avgGap: 1.2, totalFaults: 620000,  totalCovered: 606360 },
    { coverageType: 'FUNCTIONAL',      avgAchieved: 88.4, avgTarget: 92.0, avgGap: 3.6, totalFaults: 380000,  totalCovered: 335920 },
    { coverageType: 'TRANSITION',      avgAchieved: 95.1, avgTarget: 97.5, avgGap: 2.4, totalFaults: 560000,  totalCovered: 532560 },
  ],
  coverageTimeline: Array.from({ length: 24 }, (_, i) => ({
    analyzedAt: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    domain: DOMAINS[i % 5],
    coveragePct: 88 + Math.sin(i / 3) * 5 + Math.random() * 2,
  })),
};

export const scanChainData = {
  totalChains: 128,
  failedChains: 7,
  avgPassRate: 97.8,
  chains: Array.from({ length: 32 }, (_, i) => ({
    id: `sc-${i}`,
    chainId: `CHAIN_${String(i + 1).padStart(3, '0')}`,
    chainLength: 512 + i * 64,
    shiftCycles: 512 + i * 64,
    captureWindows: 4 + (i % 4),
    passRate: i < 3 ? 60 + Math.random() * 30 : 95 + Math.random() * 5,
    cellsFailed: i < 3 ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 5),
    cellsPassed: 512 + i * 64 - (i < 3 ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 5)),
    stitchedBridges: i < 2 ? Math.floor(Math.random() * 3) : 0,
    analyzedAt: new Date(Date.now() - i * 3600000).toISOString(),
  })),
};

export const mbistData = {
  totalMemories: 64,
  failedMemories: 9,
  passRate: 85.9,
  avgCoverage: 93.8,
  byAlgorithm: [
    { algorithm: 'MARCH C-', instanceCount: 28, totalPass: 24, totalFail: 4, avgCoverage: 95.2 },
    { algorithm: 'MATS++',   instanceCount: 22, totalPass: 19, totalFail: 3, avgCoverage: 93.7 },
    { algorithm: 'GALPAT',   instanceCount: 14, totalPass: 12, totalFail: 2, avgCoverage: 91.4 },
  ],
  results: Array.from({ length: 20 }, (_, i) => ({
    id: `mbist-${i}`,
    memoryCellId: `MEM_CELL_${String(i + 1).padStart(3, '0')}`,
    algorithm: ['MARCH C-', 'MATS++', 'GALPAT'][i % 3],
    wordLines: 256 * (1 + (i % 4)),
    bitLines: 128 * (1 + (i % 3)),
    retentionTimeMs: 100 + Math.random() * 400,
    passCount: 200 + Math.floor(Math.random() * 100),
    failCount: i < 9 ? Math.floor(Math.random() * 20) : 0,
    coveragePct: 88 + Math.random() * 10,
    testedAt: new Date(Date.now() - i * 3600000).toISOString(),
  })),
};

export const lbistData = {
  totalBlocks: 48,
  failedBlocks: 6,
  passRate: 87.5,
  avgCoverage: 91.2,
  results: Array.from({ length: 20 }, (_, i) => ({
    id: `lbist-${i}`,
    logicBlockId: `LOGIC_BLK_${String(i + 1).padStart(3, '0')}`,
    seedValue: `0x${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0')}`,
    clockCycles: 10000 + Math.floor(Math.random() * 40000),
    signaturePassed: i >= 6,
    coveragePct: 85 + Math.random() * 12,
    testedAt: new Date(Date.now() - i * 3600000).toISOString(),
  })),
};

export const bistData = {
  totalTests: 192,
  byType: [
    { bistType: 'MBIST', instanceCount: 64, totalPass: 55, totalFail: 9, avgCoverage: 93.8, totalDurationMs: 128400 },
    { bistType: 'LBIST', instanceCount: 48, totalPass: 42, totalFail: 6, avgCoverage: 91.2, totalDurationMs: 87600 },
    { bistType: 'ABIST', instanceCount: 80, totalPass: 74, totalFail: 6, avgCoverage: 96.1, totalDurationMs: 64200 },
  ],
  results: Array.from({ length: 24 }, (_, i) => ({
    id: `bist-${i}`,
    bistType: ['MBIST', 'LBIST', 'ABIST'][i % 3],
    blockId: `BLK_${String(i + 1).padStart(3, '0')}`,
    testMode: ['NORMAL', 'FAST', 'DEEP'][i % 3],
    passCount: 100 + Math.floor(Math.random() * 200),
    failCount: i < 8 ? Math.floor(Math.random() * 15) : 0,
    coveragePct: 88 + Math.random() * 10,
    durationMs: 1000 + Math.random() * 4000,
    testedAt: new Date(Date.now() - i * 3600000).toISOString(),
  })),
};

export const redundancyData = {
  total: 512,
  repaired: 87,
  available: 398,
  depleted: 27,
  utilizationPct: 17.0,
  byType: [
    { redundancyType: 'COLUMN', total: 128, repaired: 22, available: 98, utilizationPct: 17.2 },
    { redundancyType: 'ROW',    total: 128, repaired: 28, available: 96, utilizationPct: 21.9 },
    { redundancyType: 'WORD',   total: 96,  repaired: 18, available: 74, utilizationPct: 18.8 },
    { redundancyType: 'BIT',    total: 80,  repaired: 12, available: 66, utilizationPct: 15.0 },
    { redundancyType: 'LOCAL',  total: 48,  repaired: 5,  available: 42, utilizationPct: 10.4 },
    { redundancyType: 'GLOBAL', total: 32,  repaired: 2,  available: 22, utilizationPct: 6.3  },
  ],
  elements: Array.from({ length: 50 }, (_, i) => ({
    id: `red-${i}`,
    waferId: `WAF-0${Math.floor(i / 10) + 1}`,
    dieX: Math.floor(Math.random() * 10),
    dieY: Math.floor(Math.random() * 10),
    redundancyType: ['COLUMN', 'ROW', 'WORD', 'BIT', 'LOCAL', 'GLOBAL'][i % 6],
    address: i * 4,
    repaired: i < 20,
    repairAddress: i < 20 ? (i * 4 + 512) : null,
    faultCount: i < 20 ? 1 + Math.floor(Math.random() * 3) : 0,
    available: i >= 20 || i < 15,
    analyzedAt: new Date(Date.now() - i * 3600000).toISOString(),
  })),
};
