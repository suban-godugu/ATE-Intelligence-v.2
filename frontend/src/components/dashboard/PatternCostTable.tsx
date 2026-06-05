'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn, formatCurrency, formatMs, formatPercent } from '@/lib/utils';
import { usePatternCost } from '@/hooks/usePatternCost';
import { useDashboard } from '@/context/DashboardContext';
import type { PatternRow } from '@/types/dashboard.types';
import { IconBarChart, IconArrowUpRight } from '@/components/ui/Icons';

type SortKey = keyof PatternRow;
type SortDir = 'asc' | 'desc';

const COLS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'patternName',    label: 'Pattern ID'     },
  { key: 'execTimeMs',     label: 'Test Time', align: 'right' },
  { key: 'costPerWafer',   label: 'Cost (USD)', align: 'right' },
  { key: 'detectPower',    label: 'Fail Rate',  align: 'right' },
  { key: 'detectPower',    label: 'Detect Power', align: 'right' },
  { key: 'roiScore',       label: 'ROI Score',  align: 'right' },
  { key: 'recommendation', label: 'Recommendation' },
];

// Deduplicated cols (remove duplicate detectPower)
const TABLE_COLS: { key: SortKey; label: string; align?: 'right'; id: string }[] = [
  { id: 'patternName',    key: 'patternName',    label: 'Test Pattern'     },
  { id: 'execTimeMs',     key: 'execTimeMs',     label: 'ATE Duration', align: 'right' },
  { id: 'costPerWafer',   key: 'costPerWafer',   label: 'Wafer Cost', align: 'right' },
  { id: 'failRate',       key: 'detectPower',    label: 'Bin Defect Rate',  align: 'right' },
  { id: 'detectPower',    key: 'detectPower',    label: 'Fault Coverage', align: 'right' },
  { id: 'roiScore',       key: 'roiScore',       label: 'Coverage Efficiency',  align: 'right' },
  { id: 'recommendation', key: 'recommendation', label: 'Optimization Action' },
];

