import { useState, useEffect } from 'react';
import { useSpecPatternPruning, useSimulatePatternPruningMutation, useRemovePatternPruningMutation } from '@/api/specHooks';
import { sendPrompt } from '@/lib/sendPrompt';

export default function PatternPruningTab() {
  const { data, isLoading } = useSpecPatternPruning();
  const simulatePruning = useSimulatePatternPruningMutation();
  const removePruning = useRemovePatternPruningMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [pruneResult, setPruneResult] = useState<any>(null);

  // Pre-check candidates with 0.00% coverage impact upon loading
  useEffect(() => {
    if (data?.candidates) {
      const safeIds = data.candidates
        .filter((c: any) => c.coverage_impact_pct === 0)
        .map((c: any) => c.pattern_a);
      setSelected(safeIds);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--tx-secondary)] space-y-4">
        <span className="font-mono text-lg animate-pulse select-none">[ / ]</span>
        <p className="text-sm font-medium animate-pulse">Analyzing pattern database for redundancies...</p>
      </div>
    );
  }

  const candidates = data?.candidates || [];
  const filteredCandidates = candidates.filter((c: any) => 
    c.pattern_a.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pattern_b.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filteredCandidates.length) {
      setSelected([]);
    } else {
      setSelected(filteredCandidates.map((c: any) => c.pattern_a));
    }
  };

  const handleSimulate = async () => {
    if (selected.length === 0) return;
    try {
      const res = await simulatePruning.mutateAsync({ pattern_ids: selected });
      setSimulationResult(res);
      sendPrompt(`Simulated pruning of ${selected.length} patterns: ${selected.join(', ')}. Post-pruning coverage is projected at ${res.after_coverage_pct}% with 0% delta.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrune = async () => {
    if (selected.length === 0) return;
    try {
      const res = await removePruning.mutateAsync({ pattern_ids: selected });
      setPruneResult(res);
      sendPrompt(`Applied bulk redundancy pruning on selected patterns: ${selected.join(', ')}. Removed ${res.removed} redundant patterns and saved $${res.annual_saving_est.toLocaleString()} annually.`);
      setSelected([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium">Redundant Patterns Found</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{data?.redundant_count || 0}</span>
            <span className="text-xs text-[var(--tx-muted)]">out of 1,284</span>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium">Safe to Remove</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[var(--accent-green)]">{data?.safe_to_remove || 0}</span>
            <span className="text-xs text-[var(--tx-muted)]">zero coverage loss</span>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium">Avg Overlap Ratio</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[var(--accent-amber)]">{data?.avg_overlap_pct || 84.6}%</span>
            <span className="text-xs text-[var(--tx-muted)]">high signature overlap</span>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium">Potential Storage Freed</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[var(--accent-purple)]">{data?.data_reduction_gb || 3.2} GB</span>
            <span className="text-xs text-[var(--tx-muted)]">compressed STIL format</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pruning Table */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Redundancy Candidates</h3>
              <p className="text-xs text-[var(--tx-secondary)] mt-1">Select highly overlapping patterns to prune and recover crucial test overhead.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pattern..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 text-xs bg-black/30 border border-[var(--border)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-cyan)]/50 w-44 transition-all"
                />
              </div>
              <button
                onClick={handlePrune}
                disabled={selected.length === 0 || removePruning.isPending}
                className="text-xs bg-red-500/20 text-[var(--accent-red)] hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-red-500/30 font-semibold font-mono"
              >
                {removePruning.isPending ? "[ / ] " : "[x] "}
                Prune Selected ({selected.length})
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-[var(--tx-secondary)]">
              <thead className="text-xs uppercase bg-black/40 text-[var(--tx-muted)] sticky top-0">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center mx-auto">
                      {selected.length === filteredCandidates.length && filteredCandidates.length > 0 ? (
                        <span className="font-mono text-[var(--accent-cyan)] font-bold text-xs select-none">[✓]</span>
                      ) : (
                        <span className="font-mono text-[var(--tx-muted)] font-bold text-xs select-none">[ ]</span>
                      )}
                    </button>
                  </th>
                  <th className="p-4">Pattern ID</th>
                  <th className="p-4">Duplicate Of</th>
                  <th className="p-4">Overlap %</th>
                  <th className="p-4">Unique Vectors</th>
                  <th className="p-4">Coverage Loss</th>
                  <th className="p-4">AI Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredCandidates.map((c: any) => (
                  <tr 
                    key={c.pattern_a} 
                    className={`hover:bg-white/5 transition-colors cursor-pointer ${
                      selected.includes(c.pattern_a) ? 'bg-[var(--accent-cyan)]/5' : ''
                    }`}
                    onClick={() => toggleSelect(c.pattern_a)}
                  >
                    <td className="p-4 text-center">
                      {selected.includes(c.pattern_a) ? (
                        <span className="font-mono text-[var(--accent-cyan)] font-bold text-xs select-none">[✓]</span>
                      ) : (
                        <span className="font-mono text-[var(--tx-muted)] font-bold text-xs select-none">[ ]</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-white font-semibold">{c.pattern_a}</td>
                    <td className="p-4 font-mono text-[var(--tx-muted)]">{c.pattern_b}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-black/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[var(--accent-amber)] to-[var(--accent-amber)]" 
                            style={{ width: `${c.overlap_pct}%` }} 
                          />
                        </div>
                        <span className="font-semibold text-white font-mono">{c.overlap_pct}%</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-[var(--tx-muted)]">{c.unique_vectors}</td>
                    <td className="p-4">
                      <span className={`font-mono text-xs font-semibold ${
                        c.coverage_impact_pct === 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                      }`}>
                        {c.coverage_impact_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold font-mono ${
                        c.confidence_pct >= 90 ? 'bg-green-500/20 text-[var(--accent-green)]' : 'bg-yellow-500/20 text-[var(--accent-amber)]'
                      }`}>
                        {c.confidence_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-[var(--tx-muted)]">
                      No matching redundancy candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Impact Analysis & Simulation */}
        <div className="space-y-6">
          
          {/* Coverage Simulation Preview */}
          <div className="bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-card)]/50 border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <span className="font-mono text-[var(--accent-purple)] select-none">[!]</span>
              Coverage Impact Simulator
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                <span className="text-[var(--tx-secondary)] text-sm">Selected Patterns</span>
                <span className="text-white font-mono text-md font-bold">{selected.length} items</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border)]">
                <span className="text-[var(--tx-secondary)] text-sm">Current Database Coverage</span>
                <span className="text-white font-mono text-md font-bold">94.71%</span>
              </div>
              
              {simulationResult ? (
                <div className="bg-black/30 rounded-lg p-3 border border-[var(--border)] space-y-2 animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--tx-secondary)]">Post-Pruning Coverage:</span>
                    <span className="text-[var(--accent-green)] font-mono font-semibold">{simulationResult.after_coverage_pct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--tx-secondary)]">Net Coverage Loss:</span>
                    <span className="text-[var(--accent-green)] font-mono font-semibold">{simulationResult.delta_pct}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-[var(--border)] pt-1.5 mt-1.5">
                    <span className="text-[var(--tx-secondary)]">Rollback Security Token:</span>
                    <span className="text-[var(--accent-amber)] font-mono font-bold select-all bg-white/5 px-1 py-0.5 rounded">{simulationResult.rollback_token}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[var(--tx-muted)] py-2 italic text-center">
                  Select redundant candidate rows and click Simulate below to test safety thresholds.
                </div>
              )}
              
              <button 
                onClick={handleSimulate}
                disabled={selected.length === 0 || simulatePruning.isPending}
                className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--accent-purple)]/20 hover:bg-[var(--accent-purple)]/30 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-purple)] rounded-lg transition-colors border border-[var(--accent-purple)]/30 font-semibold text-xs font-mono"
              >
                {simulatePruning.isPending ? "[ / ] " : "[►] "}
                Simulate Pruning & Validate Safety
              </button>
            </div>
          </div>

          {/* ROI Card */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center gap-2 text-[var(--tx-secondary)] font-medium text-xs mb-2">
              <span className="font-mono text-[var(--accent-green)] select-none">[▲]</span>
              <span>PROJECTED ANNUAL RETURN ON INVESTMENT</span>
            </div>
            
            {pruneResult ? (
              <div className="space-y-3 animate-fade-in">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] font-mono">
                  ${pruneResult.annual_saving_est.toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--accent-green)] font-mono">
                  <span>[✓] Success: {pruneResult.removed} patterns pruned</span>
                </div>
                <p className="text-xs text-[var(--tx-muted)] leading-normal">
                  Saved {pruneResult.time_saved_ms}ms of tester time, reducing cost per die by ${Math.abs(pruneResult.cost_per_die_delta).toFixed(3)} instantly!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] font-mono">
                  $48,200
                </div>
                <p className="text-xs text-[var(--tx-muted)] leading-normal">
                  Pruning redundant vectors recovers tester buffer capacity, minimizing expensive ATE overhead across 5M dies/year.
                </p>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
