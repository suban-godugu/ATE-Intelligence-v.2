import { useState, useEffect, useMemo } from 'react';
import { sendPrompt } from '@/lib/sendPrompt';
import { 
  useSpecFlowOptimizer, 
  useSimulateFlowOptimizerMutation, 
  useApplyFlowOptimizerMutation 
} from '@/api/specHooks';

export default function FlowOptimizerTab() {
  const { data: flowRes, isLoading } = useSpecFlowOptimizer();
  const simulateFlow = useSimulateFlowOptimizerMutation();
  const applyFlow = useApplyFlowOptimizerMutation();

  const flow = useMemo(() => flowRes || {
    current_time_ms: 4820,
    optimized_time_ms: 2502,
    saving_pct: 48.1,
    current_order: ['ATPG stuck-at', 'ATPG transition', 'MBIST', 'LBIST', 'Scan chain'],
    recommended_order: ['MBIST', 'LBIST', 'ATPG stuck-at', 'Scan chain 64x', 'ATPG transition']
  }, [flowRes]);

  const [objective, setObjective] = useState('time');
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [recommendedOrder, setRecommendedOrder] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  useEffect(() => {
    if (flow) {
      setCurrentOrder(flow.current_order);
      setRecommendedOrder(flow.recommended_order);
    }
  }, [flow]);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...recommendedOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setRecommendedOrder(newOrder);
  };

  const handleMoveDown = (index: number) => {
    if (index === recommendedOrder.length - 1) return;
    const newOrder = [...recommendedOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setRecommendedOrder(newOrder);
  };

  const handleResetAI = () => {
    setRecommendedOrder(flow.recommended_order);
  };

  const handleSimulate = () => {
    simulateFlow.mutate(
      { objective, order: recommendedOrder },
      {
        onSuccess: (res) => {
          setSimulationResult(res);
        }
      }
    );
  };

  const handleApply = () => {
    applyFlow.mutate(
      { objective, order: recommendedOrder },
      {
        onSuccess: () => {
          sendPrompt(`Apply the AI reordered flow sequence: ${recommendedOrder.join(', ')}`);
          alert('Flow optimization successfully applied!');
        }
      }
    );
  };

  const stepTimes: Record<string, string> = {
    'ATPG stuck-at': '920ms',
    'ATPG transition': '1,100ms',
    'MBIST': '440ms',
    'LBIST': '320ms',
    'Scan chain': '2,040ms',
    'Scan chain 64x': '1,060ms'
  };

  const stepClasses: Record<string, string> = {
    'ATPG stuck-at': 'bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30 text-[var(--accent-blue)]',
    'ATPG transition': 'bg-[var(--accent-amber)]/10 border-[var(--accent-amber)]/30 text-[var(--accent-amber)]',
    'MBIST': 'bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]',
    'LBIST': 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]',
    'Scan chain': 'bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)]',
    'Scan chain 64x': 'bg-gradient-to-r from-[var(--accent-blue)]/20 to-[var(--accent-cyan)]/20 border-[var(--accent-blue)]/30 text-white font-bold'
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Objective Select Toggles */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--accent-blue)] font-bold select-none">[!]</span>
          <div>
            <h3 className="text-sm font-bold text-white">AI Flow Optimizer</h3>
            <p className="text-[10px] text-[var(--tx-secondary)]">Optimise vector load sequencing to trigger early fail exits</p>
          </div>
        </div>

        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border)] w-fit shrink-0">
          {[
            { id: 'time', label: 'Time Recovery' },
            { id: 'yield', label: 'Yield Gain' },
            { id: 'cost', label: 'Cost/Die' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setObjective(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                objective === opt.id 
                  ? 'bg-[var(--accent-blue)] text-white shadow-lg' 
                  : 'text-[var(--tx-secondary)] hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Split lists: Current vs Recommended */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Current Flow sequence */}
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-6 shadow-xl flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="border-b border-[var(--border)] pb-4 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-[var(--tx-secondary)] uppercase tracking-wider">Current Sequence</h4>
                <h3 className="text-sm font-bold text-white mt-0.5">Physical Lot Load Order</h3>
              </div>
              <span className="font-mono text-xs font-bold text-[var(--accent-red)]">{flow.current_time_ms}ms</span>
            </div>

            {isLoading ? (
              <div className="space-y-3 py-6 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {currentOrder.map((step, idx) => (
                  <div 
                    key={step} 
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${stepClasses[step] || 'bg-white/5 border-[var(--border)] text-white'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[10px] w-4 opacity-55">0{idx + 1}</span>
                      <span className="font-bold">{step}</span>
                    </div>
                    <span className="font-mono text-[var(--tx-secondary)] font-bold">{stepTimes[step] || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/[0.02] border border-[var(--border)] rounded-xl p-3.5 mt-4 text-[11px] text-[var(--tx-muted)] flex gap-2 font-mono">
            <span className="text-xs text-[var(--tx-muted)] shrink-0 select-none">[i]</span>
            <span>
              Longer ATPG scan chains are run first, which causes the lot runs to take maximum test-in time before finding early defects.
            </span>
          </div>
        </div>

        {/* AI Recommended Flow sequence */}
        <div className="bg-gradient-to-br from-[var(--accent-blue)]/10 via-[var(--bg-card)] to-transparent rounded-2xl border border-[var(--accent-blue)]/30 p-6 shadow-2xl flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="border-b border-[var(--border)] pb-4 mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-wider">AI Recommended Sequence</h4>
                <h3 className="text-sm font-bold text-white mt-0.5">Optimised Early-Exit Flow</h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleResetAI}
                  className="text-[10px] font-bold text-[var(--accent-blue)] uppercase hover:underline flex items-center gap-1 font-mono"
                >
                  AUTO-SORT
                </button>
                <span className="font-mono text-xs font-bold text-[var(--accent-green)]">2,502ms</span>
              </div>
            </div>

            <div className="space-y-3">
              {recommendedOrder.map((step, idx) => (
                <div 
                  key={step} 
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all hover:border-white/20 ${stepClasses[step] || 'bg-white/5 border-[var(--border)] text-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[10px] w-4 opacity-75">0{idx + 1}</span>
                    <span className="font-bold">{step}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--tx-secondary)] font-bold">{stepTimes[step] || '—'}</span>
                    <div className="flex items-center gap-1.5 border-l border-[var(--border)] pl-3">
                      <button 
                        disabled={idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 rounded bg-white/5 text-[var(--tx-secondary)] hover:text-white disabled:opacity-20 transition-colors font-mono text-[9px] w-4 h-4 flex items-center justify-center select-none"
                      >
                        ▲
                      </button>
                      <button 
                        disabled={idx === recommendedOrder.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 rounded bg-white/5 text-[var(--tx-secondary)] hover:text-white disabled:opacity-20 transition-colors font-mono text-[9px] w-4 h-4 flex items-center justify-center select-none"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 mt-6">
            {/* Simulation Popup Result */}
            {simulationResult && (
              <div className="bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 p-4 rounded-xl space-y-2 animate-fade-in font-mono">
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent-green)] font-bold uppercase tracking-wider">
                  <span className="font-mono text-[var(--accent-green)] font-bold select-none">[✓]</span>
                  Simulation Verified
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-[var(--tx-secondary)] block">Simulated Time</span>
                    <span className="text-white font-bold">{simulationResult.simulated_time_ms}ms</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--tx-secondary)] block">Yield Delta</span>
                    <span className="text-white font-bold">+{simulationResult.yield_delta}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--tx-secondary)] block">Confidence</span>
                    <span className="text-white font-bold">{simulationResult.confidence_pct}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Savings projection banner */}
            <div className="grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-4">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3 rounded-xl">
                <span className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider block">Time Saved</span>
                <span className="text-base font-bold font-mono text-[var(--accent-green)] mt-1 block">48.1%</span>
              </div>
              <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3 rounded-xl">
                <span className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider block">Yield Gain</span>
                <span className="text-base font-bold font-mono text-[var(--accent-green)] mt-1 block">+1.2%</span>
              </div>
              <div className="bg-[var(--bg-elevated)] border border-[var(--border)] p-3 rounded-xl">
                <span className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider block">Cost Delta</span>
                <span className="text-base font-bold font-mono text-[var(--accent-green)] mt-1 block">-$0.043</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSimulate}
                disabled={simulateFlow.isPending}
                className="flex-1 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border)] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg font-mono"
              >
                ► {simulateFlow.isPending ? 'SIMULATING...' : 'SIMULATE REORDER'}
              </button>
              <button
                onClick={handleApply}
                disabled={applyFlow.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white font-bold text-xs transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5 shadow-lg"
              >
                {applyFlow.isPending ? 'APPLYING...' : 'APPLY AI FLOW'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
