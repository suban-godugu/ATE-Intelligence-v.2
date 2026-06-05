'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader, Badge, CoverageBar, DataTable } from '@/components/ui/ChartPrimitives';
import { GlassCard } from './SharedComponents';
import { mbistData } from '@/lib/mockData';
import { format } from 'date-fns';

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
    <div className="space-y-6 fade-in-up">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 select-none">
        <StatCard title="Memory Instances" value={totalMemories} subtitle="Total tested" color="blue" />
        <StatCard title="Failing Memories" value={failedMemories} subtitle={`${passRate}% pass rate`} color="red" />
        <StatCard title="Pass Rate" value={`${passRate}%`} subtitle={`${totalMemories - failedMemories} memories`} color="green" />
        <StatCard title="Avg Coverage" value={`${avgCoverage}%`} subtitle="All algorithms" color="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-stretch">
        {/* Algorithm comparison */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.25)" // Purple accent for MBIST
          glowColor="rgba(139, 92, 246, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Results by Algorithm" subtitle="Pass/Fail breakdown per MBIST algorithm" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={algoBarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pass" name="Pass" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                <Bar dataKey="fail" name="Fail" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Per-memory coverage */}
        <GlassCard
          borderColor="rgba(139, 92, 246, 0.25)"
          glowColor="rgba(139, 92, 246, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Coverage per Memory Cell" subtitle="First 16 cells — red = fault detected" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={coverageBarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
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
        </GlassCard>
      </div>

      {/* Algorithm Detail Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 select-none">
        {byAlgorithm.map((a) => (
          <GlassCard
            key={a.algorithm}
            borderColor="rgba(139, 92, 246, 0.2)"
            glowColor="rgba(139, 92, 246, 0.04)"
            padding="20px"
            className="relative shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-slate-200" style={{ color: ALGO_COLORS[a.algorithm] }}>{a.algorithm}</h4>
              <Badge color={a.avgCoverage >= 95 ? 'green' : 'amber'}>{a.instanceCount} cells</Badge>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Pass</span><span className="font-mono font-bold text-emerald-450">{a.totalPass}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Fail</span><span className="font-mono font-bold text-red-405">{a.totalFail}</span></div>
              <div className="mt-4">
                <CoverageBar label="Avg Coverage" value={a.avgCoverage} target={95} color={ALGO_COLORS[a.algorithm]} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Table */}
      <GlassCard
        borderColor="rgba(139, 92, 246, 0.25)"
        glowColor="rgba(139, 92, 246, 0.08)"
        padding="24px"
        className="relative shadow-lg"
      >
        <SectionHeader title="Memory Cell Results" />
        <DataTable
          headers={['Cell ID', 'Algorithm', 'Array Size', 'Pass', 'Fail', 'Coverage', 'Tested At']}
          rows={tableRows}
        />
      </GlassCard>
    </div>
  );
}
