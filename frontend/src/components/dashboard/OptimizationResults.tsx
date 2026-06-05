'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingDown, Clock, Target, Layers, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptimizer } from '@/hooks/useOptimizer';
import {
  runConstraintPruning,
  generateDemoPatterns,
  type OptimizationResult,
} from '@/lib/optimizer.lib';
import type { OptimizationStatus } from '@/types/dashboard.types';

// ─── Status placeholder ───────────────────────────────────
function StatusPlaceholder({ status }: { status: OptimizationStatus }) {
  const configs: Record<string, { label: string; color: string; msg: string }> = {
    idle:       { label: 'AWAITING RUN',     color: 'var(--tx-disabled)',    msg: 'Execute co-optimizer to view pattern savings' },
    pending:    { label: 'INITIALIZING',     color: 'var(--accent-blue)',    msg: 'Setting up constraint engine…' },
    processing: { label: 'RUNNING ANALYSIS', color: 'var(--accent-purple)',  msg: 'Computing multi-parameter constraints…' },
    failed:     { label: 'FAILED',           color: 'var(--accent-red)',     msg: 'Check constraints and try again' },
  };
  const c = configs[status] ?? configs.idle;
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
      <span
        className="inline-block px-2.5 py-1 text-[10px] font-bold rounded uppercase tracking-wider border animate-pulse"
        style={{ color: c.color, borderColor: `${c.color}40`, background: `${c.color}0f` }}
      >
        {c.label}
      </span>
      <p className="text-xs text-[var(--tx-muted)]">{c.msg}</p>
    </div>
  );
}

// ─── Pattern row ──────────────────────────────────────────
function PatternRow({ p, i }: {
  p: OptimizationResult['optimizedPatternSet'][0] & { impactMs: number; impactUsd: number };
  i: number;
}) {
  const isRemove = p.action === 'remove';
  return (
    <tr
      className="border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--bg-hover)]/30"
      style={{ opacity: isRemove ? 0.7 : 1 }}
    >
      <td className="py-2 px-3 text-[10px] font-mono text-[var(--tx-muted)]">{String(i + 1).padStart(2, '0')}</td>
      <td className="py-2 px-3">
        <span className="text-xs font-medium text-[var(--tx-primary)] truncate max-w-[120px] block">{p.patternId}</span>
        <span className="text-[9px] text-[var(--tx-muted)]">{p.patternType}</span>
      </td>
      <td className="py-2 px-3">
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
            isRemove
              ? 'bg-red-500/15 text-red-400 border border-red-500/25'
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
          )}
        >
          {isRemove ? '✕ Remove' : '✓ Keep'}
        </span>
      </td>
      <td className="py-2 px-3 text-[10px] font-mono text-[var(--tx-secondary)]">{p.impactMs.toFixed(1)} ms</td>
      <td className="py-2 px-3 text-[10px] font-mono text-[var(--tx-secondary)]">${(p.impactUsd * 1000).toFixed(3)}</td>
      <td className="py-2 px-3 text-[10px] text-[var(--tx-muted)] max-w-[140px] truncate">{p.reason}</td>
    </tr>
  );
}

export function OptimizationResults() {
  const { job, status } = useOptimizer();
  const [showTable, setShowTable] = useState(false);

  // Run the real algorithm client-side using the optimizer lib
  const result: OptimizationResult | null = useMemo(() => {
    if (status !== 'complete' || !job?.results) return null;

    const patterns = generateDemoPatterns(24);
    const constraints = {
      maxCostPerWafer: (job.results.totalSavings / 5) + 5000,
      yieldTarget: 90,
      maxTestTimeMs: 60,
    };

    return runConstraintPruning(patterns, constraints, 5, 489, 92.14);
  }, [status, job]);

  // Auto-show table when result comes in
  useEffect(() => {
    if (result) setShowTable(true);
  }, [result]);

  const metrics = result
    ? [
        { label: 'Cost Reduction',   value: `${result.estimatedCostReduction}%`, icon: TrendingDown, color: 'var(--accent-green)'  },
        { label: 'Time Savings',     value: `${result.estimatedTimeSavings}%`,   icon: Clock,        color: 'var(--accent-cyan)'   },
        { label: 'Yield Projection', value: `${result.projectedYield}%`,         icon: Target,       color: 'var(--accent-purple)' },
        { label: 'Patterns Cut',     value: `${result.patternsReduced} (${result.patternsReducedPct}%)`, icon: Layers, color: 'var(--accent-amber)' },
      ]
    : [];

  return (
    <div className="card flex flex-col rounded-xl overflow-hidden h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--tx-primary)]">
            Co-Optimization Results
          </h2>
          <span className="text-[9px] text-[var(--tx-muted)] font-medium">(Constraint Pruning)</span>
        </div>
        {result && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Complete
          </span>
        )}
      </div>

      {status !== 'complete' || !result ? (
        <div className="flex-1 flex flex-col justify-center">
          <StatusPlaceholder status={status} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* KPI metrics */}
          <div className="grid grid-cols-2 gap-2 p-3 shrink-0">
            {metrics.map(m => (
              <div key={m.label} className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(0,0,0,0.25)' }}>
                <m.icon className="h-3.5 w-3.5 shrink-0" style={{ color: m.color }} />
                <div className="min-w-0">
                  <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider truncate">{m.label}</p>
                  <p className="text-sm font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total savings highlight */}
          <div className="flex items-center justify-between px-3 py-2 mx-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 shrink-0">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-[var(--tx-secondary)]">Net Financial Recovery</span>
            </div>
            <span className="font-display text-xl font-bold text-emerald-400">
              ${result.totalSavingsUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Pattern table toggle */}
          <button
            onClick={() => setShowTable(v => !v)}
            className="flex items-center justify-center gap-1 py-2 text-[10px] text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] transition shrink-0 border-t border-[var(--border)]/50 mt-2"
          >
            {showTable ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showTable ? 'Hide' : 'View'} Pattern Set ({result.optimizedPatternSet.length})
          </button>

          {/* Pattern table */}
          {showTable && (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                  <tr>
                    {['#', 'Pattern', 'Action', 'Time', 'Cost/Die', 'Reason'].map(h => (
                      <th key={h} className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-wider text-[var(--tx-muted)] border-b border-[var(--border)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.optimizedPatternSet.map((p, i) => (
                    <PatternRow key={p.patternId} p={p} i={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Export button */}
          {!showTable && (
            <div className="px-3 pb-3 shrink-0">
              <button
                id="results-view-patterns-btn"
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/8 py-2 text-xs font-semibold text-[var(--accent-blue)] transition hover:bg-[var(--accent-blue)]/15"
              >
                Export Optimized ATE Suite
              </button>
            </div>
          )}
        </div>
      )}

      {status === 'idle' && (
        <div className="px-3 pb-3 shrink-0">
          <button
            id="results-view-patterns-btn-idle"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 text-xs font-semibold text-[var(--tx-muted)] opacity-50 cursor-not-allowed"
          >
            Export Optimized ATE Suite
          </button>
        </div>
      )}
    </div>
  );
}
