'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatCurrency, formatPercent, formatMs, formatNumber } from '@/lib/utils';
import type { KpiMetric } from '@/types/dashboard.types';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconBarChart,
  IconActivity,
  IconDollar,
  IconClock,
  IconShield,
  IconTarget,
} from '@/components/ui/Icons';

interface KPICardProps {
  metric:    KpiMetric;
  loading?:  boolean;
  animDelay?: number;
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; });
  return ref.current;
}

function formatValue(metric: KpiMetric): string {
  switch (metric.format) {
    case 'currency': return formatCurrency(metric.value, true);
    case 'percent':  return formatPercent(metric.value);
    case 'ms':       return formatMs(metric.value);
    case 'count':    return formatNumber(metric.value, true);
    default:         return metric.formatted;
  }
}

const ACCENT_VARS: Record<string, string> = {
  'accent-blue':   'var(--accent-blue)',
  'accent-cyan':   'var(--accent-cyan)',
  'accent-purple': 'var(--accent-purple)',
  'accent-green':  'var(--accent-green)',
  'accent-amber':  'var(--accent-amber)',
  'accent-pink':   'var(--accent-pink)',
  'accent-red':    'var(--accent-red)',
};

// Map accent color → icon component
function MetricIcon({ colorAccent, size = 15 }: { colorAccent?: string; size?: number }) {
  const props = { size };
  switch (colorAccent) {
    case 'accent-green':  return <IconShield {...props} />;
    case 'accent-cyan':   return <IconActivity {...props} />;
    case 'accent-purple': return <IconBarChart {...props} />;
    case 'accent-amber':  return <IconTarget {...props} />;
    case 'accent-red':    return <IconClock {...props} />;
    case 'accent-pink':   return <IconBarChart {...props} />;
    default:              return <IconDollar {...props} />;
  }
}

export function KPICard({ metric, loading = false, animDelay = 0 }: KPICardProps) {
  const [animated, setAnimated] = useState(false);
  const prevValue = usePrevious(metric.value);
  const changed   = prevValue !== undefined && prevValue !== metric.value;
  const accent    = ACCENT_VARS[metric.colorAccent ?? 'accent-blue'] ?? 'var(--accent-blue)';

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), animDelay);
    return () => clearTimeout(t);
  }, [animDelay]);

  if (loading) {
    return (
      <div className="card-premium rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="shimmer h-9 w-9 rounded-xl" />
          <div className="shimmer h-2.5 w-14 rounded-full" />
        </div>
        <div className="shimmer mb-2 h-2 w-20 rounded-full" />
        <div className="shimmer mb-2 h-7 w-28 rounded-lg" />
        <div className="shimmer h-1.5 w-full rounded-full" />
      </div>
    );
  }

  const isNegative = metric.delta < 0;
  const deltaGood  = metric.format === 'currency' || metric.format === 'ms' || metric.id === 'fail-count'
    ? isNegative
    : !isNegative;

  const trendIcon = metric.trend === 'flat'
    ? null
    : deltaGood
      ? <IconTrendingDown size={10} />
      : <IconTrendingUp size={10} />;

  return (
    <div
      className={cn(
        'card group relative overflow-hidden rounded-2xl p-4 transition-all duration-300',
        animated ? 'fade-in-up opacity-100' : 'opacity-0',
      )}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Top accent glow bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-80 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* Left accent stripe */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl opacity-70 group-hover:opacity-100 transition-opacity"
        style={{ background: accent }}
      />

      {/* Radial hover glow */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(circle at 15% 30%, ${accent}18, transparent 60%)` }}
      />

      <div className="relative pl-2">
        {/* Icon + trend badge */}
        <div className="mb-3 flex items-center justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110"
            style={{
              background: `${accent}16`,
              color: accent,
              boxShadow: `0 0 0 1px ${accent}22`,
            }}
          >
            <MetricIcon colorAccent={metric.colorAccent} size={15} />
          </div>

          {/* Trend badge */}
          {metric.trend !== 'flat' && (
            <span
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold',
                deltaGood
                  ? 'bg-[var(--accent-green)]/12 text-[var(--accent-green)] ring-1 ring-[var(--accent-green)]/20'
                  : 'bg-[var(--accent-red)]/12 text-[var(--accent-red)] ring-1 ring-[var(--accent-red)]/20',
              )}
            >
              {trendIcon}
              {metric.deltaFormatted}
            </span>
          )}
          {metric.trend === 'flat' && (
            <span className="text-[9px] text-[var(--tx-muted)] font-mono opacity-50">—</span>
          )}
        </div>

        {/* Label */}
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--tx-muted)]">
          {metric.label}
        </p>

        {/* Value — larger, accent coloured */}
        <p
          className={cn(
            'font-display text-[22px] font-bold leading-tight tracking-tight transition-all',
            changed && 'count-up',
          )}
          style={{ color: accent }}
        >
          {formatValue(metric)}
        </p>

        {/* Sparkline bar + sub-label */}
        <div className="mt-2 space-y-1">
          {/* Mini progress bar indicating trend magnitude */}
          <div className="h-1 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(Math.abs(metric.delta) * 8, 100)}%`,
                background: deltaGood ? 'var(--accent-green)' : 'var(--accent-red)',
                opacity: 0.7,
              }}
            />
          </div>
          <p className="text-[9px] text-[var(--tx-muted)] opacity-60">vs last week</p>
        </div>
      </div>
    </div>
  );
}
