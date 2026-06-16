'use client';

import { IconCpu, IconZap, IconShield } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

interface RecommendationItem {
  id:          string;
  title:       string;
  savingLabel: string;
  desc:        string;
  type:        'cost' | 'time' | 'coverage';
}

const ITEMS: RecommendationItem[] = [
  {
    id: 'rec-1',
    title: 'Remove PAT-SCAN-chain',
    savingLabel: 'Savings: $4.3K / month',
    desc: 'Redundant ATPG coverage detected on active HPC lot sweeps. Zero fault coverage impact.',
    type: 'cost',
  },
  {
    id: 'rec-2',
    title: 'Reduce LBIST cycles',
    savingLabel: 'Time Reduction: 12%',
    desc: 'Shorten sweep sequences. Fault logic models predict yield target is maintained at 98.3%.',
    type: 'time',
  },
  {
    id: 'rec-3',
    title: 'Merge MBIST-004 & MBIST-025',
    savingLabel: 'Coverage maintained',
    desc: 'Overlapping memory word address testing found on identical controller banks.',
    type: 'coverage',
  },
];

export function AIInsightsPanel() {
  return (
    <div className="card flex flex-col rounded-xl p-4 bg-[var(--bg-card)] border border-[var(--border)] h-[440px] overflow-hidden">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
              <IconCpu size={12} />
            </span>
            AI Recommendations
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Real-time test flow optimization insights
          </p>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="flex-1 space-y-3.5 overflow-y-auto scrollbar-none pr-1">
        {ITEMS.map((item) => (
          <div
            key={item.id}
            className="group/item relative rounded-lg border border-[var(--border)] bg-black/10 p-3 hover:bg-[var(--bg-hover)]/10 hover:border-slate-700 transition-all duration-150"
          >
            {/* Title & Badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[11px] font-bold text-white group-hover/item:text-[var(--accent-blue)] transition-colors leading-tight">
                {item.title}
              </h3>
              
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase font-mono border leading-none',
                  item.type === 'cost' && 'border-[var(--accent-green)]/30 bg-[var(--accent-green)]/8 text-[var(--accent-green)]',
                  item.type === 'time' && 'border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/8 text-[var(--accent-blue)]',
                  item.type === 'coverage' && 'border-[var(--accent-cyan)]/30 bg-[var(--accent-cyan)]/8 text-[var(--accent-cyan)]'
                )}
              >
                {item.type === 'cost' && 'Cost'}
                {item.type === 'time' && 'Time'}
                {item.type === 'coverage' && 'Coverage'}
              </span>
            </div>

            {/* Savings Label */}
            <p className="mt-1 text-[11px] font-semibold font-mono text-slate-300">
              {item.savingLabel}
            </p>

            {/* Description */}
            <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
