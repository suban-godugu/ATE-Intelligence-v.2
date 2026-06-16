'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Bell,
  ChevronRight,
  Sparkles
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

interface NavigationGroup {
  groupName: string;
  tabs: TabDef[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    groupName: 'Overview',
    tabs: [
      { id: 'overview',      label: 'Overview',      accent: 'var(--accent-blue)',   icon: LayoutDashboard },
      { id: 'fail-analysis', label: 'Fail Analysis',  badge: '38', accent: 'var(--accent-red)',    icon: FileWarning },
    ]
  },
  {
    groupName: 'Test Coverage',
    tabs: [
      { id: 'coverage',      label: 'Coverage',       accent: 'var(--accent-green)',  icon: Target },
      { id: 'scan-chain',    label: 'Scan Chain',     accent: 'var(--accent-amber)',  icon: Cpu },
    ]
  },
  {
    groupName: 'Diagnostics',
    tabs: [
      { id: 'mbist',         label: 'MBIST',          accent: 'var(--accent-purple)', icon: Database },
      { id: 'lbist',         label: 'LBIST',          accent: 'var(--accent-cyan)',   icon: Zap },
      { id: 'bist',          label: 'BIST',           accent: 'var(--accent-orange)', icon: Activity },
    ]
  },
  {
    groupName: 'Repair Analysis',
    tabs: [
      { id: 'redundancy',    label: 'Redundancy',     accent: 'var(--accent-pink)',   icon: ShieldAlert },
    ]
  }
];

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="card h-48 rounded-2xl shimmer" />
        ))}
      </div>
      <div className="card h-64 rounded-2xl shimmer" />
    </div>
  );
}

