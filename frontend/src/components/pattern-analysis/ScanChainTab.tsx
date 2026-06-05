'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
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
      label: `Pattern: ${selectedPatternId}`,
      onClick: () => updateParams(selectedPatternId, null),
    });
  }
  if (selectedChain) {
    breadcrumbItems.push({
      label: `Chain: ${selectedChain.chainId}`,
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
        <div className={selectedPatternId ? "lg:col-span-5" : "lg:col-span-12"}>
          <PatternSummaryTable
            selectedPatternId={selectedPatternId}
            onSelectPattern={(patId) => updateParams(patId, null)}
            focusedPatternId={focusedPatternId}
          />
        </div>

        {/* Right Column: Chain Analysis Panel */}
        <div className={selectedPatternId ? "lg:col-span-7" : "hidden"}>
          <AnimatePresence mode="wait">
            {selectedPatternId && (
              <ChainAnalysisPanel
                key={selectedPatternId}
                patternId={selectedPatternId}
                onClose={() => updateParams(null, null)}
                onSelectChain={(chId, chData) => updateParams(selectedPatternId, chId)}
                focusedChainId={focusedChainId}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Level 3: Flip-Flop Detail Modal */}
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
