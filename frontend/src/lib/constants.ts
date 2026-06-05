// ─── Constants ────────────────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const WS_HOST =
  process.env.NEXT_PUBLIC_WS_HOST ?? 'ws://localhost:3001';

export const WS_PATH = '/ws/dashboard';

export const QUERY_STALE_TIMES = {
  summary:     30_000,   // 30 s
  heatmap:    300_000,   // 5 min
  patterns:   300_000,   // 5 min
  trend:       60_000,   // 1 min
  lots:        15_000,   // 15 s
} as const;

export const DATE_RANGE_PRESETS = {
  '24h': { label: 'Last 24 h', days: 1   },
  '7d':  { label: 'Last 7 d',  days: 7   },
  '30d': { label: 'Last 30 d', days: 30  },
  '90d': { label: 'Last 90 d', days: 90  },
} as const;

export const OPTIMIZER_POLL_INTERVAL_MS = 2_000;
export const OPTIMIZER_MAX_POLLS        = 30;

export const PATTERN_PAGE_SIZE = 50;

export const WS_RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];
export const WS_HEARTBEAT_TIMEOUT_MS = 90_000;

export const LOT_STATUS_COLORS: Record<string, string> = {
  IN_PROCESS: '#10b981',
  COMPLETE:   '#3b82f6',
  ON_HOLD:    '#f59e0b',
  SCRAPPED:   '#ef4444',
};

export const RECOMMENDATION_COLORS: Record<string, string> = {
  KEEP:      '#10b981',
  OPTIMIZE:  '#f59e0b',
  ELIMINATE: '#ef4444',
};
