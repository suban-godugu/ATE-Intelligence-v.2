'use client';
import { clsx } from 'clsx';

interface CoverageBarProps {
  label: string;
  value: number;
  target?: number;
  max?: number;
  color?: string;
  showValue?: boolean;
}

export function CoverageBar({ label, value, target, max = 100, color = '#3b82f6', showValue = true }: CoverageBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const targetPct = target ? Math.min((target / max) * 100, 100) : null;
  const status = target ? (value >= target ? 'met' : value >= target * 0.9 ? 'near' : 'miss') : null;

  return (
    <div className="space-y-2 py-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="font-medium text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {target && (
            <span className={clsx(
              'px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold border select-none leading-none',
              status === 'met' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                : status === 'near' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                  : 'bg-red-500/10 text-red-400 border-red-500/25'
            )}>
              {status === 'met' ? '✓' : status === 'near' ? '~' : '✗'} {target.toFixed(1)}%
            </span>
          )}
          {showValue && (
            <span className="font-mono font-bold text-slate-200">{value.toFixed(1)}%</span>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-950/60 border border-slate-850/30">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'cyan' | 'purple' | 'green' | 'amber' | 'red' | 'slate';
  size?: 'sm' | 'md';
}

const badgeColors = {
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.06)]',
  cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-[0_0_8px_rgba(6,182,212,0.06)]',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25 shadow-[0_0_8px_rgba(139,92,246,0.06)]',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.06)]',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_8px_rgba(245,158,11,0.06)]',
  red:    'bg-red-500/10 text-red-400 border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.06)]',
  slate:  'bg-slate-500/10 text-slate-400 border-slate-500/25 shadow-[0_0_8px_rgba(100,116,139,0.06)]',
};

export function Badge({ children, color = 'blue', size = 'sm' }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-md border font-extrabold tracking-wide uppercase font-mono select-none leading-none',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      badgeColors[color]
    )}>
      {children}
    </span>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between select-none">
      <div>
        <h3 className="text-sm font-bold text-white tracking-tight uppercase leading-none">{title}</h3>
        {subtitle && <p className="mt-1.5 text-xs text-slate-500 font-medium leading-none">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface TableProps {
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
  emptyText?: string;
}

export function DataTable({ headers, rows, emptyText = 'No data available' }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20 select-none">
      <table className="w-full text-xs text-left text-slate-350 border-collapse">
        <thead>
          <tr 
            className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-[11px] font-bold select-none">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-500 font-medium select-none">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                className={clsx(
                  'transition-all duration-150 text-[13px] text-slate-200',
                  i % 2 === 0 ? 'bg-slate-950/5' : 'bg-transparent',
                  'hover:bg-indigo-500/[0.06] hover:border-l-[3px] hover:border-l-indigo-500/80 cursor-pointer'
                )}
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
