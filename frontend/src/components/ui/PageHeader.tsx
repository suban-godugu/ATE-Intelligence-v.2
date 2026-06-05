'use client';

import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: string;
  className?: string;
}

export const PageHeader = ({ title, subtitle, actions, badge, className }: Props) => {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7', className)}>
      {/* Title block with accent bar */}
      <div
        className="space-y-1 pl-4"
        style={{ borderLeft: '3px solid var(--accent-blue)' }}
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-[22px] font-bold text-[var(--tx-primary)] leading-none"
            style={{ letterSpacing: '-0.025em' }}
          >
            {title}
          </h1>
          {badge && (
            <span className="rounded-full bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-blue)] uppercase tracking-widest leading-none">
              {badge}
            </span>
          )}
        </div>

        {subtitle && (
          <div className="flex items-center gap-2 mt-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] pulse-glow" />
            <span className="text-[12px] text-[var(--tx-secondary)] font-medium leading-none">
              {subtitle}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
