'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Search } from 'lucide-react';
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
      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-5 space-y-2">
            <div className="h-3 w-20 bg-slate-850 rounded" />
            <div className="h-7 w-28 bg-slate-800 rounded" />
            <div className="h-3 w-24 bg-slate-850 rounded" />
          </div>
        ))}
      </div>

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
    <div className="space-y-6 fade-in-up">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 select-none">
        <StatCard title="Logic Blocks" value={filteredResults.length} subtitle="Tested instances" color="purple" />
        <StatCard title="Signature Pass" value={passedBlocks.length} subtitle={`${filteredResults.length > 0 ? Math.round((passedBlocks.length / filteredResults.length) * 100) : 0}% pass rate`} color="green" />
        <StatCard title="Signature Fail" value={failedBlocksList.length} subtitle="Mismatch detected" color="red" />
        <StatCard title="Avg Clock Cycles" value={avgCycles.toLocaleString()} subtitle="Per test run" color="cyan" />
      </div>

      {filteredResults.length === 0 ? (
        <TabEmptyState query={searchQuery} onClear={() => setSearchQuery('')} title="No Logic Blocks Found" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-stretch">
            {/* Coverage per block */}
            <GlassCard
              borderColor="rgba(6, 182, 212, 0.25)" // Cyan accent for LBIST
              glowColor="rgba(6, 182, 212, 0.08)"
              padding="24px"
              className="relative shadow-lg flex flex-col justify-between"
            >
              <div>
                <SectionHeader title="Coverage per Logic Block" subtitle="Purple = pass, red = fail" />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={coverageBarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
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
            </GlassCard>

            {/* Clock cycles */}
            <GlassCard
              borderColor="rgba(6, 182, 212, 0.25)"
              glowColor="rgba(6, 182, 212, 0.08)"
              padding="24px"
              className="relative shadow-lg flex flex-col justify-between"
            >
              <div>
                <SectionHeader title="Clock Cycles per Block" subtitle="Test duration in clock cycles" />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={clockBarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
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
            </GlassCard>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 select-none">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-center shadow-md">
              <p className="text-2xl font-bold text-emerald-400">{passedBlocks.length}</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Signature Match</p>
            </div>
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-center shadow-md">
              <p className="text-2xl font-bold text-red-400">{failedBlocksList.length}</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Signature Mismatch</p>
            </div>
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4 text-center shadow-md">
              <p className="text-2xl font-bold text-purple-400">{filteredResults.length > 0 ? (filteredResults.reduce((s, r) => s + r.coveragePct, 0) / filteredResults.length).toFixed(1) : 0}%</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Avg Coverage</p>
            </div>
            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-center shadow-md">
              <p className="text-2xl font-bold text-cyan-400">{filteredResults.length > 0 ? Math.round((passedBlocks.length / filteredResults.length) * 100) : 0}%</p>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">Pass Rate</p>
            </div>
          </div>
        </>
      )}

      {/* Table with search */}
      <GlassCard
        borderColor="rgba(6, 182, 212, 0.25)"
        glowColor="rgba(6, 182, 212, 0.08)"
        padding="24px"
        className="relative shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none mb-6">
          <SectionHeader title="Logic Block LBIST Results" />
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search by block ID or seed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all font-medium"
            />
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
        {filteredResults.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-medium font-mono border border-dashed border-slate-800 rounded-xl select-none">
            NO RECORDS MATCHED FILTER
          </div>
        ) : (
          <DataTable
            headers={['Block ID', 'Seed Value', 'Clock Cycles', 'Signature', 'Coverage', 'Tested At']}
            rows={tableRows}
          />
        )}
      </GlassCard>
    </div>
  );
}
