import { useState, useEffect } from 'react';
import { 
  useSpecCompressionTuner, 
  useCompressionPreview, 
  useApplyCompressionMutation, 
  useSimulateCompressionMutation 
} from '@/api/specHooks';
import { sendPrompt } from '@/lib/sendPrompt';

export default function CompressionTunerTab() {
  const { data: tunerData, isLoading: isTunerLoading } = useSpecCompressionTuner();
  const applyCompression = useApplyCompressionMutation();
  const simulateCompression = useSimulateCompressionMutation();

  const [ratio, setRatio] = useState<number>(32);
  const [applyResult, setApplyResult] = useState<any>(null);
  const [simResult, setSimResult] = useState<any>(null);

  // Set default ratio based on current ratio from backend spec
  useEffect(() => {
    if (tunerData?.current_ratio) {
      setRatio(tunerData.current_ratio);
    }
  }, [tunerData]);

  // Use the compression preview hook to fetch real-time analytics
  const { data: previewData, isLoading: isPreviewLoading } = useCompressionPreview(ratio);

  if (isTunerLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--tx-secondary)] space-y-4">
        <span className="font-mono text-lg animate-pulse select-none">[ / ]</span>
        <p className="text-sm font-medium animate-pulse">Loading Scan-Chain Compressor configs...</p>
      </div>
    );
  }

  const handleSimulate = async () => {
    try {
      const res = await simulateCompression.mutateAsync({ ratio });
      setSimResult(res);
      setApplyResult(null);
      sendPrompt(`Simulate scan EDT compression ratio tuning to ${ratio}x. Estimated scan time is ${res.new_scan_time_ms}ms with an estimated fault coverage impact of ${res.coverage_impact_pct}%.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async () => {
    try {
      const res = await applyCompression.mutateAsync({ ratio });
      setApplyResult(res);
      setSimResult(null);
      sendPrompt(`Applied EDT scan-compression upgrade to ${ratio}x. Rebalanced chains, compressed pattern volumes, and achieved final scan time of ${res.new_scan_time_ms}ms.`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Recommendation */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-purple)]/10 rounded-lg text-[var(--accent-purple)] font-mono text-xs font-bold select-none">
            [ AI ]
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">AI EDT Upgrade Available</h4>
            <p className="text-xs text-[var(--tx-secondary)] mt-0.5">
              Increasing compression from {tunerData?.current_ratio}x to {tunerData?.recommended_ratio}x is projected to reduce scan test time by {tunerData?.scan_in_time_reduction_pct}%.
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            setRatio(64);
            sendPrompt('Configure EDT Compression Tuner ratio to recommended 64x');
          }}
          className="text-xs px-4 py-2 bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/80 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-[var(--accent-purple)]/10 shrink-0"
        >
          Select Recommended 64x
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tuner Interface */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col justify-between min-h-[500px]">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="font-mono text-[var(--accent-cyan)] font-bold select-none">[#]</span>
              Scan Compression Tuner
            </h3>
            <p className="text-xs text-[var(--tx-secondary)] mb-6">Select a target EDT ratio to preview scan test times, cell imbalance risks, and fault metrics.</p>

            <div className="grid grid-cols-4 gap-4 mb-6">
              {[16, 32, 64, 128].map((r) => (
                <button
                  key={r}
                  onClick={() => setRatio(r)}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                    ratio === r 
                      ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)] text-[var(--accent-cyan)] scale-105 shadow-md shadow-[var(--accent-cyan)]/5' 
                      : 'bg-black/40 border-[var(--border)] text-[var(--tx-muted)] hover:border-white/20'
                  }`}
                >
                  <span className="text-2xl font-bold">{r}x</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Ratio</span>
                </button>
              ))}
            </div>

            {/* Live Prediction Block */}
            <div className="bg-black/30 rounded-xl p-5 border border-[var(--border)] relative min-h-[140px] flex flex-col justify-center">
              {isPreviewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                  <span className="font-mono text-xs text-[var(--accent-cyan)] animate-pulse select-none">[ LOADING ]</span>
                </div>
              ) : null}
              
              <h4 className="text-xs font-semibold text-[var(--tx-muted)] uppercase tracking-wider mb-4">Live Predictive Analytics</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-[10px] text-[var(--tx-muted)] uppercase font-semibold mb-1">Scan Time</div>
                  <div className="text-xl font-bold text-[var(--accent-cyan)]">
                    {previewData ? `${previewData.scan_in_time_ms}ms` : '--'}
                  </div>
                </div>
                <div className="border-x border-white/10">
                  <div className="text-[10px] text-[var(--tx-muted)] uppercase font-semibold mb-1">Coverage impact</div>
                  <div className="text-xl font-bold text-[var(--accent-amber)]">
                    {previewData ? `-${previewData.coverage_impact_pct.toFixed(2)}%` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--tx-muted)] uppercase font-semibold mb-1">Imbalance Risk</div>
                  <div className={`text-xl font-bold ${
                    previewData?.chain_imbalance_risk?.toLowerCase() === 'high' ? 'text-[var(--accent-red)]' : 'text-[var(--accent-green)]'
                  }`}>
                    {previewData ? previewData.chain_imbalance_risk : '--'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            {applyResult ? (
              <div className="bg-green-500/10 border border-green-500/20 text-[var(--accent-green)] rounded-lg p-3 flex items-center gap-2 text-xs animate-fade-in font-mono">
                <span className="font-bold select-none">[✓]</span>
                <span>Successfully applied EDT Upgrade to {ratio}x! New scan time: {applyResult.new_scan_time_ms}ms.</span>
              </div>
            ) : simResult ? (
              <div className="bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 text-[var(--accent-purple)] rounded-lg p-3 flex items-center gap-2 text-xs animate-fade-in font-mono">
                <span className="font-bold select-none">[!]</span>
                <span>Simulated {ratio}x EDT Upgrade! Projected coverage impact: -{simResult.coverage_impact_pct}%.</span>
              </div>
            ) : null}

            <div className="flex gap-4">
              <button 
                onClick={handleSimulate}
                disabled={simulateCompression.isPending}
                className="flex-1 bg-black/40 border border-white/10 hover:bg-white/5 text-white font-semibold py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-sm disabled:opacity-50 font-mono"
              >
                <span>►</span> Simulate {ratio}x Configuration
              </button>
              <button 
                onClick={handleApply}
                disabled={applyCompression.isPending}
                className="flex-1 bg-[var(--accent-cyan)] text-black hover:bg-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 text-sm shadow-lg shadow-[var(--accent-cyan)]/10 disabled:opacity-50"
              >
                Apply EDT Upgrade
              </button>
            </div>
          </div>
        </div>

        {/* Chain Health Summary */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col min-h-[500px]">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span className="font-mono text-[var(--accent-purple)] font-bold select-none">[~]</span>
                Scan Chain Balancing Report
              </h3>
              <p className="text-xs text-[var(--tx-secondary)] mt-1">Physical alignment report of sub-chains running at {tunerData?.current_ratio}x EDT compression.</p>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm text-[var(--tx-secondary)]">
              <thead className="text-xs uppercase bg-black/40 text-[var(--tx-muted)] sticky top-0">
                <tr>
                  <th className="p-3">Chain ID</th>
                  <th className="p-3">Length (cells)</th>
                  <th className="p-3">Load Balance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(tunerData?.chains || []).map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-white font-semibold">{c.id}</td>
                    <td className="p-3 font-mono text-[var(--tx-muted)]">{c.length || c.len}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-black/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              (c.balance || c.balance_pct) < 90 ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-green)]'
                            }`} 
                            style={{ width: `${c.balance || c.balance_pct}%` }} 
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-white">{c.balance || c.balance_pct}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        (c.status || '').toLowerCase() === 'healthy' 
                          ? 'bg-green-500/20 text-[var(--accent-green)]' 
                          : 'bg-yellow-500/20 text-[var(--accent-amber)]'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
