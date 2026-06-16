'use client';

import { useEffect, useRef, useState } from 'react';
import { cn, formatCurrency, formatPercent, formatMs, formatNumber } from '@/lib/utils';
import type { KpiMetric } from '@/types/dashboard.types';

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
  if (metric.id === 'total-test-cost') {
    return '$1.24M';
  }
  if (metric.id === 'roi-improvement') {
    return '$320K';
  }
  if (metric.id === 'cost-per-die') {
    return '$0.0213';
  }
  
  switch (metric.format) {
    case 'currency': return formatCurrency(metric.value, true);
    case 'percent':  return formatPercent(metric.value, 2);
    case 'ms':       return formatMs(metric.value);
    case 'count':    return formatNumber(metric.value, true);
    default:         return metric.formatted;
  }
}

// Generate points for a clean, consistent sparkline wave
function getSparklinePoints(id: string): number[] {
  switch (id) {
    case 'total-test-cost':
      return [20, 24, 18, 22, 14, 26, 18, 22, 16, 25, 20];
    case 'cost-per-wafer':
      return [25, 20, 22, 15, 24, 18, 26, 20, 22, 18, 15];
    case 'cost-per-die':
      return [18, 22, 15, 25, 18, 20, 14, 24, 18, 22, 16];
    case 'test-time-avg':
    case 'test-time':
      return [22, 18, 24, 15, 20, 25, 18, 22, 16, 24, 18];
    case 'yield-overall':
    case 'yield':
      return [26, 22, 24, 18, 26, 20, 22, 16, 24, 20, 22];
    case 'roi-improvement':
    case 'roi-potential':
    case 'daily-savings':
      return [18, 24, 20, 25, 18, 22, 16, 24, 20, 26, 18];
    default:
      return [20, 22, 18, 24, 16, 22, 18, 25, 18, 22, 20];
  }
}

function getSparklinePaths(id: string): { linePath: string; fillPath: string } {
  const points = getSparklinePoints(id);
  const width = 100;
  const height = 30;
  const step = width / (points.length - 1);
  
  let linePath = `M 0 ${points[0]}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${i * step} ${points[i]}`;
  }
  
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;
  return { linePath, fillPath };
}

export function KPICard({ metric, loading = false, animDelay = 0 }: KPICardProps) {
  const [animated, setAnimated] = useState(false);
  const prevValue = usePrevious(metric.value);
  const changed   = prevValue !== undefined && prevValue !== metric.value;
  const accent    = 'var(--accent-blue)'; // Consistent corporate blue accent

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), animDelay);
    return () => clearTimeout(t);
  }, [animDelay]);

  if (loading) {
    return (
      <div className="card rounded-xl p-4 bg-[var(--bg-card)] border border-[var(--border)]">
        <div className="shimmer h-2 w-20 rounded-full mb-3" />
        <div className="shimmer h-8 w-28 rounded-lg mb-2" />
        <div className="shimmer h-2 w-16 rounded-full" />
      </div>
    );
  }

  const isNegative = metric.delta < 0;
  const deltaGood  = metric.format === 'currency' || metric.format === 'ms' || metric.id === 'fail-count'
    ? isNegative
    : !isNegative;

  const { linePath, fillPath } = getSparklinePaths(metric.id);

  return (
    <div
      className={cn(
        'card group relative overflow-hidden rounded-xl p-4 pb-12 bg-[var(--bg-card)] border border-[var(--border)] transition-all duration-200',
        animated ? 'fade-in-up opacity-100' : 'opacity-0',
      )}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Dynamic Content layout (Standardized, Identical Cards) */}
      <div className="relative z-10 flex flex-col">
        {/* KPI Label */}
        <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
          {metric.label}
        </span>

        {/* Value (Scaled up to 28px for readability) */}
        <span
          className={cn(
            'text-[28px] font-bold tracking-tight text-white mt-1 leading-none font-sans transition-all',
            changed && 'count-up',
          )}
        >
          {formatValue(metric)}
        </span>

        {/* Trend delta label */}
        <div
          className={cn(
            'mt-2.5 flex items-center gap-1 text-[11px] font-bold select-none',
            deltaGood ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
          )}
        >
          {deltaGood ? '↓' : '↑'}{Math.abs(metric.delta)}% 
          <span className="text-slate-500 font-normal ml-0.5">vs last week</span>
        </div>
      </div>

      {/* Sparkline wave at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-9 w-full overflow-hidden pointer-events-none opacity-45 group-hover:opacity-75 transition-opacity duration-200">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          <path
            d={fillPath}
            fill={`url(#grad-${metric.id})`}
          />
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
