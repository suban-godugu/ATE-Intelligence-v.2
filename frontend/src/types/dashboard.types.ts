// ─── Dashboard TypeScript Types ───────────────────────────────────────────────

// ── KPI / Summary ─────────────────────────────────────────────────────────────

export interface KpiMetric {
  id: string;
  label: string;
  value: number;
  formatted: string;
  delta: number;          // percentage change vs prior period
  deltaFormatted: string;
  trend: 'up' | 'down' | 'flat';
  format: 'currency' | 'percent' | 'ms' | 'number' | 'count';
  unit?: string;
  icon?: string;
  colorAccent?: string;   // CSS variable name e.g. "accent-blue"
}

export interface SummaryResponse {
  fabId: string;
  fabName: string;
  periodStart: string;   // ISO
  periodEnd: string;     // ISO
  metrics: KpiMetric[];
  alertCount: number;
  lastUpdatedAt: string;
}

// ── Wafer Heatmap ──────────────────────────────────────────────────────────────

export type HeatmapColorMode = 'cost' | 'bin' | 'failType';

export interface DieCell {
  x: number;
  y: number;
  dieId: string;
  bin: number;
  cost: number;
  testTime: number;       // ms
  failType?: string;
  yieldScore: number;     // 0–100
  inWafer: boolean;
  clusterIds: string[];
}

export interface Cluster {
  id: string;
  cx: number;
  cy: number;
  radius: number;
  confidence: number;     // 0–1
  cause: string;
  affectedCount: number;
}

export interface HeatmapResponse {
  lotId: string;
  waferId: string;
  waferIndex: number;
  rows: number;
  cols: number;
  dies: DieCell[];
  clusters: Cluster[];
  summary: {
    passCount: number;
    failCount: number;
    yieldPct: number;
    avgCost: number;
  };
}

// ── Pattern Cost Table ─────────────────────────────────────────────────────────

export interface PatternRow {
  id: string;
  patternName: string;
  domain: string;
  execTimeMs: number;
  costPerWafer: number;
  detectPower: number;    // 0–1
  redundancy: number;     // 0–1
  roiScore: number;       // 0–100
  recommendation: 'KEEP' | 'OPTIMIZE' | 'ELIMINATE';
  faultClass: string;
}

export interface PatternCostResponse {
  data: PatternRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Cost Trend ─────────────────────────────────────────────────────────────────

export type TrendGranularity = 'daily' | 'weekly';

export interface TrendPoint {
  date: string;           // ISO date string
  actualCost: number;
  projectedCost: number | null;
  yieldPct: number;
  testCount: number;
}

export interface CostTrendResponse {
  granularity: TrendGranularity;
  series: TrendPoint[];
  baseline: number;
  currentAvg: number;
  improvement: number;    // pct vs baseline
}

// ── Lots ───────────────────────────────────────────────────────────────────────

export type LotStatus = 'IN_PROCESS' | 'COMPLETE' | 'ON_HOLD' | 'SCRAPPED';

export interface Lot {
  id: string;
  lotNumber: string;
  product: string;
  fabId: string;
  status: LotStatus;
  waferCount: number;
  startedAt: string;
  completedAt?: string;
  yieldPct?: number;
  totalCost?: number;
}

export interface LotContext {
  lot: Lot;
  totalDies: number;
  failDies: number;
  avgTestTimeMs: number;
  dominantFaultClass: string;
}

// ── Optimizer ─────────────────────────────────────────────────────────────────

export interface OptimizeRequest {
  lotId?: string;
  fabId?: string;
  constraints: {
    maxCostPerWafer: number;    // USD
    yieldTarget: number;         // 0–100
    maxTestTimeMs: number;       // ms
  };
}

export type OptimizationStatus = 'idle' | 'pending' | 'processing' | 'complete' | 'failed';

export interface OptimizedPatternEntry {
  patternId: string;
  patternName: string;
  action: 'KEEP' | 'REMOVE' | 'REPLACE';
  costSaving: number;
  timeReduction: number;  // ms
  yieldImpact: number;    // pct change
  confidence: number;     // 0–1
}

export interface OptimizationResults {
  jobId: string;
  status: OptimizationStatus;
  totalSavings: number;
  timeReduction: number;  // ms
  yieldImpact: number;
  patternsAnalyzed: number;
  patternsOptimized: number;
  entries: OptimizedPatternEntry[];
  completedAt?: string;
}

export interface OptimizationJob {
  jobId: string;
  status: OptimizationStatus;
  progress: number;       // 0–100
  startedAt: string;
  estimatedMs: number;
  results?: OptimizationResults;
}

// ── Dashboard Context ──────────────────────────────────────────────────────────

export type DateRangePreset = '24h' | '7d' | '30d' | '90d';

export interface DateRange {
  preset: DateRangePreset;
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  activeLotId: string | null;
  activeFabId: string | null;
  dateRange: DateRange;
  autoRefresh: boolean;
}

export interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardState extends DashboardFilters {
  lastUpdatedAt: Date | null;
  alerts: AlertItem[];
  sidebarCollapsed: boolean;
}

// ── WebSocket Messages ─────────────────────────────────────────────────────────

export type WsMessageType =
  | 'PING'
  | 'PONG'
  | 'SUBSCRIBED'
  | 'KPI_UPDATE'
  | 'HEATMAP_UPDATE'
  | 'LOT_STATUS_CHANGE'
  | 'ALERT_FIRED'
  | 'JOB_PROGRESS';

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  timestamp: string;
}

export interface KpiUpdatePayload  { metrics: KpiMetric[] }
export interface HeatmapUpdatePayload { lotId: string; waferId: string }
export interface LotStatusChangePayload { lotId: string; newStatus: LotStatus }
export interface AlertFiredPayload { alert: AlertItem }
export interface JobProgressPayload { jobId: string; progress: number; status: OptimizationStatus }
