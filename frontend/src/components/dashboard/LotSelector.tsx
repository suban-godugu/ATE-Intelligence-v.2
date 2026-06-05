'use client';

import { useState, useRef, useEffect } from 'react';
// No icons imported
import { cn } from '@/lib/utils';
import { useLots } from '@/hooks/useLots';
import { useDashboard } from '@/context/DashboardContext';
import { LOT_STATUS_COLORS } from '@/lib/constants';
import type { Lot, LotStatus } from '@/types/dashboard.types';

const STATUS_ORDER: LotStatus[] = ['IN_PROCESS', 'COMPLETE', 'ON_HOLD', 'SCRAPPED'];

export function LotSelector() {
  const { state, setLot } = useDashboard();
  const { data: lots } = useLots(state.activeFabId);
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const containerRef          = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeLot = lots?.find(l => l.id === state.activeLotId);

  const filtered = (lots ?? []).filter(l =>
    !query ||
    l.lotNumber.toLowerCase().includes(query.toLowerCase()) ||
    l.product.toLowerCase().includes(query.toLowerCase()),
  );

  const grouped = STATUS_ORDER.reduce<Record<string, Lot[]>>((acc, status) => {
    const grp = filtered.filter(l => l.status === status);
    if (grp.length) acc[status] = grp;
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        id="lot-selector-trigger"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition',
          open
            ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--tx-primary)]'
            : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--tx-secondary)] hover:border-[var(--border-bright)]',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {activeLot ? (
          <>
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: LOT_STATUS_COLORS[activeLot.status] }}
            />
            <span className="font-mono">{activeLot.lotNumber}</span>
            <span className="hidden sm:block text-[var(--tx-muted)]">— {activeLot.product}</span>
          </>
        ) : (
          <span className="text-[var(--tx-muted)]">All Lots</span>
        )}
        <span className={cn('text-[8px] font-mono text-[var(--tx-muted)] transition-transform duration-200 select-none', open && 'rotate-180')}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-72 overflow-hidden rounded-xl border border-[var(--border-bright)] bg-[var(--bg-elevated)] shadow-xl slide-in"
          role="listbox"
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search lots by ID or product…"
              className="flex-1 bg-transparent text-xs text-[var(--tx-secondary)] outline-none placeholder:text-[var(--tx-muted)]"
            />
          </div>

          {/* All lots option */}
          <button
            id="lot-option-all"
            onClick={() => { setLot(null); setOpen(false); setQuery(''); }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-xs transition hover:bg-[var(--bg-hover)]',
              !state.activeLotId ? 'text-[var(--accent-blue)]' : 'text-[var(--tx-muted)]',
            )}
            role="option"
            aria-selected={!state.activeLotId}
          >
            <span className="font-mono text-[10px] font-bold w-5 shrink-0 text-left">
              {!state.activeLotId ? '[x]' : '[ ]'}
            </span>
            <span>All Lots</span>
          </button>

          {/* Grouped lots */}
          <div className="max-h-72 overflow-y-auto scrollbar-none">
            {Object.entries(grouped).map(([status, groupLots]) => (
              <div key={status}>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--tx-muted)]"
                   style={{ background: 'var(--bg-card)' }}>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
                    style={{ background: LOT_STATUS_COLORS[status] }}
                  />
                  {status.replace('_', ' ')}
                </p>
                {groupLots.map(lot => (
                  <button
                    key={lot.id}
                    id={`lot-option-${lot.id}`}
                    onClick={() => { setLot(lot.id); setOpen(false); setQuery(''); }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-xs transition hover:bg-[var(--bg-hover)]',
                      state.activeLotId === lot.id ? 'text-[var(--accent-blue)] font-semibold' : 'text-[var(--tx-secondary)]',
                    )}
                    role="option"
                    aria-selected={state.activeLotId === lot.id}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] font-bold w-5 shrink-0 text-left">
                        {state.activeLotId === lot.id ? '[x]' : '[ ]'}
                      </span>
                      <span className="truncate font-mono">{lot.lotNumber}</span>
                    </div>
                    <span className="ml-2 shrink-0 text-[var(--tx-muted)] truncate max-w-24 font-normal">{lot.product}</span>
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(grouped).length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-[var(--tx-muted)]">No lots found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
