'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import CommandPalette from './CommandPalette';
import {
  IconRefreshCw,
  IconBell,
  IconDownload,
  IconSettings,
  IconSearch,
  IconChevronRight,
} from '@/components/ui/Icons';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  breadcrumb?: string[];
}

export function Topbar({
  title = 'Executive Dashboard',
  subtitle,
  breadcrumb = ['ATE Intelligence', 'Executive Dashboard'],
}: TopbarProps) {
  const { state, unreadAlertCount } = useDashboard();
  const { lastUpdatedAt, autoRefresh } = state;
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);

  return (
    <header
      className={cn(
        'fixed right-0 top-0 z-40 flex h-[60px] items-center gap-3 px-4',
        'border-b border-[var(--border)] transition-all duration-300',
      )}
      style={{
        left: state.sidebarCollapsed ? '60px' : '220px',
        background: 'rgba(11,15,28,0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      {/* ── Left: Breadcrumb + LIVE ─────────────────────── */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <nav className="hidden md:flex items-center gap-1" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1">
              {i > 0 && (
                <IconChevronRight size={10} className="text-[var(--tx-muted)] opacity-50 mx-0.5" />
              )}
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  i === breadcrumb.length - 1
                    ? 'text-[var(--tx-secondary)]'
                    : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] cursor-pointer',
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        {/* LIVE badge with ring pulse */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--accent-green)]/35 bg-[var(--accent-green)]/8 px-2.5 py-1 border-pulse shrink-0">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            {/* Outer pulsing ring */}
            <span
              className="absolute inset-0 rounded-full bg-[var(--accent-green)] live-ring opacity-70"
            />
            {/* Solid inner dot */}
            <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--accent-green)]" />
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--accent-green)]">Live</span>
        </div>
      </div>

      {/* ── Center: Search ─────────────────────────────── */}
      <div className="flex-1 flex justify-center">
        <button
          id="topbar-search"
          onClick={() => setIsCommandBarOpen(true)}
          className={cn(
            'group flex w-full max-w-sm items-center gap-2 rounded-xl px-3 py-1.5 text-[11px]',
            'border border-[var(--border)] bg-[var(--bg-elevated)]/60',
            'text-[var(--tx-muted)] transition-all duration-200',
            'hover:border-[var(--border-bright)] hover:bg-[var(--bg-elevated)] hover:text-[var(--tx-secondary)]',
            'focus-within:border-[rgba(79,142,247,0.5)] focus-within:shadow-[0_0_0_2px_rgba(79,142,247,0.1)]',
          )}
          aria-label="Search patterns, lots, reports…"
          title="Search"
        >
          <IconSearch size={13} className="shrink-0 opacity-50 group-hover:opacity-80 transition-opacity" />
          <span className="flex-1 text-left">Search patterns, lots…</span>
          <kbd className="hidden md:flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--tx-muted)]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Right: Actions ──────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Auto-refresh — highlighted when active */}
        <button
          id="topbar-refresh"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200',
            autoRefresh
              ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] shadow-[0_0_12px_rgba(79,142,247,0.2)]'
              : 'border-[var(--border)] bg-transparent text-[var(--tx-muted)] hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]',
          )}
          aria-label="Toggle auto-refresh"
          title="Auto-refresh"
        >
          <IconRefreshCw
            size={14}
            className={cn(autoRefresh && 'animate-spin')}
            style={autoRefresh ? { animationDuration: '3s' } : {}}
          />
        </button>

        {/* Download */}
        <button
          id="topbar-download"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--tx-muted)] transition-all duration-200 hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]"
          aria-label="Download report"
          title="Export Report"
        >
          <IconDownload size={14} />
        </button>

        {/* Settings */}
        <button
          id="topbar-settings"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent text-[var(--tx-muted)] transition-all duration-200 hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]"
          aria-label="Settings"
          title="Settings"
        >
          <IconSettings size={14} />
        </button>

        {/* Notifications — emphasised when alerts exist */}
        <button
          id="topbar-notifications"
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200',
            unreadAlertCount > 0
              ? 'border-[var(--accent-red)]/35 bg-[var(--accent-red)]/8 text-[var(--accent-red)]'
              : 'border-[var(--border)] bg-transparent text-[var(--tx-muted)] hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]',
          )}
          aria-label="Notifications"
          title="Notifications"
        >
          <IconBell size={14} />
          {unreadAlertCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-red)] px-0.5 text-[8px] font-bold text-white leading-none shadow-[0_0_8px_rgba(240,82,82,0.5)]">
              {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="mx-1.5 h-5 w-px bg-[var(--border)]" />

        {/* Avatar */}
        <div
          id="topbar-avatar"
          className="group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold text-white select-none transition-all duration-200"
          style={{
            background: 'var(--gradient-brand)',
            boxShadow: '0 0 14px rgba(79,142,247,0.3)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 22px rgba(79,142,247,0.5)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 14px rgba(79,142,247,0.3)';
          }}
          aria-label="User profile"
          title="Admin User — Engineer"
        >
          SD
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--accent-green)]" />
        </div>
      </div>
      <CommandPalette isOpen={isCommandBarOpen} onClose={() => setIsCommandBarOpen(false)} />
    </header>
  );
}

