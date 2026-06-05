// d:\officw work -1\ai-1\frontend\src\app\ate-dft\page.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useAteDftUpload, useAteDftSummary, useAteDftFiles } from '@/hooks/useAteDft';
import type { AnalysisResult, ModuleType } from '@/types/ateDft';
import { RISK_LABEL } from '@/types/ateDft';

// ── Module color map ──────────────────────────
const MODULE_COLOR: Record<ModuleType | string, string> = {
  MBIST:   '#7b5ea7',
  LBIST:   '#4fc3a1',
  SCAN:    '#e8834f',
  WAFER:   '#5b9cf6',
  ATPG:    '#e8c94f',
  UNKNOWN: '#6b6b88',
};

const MODULE_BG: Record<string, string> = {
  MBIST:   'rgba(123,94,167,0.15)',
  LBIST:   'rgba(79,195,161,0.15)',
  SCAN:    'rgba(232,131,79,0.15)',
  WAFER:   'rgba(91,156,246,0.15)',
  ATPG:    'rgba(232,201,79,0.15)',
  UNKNOWN: 'rgba(107,107,136,0.15)',
};

// ── Risk color ────────────────────────────────
function riskColor(score: number) {
  if (score > 0.7) return '#e85d5d';
  if (score > 0.35) return '#e8c94f';
  return '#4fc3a1';
}

// ── Module badge ──────────────────────────────
function ModuleBadge({ type }: { type: string }) {
  return (
    <span style={{
      background: MODULE_BG[type] ?? MODULE_BG.UNKNOWN,
      color: MODULE_COLOR[type] ?? MODULE_COLOR.UNKNOWN,
      padding: '2px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
    }}>
      {type}
    </span>
  );
}

// ── Risk bar ──────────────────────────────────
function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)',
        borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%',
          background: riskColor(score), borderRadius: 2,
          transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: riskColor(score), minWidth: 32 }}>
        {pct}%
      </span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────
function KpiCard({
  label, value, module
}: { label: string; value: number | string; module?: string }) {
  const accent = module ? (MODULE_COLOR[module.toUpperCase()] ?? '#6b6b88') : '#6b6b88';
  return (
    <div style={{
      background: '#13131f', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: accent,
      }} />
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: '#6b6b88', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#e8e8f0', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      style={{
        display: 'block', border: `1.5px dashed ${drag ? '#7b5ea7' : 'rgba(255,255,255,0.13)'}`,
        borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
        background: drag ? 'rgba(123,94,167,0.06)' : '#13131f',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        style={{ display: 'none' }}
        accept=".log,.csv,.stdf,.stil,.wgl,.rpt,.json,.txt,.spf"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>📂</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#e8e8f0', marginBottom: 6 }}>
        Drop test file here
      </div>
      <div style={{ fontSize: 12, color: '#6b6b88', lineHeight: 1.7 }}>
        Auto-detects: MBIST · LBIST · Scan Chain · Wafer · ATPG
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6,
        justifyContent: 'center', marginTop: 12 }}>
        {['.log','.csv','.stdf','.stil','.wgl','.rpt','.spf','.json'].map(ext => (
          <span key={ext} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '2px 8px', borderRadius: 4,
            fontSize: 11, color: '#6b6b88', fontFamily: 'monospace',
          }}>{ext}</span>
        ))}
      </div>
    </label>
  );
}

