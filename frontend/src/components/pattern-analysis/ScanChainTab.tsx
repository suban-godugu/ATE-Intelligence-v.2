'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import PatternSummaryTable, { usePatternsList } from './PatternSummaryTable';
import ChainAnalysisPanel, { useChainsList } from './ChainAnalysisPanel';
import FlipFlopModal from './FlipFlopModal';
import { Breadcrumb, GlassCard } from './SharedComponents';

export default function ScanChainTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // === URL DEEP LINKING PARAMS ===
  const patternParam = searchParams.get('pattern');
  const chainParam = searchParams.get('chain');

  // === SELECTION STATES ===
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(patternParam);
  const [selectedChain, setSelectedChain] = useState<any | null>(null);
  const [isFlipFlopModalOpen, setIsFlipFlopModalOpen] = useState(false);

  // === KEYBOARD NAVIGATION STATES ===
  const [focusedPatternIndex, setFocusedPatternIndex] = useState(-1);
  const [focusedChainIndex, setFocusedChainIndex] = useState(-1);

  // === TELEMETRY QUERIES FOR KEYBOARD NAVIGATION SYNCS ===
  const { data: patternsData = [] } = usePatternsList({});
  const { data: chainsData = [] } = useChainsList(selectedPatternId, {});

  // Update URL parameters helper
  const updateParams = (patternId: string | null, chainId: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (patternId) {
      params.set('pattern', patternId);
    } else {
      params.delete('pattern');
      params.delete('chain');
    }
    if (chainId) {
      params.set('chain', chainId);
    } else {
      params.delete('chain');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  // 1. Sync state to URL Parameter updates (supports Back/Forward button clicks!)
  useEffect(() => {
    if (patternParam) {
      setSelectedPatternId(patternParam);
    } else {
      setSelectedPatternId(null);
      setSelectedChain(null);
      setIsFlipFlopModalOpen(false);
    }
  }, [patternParam]);

  useEffect(() => {
    if (chainParam && chainsData.length > 0) {
      const matched = chainsData.find((c) => c.chainId === chainParam);
      if (matched) {
        setSelectedChain(matched);
        setIsFlipFlopModalOpen(true);
      }
    } else if (!chainParam) {
      setSelectedChain(null);
      setIsFlipFlopModalOpen(false);
    }
  }, [chainParam, chainsData]);

  // Reset focus indices when selections change
  useEffect(() => {
    setFocusedChainIndex(-1);
  }, [selectedPatternId]);

  useEffect(() => {
    if (!selectedPatternId) {
      setFocusedPatternIndex(-1);
    } else if (patternsData.length > 0) {
      const idx = patternsData.findIndex((p) => p.patternId === selectedPatternId);
      if (idx !== -1) {
        setFocusedPatternIndex(idx);
      }
    }
  }, [selectedPatternId, patternsData]);

  // 2. Wire Full Keyboard Events (Arrow Up/Down, Enter to select, Escape to go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keys if user is typing in a search input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (isFlipFlopModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          updateParams(selectedPatternId, null);
        }
        return;
      }

      if (!selectedPatternId) {
        // === Level 1: Pattern Summary Table navigation ===
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedPatternIndex((prev) => {
            const next = prev + 1;
            return next < patternsData.length ? next : prev;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedPatternIndex((prev) => {
            const next = prev - 1;
            return next >= 0 ? next : prev;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedPatternIndex >= 0 && focusedPatternIndex < patternsData.length) {
            const pat = patternsData[focusedPatternIndex];
            updateParams(pat.patternId, null);
          }
        }
      } else {
        // === Level 2: Chain Analysis Panel navigation ===
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedChainIndex((prev) => {
            const next = prev + 1;
            return next < chainsData.length ? next : prev;
          });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedChainIndex((prev) => {
            const next = prev - 1;
            return next >= 0 ? next : prev;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedChainIndex >= 0 && focusedChainIndex < chainsData.length) {
            const ch = chainsData[focusedChainIndex];
            updateParams(selectedPatternId, ch.chainId);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          updateParams(null, null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedPatternId,
    isFlipFlopModalOpen,
    patternsData,
    chainsData,
    focusedPatternIndex,
    focusedChainIndex
  ]);

  // Compute focused IDs for passing to table components
  const focusedPatternId = useMemo(() => {
    if (focusedPatternIndex >= 0 && focusedPatternIndex < patternsData.length) {
      return patternsData[focusedPatternIndex].patternId;
    }
    return null;
  }, [focusedPatternIndex, patternsData]);

  const focusedChainId = useMemo(() => {
    if (focusedChainIndex >= 0 && focusedChainIndex < chainsData.length) {
      return chainsData[focusedChainIndex].chainId;
    }
    return null;
  }, [focusedChainIndex, chainsData]);

  // === DRILLDOWN BREADCRUMBS SETUP ===
  const breadcrumbItems: { label: string; onClick?: () => void }[] = [
    { label: 'All Patterns', onClick: () => updateParams(null, null) },
  ];
  if (selectedPatternId) {
    breadcrumbItems.push({
      label: selectedPatternId,
      onClick: () => updateParams(selectedPatternId, null),
    });
  }
  if (selectedChain) {
    breadcrumbItems.push({
      label: selectedChain.chainId,
      onClick: () => updateParams(selectedPatternId, selectedChain.chainId),
    });
    breadcrumbItems.push({
      label: 'Flip-Flop Analysis',
    });
  }

  return (
    <div className="space-y-5 fade-in-up">
      {/* Dynamic Drilldown Navigation Trail */}
      <div className="flex items-center justify-between bg-slate-950/40 px-5 py-3 rounded-xl border border-slate-850/60 shadow-md">
        <Breadcrumb items={breadcrumbItems} />
        <span className="text-[10px] text-slate-500 font-bold font-mono tracking-wider select-none uppercase">
          Scan Chain Forensic Explorer
        </span>
      </div>

      {/* Dynamic Two-Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Pattern Summary Table */}
        <div className="lg:col-span-7">
          <PatternSummaryTable
            selectedPatternId={selectedPatternId}
            onSelectPattern={(patId) => updateParams(patId, null)}
            focusedPatternId={focusedPatternId}
          />
        </div>

        {/* Right Column: Overview Right Panel */}
        <div className="lg:col-span-5">
          <ScanChainOverviewRightPanel 
            key="overview-right"
            onSelectPattern={(patId) => updateParams(patId, null)}
          />
        </div>
      </div>

      {/* Failed Chain Analysis Modal Popup */}
      <AnimatePresence>
        {selectedPatternId && (
          <div className="fixed inset-0 z-45 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl overflow-hidden select-none">
            {/* Backdrop click closes the modal */}
            <div className="absolute inset-0 cursor-default" onClick={() => updateParams(null, null)} />
            
            {/* Modal Body Container */}
            <div className="relative z-10 w-[85vw] max-w-[1200px] max-h-[85vh] overflow-y-auto">
              <ChainAnalysisPanel
                key={selectedPatternId}
                patternId={selectedPatternId}
                onClose={() => updateParams(null, null)}
                onSelectChain={(chId, chData) => updateParams(selectedPatternId, chId)}
                focusedChainId={focusedChainId}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Level 3: Flip-Flop Detail Modal Popup */}
      <AnimatePresence>
        {selectedChain && isFlipFlopModalOpen && (
          <FlipFlopModal
            key={selectedChain.chainId}
            chainId={selectedChain.chainId}
            chainData={selectedChain}
            onClose={() => updateParams(selectedPatternId, null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanChainOverviewRightPanel({ onSelectPattern }: { onSelectPattern: (patId: string) => void }) {
  // IP domain hotspots for the Chain Density Map
  const ipDomains = [
    { name: 'USB_PHY', count: 68, pct: 100, color: 'rgba(239, 68, 68, 0.75)', textColor: '#F87171' },
    { name: 'GPU_CLUSTER', count: 42, pct: 62, color: 'rgba(245, 158, 11, 0.75)', textColor: '#FBBF24' },
    { name: 'NPU_ARRAY', count: 35, pct: 51, color: 'rgba(245, 158, 11, 0.6)', textColor: '#FCD34D' },
    { name: 'CPU_CORE', count: 24, pct: 35, color: 'rgba(59, 130, 246, 0.75)', textColor: '#60A5FA' },
    { name: 'PCIE_PHY', count: 12, pct: 18, color: 'rgba(16, 185, 129, 0.75)', textColor: '#34D399' }
  ];

  // Worst failing chains dashboard (clicking a row selects the parent pattern)
  const topFailingChains = [
    { chainId: 'CH-SCN-0004-01', patternId: 'SCN-0004', failures: 11, failRate: 7.6, domain: 'USB_PHY' },
    { chainId: 'CH-SCN-0023-01', patternId: 'SCN-0023', failures: 11, failRate: 2.9, domain: 'GPU_CLUSTER' },
    { chainId: 'CH-SCN-0006-01', patternId: 'SCN-0006', failures: 11, failRate: 1.5, domain: 'USB_PHY' },
    { chainId: 'CH-SCN-0020-01', patternId: 'SCN-0020', failures: 11, failRate: 0.6, domain: 'PCIE_PHY' },
    { chainId: 'CH-SCN-0005-01', patternId: 'SCN-0005', failures: 10, failRate: 8.7, domain: 'NPU_ARRAY' }
  ];

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {/* Chain Density Map */}
      <GlassCard borderColor="rgba(245, 158, 11, 0.2)" glowColor="rgba(245, 158, 11, 0.04)" padding="20px 24px" className="shadow-lg select-none">
        <h3 className="text-[16px] font-bold text-white tracking-tight leading-none mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Chain Failure Density Map
        </h3>
        
        <div className="space-y-3">
          {ipDomains.map((domain) => (
            <div key={domain.name} className="space-y-1">
              <div className="flex justify-between items-center text-[11px] font-semibold text-slate-400">
                <span className="font-mono tracking-wide">{domain.name}</span>
                <span style={{ color: domain.textColor }} className="font-bold">{domain.count} Fails</span>
              </div>
              <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-900">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${domain.pct}%`, 
                    backgroundColor: domain.color,
                    boxShadow: `0 0 8px ${domain.color}`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Top Failing Scan Chains Dashboard */}
      <GlassCard borderColor="rgba(239, 68, 68, 0.2)" glowColor="rgba(239, 68, 68, 0.04)" padding="20px 24px" className="shadow-lg select-none">
        <h3 className="text-[16px] font-bold text-white tracking-tight leading-none mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Top Failing Scan Chains
        </h3>
        <p className="text-[11px] text-slate-500 mb-4 font-semibold uppercase tracking-wider">Hotspots across all active patterns</p>
        
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20">
          <table className="w-full text-xs text-left text-slate-350 select-none">
            <thead>
              <tr className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-3 py-2.5 font-bold">Chain ID</th>
                <th className="px-3 py-2.5 font-bold">Domain</th>
                <th className="px-3 py-2.5 font-bold text-right">Fails / Rate</th>
              </tr>
            </thead>
            <tbody>
              {topFailingChains.map((ch) => (
                <tr 
                  key={ch.chainId}
                  onClick={() => onSelectPattern(ch.patternId)}
                  className="bg-transparent hover:bg-red-500/[0.04] transition-all duration-150 cursor-pointer border-b border-slate-950"
                >
                  <td className="px-3 py-2.5">
                    <span className="font-mono font-bold text-blue-400">{ch.chainId}</span>
                    <span className="text-[9px] text-slate-500 block font-mono">Pattern: {ch.patternId}</span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-300">{ch.domain}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    <span className="font-extrabold text-red-400 block">{ch.failures} FF</span>
                    <span className="text-[9px] text-slate-500 block">{ch.failRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}
