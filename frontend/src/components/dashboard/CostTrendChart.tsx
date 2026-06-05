'use client';

import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';
import { useCostTrend } from '@/hooks/useCostTrend';
import { useDashboard } from '@/context/DashboardContext';
import type { TrendGranularity, TrendPoint } from '@/types/dashboard.types';
import { IconTrendingDown, IconTrendingUp, IconActivity, IconChevronDown } from '@/components/ui/Icons';

interface CustomTooltipProps {
  active?:  boolean;
  payload?: { name: string; value: number; color: string }[];
  label?:   string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--border-bright)] bg-[var(--bg-elevated)] p-3 text-xs shadow-2xl slide-down">
      <p className="mb-2 font-mono text-[var(--tx-muted)] border-b border-[var(--border)] pb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6 mt-1.5">
          <span className="flex items-center gap-1.5" style={{ color: p.color }}>
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono font-semibold text-[var(--tx-primary)]">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CostTrendChart() {
  const { state } = useDashboard();
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');
  const { data, isLoading } = useCostTrend(granularity, state.activeFabId, state.activeLotId);

  if (isLoading || !data) {
    return (
      <div className="card flex h-[380px] flex-col rounded-xl p-4">
        <div className="shimmer mb-4 h-4 w-28 rounded-full" />
        <div className="shimmer mb-3 h-3 w-20 rounded-full" />
        <div className="flex-1 shimmer rounded-xl" />
      </div>
    );
  }

  const formatted = data.series.map((p: TrendPoint) => ({
    ...p,
    dateLabel: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    // Add a cost-per-wafer series (slightly different from actualCost for visual)
    costPerWafer: p.actualCost * 0.004,
  }));

  const improvement = data.improvement;
  const isImproving = improvement > 0;

  return (
    <div className="card flex flex-col rounded-xl p-4 h-[380px]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]">
            <IconActivity size={13} />
          </div>
          <h2 className="text-sm font-semibold text-[var(--tx-primary)]">Cost Trend</h2>
          <span className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
            isImproving
              ? 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]'
              : 'bg-[var(--accent-red)]/12 text-[var(--accent-red)]',
          )}>
            {isImproving ? <IconTrendingDown size={10} /> : <IconTrendingUp size={10} />}
            {formatPercent(Math.abs(improvement))} vs baseline
          </span>
        </div>

        {/* Granularity dropdown */}
        <div className="relative">
          <select
            id="trend-granularity"
            value={granularity}
            onChange={e => setGranularity(e.target.value as TrendGranularity)}
            className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-card)] pl-2.5 pr-7 py-1 text-[11px] text-[var(--tx-secondary)] outline-none cursor-pointer hover:border-[var(--border-bright)] transition"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] font-mono text-[var(--tx-muted)]">▼</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 mt-1">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formatted} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.35} />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--tx-muted)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: 'var(--tx-muted)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: 'var(--tx-muted)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px', color: 'var(--tx-secondary)' }}
            />
            <ReferenceLine
              yAxisId="left"
              y={data.baseline}
              stroke="var(--tx-muted)"
              strokeDasharray="6 3"
              strokeWidth={1}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="actualCost"
              name="Total Cost (USD)"
              stroke="var(--accent-purple)"
              strokeWidth={2}
              dot={{ r: 2, fill: 'var(--accent-purple)', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: 'var(--accent-purple)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="costPerWafer"
              name="Cost Per Wafer (USD)"
              stroke="var(--accent-cyan)"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 2, fill: 'var(--accent-cyan)', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: 'var(--accent-cyan)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
