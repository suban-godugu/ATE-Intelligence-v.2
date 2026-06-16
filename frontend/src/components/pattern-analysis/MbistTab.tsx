'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader, Badge, CoverageBar, DataTable } from '@/components/ui/ChartPrimitives';
import { GlassCard } from './SharedComponents';
import { mbistData } from '@/lib/mockData';
import { format } from 'date-fns';
import { Sparkles } from 'lucide-react';


const ALGO_COLORS: Record<string, string> = {
  'MARCH C-': '#3b82f6',
  'MATS++':   '#8b5cf6',
  'GALPAT':   '#10b981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl select-none">
      <p className="mb-1 font-semibold text-slate-350">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function MbistTab() {
  const { totalMemories, failedMemories, passRate, avgCoverage, byAlgorithm, results } = mbistData;

  const algoBarData = byAlgorithm.map((a) => ({
    name: a.algorithm,
    pass: a.totalPass,
    fail: a.totalFail,
    coverage: a.avgCoverage,
  }));

  const coverageBarData = results.slice(0, 16).map((r, i) => ({
    name: `M${i + 1}`,
    coverage: parseFloat(r.coveragePct.toFixed(2)),
    algo: r.algorithm,
    id: r.memoryCellId,
    failed: r.failCount > 0,
  }));

  const tableRows = results.slice(0, 10).map((r) => [
    <span key={`id-${r.id}`} className="font-mono text-xs text-slate-400">{r.memoryCellId}</span>,
    <Badge key={`algo-${r.id}`} color={r.algorithm === 'MARCH C-' ? 'blue' : r.algorithm === 'MATS++' ? 'purple' : 'green'}>
      {r.algorithm}
    </Badge>,
    `${r.wordLines} × ${r.bitLines}`,
    <span key={`pass-${r.id}`} className="font-mono text-emerald-400 font-bold">{r.passCount}</span>,
    <span key={`fail-${r.id}`} className={`font-mono font-bold ${r.failCount > 0 ? 'text-red-400' : 'text-slate-655'}`}>{r.failCount}</span>,
    <span key={`cov-${r.id}`} className={`font-mono font-semibold ${r.coveragePct >= 95 ? 'text-emerald-400' : r.coveragePct >= 90 ? 'text-blue-400' : 'text-amber-400'}`}>
      {r.coveragePct.toFixed(1)}%
    </span>,
    format(new Date(r.testedAt), 'HH:mm:ss'),
  ]);

  return (
    <div className="fade-in-up">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
        {/* Row 1 Left: Algorithm comparison */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.25)" // Purple accent for MBIST
          glowColor="rgba(139, 92, 246, 0.08)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Results by Algorithm" subtitle="Pass/Fail breakdown per MBIST algorithm" />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={algoBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pass" name="Pass" stackId="a" fill="#10b981" />
                  <Bar dataKey="fail" name="Fail" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Row 1 Right: Per-memory coverage */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.25)"
          glowColor="rgba(139, 92, 246, 0.08)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Coverage per Memory Cell" subtitle="First 16 cells — red = fault detected" />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis domain={[80, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="coverage" name="Coverage %" radius={[3, 3, 0, 0]}>
                    {coverageBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.failed ? '#ef4444' : ALGO_COLORS[entry.algo] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Row 2 Left: Memory Cell Results Table */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.25)"
          glowColor="rgba(139, 92, 246, 0.08)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Memory Cell Results" subtitle="Detailed block execution log" />
            <div className="max-h-[260px] overflow-y-auto mt-2">
              <DataTable
                headers={['Cell ID', 'Algorithm', 'Array Size', 'Pass', 'Fail', 'Coverage', 'Tested At']}
                rows={tableRows}
              />
            </div>
          </div>
        </GlassCard>

        {/* Row 2 Right: AI Findings & Insights Panel */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.3)"
          glowColor="rgba(139, 92, 246, 0.1)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                <span>AI Diagnostics Findings</span>
              </h3>
              <Badge color="red">9 Failed Blocks</Badge>
            </div>

            <div className="space-y-2 text-xs select-none">
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <p className="text-slate-300">
                  <span className="font-semibold text-white">9 failing memory blocks</span> detected on SRAM banks.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <p className="text-slate-300">
                  <span className="font-semibold text-white">March C-</span> produces the highest average coverage ({avgCoverage}%).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <p className="text-slate-300">
                  <span className="font-semibold text-white">3 memory cells</span> (M2, M5, M14) are repeatedly failing wordline triggers.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <p className="text-slate-300">
                  Spare column and local redundancy usage reaching <span className="font-semibold text-white">82%</span> capacity.
                </p>
              </div>
            </div>

            <div className="border border-purple-500/20 bg-purple-500/5 p-3 rounded-lg text-xs space-y-1">
              <span className="font-bold text-purple-400 uppercase tracking-wider">Recommendation</span>
              <p className="font-bold text-white text-[12px] mt-0.5">Switch to MATS++</p>
              <p className="text-slate-400 text-[10px] leading-normal">
                Transitioning active testing sequences to MATS++ recovers timing margin and removes address decoding overhead, saving approximately 14% test execution time.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

