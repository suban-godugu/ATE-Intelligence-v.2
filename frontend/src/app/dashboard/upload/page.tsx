'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Brain, Check, AlertTriangle, X, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDashboard } from '@/context/DashboardContext';
import apiClient from '@/api/client';
import { toast } from '@/hooks/useToast';
import { useWaferAi } from '@/hooks/useWaferAi';
import { DEFECT_COLORS } from '@/api/waferAi';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────
interface ColumnStat {
  name: string;
  dtype: string;
  null_pct: number;
  unique_count: number;
  sample_values: any[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}

interface ValidationReport {
  validation_id: string;
  timestamp: string;
  filename: string;
  file_size_bytes: number;
  file_category: string;
  data_type: 'structured' | 'unstructured' | 'mixed' | 'unknown';
  status: 'VALID' | 'INVALID' | 'WARNING';
  confidence_score: number;
  row_count?: number;
  column_count?: number;
  column_stats?: ColumnStat[];
  issues: ValidationIssue[];
  recommended_pipeline: string;
  metadata: Record<string, any>;
}

interface HistoryItem {
  id: string;
  validationId: string;
  filename: string;
  fileCategory: string;
  dataType: string;
  status: 'VALID' | 'INVALID' | 'WARNING';
  confidenceScore: number;
  issueCount: number;
  createdAt: string;
}

interface CardState {
  file: File | null;
  status: 'idle' | 'validating' | 'success' | 'error';
  error: string | null;
  report: ValidationReport | null;
}

const CARD_CONFIGS = {
  STIL: {
    title: 'STIL',
    description: 'Scan Pattern Definition',
    extension: 'Supported: .stil',
    iconColor: 'var(--accent-green)',
    accept: '.stil',
  },
  ATE_LOG: {
    title: 'ATE LOG',
    description: 'Tester execution results',
    extension: 'Supported: .log, .csv',
    iconColor: 'var(--accent-blue)',
    accept: '.log,.csv',
  },
  ATPG_REPORT: {
    title: 'ATPG REPORT',
    description: 'Coverage and fault diagnostics',
    extension: 'Supported: .rpt',
    iconColor: 'var(--accent-purple)',
    accept: '.rpt',
  },
  MBIST_REPORT: {
    title: 'MBIST REPORT',
    description: 'Memory test diagnostics',
    extension: 'Supported: .rpt, .xml',
    iconColor: 'var(--accent-blue)',
    accept: '.rpt,.xml',
  },
  LBIST_REPORT: {
    title: 'LBIST REPORT',
    description: 'Logic self-test diagnostics',
    extension: 'Supported: .rpt, .xml',
    iconColor: 'var(--accent-cyan)',
    accept: '.rpt,.xml',
  },
};

// ── Validation Card Component ─────────────────────────────────────────────
const ValidationCard = ({
  type,
  config,
  cardState,
  isActive,
  onFileSelect,
  onClear,
  onCardClick,
}: {
  type: string;
  config: typeof CARD_CONFIGS[keyof typeof CARD_CONFIGS];
  cardState: CardState;
  isActive: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onCardClick: () => void;
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragOver(true);
    else if (e.type === 'dragleave') setDragOver(false);
  };

  const handleCardClick = () => {
    if (cardState.file) {
      onCardClick();
    } else if (cardState.status !== 'validating') {
      inputRef.current?.click();
    }
  };

  let borderClass = 'border-[var(--border)] bg-[var(--bg-card)]/50 backdrop-blur-sm hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]/40 hover:-translate-y-0.5 transition-all duration-200';
  if (isActive) {
    borderClass = 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 ring-1 ring-[var(--accent-blue)]/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]';
  } else if (cardState.status === 'validating') {
    borderClass = 'border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5 border-pulse';
  } else if (cardState.status === 'success' && cardState.report) {
    borderClass = cardState.report.status === 'VALID'
      ? 'border-[var(--accent-green)]/60 bg-[rgba(16,185,129,0.02)]'
      : cardState.report.status === 'WARNING'
        ? 'border-[var(--accent-amber)]/60 bg-[rgba(245,158,11,0.02)]'
        : 'border-[var(--accent-red)]/60 bg-[rgba(239,68,68,0.02)]';
  } else if (cardState.status === 'error') {
    borderClass = 'border-[var(--accent-red)]/60 bg-[rgba(239,68,68,0.02)]';
  } else if (dragOver) {
    borderClass = 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 scale-[0.99]';
  }

