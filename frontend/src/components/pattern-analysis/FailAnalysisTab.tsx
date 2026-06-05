'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  Sparkles,
  Cpu,
  AlertCircle,
  Wand2,
  Clock,
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './SharedComponents';

interface PatternRecord {
  id: string;
  type: string;
  testTime: string;
  costPerDie: string;
  coverage: number;
  failRate: number;
  power: 'HIGH' | 'MEDIUM' | 'LOW';
  domain: string;
}

const INITIAL_PATTERNS: PatternRecord[] = [
  { id: 'PT_077', type: 'SCAN',  testTime: '2840ms', costPerDie: '$0.0518', coverage: 94.2, failRate: 14.2, power: 'HIGH',   domain: 'IO' },
  { id: 'PT_041', type: 'ATPG',  testTime: '1180ms', costPerDie: '$0.0275', coverage: 89.1, failRate: 8.7,  power: 'MEDIUM', domain: 'CORE' },
  { id: 'PT_012', type: 'MBIST', testTime: '440ms',  costPerDie: '$0.0118', coverage: 99.2, failRate: 1.1,  power: 'LOW',    domain: 'MEMORY' },
  { id: 'PT_018', type: 'LBIST', testTime: '320ms',  costPerDie: '$0.0080', coverage: 96.5, failRate: 0.4,  power: 'LOW',    domain: 'LOGIC' },
  { id: 'PT_055', type: 'SCAN',  testTime: '928ms',  costPerDie: '$0.0238', coverage: 91.4, failRate: 6.2,  power: 'HIGH',   domain: 'ANALOG' },
];

