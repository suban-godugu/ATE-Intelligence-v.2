'use client';

import { useState } from 'react';
import { cn, clamp } from '@/lib/utils';
import { useOptimizer } from '@/hooks/useOptimizer';
import { useDashboard } from '@/context/DashboardContext';
import type { OptimizationStatus } from '@/types/dashboard.types';
import { IconZap, IconActivity } from '@/components/ui/Icons';

interface SliderProps {
  id:       string;
  label:    string;
  min:      number;
  max:      number;
  step:     number;
  value:    number;
  onChange: (v: number) => void;
  format:   (v: number) => string;
  disabled?: boolean;
  accent?:  string;
}

function Slider({ id, label, min, max, step, value, onChange, format, disabled, accent = 'var(--accent-blue)' }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <label htmlFor={id} className="text-[11px] font-medium text-[var(--tx-muted)]">{label}</label>
        <span
          className="font-mono font-bold text-sm"
          style={{ color: accent }}
        >
          {format(value)}
        </span>
      </div>
      <div className="relative h-6 flex items-center group">
        {/* Track background */}
        <div className="relative h-1.5 w-full rounded-full bg-[var(--bg-hover)]">
          {/* Filled portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${accent}aa, ${accent})`,
            }}
          />
        </div>
        {/* Hidden range input */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          style={{ zIndex: 2 }}
        />
        {/* Thumb */}
        <div
          className="absolute h-4 w-4 rounded-full border-2 shadow-lg transition-all duration-150 group-hover:scale-110"
          style={{
            left: `calc(${pct}% - 8px)`,
            borderColor: accent,
            background: 'var(--bg-card)',
            boxShadow: `0 0 0 3px ${accent}25, 0 2px 8px rgba(0,0,0,0.4)`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

export function OptimizationEngine() {
  const { state }          = useDashboard();
  const { submit, status, progress, reset } = useOptimizer();

  const [maxCostPerWafer, setMaxCost]   = useState(68);
  const [yieldTarget,     setYield]     = useState(98);
  const [maxTestTimeMs,   setTestTime]  = useState(50);

  const isRunning = status === 'pending' || status === 'processing';
  const isDone    = status === 'complete' || status === 'failed';
  const isAlgoActive = isRunning || isDone;

  const handleRun = () => {
    if (isDone) { reset(); return; }
    submit({
      lotId:  state.activeLotId ?? undefined,
      fabId:  state.activeFabId ?? undefined,
      constraints: {
        maxCostPerWafer: clamp(maxCostPerWafer * 1000, 10000, 500000),
        yieldTarget:     clamp(yieldTarget, 80, 99.9),
        maxTestTimeMs:   clamp(maxTestTimeMs, 5, 500),
      },
    });
  };

  return (
    <div className="card relative flex flex-col rounded-xl p-4 h-[380px] overflow-hidden">
      {/* No watermark icon */}

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[var(--accent-blue)]">
              <IconZap size={13} />
            </div>
            <h2 className="text-sm font-semibold text-[var(--tx-primary)]">
              ATE Suite Co-Optimizer
            </h2>
          </div>
          {/* Status badge */}
          <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
            isAlgoActive
              ? 'border border-[var(--accent-green)]/40 bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
              : 'border border-[var(--tx-muted)]/20 bg-[var(--bg-hover)] text-[var(--tx-muted)]',
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              isAlgoActive ? 'bg-[var(--accent-green)] animate-pulse' : 'bg-[var(--tx-muted)]',
            )} />
            {isAlgoActive ? 'Algo Active' : 'Standby'}
          </div>
        </div>
      </div>

      {/* Technique tags */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {['Constraint-Based Pruning', 'Generative Simulation'].map(tag => (
          <span key={tag} className="rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--tx-muted)] font-medium">
            {tag}
          </span>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-5 mb-5 flex-1">
        <Slider
          id="opt-max-cost"
          label="Target ATE Cost Ceiling"
          min={10} max={500} step={1}
          value={maxCostPerWafer}
          onChange={setMaxCost}
          format={v => `${v}$`}
          disabled={isRunning}
          accent="var(--accent-blue)"
        />
        <Slider
          id="opt-yield-target"
          label="Silicon Yield Floor"
          min={80} max={99.9} step={0.1}
          value={yieldTarget}
          onChange={setYield}
          format={v => `${v.toFixed(0)}%`}
          disabled={isRunning}
          accent="var(--accent-purple)"
        />
        <Slider
          id="opt-test-time"
          label="ATE Sweep Limit"
          min={5} max={500} step={1}
          value={maxTestTimeMs}
          onChange={setTestTime}
          format={v => `${v} ms`}
          disabled={isRunning}
          accent="var(--accent-cyan)"
        />
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-[var(--tx-muted)]">Analyzing {progress.toFixed(0)}%</span>
            <span className="text-[var(--accent-purple)] animate-pulse font-medium">Processing…</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))',
                boxShadow: '0 0 10px rgba(139,92,246,0.5)',
              }}
            />
          </div>
        </div>
      )}

      {/* CTA Button */}
      <button
        id="optimizer-run-btn"
        onClick={handleRun}
        disabled={isRunning}
        className={cn(
          'relative flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white',
          'transition-all duration-200 disabled:cursor-not-allowed select-none',
          isDone && status === 'failed'
            ? 'bg-[var(--accent-red)] hover:brightness-110'
            : isDone
            ? 'bg-[var(--accent-green)] hover:brightness-110'
            : 'bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)] hover:brightness-110 active:scale-[0.99]',
          isRunning && 'opacity-75',
        )}
        style={{
          boxShadow: isRunning
            ? '0 0 20px rgba(139,92,246,0.4)'
            : '0 4px 16px rgba(59,130,246,0.25)',
        }}
      >
        {isRunning ? (
          <span className="flex items-center gap-2">
            <IconActivity size={14} className="animate-pulse" />
            Analyzing Patterns…
          </span>
        ) : isDone && status === 'complete' ? (
          <span className="flex items-center gap-2"><IconZap size={14} />Run Again</span>
        ) : isDone && status === 'failed' ? (
          <span className="flex items-center gap-2"><IconZap size={14} />Retry</span>
        ) : (
          <span className="flex items-center gap-2"><IconZap size={14} />Execute Suite Co-Optimization</span>
        )}

        {/* Shimmer overlay while running */}
        {isRunning && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 shimmer opacity-20" />
          </div>
        )}
      </button>
    </div>
  );
}
