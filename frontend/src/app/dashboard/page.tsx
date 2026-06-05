'use client';

import { KPICard }             from '@/components/dashboard/KPICard';
import { WaferHeatmap }        from '@/components/dashboard/WaferHeatmap';
import { CostTrendChart }      from '@/components/dashboard/CostTrendChart';
import { PatternCostTable }    from '@/components/dashboard/PatternCostTable';
import { OptimizationEngine }  from '@/components/dashboard/OptimizationEngine';
import { OptimizationResults } from '@/components/dashboard/OptimizationResults';
import { LotSelector }         from '@/components/dashboard/LotSelector';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useDashboard }        from '@/context/DashboardContext';

/** Styled section divider with label */
function SectionDivider({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="flex items-center gap-4 py-1">
      <div className="flex-shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--tx-muted)]">{label}</p>
        {sublabel && <p className="text-[9px] text-[var(--tx-muted)] opacity-50">{sublabel}</p>}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
    </div>
  );
}

/** Stack of tech badge pills for the footer */
function TechBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[9px] font-mono text-[var(--tx-muted)]">
      <span className="h-1 w-1 rounded-full bg-[var(--accent-blue)] opacity-60" />
      {label}
    </span>
  );
}

export default function ExecutiveDashboardPage() {
  const { state }                    = useDashboard();
  const { data: summary, isLoading } = useDashboardSummary(state.activeFabId, state.activeLotId);

  const metrics    = summary?.metrics ?? [];
  const isDemoData = !state.activeLotId;

  return (
    <div className="space-y-6 py-5">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Active LOT tag */}
          {state.activeLotId && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-green)]/40 bg-[var(--accent-green)]/8 px-2.5 py-0.5 text-[9px] font-semibold text-[var(--accent-green)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] pulse-glow" />
                Active LOT: {state.activeLotId.toUpperCase()}
              </span>
            </div>
          )}

          {/* Main title with gradient */}
          <h1 className="flex items-center gap-3 font-display leading-tight">
            <span
              className="text-2xl font-bold text-gradient gradient-text"
              style={{ backgroundImage: 'var(--gradient-brand)' }}
            >
              Executive Dashboard
            </span>
            {/* LIVE chip */}
            <span className="status-live">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-[var(--accent-green)] live-ring" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
              </span>
              Live
            </span>
          </h1>

          <p className="text-[11px] text-[var(--tx-muted)]">
            Semiconductor Test Intelligence · ATE Cost Optimization Platform
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Last updated pill */}
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] text-[var(--tx-muted)]">
            Auto-refresh
            <span className="text-[var(--accent-blue)] font-semibold">30s</span>
          </span>
          {/* Lot selector */}
          <LotSelector />
        </div>
      </div>

      {/* ── Demo data banner ─────────────────────────────────────── */}
      {isDemoData && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/6 px-4 py-3">
          {/* Icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[var(--accent-amber)]">
              Demo Data Mode
            </p>
            <p className="text-[10px] text-[var(--accent-amber)]/60 mt-0.5">
              Upload files to view real metrics and analysis
            </p>
          </div>
          <button
            id="banner-upload-btn"
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[var(--accent-amber)]/50 bg-[var(--accent-amber)]/15 px-3 py-1.5 text-[11px] font-bold text-[var(--accent-amber)] transition-all hover:bg-[var(--accent-amber)]/25"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Data
          </button>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <section aria-label="Key performance indicators">
        <SectionDivider label="Key Performance Indicators" sublabel="Real-time semiconductor test metrics" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <KPICard
                  key={i}
                  metric={{ id: `skel-${i}`, label: '', value: 0, formatted: '', delta: 0, deltaFormatted: '', trend: 'flat', format: 'number' }}
                  loading
                  animDelay={i * 60}
                />
              ))
            : metrics.map((m, i) => (
                <KPICard key={m.id} metric={m} animDelay={i * 60} />
              ))}
        </div>
      </section>

      {/* ── Row 1: Wafer Heatmap | Pattern Cost Table ─────────────── */}
      <section aria-label="Wafer analysis and pattern cost">
        <SectionDivider label="Spatial Analysis" sublabel="Wafer yield mapping & pattern cost breakdown" />
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div id="wafer-maps" className="scroll-mt-24 flex">
            <div className="flex-1">
              <WaferHeatmap />
            </div>
          </div>
          <div id="pattern-cost-table" className="scroll-mt-24 flex">
            <div className="flex-1">
              <PatternCostTable />
            </div>
          </div>
        </div>
      </section>

      {/* ── Row 2: Cost Trend | AI Optimizer | Results ────────────── */}
      <section aria-label="Cost trends and AI optimization" id="optimizer" className="scroll-mt-24">
        <SectionDivider label="AI Co-Optimization Engine" sublabel="Constraint-based pruning & cost trend analysis" />
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div id="cost-trends" className="scroll-mt-24 flex">
            <div className="flex-1">
              <CostTrendChart />
            </div>
          </div>
          <div className="flex">
            <div className="flex-1">
              <OptimizationEngine />
            </div>
          </div>
          <div className="flex">
            <div className="flex-1">
              <OptimizationResults />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="pt-4 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-gradient gradient-text"
            style={{ backgroundImage: 'var(--gradient-brand)' }}
          >
            ATE Platform
          </span>
          <span className="text-[9px] text-[var(--tx-disabled)]">·</span>
          <span className="text-[10px] text-[var(--tx-muted)]">Executive Dashboard v2.0</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {['NestJS', 'PostgreSQL', 'Redis', 'BullMQ'].map((t) => (
            <TechBadge key={t} label={t} />
          ))}
        </div>
      </footer>
    </div>
  );
}
