'use client';

import { type ReactNode } from 'react';
import { Sidebar }     from '@/components/layout/Sidebar';
import { Topbar }      from '@/components/layout/Topbar';
import { useDashboard } from '@/context/DashboardContext';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { state } = useDashboard();
  const collapsed  = state.sidebarCollapsed;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Topbar ───────────────────────────────────────────── */}
      <Topbar />

      {/* ── Main content ─────────────────────────────────────── */}
      <main
        className={cn(
          'min-h-screen pt-[60px] pb-12 transition-all duration-300',
        )}
        style={{
          marginLeft: collapsed ? '60px' : '220px',
          paddingLeft: 'clamp(16px, 3vw, 28px)',
          paddingRight: 'clamp(16px, 3vw, 28px)',
        }}
      >
        {/* ── Subtle grid background ── */}
        <div
          className="pointer-events-none fixed inset-0 bg-grid-pattern"
          style={{ opacity: 0.18, zIndex: 0 }}
        />

        {/* ── Ambient corner glow ── */}
        <div
          className="pointer-events-none fixed top-0 right-0 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(79,142,247,0.07) 0%, transparent 70%)', zIndex: 0 }}
        />
        <div
          className="pointer-events-none fixed bottom-0 left-1/4 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(166,120,255,0.05) 0%, transparent 70%)', zIndex: 0 }}
        />

        {/* ── Page content ── */}
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
