'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader, Badge, CoverageBar, DataTable } from '@/components/ui/ChartPrimitives';
import { GlassCard } from './SharedComponents';
import { bistData } from '@/lib/mockData';
import { format } from 'date-fns';

const TYPE_COLORS: Record<string, string> = {
  MBIST: '#3b82f6',
  LBIST: '#8b5cf6',
  ABIST: '#10b981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-slate-350">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function BistTab() {
  const { totalTests, byType, results } = bistData;

  const totalPass = byType.reduce((s, t) => s + t.totalPass, 0);
  const totalFail = byType.reduce((s, t) => s + t.totalFail, 0);
  const totalDuration = byType.reduce((s, t) => s + t.totalDurationMs, 0);

  const pieData = byType.map((t) => ({ name: t.bistType, value: t.instanceCount }));

  const barData = byType.map((t) => ({
    name: t.bistType,
    pass: t.totalPass,
    fail: t.totalFail,
    coverage: t.avgCoverage,
    duration: t.totalDurationMs,
  }));

  const tableRows = results.slice(0, 12).map((r) => [
    <span key={`blockId-${r.id}`} className="font-mono text-xs text-slate-400">{r.blockId}</span>,
    <Badge key={`type-${r.id}`} color={r.bistType === 'MBIST' ? 'blue' : r.bistType === 'LBIST' ? 'purple' : 'green'}>
      {r.bistType}
    </Badge>,
    r.testMode,
    <span key={`pass-${r.id}`} className="font-mono text-emerald-400 font-bold">{r.passCount}</span>,
    <span key={`fail-${r.id}`} className={`font-mono font-bold ${r.failCount > 0 ? 'text-red-400' : 'text-slate-650'}`}>{r.failCount}</span>,
    <span key={`cov-${r.id}`} className={`font-mono font-semibold ${r.coveragePct >= 95 ? 'text-emerald-400' : r.coveragePct >= 90 ? 'text-blue-400' : 'text-amber-400'}`}>
      {r.coveragePct.toFixed(1)}%
    </span>,
    <span key={`dur-${r.id}`} className="font-mono text-slate-400">{r.durationMs.toFixed(0)} ms</span>,
    format(new Date(r.testedAt), 'HH:mm:ss'),
  ]);

  return (
    <div className="space-y-6 fade-in-up">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 select-none">
        <StatCard title="Total BIST Tests" value={totalTests} subtitle="All types combined" color="blue" />
        <StatCard title="Passed" value={totalPass} subtitle={`${((totalPass / totalTests) * 100).toFixed(1)}% pass rate`} color="green" />
        <StatCard title="Failed" value={totalFail} subtitle="Across all types" color="red" />
        <StatCard title="Total Duration" value={`${(totalDuration / 1000).toFixed(1)}s`} subtitle="Combined execution" color="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-stretch">
        {/* Type pie */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.25)" // Orange accent for BIST
          glowColor="rgba(249, 115, 22, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="BIST Type Distribution" subtitle="Test count by type" />
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Coverage by type */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.25)"
          glowColor="rgba(249, 115, 22, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Coverage & Pass Rate by Type" />
            <div className="space-y-4 pt-2">
              {byType.map((t) => (
                <div key={t.bistType} className="space-y-2 select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ background: TYPE_COLORS[t.bistType] }} />
                      <span className="text-sm font-semibold text-slate-300">{t.bistType}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-450 font-bold">Pass: {t.totalPass}</span>
                      <span className="text-red-405 font-bold">Fail: {t.totalFail}</span>
                      <span className="font-mono font-bold text-slate-205">{t.avgCoverage}%</span>
                    </div>
                  </div>
                  <CoverageBar label="" value={t.avgCoverage} target={95} color={TYPE_COLORS[t.bistType]} showValue={false} />
                </div>
              ))}

              <div className="mt-4 rounded-xl border border-slate-900 bg-slate-950/20 p-3 select-none">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pass" name="Pass" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                    <Bar dataKey="fail" name="Fail" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <GlassCard
        borderColor="rgba(249, 115, 22, 0.25)"
        glowColor="rgba(249, 115, 22, 0.08)"
        padding="24px"
        className="relative shadow-lg"
      >
        <SectionHeader title="BIST Test Results" />
        <DataTable
          headers={['Block ID', 'Type', 'Mode', 'Pass', 'Fail', 'Coverage', 'Duration', 'Tested At']}
          rows={tableRows}
        />
      </GlassCard>
    </div>
  );
}