  return (
    <div
      onClick={handleCardClick}
      onDragOver={handleDrag}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative rounded-xl border p-4 flex flex-col items-center text-center gap-1.5 cursor-pointer transition-all ${borderClass}`}
    >
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        {cardState.status === 'success' && cardState.report && (
          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded font-mono border leading-none ${
            cardState.report.status === 'VALID' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-[var(--accent-green)]/20' :
            cardState.report.status === 'WARNING' ? 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border-[var(--accent-amber)]/20' :
            'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-[var(--accent-red)]/20'
          }`}>
            {cardState.report.status}
          </span>
        )}
        {cardState.file && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[var(--tx-muted)] hover:text-[var(--accent-red)] transition-colors p-1"
            title="Remove File"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <h4 className="text-[12px] font-bold text-[var(--tx-primary)]">
          {config.title}
        </h4>
        {cardState.status === 'validating' && (
          <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-blue)]" />
        )}
      </div>

      <p className="text-[10px] text-[var(--tx-secondary)] leading-tight px-1 font-medium">
        {config.description}
      </p>

      <p className="text-[9px] font-mono text-[var(--tx-muted)]">
        {config.extension}
      </p>

      {cardState.file ? (
        <div 
          className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[rgba(255,255,255,0.03)] border border-[var(--border)] max-w-[180px] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[9px] text-[var(--accent-green)]">●</span>
          <span className="text-[9px] text-[var(--tx-primary)] truncate font-mono flex-1 text-center" title={cardState.file.name}>
            {cardState.file.name}
          </span>
        </div>
      ) : (
        <p className="text-[9.5px] text-[var(--tx-muted)] font-semibold mt-1">
          Drag & Drop or Browse Files
        </p>
      )}

      {cardState.error && (
        <p className="text-[8px] text-[var(--accent-red)] font-semibold w-full truncate leading-none mt-1">
          {cardState.error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        accept={config.accept}
      />
    </div>
  );
};

// ─── Wafer Drop Zone Component ─────────────────────────────────────────────
interface WaferDropZoneProps {
  onFiles: (files: File[]) => void;
  predicting: boolean;
}

const WaferDropZone: React.FC<WaferDropZoneProps> = ({ onFiles, predicting }) => {
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
        'relative flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border-2 border-dashed p-8 cursor-pointer transition-all duration-300 shadow-sm',
        dragging
          ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 scale-[1.01]'
          : 'border-[var(--border)] bg-[var(--bg-card)]/30 backdrop-blur-sm hover:border-[var(--accent-purple)]/50 hover:bg-[var(--bg-hover)]/40',
        predicting && 'cursor-not-allowed opacity-50 pointer-events-none',
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handle(e.target.files)} />

      {predicting ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-purple)]" />
          <p className="text-xs font-semibold text-[var(--accent-purple)]">Classifying wafer…</p>
          <p className="text-[10px] text-[var(--tx-muted)]">AI Classification running</p>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20">
            <Upload className="h-4 w-4 text-[var(--accent-purple)]" />
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[var(--tx-primary)]">Upload Wafer Maps</p>
            <p className="text-[10px] text-[var(--tx-muted)] mt-0.5">PNG • JPG • JPEG</p>
          </div>
          <p className="text-[10px] text-[var(--tx-muted)] font-semibold mt-1">
            Drag & Drop or Browse Files
          </p>
        </>
      )}
    </div>
  );
};

