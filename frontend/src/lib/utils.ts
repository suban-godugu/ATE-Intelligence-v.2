import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Class helper ──────────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Number formatters ─────────────────────────────────────────────────────────
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatMs(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1_000)  return `${(ms / 1_000).toFixed(2)} s`;
  return `${ms.toFixed(1)} ms`;
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

// ── Colour interpolation for heatmap ─────────────────────────────────────────
// t ∈ [0, 1]  → [green, amber, red] gradient
export function interpolateColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    // green (#10b981) → amber (#f59e0b)
    const tt = clamped / 0.5;
    const r = Math.round(16  + tt * (245 - 16));
    const g = Math.round(185 + tt * (158 - 185));
    const b = Math.round(129 + tt * (11  - 129));
    return `rgb(${r},${g},${b})`;
  } else {
    // amber (#f59e0b) → red (#ef4444)
    const tt = (clamped - 0.5) / 0.5;
    const r = Math.round(245 + tt * (239 - 245));
    const g = Math.round(158 + tt * (68  - 158));
    const b = Math.round(11  + tt * (68  - 11));
    return `rgb(${r},${g},${b})`;
  }
}

// ── Bin colors ────────────────────────────────────────────────────────────────
const BIN_PALETTE = ['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4'];
export function binColor(bin: number): string {
  return BIN_PALETTE[bin % BIN_PALETTE.length] ?? '#4b5880';
}

// ── Time helpers ──────────────────────────────────────────────────────────────
export function timeAgo(date: Date | string): string {
  const d    = typeof date === 'string' ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 5)   return 'just now';
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Clamp ─────────────────────────────────────────────────────────────────────
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
