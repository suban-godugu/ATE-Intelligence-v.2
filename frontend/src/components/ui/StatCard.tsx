'use client';
import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'pink';
  trend?: { value: number; label: string };
  className?: string;
}

const colorMap = {
  blue:   { border: 'border-blue-500/20',   text: 'text-blue-400',   glow: 'shadow-blue-500/10' },
  cyan:   { border: 'border-cyan-500/20',   text: 'text-cyan-400',   glow: 'shadow-cyan-500/10' },
  purple: { border: 'border-purple-500/20', text: 'text-purple-400', glow: 'shadow-purple-500/10' },
  green:  { border: 'border-emerald-500/20', borderGreen: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
  amber:  { border: 'border-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/10' },
  red:    { border: 'border-red-500/20',     text: 'text-red-400',   glow: 'shadow-red-500/10' },
  pink:   { border: 'border-pink-500/20',  text: 'text-pink-400',  glow: 'shadow-pink-500/10' },
};

export function StatCard({ title, value, subtitle, color = 'blue', trend, className }: StatCardProps) {
  const c = colorMap[color] as any;
  return (
    <div
      className={clsx(
        'card relative overflow-hidden p-5',
        'hover:scale-[1.02]',
        c.border,
        c.glow,
        'shadow-lg',
        className,
      )}
    >
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className={clsx('mt-1.5 text-2xl font-bold tabular-nums', c.text)}>{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          {trend && (
            <div className={clsx('mt-2 flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

