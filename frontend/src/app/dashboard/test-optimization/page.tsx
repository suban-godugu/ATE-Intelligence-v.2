'use client';

import { useState, Suspense, lazy } from 'react';
// No icons imported
import { cn } from '@/lib/utils';

// Lazy-load optimization tab panels
const OverviewTab         = lazy(() => import('@/components/test-optimization/OverviewTab'));
const FlowOptimizerTab     = lazy(() => import('@/components/test-optimization/FlowOptimizerTab'));
const PatternPruningTab    = lazy(() => import('@/components/test-optimization/PatternPruningTab'));
const CompressionTunerTab  = lazy(() => import('@/components/test-optimization/CompressionTunerTab'));
const YieldPredictorTab    = lazy(() => import('@/components/test-optimization/YieldPredictorTab'));
const SavingsDashboardTab  = lazy(() => import('@/components/test-optimization/SavingsDashboardTab'));

type TabId = 'overview' | 'flow' | 'pruning' | 'compression' | 'yield' | 'savings';

const TABS: { id: TabId; label: string; accent: string }[] = [
  { id: 'overview',    label: 'Overview',         accent: 'var(--accent-blue)' },
  { id: 'flow',        label: 'Flow Optimizer',   accent: 'var(--accent-blue)' },
  { id: 'pruning',     label: 'Pattern Pruning',  accent: 'var(--accent-amber)' },
  { id: 'compression', label: 'Compression',      accent: 'var(--accent-green)' },
  { id: 'yield',       label: 'Yield Predictor',  accent: 'var(--accent-cyan)' },
  { id: 'savings',     label: 'Savings',          accent: 'var(--accent-green)' },
];

function TabSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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

export default function TestOptimizationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab />;
      case 'flow':        return <FlowOptimizerTab />;
      case 'pruning':     return <PatternPruningTab />;
      case 'compression': return <CompressionTunerTab />;
      case 'yield':       return <YieldPredictorTab />;
      case 'savings':     return <SavingsDashboardTab />;
    }
  };

  return (
    <div className="space-y-5 py-4 animate-fade-in">
      {/* Page heading */}
      <div className="pl-4" style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(to bottom, var(--accent-cyan), transparent) 1' }}>
        <h1
          className="text-[20px] font-bold text-[var(--tx-primary)]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Test Flow Optimization Suite
        </h1>
        <p className="text-[12px] text-[var(--tx-secondary)] mt-0.5">
          Configure, simulate, and apply intelligent re-ordering for semiconductor test patterns
        </p>
      </div>

      {/* Tab Navigation (Pill Tab Bar) */}
      <div
        className="relative flex items-center gap-1 p-1 overflow-x-auto scrollbar-none border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]"
        style={{
          width: 'fit-content',
          maxWidth: '100%',
        }}
        role="tablist"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center px-4 py-2 rounded-[var(--radius-md)] text-[11px] font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap shrink-0',
                isActive
                  ? 'text-white'
                  : 'text-[var(--tx-secondary)] hover:text-white hover:bg-white/[0.04]'
              )}
              style={isActive ? { background: 'var(--accent-blue)', boxShadow: '0 0 14px rgba(59,130,246,0.25)' } : {}}
              aria-selected={isActive}
              role="tab"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[500px]">
        <Suspense fallback={<TabSkeleton />}>
          <div key={activeTab} className="fade-in-up">
            {renderTab()}
          </div>
        </Suspense>
      </div>
    </div>
  );
}
