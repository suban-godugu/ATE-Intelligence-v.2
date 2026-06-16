'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Database, ShieldAlert, Cpu, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Patterns' | 'Wafers';
  action: () => void;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle Ctrl+K/Cmd+K global shortcuts to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const items: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Open Executive Dashboard',
      category: 'Navigation',
      action: () => { router.push('/dashboard'); onClose(); },
      icon: Cpu,
    },
    {
      id: 'nav-cost',
      title: 'Open Cost Analysis',
      category: 'Navigation',
      action: () => { router.push('/dashboard/cost'); onClose(); },
      icon: DollarSign,
      shortcut: 'G C',
    },
    {
      id: 'nav-reports',
      title: 'Open Reports & Test Data Ingestion',
      category: 'Navigation',
      action: () => { router.push('/dashboard/upload'); onClose(); },
      icon: FileText,
      shortcut: 'G R',
    },
    {
      id: 'nav-wafer',
      title: 'Open Wafer Lot View',
      category: 'Navigation',
      action: () => { router.push('/dashboard/wafer-lot'); onClose(); },
      icon: Database,
      shortcut: 'G W',
    },
    {
      id: 'pattern-pat-001',
      title: 'Analyze Pattern PAT-001 (Critical)',
      category: 'Patterns',
      action: () => { router.push('/dashboard/pattern-analysis?tab=scan-chain&pattern=PAT-001'); onClose(); },
      icon: ShieldAlert,
    },
    {
      id: 'pattern-pat-012',
      title: 'Analyze Pattern PAT-012 (Failed)',
      category: 'Patterns',
      action: () => { router.push('/dashboard/pattern-analysis?tab=scan-chain&pattern=PAT-012'); onClose(); },
      icon: ShieldAlert,
    },
    {
      id: 'wafer-waf-001',
      title: 'Search Wafer Lot LOT-2024-042',
      category: 'Wafers',
      action: () => { router.push('/dashboard/wafer-lot?lot=LOT-2024-042'); onClose(); },
      icon: Database,
    },
    {
      id: 'wafer-waf-002',
      title: 'Search Wafer Lot LOT_6',
      category: 'Wafers',
      action: () => { router.push('/dashboard/wafer-lot?lot=LOT_6'); onClose(); },
      icon: Database,
    },
  ];

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-950/60 backdrop-blur-md">
      <div
        ref={containerRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/80 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Area */}
        <div className="relative flex items-center border-b border-slate-800 p-4">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search patterns, wafers, reports..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono select-none">
              No matching commands or patterns found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition duration-150',
                    isSelected
                      ? 'bg-indigo-600/80 text-white shadow-lg shadow-indigo-600/10'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-slate-400')} />
                    <div>
                      <p className="text-xs font-semibold">{item.title}</p>
                      <p className={cn('text-[9px] uppercase tracking-wider font-extrabold mt-0.5', isSelected ? 'text-indigo-200' : 'text-slate-500')}>
                        {item.category}
                      </p>
                    </div>
                  </div>

                  {item.shortcut && (
                    <span className={cn('text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-800 bg-slate-950/40 text-slate-500')}>
                      {item.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2.5 bg-slate-950/30 text-[10px] text-slate-500 font-mono select-none">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <div>Ctrl + K</div>
        </div>
      </div>
    </div>
  );
}