// ─── Validation Status Checklist Row ────────────────────────────────────────
const ValidationStatusCheck = ({ label, isUploaded }: { label: string; isUploaded: boolean }) => {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold py-1">
      {isUploaded ? (
        <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">✓</span>
      ) : (
        <span className="flex h-4 w-4 items-center justify-center rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">⚠</span>
      )}
      <span className={isUploaded ? 'text-[var(--tx-primary)]' : 'text-[var(--tx-muted)]'}>
        {label} {isUploaded ? 'Uploaded' : 'Missing'}
      </span>
    </div>
  );
};

// ─── Main Ingestion Page ───────────────────────────────────────────────────
export default function UploadPage() {
  const queryClient = useQueryClient();
  const { state, setLot } = useDashboard();
  const { lotDatabase, predicting, error: waferError, predict, clearAll: clearWafer, deleteWafer } = useWaferAi();
  const [showWaferResults, setShowWaferResults] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Validation States
  const [cards, setCards] = useState<Record<string, CardState>>({
    STIL:         { file: null, status: 'idle', error: null, report: null },
    ATE_LOG:      { file: null, status: 'idle', error: null, report: null },
    ATPG_REPORT:  { file: null, status: 'idle', error: null, report: null },
    MBIST_REPORT: { file: null, status: 'idle', error: null, report: null },
    LBIST_REPORT: { file: null, status: 'idle', error: null, report: null },
  });
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'issues' | 'columns'>('summary');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Fetch Lots list
  const { data: storedLots, refetch: refetchLots } = useQuery({
    queryKey: ['stored-lots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/lots');
      return Array.isArray(data) ? data : data?.data ?? [];
    },
  });

  // Fetch validation history list
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/model-validation/history?limit=10');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpload = async (key: string, file: File) => {
    setActiveCardKey(key);
    setCards(prev => ({
      ...prev,
      [key]: { ...prev[key], file, status: 'validating', error: null }
    }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/model-validation/validate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed (Status: ${res.status})`);
      const data = await res.json();
      
      setCards(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'success', report: data.report, error: null }
      }));
      setActiveReport(data.report);
      setActiveTab('summary');
      fetchHistory();
      refetchLots();
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stored-lots'] });
      toast.success('Validation Successful', `${key} file parsed cleanly.`);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || 'Schema parse mismatch.';
      setCards(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'error', error: errMsg, report: null }
      }));
      toast.error('Validation Failed', `${key}: ${errMsg}`);
    }
  };

  const handleClearCard = (key: string) => {
    setCards(prev => ({
      ...prev,
      [key]: { file: null, status: 'idle', error: null, report: null }
    }));
    if (activeCardKey === key) {
      setActiveCardKey(null);
      setActiveReport(null);
    } else {
      const clearedReport = cards[key]?.report;
      if (clearedReport && activeReport && activeReport.validation_id === clearedReport.validation_id) {
        setActiveReport(null);
      }
    }
  };

  const handleCardClick = (key: string) => {
    const card = cards[key];
    if (card && card.report) {
      setActiveCardKey(key);
      setActiveReport(card.report);
      setActiveTab('summary');
    }
  };

  const loadReportDetails = async (id: string) => {
    const foundCardEntry = Object.entries(cards).find(([_, c]) => c.report?.validation_id === id);
    if (foundCardEntry) {
      const [key, card] = foundCardEntry;
      setActiveCardKey(key);
      setActiveReport(card.report);
      setActiveTab('summary');
      return;
    }

    setActiveCardKey(null);
    try {
      const res = await fetch(`/api/model-validation/${id}`);
      if (!res.ok) throw new Error('Could not fetch report details');
      const data = await res.json();
      setActiveReport(data.reportJson);
      setActiveTab('summary');
    } catch (err: any) {
      toast.error('Error', 'Failed to load past validation details.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/lots/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stored-lots'] });
      refetchLots();
      setDeleteConfirm(null);
      if (state.activeLotId === id) setLot(null);
      toast.success('Job Deleted', 'Analysis run data wiped.');
    } catch {
      toast.error('Deletion Failed', 'Unable to wipe lot analysis data.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await apiClient.delete('/lots');
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stored-lots'] });
      refetchLots();
      setDeleteConfirm(null);
      setLot(null);
      toast.success('Jobs Cleared', 'All stored analysis jobs deleted.');
    } catch {
      toast.error('Clear Failed', 'Unable to clear jobs.');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getQueueStatus = (status: CardState['status']) => {
    if (status === 'success') return '100%';
    if (status === 'validating') return 'Validating...';
    if (status === 'error') return 'Error';
    return 'Pending';
  };

  const hasWafers = Object.values(lotDatabase).some(l => l.wafers.length > 0);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageHeader
        title="Test Data Ingestion & Validation"
        subtitle="Upload ATE test artifacts, wafer maps, and diagnostic reports for AI-driven analysis."
      />

      {/* Main Grid: Uploads vs Status & Reports */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Inputs & Image Uploads */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Section 1: Primary Test Inputs */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--tx-primary)]">Primary Test Inputs</h3>
              <p className="text-[11px] text-[var(--tx-secondary)]">Required test patterns and test logs</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['STIL', 'ATE_LOG', 'ATPG_REPORT'] as const).map((key) => (
                <ValidationCard
                  key={key}
                  type={key}
                  config={CARD_CONFIGS[key]}
                  cardState={cards[key]}
                  isActive={activeCardKey === key}
                  onFileSelect={(file) => handleUpload(key, file)}
                  onClear={() => handleClearCard(key)}
                  onCardClick={() => handleCardClick(key)}
                />
              ))}
            </div>
          </div>

          {/* Section 2: Diagnostic Reports */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--tx-primary)]">Diagnostic Reports</h3>
              <p className="text-[11px] text-[var(--tx-secondary)]">Optional internal circuit BIST outputs</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(['MBIST_REPORT', 'LBIST_REPORT'] as const).map((key) => (
                <ValidationCard
                  key={key}
                  type={key}
                  config={CARD_CONFIGS[key]}
                  cardState={cards[key]}
                  isActive={activeCardKey === key}
                  onFileSelect={(file) => handleUpload(key, file)}
                  onClear={() => handleClearCard(key)}
                  onCardClick={() => handleCardClick(key)}
                />
              ))}
            </div>
          </div>

          {/* Section 3: Wafer Image Analysis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--tx-primary)]">Wafer Image Analysis</h3>
                <p className="text-[11px] text-[var(--tx-secondary)]">Upload wafer maps and defect images for AI classification and spatial analysis.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/5 px-2 py-0.5 text-[9px] font-semibold text-[var(--accent-purple)]">
                  AI Classification Enabled
                </span>
                {hasWafers && (
                  <>
                    <button
                      onClick={() => setShowWaferResults(v => !v)}
                      className="flex items-center gap-1 text-[10px] text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] transition"
                    >
                      {showWaferResults ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showWaferResults ? 'Hide' : 'Show'} Wafers
                    </button>
                    <button
                      onClick={async () => {
                        await clearWafer();
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                        toast.success('Assignment Cleared', 'Wafer maps reset.');
                      }}
                      className="text-[10px] text-[var(--tx-muted)] hover:text-red-400 transition"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            <WaferDropZone
              predicting={predicting}
              onFiles={async (imgs) => {
                for (const img of imgs) await predict(img);
                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              }}
            />

            {waferError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{waferError}</p>
              </div>
            )}

            {/* AI Results table */}
            {showWaferResults && hasWafers && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/40 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]/30">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-[var(--accent-purple)]" />
                    <span className="text-[10px] font-bold text-[var(--tx-secondary)] uppercase tracking-wider">AI Wafer Diagnostics</span>
                  </div>
                </div>
                <div className="overflow-x-auto text-[11px] scrollbar-none">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border)] text-[9px] font-bold uppercase text-[var(--tx-muted)]">
                        <th className="py-2 px-3">File Name</th>
                        <th className="py-2 px-3">Class</th>
                        <th className="py-2 px-3">Confidence</th>
                        <th className="py-2 px-3">Lot ID</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(lotDatabase).flatMap(([lotId, lotData]) =>
                        lotData.wafers.map((wafer, idx) => {
                          const color = DEFECT_COLORS[wafer.class] ?? '#94a3b8';
                          return (
                            <tr key={`${wafer.name}-${idx}`} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-hover)]/20">
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-white truncate max-w-[150px]">{wafer.name}</p>
                                <p className="text-[8.5px] text-[var(--tx-muted)] font-mono">{new Date(wafer.timestamp).toLocaleTimeString()}</p>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase"
                                  style={{ background: `${color}12`, border: `1px solid ${color}35`, color }}
                                >
                                  {wafer.class}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono" style={{ color }}>
                                {wafer.confidence.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-[var(--tx-secondary)]">
                                {wafer.lot}
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  onClick={async () => {
                                    await deleteWafer(wafer.lot, wafer.name);
                                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                                    toast.success('Removed', 'Wafer classification assignment cleared.');
                                  }}
                                  className="text-[var(--tx-muted)] hover:text-[var(--accent-red)] transition-colors p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Upload Queue Section */}
          <div className="card glass p-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--tx-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-[var(--accent-blue)]" />
              Upload Queue
            </h3>
            <div className="space-y-1.5">
              {[
                { name: 'STIL', status: getQueueStatus(cards.STIL.status) },
                { name: 'ATE LOG', status: getQueueStatus(cards.ATE_LOG.status) },
                { name: 'ATPG REPORT', status: getQueueStatus(cards.ATPG_REPORT.status) },
                { name: 'MBIST', status: getQueueStatus(cards.MBIST_REPORT.status) },
                { name: 'LBIST', status: getQueueStatus(cards.LBIST_REPORT.status) },
                { name: 'Wafer Image', status: predicting ? 'Classifying...' : (hasWafers ? '100%' : 'Pending') },
              ].map((q, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-mono py-1.5">
                  <span className="text-[var(--tx-secondary)]">{q.name}</span>
                  <span className="flex-1 border-b border-dotted border-[var(--border)] mx-2 h-2" />
                  <span className={q.status === '100%' ? 'text-[var(--accent-green)] font-semibold' : 'text-[var(--tx-muted)]'}>
                    {q.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width) - Validation Status & Report Details */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Validation Status checklist */}
          <div className="card glass p-4 space-y-3">
            <h3 className="text-xs font-bold text-[var(--tx-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Check className="h-4 w-4 text-[var(--accent-green)] font-bold" />
              Validation Status
            </h3>
            <div className="space-y-1">
              <ValidationStatusCheck label="STIL" isUploaded={cards.STIL.status === 'success'} />
              <ValidationStatusCheck label="ATE Log" isUploaded={cards.ATE_LOG.status === 'success'} />
              <ValidationStatusCheck label="ATPG Report" isUploaded={cards.ATPG_REPORT.status === 'success'} />
              <ValidationStatusCheck label="MBIST" isUploaded={cards.MBIST_REPORT.status === 'success'} />
              <ValidationStatusCheck label="LBIST" isUploaded={cards.LBIST_REPORT.status === 'success'} />
              <ValidationStatusCheck label="Wafer Image" isUploaded={hasWafers} />
            </div>
          </div>

          {/* Validation Report details OR history */}
          {activeReport ? (
            <div className="card glass p-4 space-y-4 relative">
              <button
                onClick={() => setActiveReport(null)}
                className="absolute top-3.5 right-3.5 text-[var(--tx-muted)] hover:text-white transition"
                title="Close report"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="border-b border-[var(--border)] pb-3">
                <span className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider font-mono">Report Details</span>
                <h3 className="text-xs font-bold text-[var(--tx-primary)] truncate max-w-[200px]" title={activeReport.filename}>{activeReport.filename}</h3>
                <p className="text-[9px] text-[var(--tx-muted)] mt-0.5 font-mono">
                  {new Date(activeReport.timestamp).toLocaleTimeString()} · {formatBytes(activeReport.file_size_bytes)}
                </p>
              </div>

              {/* Validation Status & score */}
              <div className="flex items-center justify-between text-[11px] font-semibold bg-[var(--bg-elevated)]/20 border border-[var(--border)] p-2.5 rounded-lg">
                <span className={`status-live font-bold uppercase leading-none ${
                  activeReport.status === 'VALID' ? 'text-[var(--accent-green)] border-[var(--accent-green)]/35 bg-[var(--accent-green)]/8' :
                  activeReport.status === 'WARNING' ? 'text-[var(--accent-amber)] border-[var(--accent-amber)]/35 bg-[var(--accent-amber)]/8' :
                  'text-[var(--accent-red)] border-[var(--accent-red)]/35 bg-[var(--accent-red)]/8'
                }`}>
                  {activeReport.status}
                </span>
                <span className="text-[var(--tx-secondary)] font-mono">
                  {Math.round(activeReport.confidence_score * 100)}% Match
                </span>
              </div>

              {/* Subtabs inside active report */}
              <div className="flex border-b border-[var(--border)] text-[11px] gap-3">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`pb-1.5 font-medium transition-colors ${
                    activeTab === 'summary' ? 'border-b border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`pb-1.5 font-medium transition-colors ${
                    activeTab === 'issues' ? 'border-b border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                  }`}
                >
                  Issues ({activeReport.issues.length})
                </button>
                {activeReport.column_stats && activeReport.column_stats.length > 0 && (
                  <button
                    onClick={() => setActiveTab('columns')}
                    className={`pb-1.5 font-medium transition-colors ${
                      activeTab === 'columns' ? 'border-b border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                    }`}
                  >
                    Columns
                  </button>
                )}
              </div>

              {/* Tab views */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {activeTab === 'summary' && (
                  <div className="space-y-3 text-[11px]">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-[var(--bg-elevated)]/25 p-2 rounded border border-[var(--border)]">
                        <p className="text-[9px] text-[var(--tx-muted)] uppercase font-mono">Rows</p>
                        <p className="font-bold text-white mt-0.5">{activeReport.row_count ?? 'N/A'}</p>
                      </div>
                      <div className="bg-[var(--bg-elevated)]/25 p-2 rounded border border-[var(--border)]">
                        <p className="text-[9px] text-[var(--tx-muted)] uppercase font-mono">Columns</p>
                        <p className="font-bold text-white mt-0.5">{activeReport.column_count ?? 'N/A'}</p>
                      </div>
                    </div>
                    {/* Pipeline */}
                    <div className="p-3 border border-[var(--accent-blue)]/20 rounded bg-[var(--accent-blue)]/5">
                      <p className="text-[10px] text-[var(--tx-secondary)] font-medium font-mono">Suggested Pipeline:</p>
                      <code className="text-[9.5px] font-mono text-[var(--accent-cyan)] block mt-1 break-all bg-black/20 p-1.5 rounded">
                        {activeReport.recommended_pipeline}
                      </code>
                    </div>
                  </div>
                )}

                {activeTab === 'issues' && (
                  <div className="space-y-2">
                    {activeReport.issues.length === 0 ? (
                      <p className="text-[11px] text-[var(--accent-green)] font-semibold text-center py-4">
                        ✓ No schema mismatches found.
                      </p>
                    ) : (
                      activeReport.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 border rounded text-[10.5px] ${
                            issue.severity === 'error' ? 'border-red-500/20 bg-red-500/5 text-red-400' :
                            'border-amber-500/20 bg-amber-500/5 text-amber-400'
                          }`}
                        >
                          <span className="font-bold font-mono text-[9px] mr-1">[{issue.code}]</span>
                          {issue.message}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'columns' && activeReport.column_stats && (
                  <div className="space-y-2 text-[10.5px] font-mono">
                    {activeReport.column_stats.map((col, idx) => (
                      <div key={idx} className="flex justify-between border-b border-[var(--border)]/45 pb-1">
                        <span className="font-semibold text-white truncate max-w-[120px]" title={col.name}>{col.name}</span>
                        <span className="text-[var(--tx-muted)]">{col.dtype}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            
            /* History of past validations */
            <div className="card glass p-4 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--tx-muted)] border-b border-[var(--border)] pb-2 font-mono">
                Recent Validations
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-[10px] text-[var(--tx-muted)] text-center py-4 font-mono">No recent validations found.</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadReportDetails(item.id)}
                      className="p-2 border border-[var(--border)] rounded-lg hover:border-[var(--border-bright)] cursor-pointer bg-[var(--bg-card)]/50 transition-colors flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate max-w-[140px]">
                        <p className="font-semibold text-[var(--tx-primary)] truncate">{item.filename}</p>
                        <p className="text-[8.5px] text-[var(--tx-muted)] font-mono">{item.fileCategory.replace('tabular_', '').toUpperCase()}</p>
                      </div>
                      <span className={`badge-pill text-[9px] px-2 py-0.5 rounded-full font-mono ${
                        item.status === 'VALID' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                        item.status === 'WARNING' ? 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]' :
                        'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── Stored Forensic Jobs (Recent Analysis Jobs) ────────── */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-3">
            <h3 className="text-[15px] font-bold text-[var(--tx-primary)]" style={{ letterSpacing: '-0.015em' }}>
              Recent Analysis Jobs
            </h3>
            {storedLots && storedLots.length > 0 && (
              <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)] leading-none">
                {storedLots.length} Active
              </span>
            )}
          </div>

          {storedLots && storedLots.length > 0 && (
            deleteConfirm === 'all' ? (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded border text-[11px] bg-red-950/20 border-red-500/30">
                <span className="text-[var(--accent-red)] font-semibold">Confirm clear?</span>
                <button onClick={handleDeleteAll} className="text-[var(--accent-red)] font-bold hover:underline">Yes</button>
                <button onClick={() => setDeleteConfirm(null)} className="text-[var(--tx-muted)]">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm('all')}
                className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.18)] transition text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 rounded"
              >
                Clear All
              </button>
            )
          )}
        </div>

        {storedLots && storedLots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {storedLots.map((lot: any) => {
              const isActiveLot = state.activeLotId === lot.id;
              return (
                <div
                  key={lot.id}
                  onClick={() => setLot(lot.id)}
                  className={`
                    relative cursor-pointer rounded-[var(--radius-xl)] border p-5 transition-all duration-300 group hover:-translate-y-0.5
                    ${isActiveLot
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-[0_0_20px_rgba(59,130,246,0.12)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)]/50 hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]/30'
                    }
                  `}
                >
                  {isActiveLot && (
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-[var(--accent-blue)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 leading-none">Active</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border border-[var(--accent-blue)]/30 text-[var(--accent-blue)] bg-[var(--accent-blue)]/5">
                      LOT
                    </span>

                    {deleteConfirm === lot.id ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-[var(--accent-red)] font-semibold">Delete?</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(lot.id); }} className="text-[var(--accent-red)] font-bold hover:underline">Yes</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }} className="text-[var(--tx-muted)]">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lot.id); }}
                        className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[9px] font-bold text-[var(--tx-muted)] hover:text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.08)] border border-[var(--border)] rounded transition-all font-mono"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <h4 className="text-[13px] font-bold text-[var(--tx-primary)] mb-1">
                    Lot {lot.lotNumber}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lot.product && (
                      <span className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)]">{lot.product}</span>
                    )}
                    {lot.tester && (
                      <span className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)]">{lot.tester}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)] text-[11px] font-mono">
                    <div>
                      <p className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">Patterns</p>
                      <p className="text-[12px] font-bold mt-0.5 text-white">{lot._count?.patterns ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">Created</p>
                      <p className="text-[12px] mt-0.5 text-[var(--tx-secondary)]">
                        {new Date(lot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border p-12 flex flex-col items-center justify-center text-center bg-[var(--bg-card)]/30 border-[var(--border)]">
            <span className="inline-block px-2.5 py-1 text-[9px] font-bold text-[var(--tx-disabled)] border border-[var(--border)] bg-[var(--bg-card)] rounded uppercase tracking-wider mb-3.5 font-mono">
              Empty Job Cache
            </span>
            <p className="text-[13px] font-semibold text-[var(--tx-secondary)] mb-1">
              No analysis jobs available
            </p>
            <p className="text-[11px] text-[var(--tx-muted)]">
              Upload test data to begin analysis.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
