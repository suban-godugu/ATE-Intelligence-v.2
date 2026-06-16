'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Search, Sparkles } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader, Badge, DataTable } from '@/components/ui/ChartPrimitives';
import { GlassCard } from './SharedComponents';
import { lbistData } from '@/lib/mockData';
import { format } from 'date-fns';
import { TabEmptyState } from './TabEmptyState';

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

export function LbistTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      {/* Two Column Charts Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-40 bg-slate-850 rounded" />
              <div className="h-3 w-56 bg-slate-850 rounded" />
            </div>
            <div className="h-[240px] bg-slate-950/30 rounded-lg border border-slate-850/20 flex items-end p-4 justify-between">
              {[...Array(16)].map((_, j) => (
                <div key={j} className="bg-slate-800/50 rounded-t w-4" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Large Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 space-y-4">
        <div className="h-4.5 w-40 bg-slate-850 rounded" />
        <div className="space-y-3">
          <div className="grid grid-cols-6 gap-4 border-b border-slate-850/30 pb-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 w-16 bg-slate-800 rounded" />
            ))}
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-2 border-b border-slate-850/20">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-3 w-12 bg-slate-850 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LbistTab() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const { totalBlocks, passRate, avgCoverage, results } = lbistData;

  const filteredResults = results.filter((r) =>
    r.logicBlockId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.seedValue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const coverageBarData = filteredResults.slice(0, 20).map((r, i) => ({
    name: `B${i + 1}`,
    coverage: parseFloat(r.coveragePct.toFixed(2)),
    passed: r.signaturePassed,
    id: r.logicBlockId,
  }));

  const clockBarData = filteredResults.slice(0, 16).map((r, i) => ({
    name: `B${i + 1}`,
    cycles: r.clockCycles,
    passed: r.signaturePassed,
  }));

  const tableRows = filteredResults.slice(0, 12).map((r) => [
    <span key={`id-${r.id}`} className="font-mono text-xs text-slate-400">{r.logicBlockId}</span>,
    <span key={`seed-${r.id}`} className="font-mono text-xs text-slate-500">{r.seedValue}</span>,
    r.clockCycles.toLocaleString(),
    <Badge key={`sig-${r.id}`} color={r.signaturePassed ? 'green' : 'red'}>
      {r.signaturePassed ? '✓ PASS' : '✗ FAIL'}
    </Badge>,
    <span key={`cov-${r.id}`} className={`font-mono font-semibold ${r.coveragePct >= 93 ? 'text-emerald-400' : r.coveragePct >= 88 ? 'text-blue-400' : 'text-red-400'}`}>
      {r.coveragePct.toFixed(1)}%
    </span>,
    format(new Date(r.testedAt), 'HH:mm:ss'),
  ]);

  const passedBlocks = filteredResults.filter((r) => r.signaturePassed);
  const failedBlocksList = filteredResults.filter((r) => !r.signaturePassed);
  const avgCycles = filteredResults.length > 0 
    ? Math.round(filteredResults.reduce((s, r) => s + r.clockCycles, 0) / filteredResults.length)
    : 0;

  if (loading) {
    return <LbistTabSkeleton />;
  }

  return (
    <div className="fade-in-up">
      {filteredResults.length === 0 ? (
        <TabEmptyState query={searchQuery} onClear={() => setSearchQuery('')} title="No Logic Blocks Found" />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
          {/* Row 1 Left: Coverage per block */}
          <GlassCard
            borderColor="rgba(6, 182, 212, 0.25)" // Cyan accent for LBIST
            glowColor="rgba(6, 182, 212, 0.08)"
            padding="20px"
            className="relative shadow-lg flex flex-col justify-between"
          >
            <div>
              <SectionHeader title="Coverage per Logic Block" subtitle="Purple = pass, red = fail" />
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={coverageBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis domain={[80, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="coverage" name="Coverage %" radius={[3, 3, 0, 0]}>
                      {coverageBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.passed ? '#8b5cf6' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          {/* Row 1 Right: Clock cycles */}
          <GlassCard
            borderColor="rgba(6, 182, 212, 0.25)"
            glowColor="rgba(6, 182, 212, 0.08)"
            padding="20px"
            className="relative shadow-lg flex flex-col justify-between"
          >
            <div>
              <SectionHeader title="Clock Cycles per Block" subtitle="Test duration in clock cycles" />
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clockBarData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="cycles" name="Clock Cycles" radius={[3, 3, 0, 0]}>
                      {clockBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.passed ? '#06b6d4' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GlassCard>

          {/* Row 2 Left: Table with search */}
          <GlassCard
            borderColor="rgba(6, 182, 212, 0.25)"
            glowColor="rgba(6, 182, 212, 0.08)"
            padding="20px"
            className="relative shadow-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none mb-4">
              <SectionHeader title="Logic Block LBIST Results" subtitle="Block status log" />
              <div className="relative w-full sm:w-56 shrink-0">
                <input
                  type="text"
                  placeholder="Search block..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-slate-950/60 border border-slate-800/80 rounded-lg text-slate-250 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              <DataTable
                headers={['Block ID', 'Seed Value', 'Clock Cycles', 'Signature', 'Coverage', 'Tested At']}
                rows={tableRows}
              />
            </div>
          </GlassCard>

          {/* Row 2 Right: AI Findings & Insights Panel */}
          <GlassCard
            borderColor="rgba(6, 182, 212, 0.3)"
            glowColor="rgba(6, 182, 212, 0.1)"
            padding="20px"
            className="relative shadow-lg flex flex-col justify-between animate-fade-in"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
                  <span>LBIST AI Findings</span>
                </h3>
                <Badge color="red">{failedBlocksList.length} Failures</Badge>
              </div>

              <div className="space-y-2 text-xs select-none">
                <div className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <p className="text-slate-350">
                    <span className="font-semibold text-white">{failedBlocksList.length} logic blocks</span> failed PRPG signature mismatch.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <p className="text-slate-350">
                    Average logic block coverage matches sign-off target at <span className="font-semibold text-white">{avgCoverage}%</span>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <p className="text-slate-350">
                    Block <span className="font-semibold text-white">L12</span> and <span className="font-semibold text-white">L18</span> show repeating seed signature clock-domain crossings failures.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <p className="text-slate-350">
                    Average clock cycles per run steady at <span className="font-semibold text-white">{avgCycles.toLocaleString()}</span>.
                  </p>
                </div>
              </div>

              <div className="border border-cyan-500/20 bg-cyan-500/5 p-3 rounded-lg text-xs space-y-1">
                <span className="font-bold text-cyan-400 uppercase tracking-wider">Timing Optimization</span>
                <p className="font-bold text-white text-[12px] mt-0.5">Adjust scan-clock phase shift</p>
                <p className="text-slate-400 text-[10px] leading-normal">
                  Applying a 150ps timing phase-shift skew to boundary blocks L12 & L18 resolves active clock-skew mismatches and recovers 100% of the signature pass rate.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

