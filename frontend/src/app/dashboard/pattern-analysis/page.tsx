'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileWarning,
  Target,
  Cpu,
  Database,
  Zap,
  Activity,
  ShieldAlert,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Bell
} from 'lucide-react';

// Lazy-load tab panels
const OverviewTab     = lazy(() => import('@/components/pattern-analysis/OverviewTab'));
const FailAnalysisTab = lazy(() => import('@/components/pattern-analysis/FailAnalysisTab'));
const CoverageTab     = lazy(() => import('@/components/pattern-analysis/CoverageTab'));
const ScanChainTab    = lazy(() => import('@/components/pattern-analysis/ScanChainTab'));
const MbistTab        = lazy(() => import('@/components/pattern-analysis/MbistTab'));
const LbistTab        = lazy(() => import('@/components/pattern-analysis/LbistTab'));
const BistTab         = lazy(() => import('@/components/pattern-analysis/BistTab'));
const RedundancyTab   = lazy(() => import('@/components/pattern-analysis/RedundancyTab'));
import { TabErrorBoundary } from '@/components/pattern-analysis/TabErrorBoundary';

type TabId = 'overview' | 'fail-analysis' | 'coverage' | 'scan-chain' | 'mbist' | 'lbist' | 'bist' | 'redundancy';

interface TabDef {
  id: TabId;
  label: string;
  badge?: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabDef[] = [
  { id: 'overview',      label: 'Overview',      accent: 'var(--accent-blue)',   icon: LayoutDashboard },
  { id: 'fail-analysis', label: 'Fail Analysis',  badge: '38', accent: 'var(--accent-red)',    icon: FileWarning },
  { id: 'coverage',      label: 'Coverage',       accent: 'var(--accent-green)',  icon: Target },
  { id: 'scan-chain',    label: 'Scan Chain',     accent: 'var(--accent-amber)',  icon: Cpu },
  { id: 'mbist',         label: 'MBIST',          accent: 'var(--accent-purple)', icon: Database },
  { id: 'lbist',         label: 'LBIST',          accent: 'var(--accent-cyan)',   icon: Zap },
  { id: 'bist',          label: 'BIST',           accent: 'var(--accent-orange)', icon: Activity },
  { id: 'redundancy',    label: 'Redundancy',     accent: 'var(--accent-pink)',   icon: ShieldAlert },
];

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card h-24 rounded-2xl shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card h-72 rounded-2xl shimmer" />
        ))}
      </div>
    </div>
  );
}