const DOMAIN_COLORS: Record<string, { color: string; bg: string }> = {
  SCAN:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  MBIST:       { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)'  },
  LBIST:       { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'   },
  IDDQ:        { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  FUNCTIONAL:  { color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  AT_SPEED:    { color: '#ec4899', bg: 'rgba(236,72,153,0.12)'  },
};

const REC_STYLES: Record<string, { color: string; border: string; bg: string; label: string }> = {
  KEEP:     { color: '#10b981', border: 'rgba(16,185,129,0.4)',  bg: 'rgba(16,185,129,0.08)',  label: 'RETAIN'   },
  OPTIMIZE: { color: '#f59e0b', border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)', label: 'AUDIT' },
  ELIMINATE:{ color: '#ef4444', border: 'rgba(239,68,68,0.4)',  bg: 'rgba(239,68,68,0.08)',  label: 'PRUNE' },
};

function roiColor(score: number): string {
  if (score >= 65) return 'var(--accent-green)';
  if (score >= 35) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

function PatternIdBadge({ name }: { name: string }) {
  // Convert name like "mbist-011" → "PAT-MBIST-011"
  const parts = name.split('-');
  const domain = parts[0]?.toUpperCase() ?? 'PAT';
  const num = parts[1] ?? '001';
  const formatted = `PAT-${domain}-${num.padStart(3, '0')}`;
  return (
    <span className="font-mono text-[var(--accent-blue)] text-[11px] font-semibold hover:underline cursor-pointer">
      {formatted}
    </span>
  );
}

export function PatternCostTable() {
  const { state } = useDashboard();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = usePatternCost(state.activeLotId);
  const [sortKey, setSortKey] = useState<SortKey>('roiScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allRows = data?.pages.flatMap(p => p.data) ?? [];
  const total   = data?.pages[0]?.total ?? 0;

  const sorted = [...allRows].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    return sortDir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }, [sortKey]);

  return (
    <div className="card flex flex-col rounded-xl overflow-hidden h-[440px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-blue)]/15 text-[var(--accent-blue)]">
            <IconBarChart size={13} />
          </div>
          <h2 className="text-sm font-semibold text-[var(--tx-primary)]">Test Pattern Cost &amp; Coverage</h2>
        </div>
        <button
          id="pattern-table-view-all"
          className="flex items-center gap-1 text-[11px] text-[var(--accent-blue)] hover:underline font-medium transition"
        >
          View All
          <IconArrowUpRight size={11} />
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-none">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
            <tr>
              {TABLE_COLS.map(col => (
                <th
                  key={col.id}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'cursor-pointer select-none px-3 py-2 text-[9px] font-bold uppercase tracking-wider',
                    'text-[var(--tx-muted)] transition hover:text-[var(--tx-secondary)]',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}
                  >
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === 'asc'
                        ? <span className="text-[8px] font-mono text-[var(--accent-blue)] ml-1">▲</span>
                        : <span className="text-[8px] font-mono text-[var(--accent-blue)] ml-1">▼</span>
                      : <span className="text-[8px] font-mono text-[var(--tx-disabled)] ml-1 opacity-45">⇅</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50">
                    {TABLE_COLS.map(c => (
                      <td key={c.id} className="px-3 py-2">
                        <div className="shimmer h-3 rounded-full" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((row) => {
                  const recStyle = REC_STYLES[row.recommendation] ?? REC_STYLES.KEEP;
                  // Simulated fail rate = (1 - detectPower) * 5%
                  const failRate = ((1 - row.detectPower) * 5).toFixed(2);
                  return (
                    <tr
                      key={row.id}
                      className="group border-b border-[var(--border)]/40 transition-colors hover:bg-[var(--bg-hover)]/60"
                    >
                      {/* Pattern ID */}
                      <td className="px-3 py-2">
                        <PatternIdBadge name={row.patternName} />
                      </td>
                      {/* Test time */}
                      <td className="px-3 py-2 text-right font-mono text-[var(--tx-secondary)] text-[11px]">
                        {formatMs(row.execTimeMs)}
                      </td>
                      {/* Cost */}
                      <td className="px-3 py-2 text-right font-mono text-[var(--tx-secondary)] text-[11px]">
                        {formatCurrency(row.costPerWafer)}
                      </td>
                      {/* Fail rate */}
                      <td className="px-3 py-2 text-right">
                        <span className={cn(
                          'font-mono text-[11px]',
                          parseFloat(failRate) > 3 ? 'text-[var(--accent-red)]'
                            : parseFloat(failRate) > 1 ? 'text-[var(--accent-amber)]'
                            : 'text-[var(--accent-green)]',
                        )}>
                          {failRate}%
                        </span>
                      </td>
                      {/* Detect Power */}
                      <td className="px-3 py-2 text-right">
                        <span className={cn(
                          'font-mono text-[11px] font-semibold uppercase tracking-wide',
                          row.detectPower >= 0.8 ? 'text-[var(--accent-green)]'
                            : row.detectPower >= 0.6 ? 'text-[var(--accent-amber)]'
                            : 'text-[var(--accent-red)]',
                        )}>
                          {row.detectPower >= 0.8 ? 'HIGH' : row.detectPower >= 0.6 ? 'MEDIUM' : 'LOW'}
                        </span>
                      </td>
                      {/* ROI */}
                      <td className="px-3 py-2 text-right font-mono text-[11px] font-semibold" style={{ color: roiColor(row.roiScore) }}>
                        {row.roiScore}
                      </td>
                      {/* Recommendation */}
                      <td className="px-3 py-2">
                        <span
                          className="inline-block rounded-md border px-2 py-0.5 text-[9.5px] font-bold text-center tracking-wide min-w-[56px]"
                          style={{ color: recStyle.color, borderColor: recStyle.border, background: recStyle.bg }}
                        >
                          {recStyle.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {/* Infinite scroll sentinel */}
        <div ref={loaderRef} className="h-8 flex items-center justify-center">
          {isFetchingNextPage && (
            <span className="flex items-center gap-1.5 text-[10px] text-[var(--tx-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
              Loading more…
            </span>
          )}
        </div>
      </div>

      {/* Metric Definition footer */}
      <div className="border-t border-[var(--border)] px-4 py-2 shrink-0">
        <p className="text-[9px] text-[var(--tx-muted)]">
          <span className="font-semibold text-[var(--tx-disabled)]">Metric Definition:</span>{' '}
          Efficiency Index = (Bin Defect Rate × Fault Coverage) / (ATE Duration × Wafer Cost)
        </p>
      </div>
    </div>
  );
}
