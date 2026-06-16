'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/context/DashboardContext';
import { DATE_RANGE_PRESETS } from '@/lib/constants';
import type { DateRangePreset } from '@/types/dashboard.types';
import {
  IconLayoutDashboard,
  IconUpload,
  IconCpu,
  IconFlask,
  IconLayers,
  IconWrench,
  IconDollar,
  IconFileText,
  IconBell,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconMicrochip,
} from '@/components/ui/Icons';

const DATE_PRESETS: DateRangePreset[] = ['24h', '7d', '30d', '90d'];

const FAB_OPTIONS = [
  { value: 'fab-001', label: 'All Fabs' },
  { value: 'fab-002', label: 'Fab Alpha' },
  { value: 'fab-003', label: 'Fab Beta' },
];

const TESTER_OPTIONS = [
  { value: '', label: 'All Testers' },
  { value: 'tester-a', label: 'Tester A' },
  { value: 'tester-b', label: 'Tester B' },
];

const NAV_SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { href: '/dashboard',                   label: 'Dashboard',             id: 'nav-dashboard',  Icon: IconLayoutDashboard },
    ],
  },
  {
    title: 'Data Management',
    items: [
      { href: '/dashboard/upload',            label: 'Upload Files',          id: 'nav-upload',     Icon: IconUpload          },
      { href: '/dashboard/reports',           label: 'Reports',               id: 'nav-reports',    Icon: IconFileText        },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { href: '/dashboard/pattern-analysis',  label: 'Pattern Analysis',      id: 'nav-patterns',   Icon: IconCpu             },
      { href: '/dashboard/wafer-lot',         label: 'Wafer Analytics',       id: 'nav-wafer',      Icon: IconLayers          },
      { href: '/dashboard/equipment',         label: 'Equipment',             id: 'nav-equipment',  Icon: IconWrench          },
    ],
  },
  {
    title: 'Optimization',
    items: [
      { href: '/dashboard/test-optimization', label: 'Test Optimization',     id: 'nav-testopt',    Icon: IconFlask           },
      { href: '/dashboard/cost',              label: 'Cost Intelligence',     id: 'nav-cost',       Icon: IconDollar          },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/dashboard/alerts',            label: 'Alerts',                id: 'nav-alerts',     Icon: IconBell            },
      { href: '/dashboard/settings',          label: 'Settings',              id: 'nav-settings',   Icon: IconSettings        },
    ],
  },
];

/** Styled section divider label for expanded sidebar */
function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mx-3 mb-1 mt-2 flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--tx-muted)] opacity-70 whitespace-nowrap">
        {title}
      </span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