export default function PatternAnalysisPage() {
  const [activeTab,    setActiveTab]    = useState<TabId>('overview');
  const [selectedLot,  setSelectedLot]  = useState('LOT-2024-042');
  const [refreshKey,   setRefreshKey]   = useState(0);

  // Dynamic Telemetry Sweep States
  const [lastSweepSeconds, setLastSweepSeconds] = useState(0);
  const [pulseKpi, setPulseKpi] = useState<string | null>(null);

  // Parent KPI States
  const [patternsKpis, setPatternsKpis] = useState({
    totalPatterns: 1284,
    faultCoverage: 94.7,
    atpgEfficiency: 87.3,
    totalTestTime: 4820,
    failPatterns: 38,
    redundant: 12,
  });

  const [coverageKpis, setCoverageKpis] = useState({
    overallCoverage: 94.7,
    stuckAt: 94.2,
    transitionDelay: 89.1,
    cellAware: 91.4,
    bridgeIddq: 82.7,
  });

  // Telemetry Sweep loop (Updates every second, fluctuates every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSweepSeconds((prev) => {
        if (prev >= 4) {
          // Trigger Telemetry Sweep Fluctuations!
          setPatternsKpis((current) => ({
            ...current,
            atpgEfficiency: parseFloat((87.3 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
            totalTestTime: 4820 + Math.floor(Math.random() * 10 - 5),
            failPatterns: Math.random() > 0.75 ? 38 + Math.floor(Math.random() * 2 - 1) : current.failPatterns,
          }));

          setCoverageKpis((current) => ({
            ...current,
            overallCoverage: parseFloat((94.7 + (Math.random() * 0.1 - 0.05)).toFixed(1)),
            stuckAt: parseFloat((94.2 + (Math.random() * 0.15 - 0.07)).toFixed(1)),
            transitionDelay: parseFloat((89.1 + (Math.random() * 0.2 - 0.1)).toFixed(1)),
            cellAware: parseFloat((91.4 + (Math.random() * 0.1 - 0.05)).toFixed(1)),
            bridgeIddq: parseFloat((82.7 + (Math.random() * 0.15 - 0.07)).toFixed(1)),
          }));

          // Trigger brief update pulse highlights
          setPulseKpi('pulse');
          setTimeout(() => setPulseKpi(null), 850);

          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':      return <TabErrorBoundary tabName="Overview"><OverviewTab /></TabErrorBoundary>;
      case 'fail-analysis': return <FailAnalysisTab />;
      case 'coverage':      return <CoverageTab />;
      case 'scan-chain':    return <ScanChainTab />;
      case 'mbist':         return <MbistTab />;
      case 'lbist':         return <TabErrorBoundary tabName="LBIST"><LbistTab /></TabErrorBoundary>;
      case 'bist':          return <BistTab />;
      case 'redundancy':    return <TabErrorBoundary tabName="Redundancy"><RedundancyTab /></TabErrorBoundary>;
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Active Lot Card at the Top (With live sweep clock) ── */}
      <div className="card flex items-center justify-between border border-slate-800 bg-slate-900/40 p-4 rounded-xl shadow-lg relative overflow-hidden hover:border-slate-700/80 transition-all duration-300">
        <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/60 text-[var(--tx-muted)]">
            <Database className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Lot</p>
            <p className="text-sm font-semibold text-slate-300 mt-0.5">None selected</p>
          </div>
        </div>

        {/* Dynamic Telemetry Sweep Indicator */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-extrabold bg-slate-950/40 border border-slate-850 px-3 py-1.5 rounded-lg font-mono tracking-wider select-none">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>Last sweep: {lastSweepSeconds}s ago</span>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-display text-2xl font-extrabold text-gradient tracking-tight"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--tx-primary) 40%, var(--accent-purple))' }}
          >
            Pattern Analysis Platform
          </h1>
          <p className="mt-1.5 text-xs text-[var(--tx-muted)] pl-0">
            Deep forensics and optimization for semiconductor test patterns
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex h-9 px-3 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
            <span>REFRESH</span>
          </button>
          <button
            className="flex h-9 px-3 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Download report"
            title="Export"
          >
            <Download className="h-3 w-3" />
            <span>EXPORT</span>
          </button>
          <button
            className="relative flex h-9 px-3 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-3 w-3" />
            <span>ALERTS</span>
            <span className="absolute right-1 top-1">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          </button>
        </div>
      </div>

      {/* ── Tab Navigation (Rounded Pills) ─────────────── */}
      <div
        className="flex items-center gap-1 overflow-x-auto scrollbar-none bg-slate-950/40 p-1 rounded-xl border border-slate-800/80"
        role="tablist"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200',
                isActive
                  ? 'text-white shadow-lg bg-indigo-600/80 shadow-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
              )}
              aria-selected={isActive}
              role="tab"
            >
              <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{tab.label}</span>
              {/* Badge */}
              {tab.badge && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[9px] font-extrabold leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── KPI Cards Deck (Tab-sensitive & Live Fluctuations) ────────── */}
      {activeTab === 'coverage' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* KPI 1: OVERALL COVERAGE */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Overall Coverage</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-emerald-400"
              )}>
                {coverageKpis.overallCoverage}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Combined target: 90%</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
              <Target className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 2: STUCK-AT FAULTS */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Stuck-at Faults</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-blue-400"
              )}>
                {coverageKpis.stuckAt}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Static DC test</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Cpu className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 3: TRANSITION DELAY */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Transition Delay</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-cyan-400"
              )}>
                {coverageKpis.transitionDelay}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">At-speed dynamic</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 4: CELL-AWARE DFT */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Cell-Aware DFT</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-amber-500"
              )}>
                {coverageKpis.cellAware}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Transistor-level</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 5: BRIDGE & IDDQ */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Bridge & IDDQ</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-orange-500"
              )}>
                {coverageKpis.bridgeIddq}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Bridging faults</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </div>
      ) : activeTab === 'scan-chain' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* KPI 1: PATTERN COUNT */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between rounded-xl shadow-md hover:border-slate-700/80 hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div className="flex items-center justify-between w-full">
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Pattern Count</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                <Database className="h-3.5 w-3.5" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-850/40">
              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Traditional</span>
                <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">12,540</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-emerald-400 uppercase block flex items-center gap-0.5">
                  <span>AI Recommended</span>
                </span>
                <span className="text-sm font-mono font-bold text-emerald-450 block mt-0.5">8,920</span>
              </div>
            </div>
          </div>

          {/* KPI 2: TEST TIME */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between rounded-xl shadow-md hover:border-slate-700/80 hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div className="flex items-center justify-between w-full">
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Test Time</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-850/40">
              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Traditional</span>
                <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">42 min</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-emerald-400 uppercase block">AI Recommended</span>
                <span className="text-sm font-mono font-bold text-emerald-450 block mt-0.5">24 min</span>
              </div>
            </div>
          </div>

          {/* KPI 3: COVERAGE */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between rounded-xl shadow-md hover:border-slate-700/80 hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div className="flex items-center justify-between w-full">
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Coverage</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
                <Target className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-850/40">
              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Traditional</span>
                <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">96.2%</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-emerald-400 uppercase block">AI Recommended</span>
                <span className="text-sm font-mono font-bold text-emerald-450 block mt-0.5">98.7%</span>
              </div>
            </div>
          </div>

          {/* KPI 4: YIELD */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between rounded-xl shadow-md hover:border-slate-700/80 hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div className="flex items-center justify-between w-full">
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Yield</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-850/40">
              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Traditional</span>
                <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">91.4%</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-emerald-400 uppercase block">AI Recommended</span>
                <span className="text-sm font-mono font-bold text-emerald-450 block mt-0.5">95.8%</span>
              </div>
            </div>
          </div>

          {/* KPI 5: RETESTING RATE */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between rounded-xl shadow-md hover:border-slate-700/80 hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div className="flex items-center justify-between w-full">
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Retesting Rate</p>
              <div className="h-6 w-6 rounded-md flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-850/40">
              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">Traditional</span>
                <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">14.8%</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-emerald-400 uppercase block">AI Recommended</span>
                <span className="text-sm font-mono font-bold text-emerald-450 block mt-0.5">5.2%</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* KPI 1: TOTAL PATTERNS */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Total Patterns</p>
              <p className="text-xl font-bold text-white mt-1 font-mono">{patternsKpis.totalPatterns}</p>
              <p className="text-[10px] text-slate-500 mt-1">All domains</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Database className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 2: FAULT COVERAGE */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Fault Coverage</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-emerald-400"
              )}>
                {patternsKpis.faultCoverage}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Target: 90%</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 animate-pulse">
              <Target className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 3: ATPG EFFICIENCY */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">ATPG Efficiency</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-cyan-400"
              )}>
                {patternsKpis.atpgEfficiency}%
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Vectors / fault</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 4: TOTAL TEST TIME */}
          <div className={cn(
            "card relative overflow-hidden border bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300",
            pulseKpi === 'pulse' ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "border-slate-800"
          )}>
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Total Test Time</p>
              <p className={cn(
                "text-xl font-bold mt-1 font-mono transition-all duration-350",
                pulseKpi === 'pulse' ? "text-emerald-400 scale-105" : "text-amber-500"
              )}>
                {patternsKpis.totalTestTime}ms
              </p>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">Per lot run</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 5: FAIL PATTERNS */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Fail Patterns</p>
              <p className="text-xl font-bold text-red-400 mt-1 font-mono">{patternsKpis.failPatterns}</p>
              <p className="text-[10px] text-slate-500 mt-1">2.96% of total</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          {/* KPI 6: REDUNDANT */}
          <div className="card relative overflow-hidden border border-slate-800 bg-slate-900/50 p-4 flex items-center justify-between rounded-xl shadow-md hover:scale-[1.02] transition-all duration-300">
            <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
            <div>
              <p className="text-[9px] font-extrabold tracking-wider uppercase text-slate-500">Redundant</p>
              <p className="text-xl font-bold text-yellow-500 mt-1 font-mono">{patternsKpis.redundant}</p>
              <p className="text-[10px] text-slate-500 mt-1">Safe to remove</p>
            </div>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content ──────────────────────────────────── */}
      <Suspense fallback={<TabSkeleton />}>
        <div key={`${activeTab}-${refreshKey}`} className="fade-in-up">
          {renderTab()}
        </div>
      </Suspense>
    </div>
  );
}