function PatternAnalysisContent() {
  const [activeTab,    setActiveTab]    = useState<TabId>('overview');
  const [selectedLot,  setSelectedLot]  = useState('LOT-2024-042');
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

  // Active pattern search param lookup
  const searchParams = useSearchParams();
  const activePatternId = searchParams.get('pattern');

  // Deterministic seeded helpers matching route.ts
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seededRng = (seed: number, min: number, max: number): number => {
    const x = Math.sin(seed) * 10000;
    const r = x - Math.floor(x);
    return Math.floor(min + r * (max - min));
  };

  const getPatternAiInsights = (patternId: string) => {
    const seed = hashCode(patternId);
    const failedChains = seededRng(seed, 0, 12);
    const failRate = failedChains === 0 ? 0 : parseFloat((seededRng(seed + 1, 10, 890) / 100).toFixed(1));
    const worstDomain = ['CPU_CORE', 'GPU_CLUSTER', 'MEMORY_CTRL', 'IO_FABRIC', 'PCIE_PHY', 'USB_PHY', 'DDR_PHY', 'NPU_ARRAY'][seededRng(seed + 5, 0, 8)];
    const primaryCause = ['Stuck-At-0', 'Stuck-At-1', 'Transition', 'Path-Delay', 'Bridge', 'Cell-Aware', 'IDDQ'][seededRng(seed + 6, 0, 7)];
    const yieldImpact = parseFloat((failRate * 0.23).toFixed(2));
    
    return {
      failedChains,
      failRate,
      worstDomain,
      primaryCause,
      yieldImpact,
      recommendChain: `CH-${patternId}-01`
    };
  };

  // Dynamic Telemetry Sweep States
  const [lastSweepSeconds, setLastSweepSeconds] = useState(0);
  const [pulseKpi, setPulseKpi] = useState<string | null>(null);

  // Parent KPI States (Global metrics synced to sticky header)
  const [patternsKpis, setPatternsKpis] = useState({
    totalPatterns: 1284,
    faultCoverage: 94.7,
    atpgEfficiency: 87.3,
    totalTestTime: 4820,
    failPatterns: 38,
    redundant: 12,
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
    <div className="space-y-4">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            className="font-display text-2xl font-extrabold text-gradient tracking-tight"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--tx-primary) 40%, var(--accent-purple))' }}
          >
            Pattern Analysis Platform
          </h1>
          <p className="mt-1 text-xs text-[var(--tx-muted)]">
            Deep diagnostics and optimization workstation for semiconductor test patterns
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[9px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
            <span>REFRESH</span>
          </button>
          <button
            className="flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[9px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Download report"
            title="Export"
          >
            <Download className="h-3 w-3" />
            <span>EXPORT</span>
          </button>
          <button
            className="relative flex h-8 px-2.5 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[9px] font-bold uppercase tracking-wider text-[var(--tx-muted)] transition hover:border-[var(--border-bright)] hover:text-[var(--tx-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="h-3 w-3" />
            <span>ALERTS</span>
            <span className="absolute right-1 top-1">
              <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
          </button>
        </div>
      </div>

      {/* ── Sticky Active Lot & Global KPI Header ── */}
      <div className="sticky top-[60px] z-30 flex flex-wrap items-center justify-between border border-slate-800 bg-[rgba(15,23,42,0.85)] backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg gap-4 select-none">
        <div className="flex items-center gap-2.5">
          <Database className="h-4 w-4 text-indigo-400 shrink-0" />
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Active Lot</span>
            <select
              value={selectedLot}
              onChange={(e) => setSelectedLot(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer block mt-0.5"
            >
              <option value="LOT-2024-042" className="bg-slate-900">LOT-2024-042 (Active)</option>
              <option value="LOT_6" className="bg-slate-900">LOT_6 (FastAPI Upload)</option>
            </select>
          </div>
        </div>

        {/* Global KPIs Row */}
        <div className="flex items-center gap-5 text-xs overflow-x-auto scrollbar-none py-1">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Patterns</span>
            <span className="font-mono font-bold text-slate-200">{patternsKpis.totalPatterns}</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Coverage</span>
            <span className="font-mono font-bold text-emerald-450">{patternsKpis.faultCoverage}%</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">ATPG Efficiency</span>
            <span className="font-mono font-bold text-cyan-405">{patternsKpis.atpgEfficiency}%</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Fails</span>
            <span className={cn(
              "font-mono font-bold transition-all duration-300",
              pulseKpi === 'pulse' ? "text-red-400 scale-105" : "text-red-400"
            )}>
              {patternsKpis.failPatterns}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Yield</span>
            <span className="font-mono font-bold text-amber-400">98.3%</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Status</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 leading-none">
              Active
            </span>
          </div>
        </div>

        {/* Dynamic Telemetry Sweep Indicator */}
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-extrabold bg-slate-950/40 border border-slate-850/80 px-2.5 py-1 rounded-lg font-mono tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>Sweep: {lastSweepSeconds}s ago</span>
        </div>
      </div>

      {/* ── Main Workspace Row ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left Sub-Navigation Sidebar */}
        <div className="w-full lg:w-48 shrink-0 bg-slate-900/30 border border-slate-800/80 rounded-xl p-2 space-y-3.5 shadow-md lg:sticky lg:top-[120px]">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <h3 className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest px-2">
                {group.groupName}
              </h3>
              <div className="space-y-0.5">
                {group.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                        isActive
                          ? 'bg-indigo-600/80 text-white shadow-md shadow-indigo-600/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-450')} />
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[8px] font-extrabold leading-none',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                        )}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Central Content Panel */}
        <div className="flex-1 min-w-0 w-full">
          <Suspense fallback={<TabSkeleton />}>
            <div key={`${activeTab}-${refreshKey}`} className="fade-in-up">
              {renderTab()}
            </div>
          </Suspense>
        </div>

        {/* Right Collapsible AI Copilot Side Panel */}
        <div className={cn(
          "shrink-0 border border-slate-850 bg-slate-900/40 rounded-xl shadow-lg transition-all duration-300 flex flex-col relative overflow-hidden lg:sticky lg:top-[120px] w-full lg:w-auto",
          isCopilotOpen ? "lg:w-60 p-3.5" : "lg:w-11 py-3 px-1 items-center"
        )}>
          {isCopilotOpen ? (
            <div className="space-y-3.5 w-full">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-2 flex-row">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-extrabold text-white uppercase tracking-wider">AI Copilot</span>
                </div>
                <button
                  onClick={() => setIsCopilotOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-350 transition block"
                  title="Collapse"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Stats & Insights */}
              <div className="space-y-2.5 select-none font-sans">
                {activePatternId ? (() => {
                  const insights = getPatternAiInsights(activePatternId);
                  return (
                    <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-lg space-y-2">
                      <div className="border-b border-slate-850/40 pb-1.5 mb-1.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Selected Pattern Analysis</p>
                        <p className="text-xs font-mono font-extrabold text-indigo-400 mt-0.5">{activePatternId}</p>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-red-400">{insights.failedChains} failing chains</p>
                          <p className="text-[9px] text-slate-500">Fail rate: {insights.failRate}%</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-purple-400">Worst Domain: {insights.worstDomain}</p>
                          <p className="text-[9px] text-slate-500">Primary: {insights.primaryCause}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-400">Yield Impact: {insights.yieldImpact}%</p>
                          <p className="text-[9px] text-slate-500">Shortfall in Lot sign-off</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-850/40 text-[9px] text-slate-400 font-semibold italic">
                        💡 Rec: Compress chain <span className="font-mono font-bold text-indigo-300">{insights.recommendChain}</span>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="bg-slate-950/40 border border-slate-855 p-2.5 rounded-lg space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-red-400">{patternsKpis.failPatterns} failing patterns</p>
                        <p className="text-[9px] text-slate-500">Detected on static DC paths</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-purple-400">3 optimization options</p>
                        <p className="text-[9px] text-slate-500">Compaction opportunities found</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-emerald-450">Potential savings: $42,300</p>
                        <p className="text-[9px] text-slate-500">Based on compression modeling</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-lg border border-purple-500/15 bg-purple-500/5 text-[9px] text-purple-350 leading-relaxed font-semibold">
                  ⚠️ Mixed-signal analog coverage is currently at 74.2%, which is 15.8% below the target 90.0% sign-off rule.
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1.5 pt-1.5">
                <button className="w-full flex h-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[9px] font-bold text-white tracking-wider uppercase transition shadow-md shadow-indigo-600/10 cursor-pointer border-none outline-none">
                  Generate Report
                </button>
                <button className="w-full flex h-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-[9px] font-bold text-slate-350 tracking-wider uppercase transition cursor-pointer outline-none">
                  Analyze Selected Pattern
                </button>
                <button className="w-full flex h-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-[9px] font-bold text-slate-350 tracking-wider uppercase transition cursor-pointer outline-none">
                  Predict Yield Impact
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6 w-full">
              <button
                onClick={() => setIsCopilotOpen(true)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                title="Expand AI Copilot"
              >
                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
              </button>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 font-mono select-none [writing-mode:vertical-lr] tracking-[0.2em] transform rotate-180">
                AI COPILOT
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatternAnalysisPage() {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <PatternAnalysisContent />
    </Suspense>
  );
}
