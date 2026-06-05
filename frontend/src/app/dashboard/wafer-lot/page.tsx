'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Brain, Layers, RefreshCw,
  ChevronDown, TrendingUp, AlertTriangle, Check,
  BarChart3, Eye, X, Cpu, Database, ArrowRight, Trash2, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWaferAi } from '@/hooks/useWaferAi';
import { DEFECT_COLORS, LOT_MAPPING, type WaferEntry } from '@/api/waferAi';
import { toast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

// ─── Defect colour badge ──────────────────────────────────
function DefectBadge({ cls, confidence }: { cls: string; confidence: number }) {
  const color = DEFECT_COLORS[cls] ?? '#8b9cc8';
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {cls} · {confidence.toFixed(1)}%
    </span>
  );
}

// ─── Wafer Image Drop Zone (interactive upload on same page) ──────
interface WaferDropZoneProps {
  onFiles: (files: File[]) => void;
  predicting: boolean;
}

function WaferDropZone({ onFiles, predicting }: WaferDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((files: FileList | null) => {
    if (!files) return;
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imgs.length) onFiles(imgs);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      onClick={() => !predicting && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-6 cursor-pointer transition-all duration-300 shadow-md',
        dragging
          ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 scale-[1.01] shadow-[0_0_30px_rgba(168,85,247,0.15)]'
          : 'border-[var(--border)] bg-[var(--bg-card)]/30 backdrop-blur-sm hover:border-[var(--accent-purple)]/50 hover:bg-[var(--bg-hover)]/45 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5',
        predicting && 'cursor-not-allowed opacity-50 pointer-events-none',
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handle(e.target.files)} />

      {predicting ? (
        <div className="flex items-center gap-4 py-2">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--accent-purple)] border-t-transparent animate-spin shrink-0" />
          <div className="text-left">
            <p className="text-xs font-bold text-[var(--accent-purple)] uppercase tracking-wider">AI Inference Active</p>
            <p className="text-[10px] text-[var(--tx-muted)]">ResNet50 model classifying defects...</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/30">
              <Upload className="h-5 w-5 text-[var(--accent-purple)] animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-[var(--tx-primary)] uppercase tracking-wider">Upload Wafer Images</p>
              <p className="text-[10px] text-[var(--tx-muted)]">AI Defect Classification • ResNet50 • Drag & drop files directly</p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--accent-purple)]/40 bg-[var(--accent-purple)]/10 px-3 py-1 text-[9px] font-bold text-[var(--accent-purple)] uppercase tracking-widest leading-none">
            Drop Files Here
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Probability bar chart ────────────────────────────────
function ProbChart({ probs }: { probs: Record<string, number> }) {
  if (!probs) return null;
  const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return (
    <div className="space-y-2">
      {sorted.map(([cls, prob]) => (
        <div key={cls} className="flex items-center gap-2">
          <span className="w-[70px] text-[10px] text-[var(--tx-muted)] truncate shrink-0">{cls}</span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${prob}%`,
                background: DEFECT_COLORS[cls] ?? 'var(--accent-blue)',
              }}
            />
          </div>
          <span className="w-10 text-right text-[10px] font-mono text-[var(--tx-secondary)]">{prob.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}


// (UploadZone moved to Upload Files page)

// ─── LOT Summary Row ──────────────────────────────────────
function LotSummaryRow({
  lotId,
  defectType,
  waferCount,
  totalYield,
  isSelected,
  onSelect,
}: {
  lotId: string;
  defectType: string;
  waferCount: number;
  totalYield: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const color = DEFECT_COLORS[defectType] ?? '#8b9cc8';
  const hasData = waferCount > 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group',
        isSelected
          ? 'bg-[var(--bg-elevated)] border border-[var(--border-bright)]'
          : 'border border-transparent hover:bg-[var(--bg-hover)]/50 hover:border-[var(--border)]',
      )}
    >
      <span
        className="shrink-0 h-2 w-2 rounded-full"
        style={{ background: hasData ? color : 'var(--tx-disabled)' }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-semibold text-[var(--tx-primary)] truncate">{lotId}</span>
        <span className="block text-[10px] text-[var(--tx-muted)]">{defectType}</span>
      </span>
      {hasData && (
        <div className="shrink-0 text-right">
          <span className="block text-[10px] font-bold text-[var(--tx-secondary)]">{waferCount}w</span>
          <span className="block text-[10px] font-mono" style={{ color }}>
            {totalYield.toFixed(1)}%
          </span>
        </div>
      )}
      {!hasData && (
        <span className="text-[9px] text-[var(--tx-disabled)]">Empty</span>
      )}
    </button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────
export default function WaferLotPage() {
  const queryClient = useQueryClient();
  const { lotDatabase, predicting, error, predict, clearLot, clearAll, deleteWafer } = useWaferAi();
  const [selectedLot, setSelectedLot] = useState('LOT_1');
  const [showAttention, setShowAttention] = useState(false);

  // Auto-select the first non-empty lot upon initial load or state update
  useEffect(() => {
    const activeLot = Object.entries(lotDatabase).find(([_, data]) => data.wafers.length > 0)?.[0];
    if (activeLot) {
      setSelectedLot(activeLot);
    }
  }, [lotDatabase]);

  const [lastResult, setLastResult]   = useState<WaferEntry | null>(null);
  const [showResult, setShowResult]   = useState(false);

  const selectedLotData = lotDatabase[selectedLot];
  const wafers          = selectedLotData?.wafers ?? [];

  // dismiss flash after 6s
  useEffect(() => {
    if (!showResult) return;
    const t = setTimeout(() => setShowResult(false), 6000);
    return () => clearTimeout(t);
  }, [showResult]);

  // Aggregate summary stats across all lots
  const globalStats = Object.values(lotDatabase).reduce(
    (acc, lot) => {
      lot.wafers.forEach(w => {
        acc.totalWafers++;
        acc.totalGood  += w.good;
        acc.totalFail  += w.fail;
        acc.totalDies  += w.total;
      });
      return acc;
    },
    { totalWafers: 0, totalGood: 0, totalFail: 0, totalDies: 0 }
  );

  const globalYield = globalStats.totalDies > 0
    ? (globalStats.totalGood / globalStats.totalDies) * 100
    : 0;

  // Lot summary stats
  const lotYield = wafers.length > 0
    ? wafers.reduce((a, w) => a + w.good, 0) /
      Math.max(1, wafers.reduce((a, w) => a + w.total, 0)) * 100
    : 0;

  return (
    <div className="space-y-5 py-4">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full border border-[var(--accent-purple)]/40 bg-[var(--accent-purple)]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--accent-purple)]">
              ● AI Active
            </span>
            <span className="text-[10px] text-[var(--tx-muted)]">ResNet50 · WaferVision v1.0</span>
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--tx-primary)] leading-tight">
            Wafer / Lot Analytics
            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-purple-500/35 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-400 align-middle">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 pulse-glow" />
              AI Vision
            </span>
          </h1>
          <p className="mt-0.5 text-[11px] text-[var(--tx-muted)]">
            AI Defect Classification · Overlay Heatmap · Fail Density · LOT Intelligence
          </p>
        </div>

        <button
          onClick={async () => {
            await clearAll();
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast.success('All Wafers Cleared', 'All wafer image assignments cleared.');
          }}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-[11px] text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] hover:border-[var(--border-bright)] transition"
        >
          <RefreshCw className="h-3 w-3" />
          Clear All
        </button>
      </div>

      {/* ── Flash: Last Prediction Result ─────────────────── */}
      {showResult && lastResult && (
        <div
          className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-all"
          style={{
            background: `${DEFECT_COLORS[lastResult.class] ?? '#8b9cc8'}14`,
            borderColor: `${DEFECT_COLORS[lastResult.class] ?? '#8b9cc8'}40`,
          }}
        >
          <Brain className="h-4 w-4 shrink-0" style={{ color: DEFECT_COLORS[lastResult.class] }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--tx-primary)]">
              AI Classification: <strong>{lastResult.class}</strong> · {lastResult.confidence.toFixed(1)}% confidence
            </p>
            <p className="text-[10px] text-[var(--tx-muted)]">
              Assigned to {lastResult.lot} · Good: {lastResult.good} · Fail: {lastResult.fail} · Yield: {lastResult.yield.toFixed(1)}%
            </p>
          </div>
          <button onClick={() => setShowResult(false)} className="shrink-0 text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* ── Global KPI Cards ──────────────────────────────── */}
      <section aria-label="Global wafer metrics">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Wafers',  value: globalStats.totalWafers, icon: Layers,   color: 'var(--accent-blue)',   suffix: '' },
            { label: 'Good Dies',     value: globalStats.totalGood,   icon: Check,    color: 'var(--accent-green)',  suffix: '' },
            { label: 'Fail Dies',     value: globalStats.totalFail,   icon: AlertTriangle, color: 'var(--accent-red)',suffix: '' },
            { label: 'Global Yield',  value: globalYield.toFixed(1),  icon: TrendingUp, color: 'var(--accent-purple)',suffix: '%' },
          ].map(kpi => (
            <div key={kpi.label} className="card rounded-xl p-4 flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${kpi.color}20`, border: `1px solid ${kpi.color}40` }}
              >
                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-[10px] text-[var(--tx-muted)] uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold font-mono" style={{ color: kpi.color }}>
                  {kpi.value}{kpi.suffix}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main Layout: Sidebar + Content ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">

        {/* ── LOT Sidebar ────────────────────────────────── */}
        <div className="card rounded-xl p-4 space-y-1 h-fit">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)]">
              LOT Database
            </p>
            <span className="text-[10px] font-mono text-[var(--accent-green)]">
              {Object.values(lotDatabase).filter(l => l.wafers.length > 0).length} active
            </span>
          </div>

          <div className="space-y-1 max-h-[350px] overflow-y-auto pr-1">
            {Object.entries(lotDatabase).map(([lotId, data]) => {
              const totalYield = data.wafers.length > 0
                ? data.wafers.reduce((a, w) => a + w.good, 0) /
                  Math.max(1, data.wafers.reduce((a, w) => a + w.total, 0)) * 100
                : 0;
              return (
                <LotSummaryRow
                  key={lotId}
                  lotId={lotId}
                  defectType={data.defect_type}
                  waferCount={data.wafers.length}
                  totalYield={totalYield}
                  isSelected={selectedLot === lotId}
                  onSelect={() => setSelectedLot(lotId)}
                />
              );
            })}
          </div>

          {/* Visualization Settings inside sidebar */}
          <div className="border-t border-[var(--border)] mt-4 pt-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)]">
              Visualization Settings
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--tx-secondary)]">Show Attention Map</span>
              <button
                onClick={() => setShowAttention(prev => !prev)}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  showAttention ? "bg-purple-600" : "bg-zinc-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    showAttention ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────── */}
        <div className="space-y-4">

          {/* Interactive Wafer Drop Zone */}
          <WaferDropZone
            predicting={predicting}
            onFiles={async (imgs) => {
              for (const img of imgs) {
                const res = await predict(img);
                if (res) {
                  toast.success(
                    'Wafer Classified',
                    `${img.name} successfully predicted as ${res.class} (${res.confidence.toFixed(1)}%) and assigned to ${res.lot}.`
                  );
                }
              }
            }}
          />

          {/* LOT Header */}
          <div
            className="rounded-2xl border p-5"
            style={{
              background: 'rgba(15,20,40,0.85)',
              borderColor: `${DEFECT_COLORS[selectedLotData?.defect_type ?? ''] ?? 'var(--border)'}44`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold font-mono text-[var(--tx-muted)]">{selectedLot}</span>
                  <DefectBadge
                    cls={selectedLotData?.defect_type ?? 'Unknown'}
                    confidence={0}
                  />
                </div>
                <h2 className="text-base font-bold text-[var(--tx-primary)]">
                  {selectedLot} Analysis
                </h2>
              </div>

              {wafers.length > 0 && (
                <div className="flex items-center gap-4">
                  {/* Lot summary chips */}
                  {[
                    { label: 'Wafers', val: wafers.length,  icon: Layers },
                    { label: 'Yield',  val: `${lotYield.toFixed(1)}%`, icon: TrendingUp },
                    { label: 'Fail',   val: wafers.reduce((a, w) => a + w.fail, 0), icon: AlertTriangle },
                  ].map(s => (
                    <div key={s.label} className="text-right">
                      <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider">{s.label}</p>
                      <p className="text-sm font-bold font-mono text-[var(--tx-primary)]">{s.val}</p>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      await clearLot(selectedLot);
                      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                      toast.success('Lot Cleared', `All wafer assignments in ${selectedLot} cleared.`);
                    }}
                    className="text-[10px] text-[var(--tx-muted)] hover:text-red-400 transition flex items-center gap-1"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              )}
            </div>

            {/* LOT Summary metrics (when wafers exist) */}
            {wafers.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-6 pb-6 border-b border-[var(--border)]">
                {[
                  { label: 'Total Wafers', value: wafers.length,                       color: 'var(--accent-blue)'   },
                  { label: 'Good Dies',    value: wafers.reduce((a, w) => a + w.good, 0), color: 'var(--accent-green)' },
                  { label: 'Fail Dies',    value: wafers.reduce((a, w) => a + w.fail, 0), color: 'var(--accent-red)'   },
                  { label: 'LOT Yield',    value: `${lotYield.toFixed(2)}%`,            color: 'var(--accent-purple)' },
                ].map(m => (
                  <div key={m.label} className="card-elevated rounded-xl p-3 text-center">
                    <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Wafer list showing visual heatmaps directly side-by-side */}
            {wafers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-hover)] border border-[var(--border)]">
                  <Database className="h-5 w-5 text-[var(--tx-muted)]" />
                </div>
                <p className="text-sm text-[var(--tx-muted)]">No wafers in {selectedLot}</p>
                <p className="text-[11px] text-[var(--tx-disabled)]">
                  Upload a wafer image above — AI will classify and assign it here
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {wafers.map((wafer, i) => {
                  const defColor = DEFECT_COLORS[wafer.class] ?? '#8b9cc8';
                  const isNormal = wafer.class === 'Normal';
                  const timestampStr = wafer.timestamp ? new Date(wafer.timestamp).toLocaleString() : 'N/A';

                  return (
                    <div
                      key={`${wafer.name}-${i}`}
                      className="border-b border-[var(--border)] pb-8 last:border-0 last:pb-0"
                    >
                      {/* Wafer Card Header */}
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded bg-[var(--bg-hover)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[var(--tx-muted)]">
                              #{i + 1}
                            </span>
                            <h3 className="text-sm font-semibold text-[var(--tx-primary)] truncate" title={wafer.name}>
                              {wafer.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <DefectBadge cls={wafer.class} confidence={wafer.confidence} />
                            <span className="text-[10px] text-[var(--tx-disabled)]">{timestampStr}</span>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            await deleteWafer(selectedLot, wafer.name);
                            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                            toast.success('Wafer Removed', `${wafer.name} has been removed from assignment.`);
                          }}
                          className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all duration-200"
                          title="Delete Wafer Entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Side-by-Side Visuals & Stacked Metrics Column Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                        
                        {/* Left visual maps container (takes 5 out of 7 columns) */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Overlay Analytics */}
                            <div className="card rounded-2xl p-4 border border-[var(--border)] bg-black/30 flex flex-col items-center">
                              <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-wider mb-3">
                                Overlay Analytics
                              </p>
                              <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden border border-white/5 bg-zinc-950 flex items-center justify-center shadow-inner group/img">
                                {wafer.overlayDataUrl ? (
                                  <img
                                    src={wafer.overlayDataUrl}
                                    alt="Overlay Analytics"
                                    className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                                  />
                                ) : wafer.waferImageUrl ? (
                                  <div className="relative h-full w-full">
                                    <img
                                      src={wafer.waferImageUrl}
                                      alt="Original Image"
                                      className="h-full w-full object-contain opacity-60"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-3 text-center">
                                      <p className="text-[9px] font-semibold text-[var(--tx-muted)] uppercase tracking-wider leading-relaxed">
                                        Overlay Generating...
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[var(--tx-disabled)]">No Map Available</span>
                                )}
                              </div>
                            </div>

                            {/* Fail Density Map */}
                            <div className="card rounded-2xl p-4 border border-[var(--border)] bg-black/30 flex flex-col items-center">
                              <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-wider mb-3">
                                Fail Density Map
                              </p>
                              <div className="relative aspect-square w-full max-w-[200px] rounded-xl overflow-hidden border border-white/5 bg-zinc-950 flex items-center justify-center shadow-inner group/img">
                                {wafer.densityDataUrl ? (
                                  <img
                                    src={wafer.densityDataUrl}
                                    alt="Fail Density Map"
                                    className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-4 text-center">
                                    <span className="text-[10px] text-[var(--tx-disabled)] uppercase tracking-wider">
                                      No Density Data
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                          </div>

                          {/* AI Attention Map (centered full-width map below overlay/density) */}
                          {showAttention && (
                            <div className="card rounded-2xl p-4 border border-[var(--border)] bg-black/30 flex flex-col items-center">
                              <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-wider mb-3">
                                AI Attention Map
                              </p>
                              <div className="relative aspect-video w-full max-w-[420px] rounded-xl overflow-hidden border border-white/5 bg-zinc-950 flex items-center justify-center shadow-inner group/img">
                                {wafer.attentionDataUrl ? (
                                  <img
                                    src={wafer.attentionDataUrl}
                                    alt="AI Attention Map"
                                    className="h-full w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
                                  />
                                ) : (
                                  <span className="text-[10px] text-[var(--tx-disabled)]">No Attention Map Available</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Class Probability Distribution */}
                          <div className="card rounded-2xl p-4 border border-[var(--border)] bg-black/30">
                            <p className="text-[10px] font-bold text-[var(--tx-muted)] uppercase tracking-wider mb-3">
                              Class Probability Distribution
                            </p>
                            <ProbChart probs={wafer.probabilities} />
                          </div>
                        </div>

                        {/* Right metrics container (takes 2 out of 7 columns) */}
                        <div className="lg:col-span-2 flex flex-col gap-2">
                          {[
                            { label: 'Defect Type', value: wafer.class, color: defColor },
                            { label: 'Assigned LOT', value: wafer.lot, color: 'var(--tx-secondary)' },
                            { label: 'Confidence', value: `${wafer.confidence.toFixed(1)}%`, color: defColor },
                            { label: 'Good Dies', value: wafer.good.toLocaleString(), color: '#10b981' },
                            { label: 'Fail Dies', value: wafer.fail.toLocaleString(), color: '#ef4444' },
                            { label: 'Total Dies', value: wafer.total.toLocaleString(), color: 'var(--tx-secondary)' },
                            { label: 'Yield', value: `${wafer.yield.toFixed(2)}%`, color: isNormal ? '#10b981' : defColor },
                          ].map(m => (
                            <div key={m.label} className="rounded-xl p-3 bg-black/40 border border-[var(--border)]/50 flex flex-col">
                              <span className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider font-semibold mb-0.5">
                                {m.label}
                              </span>
                              <span className="text-base font-bold font-mono" style={{ color: m.color }}>
                                {m.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── AI Model Info Card ───────────────────────── */}
          <div className="rounded-2xl border border-[var(--border)] p-5" style={{ background: 'rgba(15,20,40,0.85)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="h-4 w-4 text-[var(--accent-purple)]" />
              <h3 className="text-sm font-semibold text-[var(--tx-primary)]">AI Model Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Architecture', value: 'ResNet-50',        color: 'var(--accent-blue)'   },
                { label: 'Classes',      value: '9 Defect Types',   color: 'var(--accent-purple)' },
                { label: 'Input Size',   value: '224 × 224 px',     color: 'var(--accent-cyan)'   },
                { label: 'Inference',    value: 'CPU / CUDA',        color: 'var(--accent-green)'  },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-xs font-bold" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Defect class legend */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-[10px] font-bold text-[var(--tx-muted)] uppercase tracking-wider mb-3">
                Defect Class Legend
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DEFECT_COLORS).map(([cls, color]) => (
                  <span
                    key={cls}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                    style={{
                      background: `${color}18`,
                      border: `1px solid ${color}40`,
                      color,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            {/* LOT mapping table */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                <p className="text-[10px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">
                  LOT ↔ Defect Mapping
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-5">
                {Object.entries(LOT_MAPPING).map(([cls, lotId]) => (
                  <div
                    key={cls}
                    className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px]"
                    style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${DEFECT_COLORS[cls] ?? '#8b9cc8'}30` }}
                  >
                    <span className="font-bold font-mono text-[var(--tx-muted)]">{lotId}</span>
                    <span className="font-semibold" style={{ color: DEFECT_COLORS[cls] }}>{cls}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold bg-gradient-to-br from-purple-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-wider">ATE PLATFORM</span>
          <span className="text-[10px] text-[var(--tx-muted)]">
            <span className="text-[var(--tx-disabled)]">·</span> Wafer / Lot Analytics v1.0
          </span>
        </div>
        <span className="font-mono text-[10px] text-[var(--tx-disabled)]">
          ResNet50 · FastAPI · WaferVision AI
        </span>
      </footer>
    </div>
  );
}
