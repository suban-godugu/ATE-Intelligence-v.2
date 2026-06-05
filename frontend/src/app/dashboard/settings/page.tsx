"use client";

// No icons imported

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-fade-in">
      <div
        className="w-full max-w-sm rounded-[var(--radius-2xl)] border p-10 flex flex-col items-center text-center gap-5"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Status chip */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-dot-pulse animate-pulse" />
          <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-widest">In Development</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-center mb-2">
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded border border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
              SETTINGS
            </span>
          </div>
          <h1 className="text-[18px] font-bold text-[var(--tx-primary)]" style={{ letterSpacing: '-0.02em' }}>
            Settings
          </h1>
          <p className="text-[12px] text-[var(--tx-secondary)] leading-relaxed">
            User preferences, API key management, organisation configuration, and access controls.
          </p>
        </div>

        {/* Progress track */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-[var(--tx-muted)] uppercase tracking-wider">Completion</span>
            <span className="mono-value text-[var(--accent-primary)]">0%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border)] overflow-hidden">
            <div className="h-full w-0 rounded-full bg-[var(--accent-primary)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
