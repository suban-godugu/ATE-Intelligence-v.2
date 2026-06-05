'use client';

import { useState, useEffect, useRef } from 'react';
import { useSpecYieldPredictor, usePredictYieldMutation } from '@/api/specHooks';
import { sendPrompt } from '@/lib/sendPrompt';

export default function YieldPredictorTab() {
  const { data: baselineData, isLoading } = useSpecYieldPredictor();
  const predictYield = usePredictYieldMutation();

  const [thresholds, setThresholds] = useState({ stuckAt: 94.0, transition: 89.0, iddq: 82.0 });
  const [prediction, setPrediction] = useState<any>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize prediction state from baseline query
  useEffect(() => {
    if (baselineData) {
      setPrediction({
        predicted_yield_pct: baselineData.predicted_yield_pct,
        yield_delta_pct: baselineData.yield_delta_pct,
        by_fab: baselineData.by_fab,
        dominant_fault_class: 'Stuck-at (dominant)',
        diminishing_returns_at: '~850 patterns'
      });
    }
  }, [baselineData]);

  // Run prediction with 250ms debounce to prevent API spam during slider dragging
  const triggerPrediction = (stuckAt: number, transition: number, iddq: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(async () => {
      try {
        const res = await predictYield.mutateAsync({
          stuck_at_threshold_pct: stuckAt,
          transition_threshold_pct: transition,
          iddq_threshold_pct: iddq
        });
        const data = res?.data || res;
        setPrediction(data);
        sendPrompt(`Yield optimization simulation: Stuck-At=${stuckAt}%, Transition=${transition}%, IDDQ=${iddq}%. Projecting yield delta of ${data.yield_delta_pct}% and dominant fault factor of "${data.dominant_fault_class}".`);
      } catch (e) {
        console.error(e);
      }
    }, 250);
  };

  const handleSliderChange = (key: 'stuckAt' | 'transition' | 'iddq', val: number) => {
    const nextThresholds = { ...thresholds, [key]: val };
    setThresholds(nextThresholds);
    triggerPrediction(nextThresholds.stuckAt, nextThresholds.transition, nextThresholds.iddq);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--tx-secondary)] space-y-4">
        <span className="font-mono text-xl animate-pulse text-[var(--accent-cyan)] select-none">[ / ]</span>
        <p className="text-sm font-medium animate-pulse">Initializing yield forecasting models...</p>
      </div>
    );
  }

  const displayYield = prediction?.predicted_yield_pct ?? baselineData?.predicted_yield_pct ?? 89.1;
  const displayDelta = prediction?.yield_delta_pct ?? baselineData?.yield_delta_pct ?? 1.7;
  const fabs = prediction?.by_fab ?? baselineData?.by_fab ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Current Predicted Yield */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs text-[var(--tx-secondary)] font-medium">Projected Yield</span>
            <div className="text-4xl font-bold text-white mt-2 font-mono">
              {displayYield.toFixed(1)}%
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--tx-muted)]">
            <span className="font-mono text-[var(--tx-muted)] select-none mr-1">[~]</span>
            <span className="font-mono">Baseline: {baselineData?.current_yield_pct ?? 87.4}%</span>
          </div>
        </div>

        {/* Card: Yield Delta Opportunity */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs text-[var(--tx-secondary)] font-medium">Estimated Net Gain</span>
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] mt-2 font-mono">
              {displayDelta >= 0 ? '+' : ''}{displayDelta.toFixed(1)}%
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-[var(--accent-green)] font-mono">
            <span className="text-[var(--accent-green)] select-none mr-1">[▲]</span>
            <span>Increased throughput margins</span>
          </div>
        </div>

        {/* Card: Model Confidence */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs text-[var(--tx-secondary)] font-medium">AI Predictor Confidence</span>
            <div className="text-4xl font-bold text-[var(--accent-purple)] mt-2 font-mono">
              {baselineData?.model_confidence_pct ?? 94}%
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 bg-black/40 rounded-full h-1.5 overflow-hidden border border-[var(--border)]">
              <div className="bg-[var(--accent-purple)] h-full" style={{ width: `${baselineData?.model_confidence_pct ?? 94}%` }} />
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coverage Threshold Sliders */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 space-y-8 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <span className="font-mono text-[var(--accent-purple)] select-none">[#]</span>
              Coverage Thresholds
            </h3>
            <p className="text-xs text-[var(--tx-secondary)] mb-6">Drag fault coverage levels to observe how changes project onto the wafer yield curve.</p>
  
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <span className="text-slate-300 font-medium">Stuck-At Faults</span>
                  <span className="text-[var(--accent-cyan)] font-mono font-bold">{thresholds.stuckAt.toFixed(1)}%</span>
                </div>
                <input 
                  type="range" min="80" max="100" step="0.5" 
                  value={thresholds.stuckAt}
                  onChange={(e) => handleSliderChange('stuckAt', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-cyan)]" 
                />
              </div>
  
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <span className="text-slate-300 font-medium">Transition Faults</span>
                  <span className="text-[var(--accent-amber)] font-mono font-bold">{thresholds.transition.toFixed(1)}%</span>
                </div>
                <input 
                  type="range" min="80" max="100" step="0.5" 
                  value={thresholds.transition}
                  onChange={(e) => handleSliderChange('transition', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-amber)]" 
                />
              </div>
  
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <span className="text-slate-300 font-medium">IDDQ / Leakage</span>
                  <span className="text-[var(--accent-purple)] font-mono font-bold">{thresholds.iddq.toFixed(1)}%</span>
                </div>
                <input 
                  type="range" min="70" max="100" step="0.5" 
                  value={thresholds.iddq}
                  onChange={(e) => handleSliderChange('iddq', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--accent-purple)]" 
                />
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-black/30 rounded-xl border border-[var(--border)] space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--tx-secondary)] uppercase tracking-wider font-mono">
              <span className="text-[var(--accent-amber)] select-none mr-1">[!]</span>
              <span>Diminishing Returns Point</span>
            </div>
            <div className="text-lg font-bold text-white font-mono">
              {prediction?.diminishing_returns_at || '~850 patterns'}
            </div>
            <div className="text-[10px] text-[var(--tx-secondary)] font-medium leading-relaxed font-mono">
              Dominant fail factor: <span className="text-slate-300 font-semibold">{prediction?.dominant_fault_class || 'Stuck-at (dominant)'}</span>
            </div>
          </div>
        </div>

        {/* Prediction Table */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <span className="font-mono text-[var(--accent-green)] select-none">[▲]</span>
            Predicted Yield by Fab Site
          </h3>
          <p className="text-xs text-[var(--tx-secondary)] mb-6">Fab-by-fab prediction analysis comparing historical baselines against live speculative models.</p>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-[var(--tx-secondary)]">
              <thead className="text-xs uppercase bg-black/40 text-[var(--tx-muted)] sticky top-0 font-mono">
                <tr>
                  <th className="p-4">Fab Site</th>
                  <th className="p-4">Baseline Yield</th>
                  <th className="p-4">Predicted Yield</th>
                  <th className="p-4">Delta Opportunity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {fabs.map((f: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">{f.fab}</td>
                    <td className="p-4 font-mono text-[var(--tx-muted)]">{f.current.toFixed(1)}%</td>
                    <td className="p-4 font-mono font-bold text-white">
                      {f.predicted.toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono ${
                        f.delta >= 0 
                          ? 'bg-green-500/20 text-[var(--accent-green)] border border-[var(--accent-green)]/20' 
                          : 'bg-red-500/20 text-[var(--accent-red)] border border-[var(--accent-red)]/20'
                      }`}>
                        {f.delta >= 0 ? '+' : ''}{f.delta.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {fabs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-[var(--tx-muted)] font-mono">
                      No fab projection records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
