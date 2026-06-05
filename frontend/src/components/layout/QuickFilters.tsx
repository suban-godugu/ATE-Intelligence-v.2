'use client';

// No icons imported
import { useDashboard } from '@/context/DashboardContext';
import { useLots } from '@/hooks/useLots';
import type { DateRangePreset } from '@/types/dashboard.types';
import { DATE_RANGE_PRESETS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const DATE_PRESETS: DateRangePreset[] = ['24h', '7d', '30d', '90d'];

const FAB_OPTIONS = [
  { value: 'fab-001', label: 'Fab Alpha', node: '7nm' },
  { value: 'fab-002', label: 'Fab Beta',  node: '5nm' },
  { value: 'fab-003', label: 'Fab Gamma', node: '3nm' },
];

export function QuickFilters() {
  const { state, setLot, setFab, setDateRange } = useDashboard();
  const { data: lots } = useLots(state.activeFabId);

  const isModified = state.activeLotId !== null || state.dateRange.preset !== '7d' || state.activeFabId !== 'fab-001';
  const activeFab  = FAB_OPTIONS.find(f => f.value === state.activeFabId);

  const handleReset = () => {
    setLot(null);
    setFab('fab-001');
    setDateRange('7d');
  };

  return (
    <div
      className={cn(
        'fixed z-30 flex items-center gap-2.5 px-5 py-2',
        'border-b border-[var(--border)] glass-sm transition-all duration-300',
      )}
      style={{
        top: '60px',
        left: state.sidebarCollapsed ? '60px' : '200px',
        right: 0,
        height: '44px',
      }}
    >
      {/* ── Date range ────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider select-none shrink-0">DATE</span>
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              id={`filter-date-${preset}`}
              onClick={() => setDateRange(preset)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                state.dateRange.preset === preset
                  ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                  : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {DATE_RANGE_PRESETS[preset].label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--border)] shrink-0" />

      {/* ── Fab selector ──────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider select-none shrink-0">FAB</span>
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5">
          {FAB_OPTIONS.map((fab) => (
            <button
              key={fab.value}
              id={`filter-fab-${fab.value}`}
              onClick={() => setFab(fab.value)}
              className={cn(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                state.activeFabId === fab.value
                  ? 'bg-[var(--accent-purple)]/80 text-white shadow-sm'
                  : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {fab.label}
              <span className={cn(
                'rounded text-[9px] font-mono px-1',
                state.activeFabId === fab.value ? 'text-purple-200' : 'text-[var(--tx-muted)]',
              )}>
                {fab.node}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-[var(--border)] shrink-0" />

      {/* ── Lot filter ────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider select-none shrink-0">LOT</span>
        <select
          id="filter-lot"
          value={state.activeLotId ?? ''}
          onChange={(e) => setLot(e.target.value || null)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
            'bg-[var(--bg-card)] outline-none cursor-pointer text-xs',
            'focus:ring-1 focus:ring-[var(--accent-blue)]',
            state.activeLotId
              ? 'border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)] font-bold'
              : 'border-[var(--border)] text-[var(--tx-muted)] hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)]',
          )}
        >
          <option value="">All Lots</option>
          {lots?.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.lotNumber} — {lot.product}
            </option>
          ))}
        </select>
      </div>

      {/* ── Right side ────────────────────────────── */}
      <div className="ml-auto flex items-center gap-2">
        {/* Active filter badge */}
        {isModified && (
          <span className="badge-pill border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] slide-in font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-blue)] animate-pulse" />
            FILTERED
          </span>
        )}

        {/* Active lot indicator */}
        {state.activeLotId && (
          <span className="badge-pill border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-mono slide-in font-semibold">
            {lots?.find(l => l.id === state.activeLotId)?.lotNumber ?? state.activeLotId}
          </span>
        )}

        {/* Reset */}
        <button
          id="filter-reset"
          onClick={handleReset}
          className={cn(
            'flex items-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-150',
            isModified
              ? 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10'
              : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--tx-muted)] opacity-50 cursor-not-allowed',
          )}
          disabled={!isModified}
          aria-label="Reset filters"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
