'use client';

import { Search, RotateCcw } from 'lucide-react';
import { GlassCard } from './SharedComponents';

interface EmptyStateProps {
  query: string;
  onClear: () => void;
  title?: string;
  message?: string;
}

export function TabEmptyState({ query, onClear, title = "No Patterns Found", message }: EmptyStateProps) {
  return (
    <GlassCard
      borderColor="rgba(148, 163, 184, 0.15)"
      glowColor="rgba(148, 163, 184, 0.03)"
      padding="32px"
      className="text-center space-y-4 my-6 flex flex-col items-center justify-center min-h-[300px] select-none"
    >
      <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-slate-900 border border-slate-800">
        <Search className="h-6 w-6 text-slate-500" />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-slate-900 animate-ping" />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-slate-900" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-sm font-semibold text-white tracking-wide">
          {title}
        </h3>
        <p className="text-xs text-slate-500">
          {message || `No sensor records matched the search criteria "${query}". Try adjusting your query or resetting filters.`}
        </p>
      </div>
      <button
        onClick={onClear}
        className="flex h-8 px-3.5 items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98] cursor-pointer"
      >
        <RotateCcw className="h-3 w-3" />
        <span>RESET FILTER</span>
      </button>
    </GlassCard>
  );
}
