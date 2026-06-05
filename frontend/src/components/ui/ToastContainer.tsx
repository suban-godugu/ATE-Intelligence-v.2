'use client';

import { useToastStore } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const typeBadge =
          t.type === 'success' ? '[✓]' : t.type === 'error' ? '[!]' : '[i]';
        const accent =
          t.type === 'success'
            ? 'var(--accent-green)'
            : t.type === 'error'
              ? 'var(--accent-red)'
              : 'var(--accent-blue)';

        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border shadow-xl animate-fade-in'
            )}
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <span className="font-mono text-sm font-bold shrink-0 mt-0.5 select-none" style={{ color: accent }}>
              {typeBadge}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--tx-primary)]">{t.title}</p>
              {t.description ? (
                <p className="text-[11px] text-[var(--tx-secondary)] mt-0.5 leading-relaxed">
                  {t.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-[var(--tx-muted)] hover:text-[var(--tx-primary)] transition-colors shrink-0 font-mono text-xs select-none"
              aria-label="Dismiss"
            >
              [x]
            </button>
          </div>
        );
      })}
    </div>
  );
};