export default function FailAnalysisTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  // Live patterns data states
  const [patterns, setPatterns] = useState<PatternRecord[]>(INITIAL_PATTERNS);
  const [pulsePatternId, setPulsePatternId] = useState<string | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Live fail-rate sweeps oscillation (every 6 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * patterns.length);
      const targetPattern = patterns[randomIndex];
      
      setPatterns((current) =>
        current.map((p, idx) => {
          if (idx === randomIndex) {
            // Fluctuate fail rate subtly
            const delta = parseFloat((Math.random() * 0.4 - 0.2).toFixed(1));
            const newRate = parseFloat(Math.min(Math.max(p.failRate + delta, 0.1), 35).toFixed(1));
            return {
              ...p,
              failRate: newRate,
            };
          }
          return p;
        })
      );

      // Flash table cell
      setPulsePatternId(targetPattern.id);
      setTimeout(() => setPulsePatternId(null), 850);
    }, 6000);

    return () => clearInterval(interval);
  }, [patterns]);

  // Telemetry query loader delay (500ms) on row select
  useEffect(() => {
    if (selectedPatternId) {
      setLoadingDiagnostics(true);
      const timer = setTimeout(() => {
        setLoadingDiagnostics(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [selectedPatternId]);

  // Filter types & domains
  const types = ['All Types', 'SCAN', 'ATPG', 'MBIST', 'LBIST'];
  const domains = ['All Domains', 'IO', 'CORE', 'MEMORY', 'LOGIC', 'ANALOG'];

  // Apply filters
  const filteredPatterns = patterns.filter((pattern) => {
    const matchesSearch =
      pattern.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.domain.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'All Types' || pattern.type === selectedType;
    const matchesDomain = selectedDomain === 'All Domains' || pattern.domain === selectedDomain;

    return matchesSearch && matchesType && matchesDomain;
  });

  const selectedPattern = patterns.find(p => p.id === selectedPatternId);

  return (
    <div className="space-y-5 fade-in-up">
      {/* ── Search & Filters Row ───────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search pattern ID, domain, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs bg-slate-950/40 border border-slate-850/60 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all duration-300"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex w-full md:w-auto items-center gap-2 select-none">
          {/* Type Dropdown */}
          <div className="relative shrink-0 w-1/2 md:w-40">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 px-3 pr-8 text-xs font-semibold bg-slate-950/40 border border-slate-850/60 rounded-xl text-slate-350 appearance-none focus:outline-none focus:border-slate-700 transition-all duration-300 cursor-pointer"
            >
              {types.map(t => (
                <option key={t} value={t} className="bg-slate-950 text-slate-350">{t === 'All Types' ? 'All Types' : t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Domain Dropdown */}
          <div className="relative shrink-0 w-1/2 md:w-40">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full h-10 px-3 pr-8 text-xs font-semibold bg-slate-950/40 border border-slate-850/60 rounded-xl text-slate-350 appearance-none focus:outline-none focus:border-slate-700 transition-all duration-300 cursor-pointer"
            >
              {domains.map(d => (
                <option key={d} value={d} className="bg-slate-950 text-slate-350">{d === 'All Domains' ? 'All Domains' : d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Master-Detail Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Side: Pattern Table (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard
            borderColor="rgba(239, 68, 68, 0.2)" // Subtle red border for failures theme
            glowColor="rgba(239, 68, 68, 0.06)"
            padding="20px 24px"
            className="w-full relative shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="mb-4 select-none">
                <h3 className="text-[16px] font-bold text-white uppercase tracking-wider">Failing Patterns</h3>
                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-none">Click a row to trigger real-time ATPG forensics</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20 select-none">
                <table className="w-full text-xs text-left text-slate-350 border-collapse">
                  <thead>
                    <tr 
                      className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider"
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                    >
                      <th className="px-4 py-3 text-[11px] font-bold">Pattern ID</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Type</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Test Time</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Cost/Die</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Coverage</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-right">Fail Rate</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Power</th>
                      <th className="px-4 py-3 text-[11px] font-bold">Domain</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatterns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-medium select-none">
                          No patterns found matching selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPatterns.map((pattern, index) => {
                        const isSelected = selectedPatternId === pattern.id;
                        const isPulsing = pulsePatternId === pattern.id;
                        return (
                          <tr
                            key={pattern.id}
                            onClick={() => setSelectedPatternId(pattern.id)}
                            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                            className={cn(
                              'cursor-pointer transition-all duration-150 text-[13px] text-slate-200',
                              isSelected
                                ? 'bg-indigo-500/15 border-l-[3px] border-l-indigo-500 font-semibold shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                : index % 2 === 0
                                ? 'bg-slate-950/5'
                                : 'bg-transparent',
                              'hover:bg-indigo-500/[0.06] hover:border-l-[3px] hover:border-l-indigo-500/80'
                            )}
                          >
                            {/* Pattern ID */}
                            <td className="px-4 py-3.5">
                              <span className="font-semibold font-mono text-blue-400 select-none">
                                {pattern.id}
                              </span>
                            </td>

                            {/* Type Badge */}
                            <td className="px-4 py-3.5">
                              <span className="px-1.5 py-0.5 rounded border border-slate-800 bg-slate-950/60 text-[10px] font-extrabold tracking-wider font-mono text-slate-400 select-none">
                                {pattern.type}
                              </span>
                            </td>

                            {/* Test Time */}
                            <td className="px-4 py-3.5 font-mono text-slate-300 font-medium">
                              {pattern.testTime}
                            </td>

                            {/* Cost/Die */}
                            <td className="px-4 py-3.5 font-mono text-slate-400">
                              {pattern.costPerDie}
                            </td>

                            {/* Coverage Progress Bar */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-300 font-semibold">{pattern.coverage.toFixed(1)}%</span>
                                <div className="h-1.5 w-12 rounded-full bg-slate-950 border border-slate-850/20 overflow-hidden shrink-0 hidden sm:block">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      pattern.coverage >= 95 ? 'bg-emerald-500' : 'bg-blue-500'
                                    )}
                                    style={{ width: `${pattern.coverage}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Fail Rate (With dynamic sweeps highlighting) */}
                            <td className="px-4 py-3.5 text-right">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider font-mono border select-none leading-none inline-block',
                                  isPulsing
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 scale-[1.03] shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                    : pattern.failRate >= 10
                                    ? 'bg-red-500/10 text-red-400 border-red-500/25'
                                    : pattern.failRate >= 5
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                )}
                              >
                                {pattern.failRate.toFixed(1)}%
                              </span>
                            </td>

                            {/* Power Badge */}
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest border uppercase leading-none select-none font-mono',
                                  pattern.power === 'HIGH'
                                    ? 'border-red-500/30 text-red-400 bg-red-500/5'
                                    : pattern.power === 'MEDIUM'
                                    ? 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                                    : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                )}
                              >
                                {pattern.power}
                              </span>
                            </td>

                            {/* Domain */}
                            <td className="px-4 py-3.5 text-slate-400 font-semibold font-mono">
                              {pattern.domain}
                            </td>

                            {/* Action Button */}
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatternId(pattern.id);
                                }}
                                className={cn(
                                  'text-[10px] font-extrabold uppercase tracking-widest bg-transparent border-0 outline-none hover:text-white transition-all cursor-pointer inline-flex items-center gap-1',
                                  pattern.failRate >= 10 ? 'text-red-400' : 'text-indigo-400'
                                )}
                              >
                                <span>{pattern.failRate >= 10 ? 'ANALYSE' : 'OPTIMIZE'}</span>
                                <ArrowRight className="h-3 w-3 shrink-0" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer / Pagination */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 tracking-wider mt-4 select-none">
              <span>Showing {filteredPatterns.length} of 1284 patterns</span>
              <div className="flex items-center gap-1.5">
                <button className="px-3 py-1.5 rounded-lg border border-slate-850 bg-slate-900/30 hover:bg-slate-900/60 hover:text-slate-350 disabled:opacity-40 disabled:cursor-not-allowed transition" disabled>
                  Prev
                </button>
                <button className="px-3 py-1.5 rounded-lg border border-slate-850 bg-slate-900/30 hover:bg-slate-900/60 hover:text-slate-350 transition">
                  Next
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Diagnostics Detail Panel (Takes 1 Column) */}
        <div className="h-full">
          {!selectedPattern ? (
            /* PLACEHOLDER: Unselected state */
            <GlassCard
              borderColor="rgba(239, 68, 68, 0.2)"
              glowColor="rgba(239, 68, 68, 0.04)"
              padding="24px"
              className="h-full min-h-[440px] flex flex-col items-center justify-center text-center shadow-lg relative"
            >
              <div className="h-12 w-12 rounded-full bg-slate-950/60 flex items-center justify-center text-indigo-400 border border-slate-850 animate-pulse">
                <Sparkles className="h-5 w-5" />
              </div>
              <h4 className="mt-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed select-none">
                Select a pattern from the table to run deep-dive forensics
              </h4>
            </GlassCard>
          ) : loadingDiagnostics ? (
            /* ACTIVE QUERY: Telemetry loader state */
            <GlassCard
              borderColor="rgba(239, 68, 68, 0.25)"
              glowColor="rgba(239, 68, 68, 0.08)"
              padding="24px"
              className="h-full min-h-[440px] flex flex-col items-center justify-center text-center shadow-lg relative select-none"
            >
              <div className="pointer-events-none absolute inset-0 opacity-10 bg-gradient-to-br from-purple-500 via-transparent to-transparent" />
              <div className="h-12 w-12 rounded-full bg-slate-950/60 flex items-center justify-center text-purple-400 border border-purple-500/20 animate-spin">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="mt-5 text-[10px] font-extrabold text-purple-400 uppercase tracking-widest leading-relaxed">
                Querying live telemetry...
              </h4>
              <p className="mt-1.5 text-[9px] text-slate-500 font-mono">Sweeping pattern vectors & test points</p>
            </GlassCard>
          ) : (
            /* DETAILED VIEW: Loaded Diagnostics */
            <GlassCard
              borderColor={selectedPattern.failRate >= 10 ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}
              glowColor={selectedPattern.failRate >= 10 ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)"}
              padding="24px"
              className="h-full relative shadow-lg flex flex-col justify-between space-y-6 fade-in select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-850/40 pb-3.5">
                <div>
                  <h4 className="text-base font-bold text-white font-mono">{selectedPattern.id}</h4>
                  <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mt-1">
                    {selectedPattern.type} · {selectedPattern.domain} DOMAIN
                  </p>
                </div>
                <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
              </div>

              {/* Core metrics */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/50 border border-slate-850/40 p-2.5 rounded-xl text-center">
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                    <Clock className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                    <span>Time</span>
                  </p>
                  <p className="text-xs font-bold text-white font-mono mt-1">{selectedPattern.testTime}</p>
                </div>
                <div className="bg-slate-950/50 border border-slate-850/40 p-2.5 rounded-xl text-center">
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                    <Zap className="h-2.5 w-2.5 text-red-400 shrink-0" />
                    <span>Fail Rate</span>
                  </p>
                  <p className={cn(
                    'text-xs font-bold font-mono mt-1',
                    selectedPattern.failRate >= 10 ? 'text-red-405' : 'text-orange-400'
                  )}>
                    {selectedPattern.failRate.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-slate-950/50 border border-slate-850/40 p-2.5 rounded-xl text-center">
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                    <Cpu className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                    <span>Power</span>
                  </p>
                  <p className="text-xs font-bold text-white mt-1">{selectedPattern.power}</p>
                </div>
              </div>

              {/* Diagnostics Logs */}
              <div className="space-y-2">
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Diagnostic Findings</p>
                <div className="bg-slate-950/60 border border-slate-850/40 rounded-xl p-3.5 text-[10px] space-y-2 text-slate-400 leading-normal font-mono">
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-400 font-bold shrink-0">●</span>
                    <span>Failures clustered at pins: <span className="text-slate-200">IO_PAD_[0-3]</span></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold shrink-0">●</span>
                    <span>Leakage current: <span className="text-slate-200">42.8 μA</span> (safety limit 30μA)</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-slate-500 font-bold shrink-0">●</span>
                    <span>Failing cycle offset: <span className="text-slate-200">84,200 - 89,450</span></span>
                  </div>
                </div>
              </div>

              {/* AI Recommendation Banner */}
              <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">AI Compaction suggestion</span>
                </div>
                <p className="text-[10px] text-slate-450 leading-normal font-medium">
                  Apply <span className="text-purple-400 font-bold">Compaction Level 4 (8x vector compression)</span> to optimize IO scan path. This will reduce execution time to <span className="text-emerald-400 font-bold">~1,980ms (-30%)</span> and lower power dissipation, while retaining full <span className="text-slate-200 font-bold">94.2%</span> coverage.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button className="flex h-9 px-4 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/10 cursor-pointer hover:scale-[1.01] active:scale-[0.99]">
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  <span>Run Full Diagnostics</span>
                </button>
                <button className="flex h-9 px-4 items-center justify-center gap-1.5 rounded-xl bg-transparent border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-350 hover:text-white transition cursor-pointer hover:bg-slate-900/40">
                  <Wand2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Apply Auto-compaction</span>
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
