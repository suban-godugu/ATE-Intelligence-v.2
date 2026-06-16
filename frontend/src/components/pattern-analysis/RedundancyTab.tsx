'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Search } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { SectionHeader, Badge, CoverageBar, DataTable } from '@/components/ui/ChartPrimitives';
import { GlassCard } from './SharedComponents';
import { redundancyData } from '@/lib/mockData';
import { TabEmptyState } from './TabEmptyState';
import { cn } from '@/lib/utils';

const TYPE_COLORS: Record<string, string> = {
  COLUMN: '#3b82f6',
  ROW:    '#8b5cf6',
  WORD:   '#10b981',
  BIT:    '#f59e0b',
  LOCAL:  '#06b6d4',
  GLOBAL: '#ec4899',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl select-none">
      <p className="mb-1 font-semibold text-slate-350">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-mono font-bold">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

export function RedundancyTabSkeleton() {
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
            <div className="h-[240px] bg-slate-950/30 rounded-lg border border-slate-850/20" />
          </div>
        ))}
      </div>

      {/* Large Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 space-y-4">
        <div className="h-4.5 w-40 bg-slate-850 rounded" />
        <div className="space-y-3">
          <div className="grid grid-cols-7 gap-4 border-b border-slate-850/30 pb-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-3 w-16 bg-slate-800 rounded" />
            ))}
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-4 py-2 border-b border-slate-850/20">
              {[...Array(7)].map((_, j) => (
                <div key={j} className="h-3 w-12 bg-slate-850 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RedundancyTab() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const { total, repaired, available, depleted, utilizationPct, byType, elements } = redundancyData;

  const filteredElements = elements.filter((e) =>
    e.waferId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.redundancyType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const barData = byType.map((t) => ({
    name: t.redundancyType.slice(0, 4),
    fullName: t.redundancyType,
    repaired: t.repaired,
    available: t.available,
    depleted: t.total - t.repaired - t.available,
  }));

  const tableRows = filteredElements.slice(0, 12).map((e) => [
    <span key={`wid-${e.id}`} className="font-mono text-xs text-slate-400">{e.waferId}</span>,
    `(${e.dieX}, ${e.dieY})`,
    <Badge key={`type-${e.id}`} color={
      e.redundancyType === 'COLUMN' ? 'blue' : e.redundancyType === 'ROW' ? 'purple' :
      e.redundancyType === 'WORD' ? 'green' : e.redundancyType === 'BIT' ? 'amber' : 'cyan'
    }>
      {e.redundancyType}
    </Badge>,
    <span key={`addr-${e.id}`} className="font-mono">{`0x${e.address.toString(16).toUpperCase().padStart(4, '0')}`}</span>,
    <Badge key={`status-${e.id}`} color={e.repaired ? 'green' : e.available ? 'blue' : 'red'}>
      {e.repaired ? '✓ Repaired' : e.available ? 'Available' : 'Depleted'}
    </Badge>,
    <span key={`faults-${e.id}`} className="font-mono font-bold text-slate-200">{e.faultCount}</span>,
    e.repairAddress ? <span key={`rep-${e.id}`} className="font-mono">{`0x${e.repairAddress.toString(16).toUpperCase().padStart(4, '0')}`}</span> : '—',
  ]);

  if (loading) {
    return <RedundancyTabSkeleton />;
  }

  return (
    <div className="space-y-6 fade-in-up">
      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 select-none">
        <StatCard title="Total Spares" value={total} subtitle="Redundancy elements" color="blue" />
        <StatCard title="Repaired" value={repaired} subtitle={`${utilizationPct}% utilized`} color="green" />
        <StatCard title="Available" value={available} subtitle="Unused Spares" color="cyan" />
        <StatCard title="Depleted" value={depleted} subtitle="Exhausted blocks" color="red" />
      </div>

      {filteredElements.length === 0 ? (
        <TabEmptyState query={searchQuery} onClear={() => setSearchQuery('')} title="No Redundancy Elements Found" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-stretch">
            {/* Stacked bar */}
            <GlassCard
              borderColor="rgba(236, 72, 153, 0.25)" // Pink accent for Redundancy
              glowColor="rgba(236, 72, 153, 0.08)"
              padding="20px"
              className="relative shadow-lg flex flex-col justify-between"
            >
              <div>
                <SectionHeader title="Redundancy by Type" subtitle="Repaired | Available | Depleted" />
                <div className="h-[220px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="repaired"  name="Repaired"  stackId="a" fill="#10b981" />
                      <Bar dataKey="available" name="Available" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="depleted"  name="Depleted"  stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </GlassCard>

            {/* Wafer Repair Heatmap Map Visualizer */}
            <GlassCard
              borderColor="rgba(236, 72, 153, 0.25)"
              glowColor="rgba(236, 72, 153, 0.08)"
              padding="20px"
              className="relative shadow-lg flex flex-col justify-between"
            >
              <div>
                <SectionHeader title="Silicon Wafer Repair Heatmap" subtitle="Active lot spatial repair status" />
                <div className="flex flex-col items-center justify-center pt-2">
                  {/* Wafer Circle layout */}
                  <div className="relative w-44 h-44 rounded-full border border-slate-800 bg-slate-950/60 flex items-center justify-center p-2 shadow-inner">
                    {/* Notch notch notch */}
                    <div className="absolute bottom-0 left-[45%] right-[45%] h-1 bg-slate-800" />
                    
                    {/* 10x10 coordinates */}
                    <div className="grid grid-cols-10 gap-0.5 w-[120px] h-[120px]">
                      {Array.from({ length: 100 }).map((_, i) => {
                        const x = i % 10;
                        const y = Math.floor(i / 10);
                        // Check if inside circle
                        const isInside = Math.sqrt((x - 4.5)**2 + (y - 4.5)**2) <= 4.5;
                        if (!isInside) return <div key={i} className="w-2.5 h-2.5 bg-transparent" />;
                        
                        const hash = (x * 17 + y * 23) % 100;
                        let bgColor = 'bg-emerald-500/80';
                        let label = 'Repaired';
                        if (hash > 85) {
                          bgColor = 'bg-red-500/90';
                          label = 'Unrepaired';
                        } else if (hash > 70) {
                          bgColor = 'bg-amber-400/95';
                          label = 'Spare Used';
                        }
                        
                        return (
                          <div
                            key={i}
                            className={cn("w-2.5 h-2.5 rounded-sm transition duration-150 cursor-pointer hover:scale-125 hover:z-10", bgColor)}
                            title={`Coordinate: (${x}, ${y}) | Status: ${label}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className="flex items-center gap-4 text-[9px] text-slate-500 mt-3.5 font-mono select-none">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-emerald-500/80 block" />
                      <span>Repaired</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-400/95 block" />
                      <span>Spare Used</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-red-500/90 block" />
                      <span>Unrepaired</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
            {/* Utilization Rate */}
            <GlassCard
              borderColor="rgba(236, 72, 153, 0.25)"
              glowColor="rgba(236, 72, 153, 0.08)"
              padding="20px"
              className="relative shadow-lg xl:col-span-1"
            >
              <div>
                <SectionHeader title="Utilization Rate by Type" subtitle="% of redundancy used" />
                <div className="space-y-3 pt-2">
                  {byType.map((t) => (
                    <div key={t.redundancyType} className="space-y-1 select-none">
                      <CoverageBar
                        label={t.redundancyType}
                        value={t.utilizationPct}
                        target={25}
                        max={100}
                        color={TYPE_COLORS[t.redundancyType]}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Summary Grid of elements */}
            <div className="xl:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {byType.map((t) => (
                <GlassCard
                  key={t.redundancyType}
                  borderColor="rgba(236, 72, 153, 0.2)"
                  glowColor="rgba(236, 72, 153, 0.04)"
                  padding="14px"
                  className="relative text-center shadow-md hover:scale-[1.02] transition-all flex flex-col justify-between"
                >
                  <div className="mb-2 h-1 w-full rounded-full" style={{ background: TYPE_COLORS[t.redundancyType] }} />
                  <div>
                    <p className="text-lg font-bold text-white font-mono">{t.total}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider font-mono leading-none my-1.5" style={{ color: TYPE_COLORS[t.redundancyType] }}>{t.redundancyType}</p>
                  </div>
                  <div className="mt-2.5 space-y-1 text-[11px]">
                    <p className="text-emerald-450 font-bold">{t.repaired} Repaired</p>
                    <p className="text-blue-400 font-bold">{t.available} Spare</p>
                  </div>
                  <p className="mt-2 text-[9px] font-mono text-slate-500 font-bold">{t.utilizationPct}% Used</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </>
      )}



      {/* Table with search */}
      <GlassCard
        borderColor="rgba(236, 72, 153, 0.25)"
        glowColor="rgba(236, 72, 153, 0.08)"
        padding="24px"
        className="relative shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none mb-6">
          <SectionHeader title="Redundancy Element Map" />
          <div className="relative w-full md:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search by wafer ID or repair type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-pink-500/50 transition-all font-medium"
            />
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </div>
        </div>
        {filteredElements.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 font-medium font-mono border border-dashed border-slate-800 rounded-xl select-none">
            NO RECORDS MATCHED FILTER
          </div>
        ) : (
          <DataTable
            headers={['Wafer ID', 'Die (X,Y)', 'Type', 'Address', 'Status', 'Faults', 'Repair Addr']}
            rows={tableRows}
          />
        )}
      </GlassCard>
    </div>
  );
}
