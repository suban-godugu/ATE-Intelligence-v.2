'use client';

import { useState, useCallback } from 'react';
import { cn, interpolateColor, binColor } from '@/lib/utils';
import { useWaferHeatmap } from '@/hooks/useWaferHeatmap';
import { useDashboard } from '@/context/DashboardContext';
import type { DieCell, HeatmapColorMode } from '@/types/dashboard.types';
import { IconCpu, IconActivity } from '@/components/ui/Icons';

const DIE_PX = 16;

interface TooltipData {
  die: DieCell;
  px:  number;
  py:  number;
}

function DieTooltip({ data }: { data: TooltipData }) {
  const { die, px, py } = data;
  return (
    <div
      className="pointer-events-none fixed z-50 w-52 rounded-xl border border-[var(--border-bright)] p-3 text-xs shadow-2xl glass slide-down"
      style={{ left: px + 16, top: py - 60 }}
    >
      <p className="mb-2 font-mono text-[var(--tx-muted)] text-[10px] border-b border-[var(--border)] pb-1.5">{die.dieId}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[var(--tx-muted)]">Bin</span>
          <span className={cn('font-semibold font-mono', die.bin === 1 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]')}>
            {die.bin}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--tx-muted)]">Cost</span>
          <span className="text-[var(--tx-primary)] font-mono">${die.cost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--tx-muted)]">Test Time</span>
          <span className="text-[var(--tx-primary)] font-mono">{(die.testTime / 1000).toFixed(2)} s</span>
        </div>
        {die.failType && (
          <div className="flex justify-between">
            <span className="text-[var(--tx-muted)]">Fault</span>
            <span className="font-mono text-[var(--accent-amber)]">{die.failType}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--tx-muted)]">Yield Score</span>
          <span className="text-[var(--tx-primary)] font-mono">{die.yieldScore.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

export function WaferHeatmap() {
  const { state } = useDashboard();
  const { data, isLoading, error } = useWaferHeatmap(state.activeLotId);
  const [colorMode, setColorMode]  = useState<HeatmapColorMode>('cost');
  const [tooltip, setTooltip]      = useState<TooltipData | null>(null);
  const [view3d, setView3d]        = useState(false);
  const [zoom, setZoom]            = useState(1);

  const getDieColor = useCallback((die: DieCell): string => {
    if (!die.inWafer) return 'transparent';
    switch (colorMode) {
      case 'cost': {
        const t = (die.cost - 100) / 400;
        return interpolateColor(t);
      }
      case 'bin':
        return die.bin === 1 ? 'var(--accent-green)' : binColor(die.bin);
      case 'failType':
        if (!die.failType) return 'var(--accent-green)';
        const faultColors: Record<string, string> = {
          STUCK_AT:   '#3b82f6',
          TRANSITION: '#8b5cf6',
          BRIDGE:     '#f59e0b',
          CELL_AWARE: '#ef4444',
        };
        return faultColors[die.failType] ?? '#6b7280';
    }
  }, [colorMode]);

  if (isLoading) {
    return (
      <div className="card flex h-[440px] flex-col rounded-xl p-3.5">
        <div className="shimmer mb-4 h-4 w-56 rounded-full" />
        <div className="flex-1 shimmer rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card flex h-[440px] items-center justify-center rounded-xl p-3.5">
        <div className="text-center">
          <span className="inline-block px-2.5 py-1 text-[10px] font-bold text-[var(--accent-amber)] border border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 rounded uppercase tracking-wider mb-2.5">
            NO WAFER DATA
          </span>
          <p className="text-xs text-[var(--tx-muted)]">Select a lot to view the spatial map</p>
        </div>
      </div>
    );
  }

  const svgW = data.cols * DIE_PX;
  const svgH = data.rows * DIE_PX;
  const cx   = svgW / 2;
  const cy   = svgH / 2;
  const r    = Math.min(cx, cy) * 0.94;

  const spatialYield = ((data.summary.passCount / (data.summary.passCount + data.summary.failCount)) * 100).toFixed(1);

  return (
    <div className="card flex flex-col rounded-xl p-3.5 h-[440px]">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-purple)]/15 text-[var(--accent-purple)]">
            <IconCpu size={13} />
          </div>
          <h2 className="text-sm font-semibold text-[var(--tx-primary)]">
            Spatial Yield & Cost
          </h2>
          <span className="rounded border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">
            Spatial AI
          </span>
        </div>
        {/* 3D View toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[var(--tx-muted)]">3D View</span>
          <button
            id="wafer-3d-toggle"
            onClick={() => setView3d(v => !v)}
            className={cn(
              'relative h-4 w-7 rounded-full transition-colors duration-200',
              view3d ? 'bg-[var(--accent-blue)]' : 'bg-[var(--bg-hover)]',
            )}
          >
            <span
              className={cn(
                'absolute left-0 top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200',
                view3d ? 'translate-x-3.5' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-0.5">
          {(['cost', 'bin', 'failType'] as HeatmapColorMode[]).map((mode) => (
            <button
              key={mode}
              id={`heatmap-mode-${mode}`}
              onClick={() => setColorMode(mode)}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-medium transition-all duration-150',
                colorMode === mode
                  ? 'bg-[var(--accent-blue)] text-white shadow-sm'
                  : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {mode === 'failType' ? 'Defect Mapping' : mode === 'cost' ? 'Spatial Cost' : 'Hard Bin'}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            id="wafer-zoom-out"
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-card)] text-sm font-bold text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)]"
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-[9px] font-mono text-[var(--tx-muted)] w-8 text-center select-none">{Math.round(zoom * 100)}%</span>
          <button
            id="wafer-zoom-in"
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--bg-card)] text-sm font-bold text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)]"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* SVG Heatmap */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden min-h-[200px]" style={{ perspective: '800px' }}>
        <div 
          style={{ 
            transform: view3d 
              ? `scale(${zoom}) rotateX(32deg) rotateY(-8deg) rotateZ(3deg)` 
              : `scale(${zoom})`, 
            transformStyle: 'preserve-3d',
            transformOrigin: 'center', 
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}
          className={cn(view3d && "drop-shadow-[0_22px_24px_rgba(0,0,0,0.6)]")}
        >
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="max-w-full"
            style={{ maxHeight: '220px' }}
          >
            <defs>
              <clipPath id="wafer-clip-v2">
                <circle cx={cx} cy={cy} r={r} />
              </clipPath>
              <filter id="wafer-glow-v2">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {view3d && (
                <filter id="shadow3d">
                  <feDropShadow dx="4" dy="8" stdDeviation="6" floodOpacity="0.5" floodColor="#000" />
                </filter>
              )}
            </defs>

            {/* Wafer ring */}
            <circle cx={cx} cy={cy} r={r + 1} fill="none" stroke="var(--accent-blue)" strokeWidth={0.5} opacity={0.2} />
            <circle cx={cx} cy={cy} r={r} fill="rgba(13,18,32,0.95)" stroke="var(--border-bright)" strokeWidth={1.5}
              filter={view3d ? 'url(#shadow3d)' : undefined}
            />

            {/* Die cells */}
            <g clipPath="url(#wafer-clip-v2)">
              {data.dies.map((die) => (
                <rect
                  key={die.dieId}
                  x={die.x * DIE_PX + 0.5}
                  y={die.y * DIE_PX + 0.5}
                  width={DIE_PX - 1}
                  height={DIE_PX - 1}
                  rx={2}
                  fill={getDieColor(die)}
                  opacity={0.9}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                  onMouseEnter={(e) => setTooltip({ die, px: e.clientX, py: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </g>

            {/* Cluster annotations */}
            {data.clusters.map((cl) => (
              <g key={cl.id}>
                <circle
                  cx={cl.cx * DIE_PX + DIE_PX / 2}
                  cy={cl.cy * DIE_PX + DIE_PX / 2}
                  r={cl.radius * DIE_PX}
                  fill="none"
                  stroke="var(--accent-amber)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  opacity={0.7}
                />
              </g>
            ))}

            {/* Notch */}
            <path
              d={`M ${cx - 5} ${cy + r - 1} Q ${cx} ${cy + r + 7} ${cx + 5} ${cy + r - 1}`}
              fill="var(--bg-secondary)"
              stroke="var(--border-bright)"
              strokeWidth={1}
            />
          </svg>
        </div>

        {tooltip && <DieTooltip data={tooltip} />}
      </div>

      {/* Color legend */}
      <div className="mt-2 flex items-center gap-3 shrink-0">
        <span className="flex items-center gap-1.5 text-[9px] text-[var(--tx-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-red)]" />
          High ATE Cost Zone
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-[var(--tx-muted)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
          Optimized Cost Zone
        </span>
        <div
          className="ml-auto flex-1 h-1.5 max-w-[80px] rounded-full"
          style={{ background: 'var(--gradient-cost)' }}
        />
        <span className="text-[9px] text-[var(--tx-muted)]">High</span>
      </div>

      {/* Stats row */}
      <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border)] pt-2.5 px-1 text-[11px] shrink-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--tx-muted)]">Total Dies:</span>
          <span className="font-semibold font-mono text-[var(--tx-secondary)]">{data.summary.passCount + data.summary.failCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--tx-muted)]">Bin 1 (Pass):</span>
          <span className="font-semibold font-mono text-[var(--accent-green)]">{data.summary.passCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--tx-muted)]">Failed Dies:</span>
          <span className="font-semibold font-mono text-[var(--accent-red)]">{data.summary.failCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[var(--tx-muted)]">Silicon Yield:</span>
          <span className="font-semibold font-mono text-[var(--accent-blue)]">{spatialYield}%</span>
        </div>
      </div>
    </div>
  );
}