// ── Result card ───────────────────────────────
function ResultCard({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(true);
  const risk = result.prediction?.riskScore ?? 0;
  const label = RISK_LABEL[result.prediction?.prediction] ?? result.prediction?.prediction;
  const featEntries = Object.entries(result.features ?? {})
    .filter(([, v]) => !Array.isArray(v) && typeof v !== 'object')
    .slice(0, 10);
  const predEntries = Object.entries(result.prediction ?? {})
    .filter(([k, v]) => !['recommendation','inputsUsed'].includes(k) && typeof v !== 'object');

  return (
    <div style={{
      background: '#13131f', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, marginBottom: 12, overflow: 'hidden',
      animation: 'fadeUp 0.3s ease',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px', cursor: 'pointer',
          borderBottom: open ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ModuleBadge type={result.detectedType} />
          <span style={{ fontSize: 13, color: '#e8e8f0' }}>{result.fileName}</span>
          <span style={{ fontSize: 11, color: '#6b6b88' }}>
            {Math.round((result.confidence ?? 0) * 100)}% confidence
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: riskColor(risk), marginLeft: 4,
          }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RiskBar score={risk} />
          <span style={{ color: '#6b6b88', fontSize: 12 }}>{open ? '▾' : '▸'}</span>
        </div>
      </div>

      {open && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 20, padding: '18px 18px 16px',
        }}>
          {/* Features */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#6b6b88', marginBottom: 8 }}>Extracted features</div>
            {featEntries.length ? featEntries.map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: '#6b6b88' }}>{k}</span>
                <span style={{ color: '#e8e8f0', fontFamily: 'monospace' }}>{String(v)}</span>
              </div>
            )) : (
              <span style={{ color: '#6b6b88', fontSize: 12 }}>No features extracted</span>
            )}
          </div>
          {/* Prediction */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#6b6b88', marginBottom: 8 }}>AI prediction</div>
            {predEntries.map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 12, padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{ color: '#6b6b88' }}>{k}</span>
                <span style={{ color: '#e8e8f0', fontFamily: 'monospace' }}>{String(v)}</span>
              </div>
            ))}
          </div>
          {/* Recommendation */}
          {result.prediction?.recommendation && (
            <div style={{
              gridColumn: '1/-1',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 6, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#4fc3a1', marginBottom: 6 }}>Recommendation</div>
              <div style={{ fontSize: 12, color: '#e8e8f0', lineHeight: 1.7 }}>
                {result.prediction.recommendation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── File tracker table ────────────────────────
function FileTrackerTable() {
  const { files, loading, refresh } = useAteDftFiles();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#e8e8f0' }}>File Tracker</div>
        <button onClick={refresh} style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.13)',
          color: '#e8e8f0', padding: '6px 14px', borderRadius: 6,
          cursor: 'pointer', fontSize: 12,
        }}>↻ Refresh</button>
      </div>
      <div style={{
        background: '#13131f', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, overflow: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['File Name','Type','Confidence','Status','Uploaded'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#6b6b88', borderBottom: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center',
                color: '#6b6b88' }}>Loading...</td></tr>
            ) : !files.length ? (
              <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center',
                color: '#6b6b88' }}>No files uploaded yet.</td></tr>
            ) : files.map(f => (
              <tr key={f.fileId}>
                <td style={{ padding: '10px 16px', color: '#e8e8f0',
                  fontFamily: 'monospace', fontSize: 12 }}>{f.fileName}</td>
                <td style={{ padding: '10px 16px' }}>
                  <ModuleBadge type={f.detectedType ?? 'UNKNOWN'} />
                </td>
                <td style={{ padding: '10px 16px', color: '#e8e8f0' }}>
                  {f.confidence ? `${Math.round(f.confidence * 100)}%` : '—'}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 12,
                    background: f.status === 'predicted' ? 'rgba(79,195,161,0.15)'
                      : f.status?.includes('fail') ? 'rgba(232,93,93,0.15)'
                      : 'rgba(91,156,246,0.15)',
                    color: f.status === 'predicted' ? '#4fc3a1'
                      : f.status?.includes('fail') ? '#e85d5d' : '#5b9cf6',
                  }}>{f.status}</span>
                </td>
                <td style={{ padding: '10px 16px', color: '#6b6b88', fontSize: 11 }}>
                  {f.uploadTime ? new Date(f.uploadTime).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────
type Tab = 'upload' | 'files';

export default function AteDftPage() {
  const [tab, setTab] = useState<Tab>('upload');
  const { results, uploading, error, upload } = useAteDftUpload();
  const { summary, refresh: refreshSummary } = useAteDftSummary();

  const handleFile = useCallback(async (file: File) => {
    await upload(file);
    refreshSummary();
  }, [upload, refreshSummary]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'upload', label: 'Upload & Analyze' },
    { key: 'files',  label: 'File Tracker' },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#09090f',
        color: '#e8e8f0', fontFamily: 'monospace', padding: '32px 40px',
      }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#7b5ea7', marginBottom: 4 }}>Semiconductor AI</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#e8e8f0' }}>
            ATE / DFT Analyzer
          </h1>
          <p style={{ fontSize: 12, color: '#6b6b88', marginTop: 4 }}>
            Automatic file detection · Separate AI model per module
          </p>
        </div>

        {/* KPI Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 14, marginBottom: 28,
        }}>
          <KpiCard label="Total Files"    value={summary?.totalFilesUploaded ?? 0} />
          <KpiCard label="MBIST Records"  value={summary?.mbist.totalRecords ?? 0} module="MBIST" />
          <KpiCard label="LBIST Records"  value={summary?.lbist.totalRecords ?? 0} module="LBIST" />
          <KpiCard label="Scan Records"   value={summary?.scan.totalRecords  ?? 0} module="SCAN"  />
          <KpiCard label="Wafer Records"  value={summary?.wafer.totalRecords ?? 0} module="WAFER" />
          <KpiCard label="ATPG Records"   value={summary?.atpg.totalRecords  ?? 0} module="ATPG"  />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24,
          borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, fontFamily: 'monospace',
              color: tab === t.key ? '#e8e8f0' : '#6b6b88',
              borderBottom: `2px solid ${tab === t.key ? '#7b5ea7' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div>
            <DropZone onFile={handleFile} />

            {uploading && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', marginTop: 16,
                background: 'rgba(123,94,167,0.08)',
                border: '1px solid rgba(123,94,167,0.2)',
                borderRadius: 10, fontSize: 12, color: '#7b5ea7',
              }}>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(123,94,167,0.3)',
                  borderTopColor: '#7b5ea7', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Analyzing file...
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 12, padding: '12px 16px', borderRadius: 8,
                background: 'rgba(232,93,93,0.08)',
                border: '1px solid rgba(232,93,93,0.2)',
                color: '#e85d5d', fontSize: 12,
              }}>
                {error} — is your backend running at{' '}
                <code style={{ fontFamily: 'monospace' }}>
                  {process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}
                </code>
                ?
              </div>
            )}

            {results.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#6b6b88', marginBottom: 12 }}>
                  Analysis results ({results.length})
                </div>
                {results.map(r => <ResultCard key={r.fileId} result={r} />)}
              </div>
            )}
          </div>
        )}

        {/* File tracker tab */}
        {tab === 'files' && <FileTrackerTable />}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}
