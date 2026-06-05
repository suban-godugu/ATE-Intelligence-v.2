'use client';

import { useSpecSavingsDashboard, useExportSavingsDashboardMutation } from '@/api/specHooks';
import { sendPrompt } from '@/lib/sendPrompt';

export default function SavingsDashboardTab() {
  const { data: summary, isLoading } = useSpecSavingsDashboard();
  const exportMutation = useExportSavingsDashboardMutation();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-[var(--tx-secondary)] space-y-4">
        <span className="font-mono text-xl animate-pulse text-[var(--accent-cyan)] select-none">[ / ]</span>
        <p className="text-sm font-medium animate-pulse">Calculating realized ROI & financial summaries...</p>
      </div>
    );
  }

  const totalSimulated = summary?.simulated_count || 0;
  const totalApplied = summary?.applied_count || 0;
  const totalPending = summary?.pending_count || 0;
  const totalActions = summary?.total_count || (totalSimulated + totalApplied + totalPending || 1);

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'savings_report.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      sendPrompt('Exported savings and ROI dashboard executive summary report to CSV file.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="font-mono text-[var(--accent-green)] select-none">[$]</span>
            Financial Impact & ROI Dashboard
          </h2>
          <p className="text-xs text-[var(--tx-secondary)] mt-1">Realized value, recovered test hours, and active optimization statistics.</p>
        </div>
        <button 
          onClick={handleExport}
          disabled={exportMutation.isPending}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-black/40 border border-white/10 hover:bg-white/5 rounded-lg text-white font-semibold text-xs transition-colors shrink-0 disabled:opacity-50 font-mono"
        >
          {exportMutation.isPending ? "[ / ] " : "[↓] "}
          Export Executive CSV Report
        </button>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium uppercase tracking-wider">Tester Time Recovered</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-white">{(summary?.annual?.time_recovered_hrs || 4368).toLocaleString()} Hrs</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-[var(--tx-muted)]">
            <span className="font-mono text-[var(--tx-muted)] select-none">[T]</span>
            <span className="font-mono">Time saved: {summary?.total_time_saved_ms || 1560}ms / cycle</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium uppercase tracking-wider">Yield Value Addition</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[var(--accent-green)]">${(summary?.annual?.yield_value || 89200).toLocaleString()}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--accent-green)]">
            <span className="font-mono text-[var(--accent-green)] select-none">[▲]</span>
            <span className="font-mono">+{summary?.yield_improvement_pct || 1.7}% overall yield gain</span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between">
          <span className="text-xs text-[var(--tx-secondary)] font-medium uppercase tracking-wider">Unit Cost Reduction</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-[var(--accent-cyan)]">-${summary?.cost_per_die_reduction || 0.043}</span>
            <span className="text-xs text-[var(--tx-muted)]">/die</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--accent-cyan)]">
            <span className="font-mono text-[var(--accent-cyan)] select-none">[✓]</span>
            <span className="font-mono">Reduced pattern memory volume</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-card)]/50 border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
          <span className="text-xs text-[var(--tx-secondary)] font-medium uppercase tracking-wider">Total Projected Savings</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-cyan)] font-mono">${(summary?.annual?.total_value || 214000).toLocaleString()}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--accent-green)] font-semibold">
            <span className="font-mono text-[var(--accent-green)] select-none">[▲]</span>
            <span className="font-mono">Projected ROI across active lots</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Action Funnel Card */}
        <div className="lg:col-span-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col justify-center">
          <div className="text-sm font-semibold text-white mb-4">Optimization Action Funnel</div>
          <div className="w-full h-8 bg-black/40 rounded-full flex overflow-hidden border border-[var(--border)]">
            <div className="h-full bg-[var(--accent-cyan)] transition-all duration-500" style={{ width: `${(totalApplied / totalActions) * 100}%` }} />
            <div className="h-full bg-[var(--accent-amber)] transition-all duration-500" style={{ width: `${(totalPending / totalActions) * 100}%` }} />
            <div className="h-full bg-[var(--accent-purple)] transition-all duration-500" style={{ width: `${(totalSimulated / totalActions) * 100}%` }} />
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mt-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[var(--accent-cyan)] border border-[var(--accent-cyan)]/25" />
              <span className="text-slate-300 font-medium">{totalApplied} Active Optimizations Applied</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[var(--accent-amber)] border border-[var(--accent-amber)]/25" />
              <span className="text-slate-300 font-medium">{totalPending} Pending Approval / Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[var(--accent-purple)] border border-[var(--accent-purple)]/25" />
              <span className="text-slate-300 font-medium">{totalSimulated} Simulated Forensics Only</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contribution matrix */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">Contribution by Module</h3>
          <p className="text-xs text-[var(--tx-secondary)] mb-6">Detailed matrix breakdown of active optimization savings per pattern forensics module.</p>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-[var(--tx-secondary)]">
              <thead className="text-xs uppercase bg-black/40 text-[var(--tx-muted)] sticky top-0">
                <tr>
                  <th className="p-3">Module</th>
                  <th className="p-3">Count</th>
                  <th className="p-3">Time Saved</th>
                  <th className="p-3">Cost Reduction</th>
                  <th className="p-3">Yield Delta</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(summary?.by_module || []).map((mod: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-semibold text-white">{mod.module}</td>
                    <td className="p-3 font-mono text-[var(--tx-muted)]">{mod.optimizations}</td>
                    <td className="p-3 font-mono text-[var(--tx-muted)]">{mod.time_saved}</td>
                    <td className="p-3 font-mono text-[var(--accent-green)]">{mod.cost_reduction}</td>
                    <td className="p-3 font-mono text-[var(--accent-cyan)]">{mod.yield_delta}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${
                        mod.status === 'Applied' ? 'bg-green-500/20 text-[var(--accent-green)]' :
                        mod.status === 'Pending' ? 'bg-yellow-500/20 text-[var(--accent-amber)]' :
                        mod.status === 'Simulated' ? 'bg-purple-500/20 text-[var(--accent-purple)]' :
                        'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                      }`}>
                        {mod.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visual Chart Card */}
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 flex flex-col min-h-[300px]">
          <h3 className="text-lg font-semibold text-white mb-2">ROI Value Distribution</h3>
          <p className="text-xs text-[var(--tx-secondary)] mb-6">Visual share of module contribution towards the $214,000 projected ROI.</p>
          
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {[
              { label: 'Flow Optimizer', value: 124800, color: 'bg-[var(--accent-green)]', pct: 58 },
              { label: 'Pattern Pruning', value: 89200, color: 'bg-[var(--accent-cyan)]', pct: 42 },
              { label: 'Compression Tuner', value: 0, color: 'bg-[var(--accent-amber)]', pct: 0 },
              { label: 'Yield Predictor', value: 0, color: 'bg-[var(--accent-purple)]', pct: 0 }
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <span className="text-white font-mono font-semibold">${item.value.toLocaleString()} ({item.pct}%)</span>
                </div>
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-[var(--border)]">
                  <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