export function Sidebar() {
  const { state, toggleSidebar, setDateRange, setFab, unreadAlertCount } = useDashboard();
  const { sidebarCollapsed: collapsed } = state;
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen flex-col',
        'border-r border-[var(--border)] bg-[var(--bg-secondary)]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      {/* ── Logo ─────────────────────────────────────────── */}
      <div className={cn(
        'relative flex h-[60px] shrink-0 items-center border-b border-[var(--border)] px-3',
        collapsed ? 'justify-center' : 'gap-2.5',
      )}>
        {/* Logo glow backdrop */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-4 -top-4 h-20 w-20 rounded-full bg-blue-500/6 blur-2xl" />
        </div>

        {/* Logo icon */}
        <div
          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{ background: 'var(--gradient-brand)', boxShadow: '0 0 16px rgba(79,142,247,0.35)' }}
        >
          <IconMicrochip size={15} className="text-white" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold font-display text-[var(--tx-primary)] leading-tight tracking-wide">
              ATE Intelligence
            </p>
            <p className="truncate text-[9px] text-[var(--tx-muted)] uppercase tracking-widest">
              Cost Optimization
            </p>
          </div>
        )}

        {!collapsed && (
          <button
            id="sidebar-toggle"
            onClick={toggleSidebar}
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[var(--tx-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]"
            aria-label="Collapse sidebar"
          >
            <IconChevronLeft size={14} />
          </button>
        )}

        {collapsed && (
          <button
            id="sidebar-toggle"
            onClick={toggleSidebar}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--tx-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]"
            aria-label="Expand sidebar"
          >
            <IconChevronRight size={14} />
          </button>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-none">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-0.5">
            {/* Section label */}
            {!collapsed && <SectionLabel title={section.title} />}
            {collapsed && <div className="mx-3 mb-1 h-px bg-[var(--border)] opacity-40" />}

            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const { Icon } = item;
              return (
                <Link
                  key={item.id}
                  id={item.id}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center py-2 text-sm font-medium transition-all duration-200',
                    collapsed ? 'mx-2 my-0.5 justify-center rounded-xl px-0 py-2.5' : 'px-3 mx-1.5 my-0.5 rounded-xl gap-2.5',
                    isActive
                      ? collapsed
                        ? 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
                        : 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]'
                      : 'text-[var(--tx-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--tx-secondary)]',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active left bar — gradient + glow (expanded only) */}
                  {!collapsed && isActive && (
                    <span className="nav-active-dot" />
                  )}

                  {/* Icon with hover glow */}
                  <span className={cn('shrink-0', collapsed ? 'relative' : 'ml-1')}>
                    <Icon
                      size={16}
                      className={cn(
                        'transition-all duration-200',
                        isActive
                          ? 'text-[var(--accent-blue)] drop-shadow-[0_0_6px_rgba(79,142,247,0.5)]'
                          : 'text-[var(--tx-muted)] group-hover:text-[var(--tx-secondary)] group-hover:drop-shadow-[0_0_4px_rgba(132,148,200,0.4)]',
                      )}
                    />
                    {/* Alert badge on icon (collapsed) */}
                    {item.id === 'nav-alerts' && unreadAlertCount > 0 && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent-red)] px-0.5 text-[8px] font-bold text-white leading-none">
                        {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                      </span>
                    )}
                  </span>

                  {/* Label + alert badge (expanded) */}
                  {!collapsed && (
                    <>
                      <span className="truncate text-[12px]">{item.label}</span>
                      {item.id === 'nav-alerts' && unreadAlertCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-red)] px-1 text-[9px] font-bold text-white">
                          {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Quick Filters (bottom, expanded only) ─────────── */}
      {!collapsed && (
        <div className="shrink-0 border-t border-[var(--border)] px-3 py-3 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--tx-muted)] opacity-60">
              Quick Filters
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {/* Date filter */}
          <div className="relative">
            <select
              id="sidebar-filter-date"
              value={state.dateRange.preset}
              onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
              className="select-styled"
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset === '24h' ? 'Last 24 hours' : DATE_RANGE_PRESETS[preset].label}
                </option>
              ))}
            </select>
            <IconChevronDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-muted)]" />
          </div>

          {/* Fab filter */}
          <div className="relative">
            <select
              id="sidebar-filter-fab"
              value={state.activeFabId ?? ''}
              onChange={(e) => setFab(e.target.value || 'fab-001')}
              className="select-styled"
            >
              {FAB_OPTIONS.map((fab) => (
                <option key={fab.value} value={fab.value}>{fab.label}</option>
              ))}
            </select>
            <IconChevronDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-muted)]" />
          </div>

          {/* Tester filter */}
          <div className="relative">
            <select
              id="sidebar-filter-tester"
              defaultValue=""
              className="select-styled"
            >
              {TESTER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <IconChevronDown size={10} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--tx-muted)]" />
          </div>
        </div>
      )}

      {/* ── Collapsed bottom alert indicator ──────────────── */}
      {collapsed && unreadAlertCount > 0 && (
        <div className="shrink-0 border-t border-[var(--border)] py-2 flex justify-center">
          <Link
            href="/dashboard/alerts"
            id="nav-bell-collapsed"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--accent-red)] hover:bg-[var(--bg-hover)] transition"
            title={`${unreadAlertCount} unread alerts`}
          >
            <IconBell size={15} />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-red)] px-0.5 text-[8px] font-bold text-white">
              {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
            </span>
          </Link>
        </div>
      )}
    </aside>
  );
}
