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
import { Sparkles } from 'lucide-react';

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
    <div className="fade-in-up">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
        {/* Row 1 Left: Type pie */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.25)" // Orange accent for BIST
          glowColor="rgba(249, 115, 22, 0.08)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="BIST Type Distribution" subtitle="Test count by type" />
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={50} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-450 font-semibold">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Row 1 Right: Coverage by type */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.25)"
          glowColor="rgba(249, 115, 22, 0.08)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <SectionHeader title="Coverage & Pass Rate by Type" subtitle="BIST execution status summary" />
            <div className="space-y-3 pt-2">
              {byType.map((t) => (
                <div key={t.bistType} className="space-y-1 select-none">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full animate-pulse" style={{ background: TYPE_COLORS[t.bistType] }} />
                      <span className="font-semibold text-slate-300">{t.bistType}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-450 font-bold">Pass: {t.totalPass}</span>
                      <span className="text-red-405 font-bold">Fail: {t.totalFail}</span>
                      <span className="font-mono font-bold text-slate-205">{t.avgCoverage}%</span>
                    </div>
                  </div>
                  <CoverageBar label="" value={t.avgCoverage} target={95} color={TYPE_COLORS[t.bistType]} showValue={false} />
                </div>
              ))}

              <div className="mt-2 rounded-xl border border-slate-900 bg-slate-950/20 p-2.5 select-none h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pass" name="Pass" stackId="a" fill="#10b981" />
                    <Bar dataKey="fail" name="Fail" stackId="a" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Row 2 Left: Table */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.25)"
          glowColor="rgba(249, 115, 22, 0.08)"
          padding="20px"
          className="relative shadow-lg"
        >
          <div>
            <SectionHeader title="BIST Test Results" subtitle="Log of BIST register sweeps" />
            <div className="max-h-[260px] overflow-y-auto mt-2">
              <DataTable
                headers={['Block ID', 'Type', 'Mode', 'Pass', 'Fail', 'Coverage', 'Duration', 'Tested At']}
                rows={tableRows}
              />
            </div>
          </div>
        </GlassCard>

        {/* Row 2 Right: AI Findings & Insights Panel */}
        <GlassCard
          borderColor="rgba(249, 115, 22, 0.3)"
          glowColor="rgba(249, 115, 22, 0.1)"
          padding="20px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-orange-400 animate-pulse" />
                <span>BIST AI Findings</span>
              </h3>
              <Badge color="amber">14 Failures</Badge>
            </div>

            <div className="space-y-2 text-xs select-none">
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <p className="text-slate-355">
                  <span className="font-semibold text-white">14 BIST failures</span> observed across LBIST logic gates and MBIST cell matrices.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <p className="text-slate-355">
                  ABIST analog signal checks verified <span className="font-semibold text-white">100% pass</span> on active voltage rails.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <p className="text-slate-355">
                  Total combined duration of BIST runs clocked at <span className="font-semibold text-white">{(totalDuration / 1000).toFixed(1)} seconds</span>.
                </p>
              </div>
            </div>

            <div className="border border-orange-500/20 bg-orange-500/5 p-3 rounded-lg text-xs space-y-1">
              <span className="font-bold text-orange-400 uppercase tracking-wider">Test Compaction</span>
              <p className="font-bold text-white text-[12px] mt-0.5">Compact overlapping MBIST registers</p>
              <p className="text-slate-400 text-[10px] leading-normal">
                Merging redundant test register sweeps on matching memory banks trims off { (totalDuration * 0.08).toFixed(0) }ms of unnecessary clock cycles.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

