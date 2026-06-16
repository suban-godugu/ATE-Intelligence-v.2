'use client';

/**
 * ATE Yield Optimization Platform — Model Validation Panel
 * =========================================================
 * Drop this file into:  frontend/src/components/ModelValidationPanel.tsx
 *
 * Usage (add to any dashboard page):
 *   import ModelValidationPanel from '@/components/ModelValidationPanel';
 *   <ModelValidationPanel />
 *
 * The component talks to NestJS at /api/model-validation/*
 * (proxied via next.config.js rewrites to http://localhost:3001).
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Check, AlertTriangle, X, Loader2 } from 'lucide-react';

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
  image_width?: number;
  image_height?: number;
  image_channels?: number;
  issues: ValidationIssue[];
  recommended_pipeline: string;
  metadata: Record<string, any>;
  trigger_prediction: boolean;
}

interface HistoryItem {
  id: string;
  validationId: string;
  filename: string;
  fileCategory: string;
  dataType: string;
  status: 'VALID' | 'INVALID' | 'WARNING';
  confidenceScore: number;
  rowCount?: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  recommendedPipeline: string;
  triggerPrediction: boolean;
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
    description: 'Standard Test Interface Language',
    extension: '.stil',
    iconColor: 'var(--accent-green)',
    accept: '.stil',
  },
  ATE_LOG: {
    title: 'ATE LOG',
    description: 'Tester log — SmarTest, G-XL, CSV',
    extension: '.log / .csv',
    iconColor: 'var(--accent-blue)',
    accept: '.log,.csv',
  },
  ATPG_REPORT: {
    title: 'ATPG REPORT',
    description: 'Fault report — TetraMAX, Modus',
    extension: '.rpt',
    iconColor: 'var(--accent-purple)',
    accept: '.rpt',
  },
  MBIST_REPORT: {
    title: 'MBIST REPORT',
    description: 'Memory BIST diagnostics',
    extension: '.rpt / .xml',
    iconColor: 'var(--accent-blue)',
    accept: '.rpt,.xml',
  },
  LBIST_REPORT: {
    title: 'LBIST REPORT',
    description: 'Logic BIST diagnostics',
    extension: '.rpt / .xml',
    iconColor: 'var(--accent-cyan)',
    accept: '.rpt,.xml',
  },
};

// ── Validation Card Sub-component ─────────────────────────────────────────
const ValidationCard = ({
  type,
  config,
  cardState,
  isActive,
  onFileSelect,
  onClear,
  onCardClick,
  isCompact,
}: {
  type: string;
  config: typeof CARD_CONFIGS[keyof typeof CARD_CONFIGS];
  cardState: CardState;
  isActive: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onCardClick: () => void;
  isCompact: boolean;
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragOver(true);
    } else if (e.type === 'dragleave') {
      setDragOver(false);
    }
  };

  const handleCardClick = () => {
    if (cardState.file) {
      onCardClick();
    } else if (cardState.status !== 'validating') {
      inputRef.current?.click();
    }
  };

  // Determine border and hover styles depending on state and report outcome
  let borderClass = 'border-[var(--border)]/85 bg-[var(--bg-card)]/50 backdrop-blur-sm hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]/60 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]';
  
  if (isActive) {
    borderClass = 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 shadow-[0_0_25px_rgba(79,142,247,0.15)] ring-1 ring-[var(--accent-blue)]/50';
  } else if (cardState.status === 'validating') {
    borderClass = 'border-[var(--accent-blue)]/50 bg-[var(--accent-blue)]/5 border-pulse';
  } else if (cardState.status === 'success' && cardState.report) {
    const status = cardState.report.status;
    if (status === 'VALID') {
      borderClass = 'border-[var(--accent-green)]/60 bg-[rgba(24,212,138,0.02)] shadow-[0_0_20px_rgba(24,212,138,0.05)]';
    } else if (status === 'WARNING') {
      borderClass = 'border-[var(--accent-amber)]/60 bg-[rgba(251,191,36,0.02)] shadow-[0_0_20px_rgba(251,191,36,0.05)]';
    } else {
      borderClass = 'border-[var(--accent-red)]/60 bg-[rgba(240,82,82,0.02)] shadow-[0_0_20px_rgba(240,82,82,0.05)]';
    }
  } else if (cardState.status === 'error') {
    borderClass = 'border-[var(--accent-red)]/60 bg-[rgba(240,82,82,0.02)] shadow-[0_0_20px_rgba(240,82,82,0.05)]';
  } else if (dragOver) {
    borderClass = 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 scale-[0.99] shadow-[0_0_20px_rgba(79,142,247,0.1)]';
  }

  // Render Horizontal Compact Layout for Sidebar
  if (isCompact) {
    return (
      <div
        onClick={handleCardClick}
        onDragOver={handleDrag}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-xl border transition-all duration-300 p-3 flex items-center justify-between gap-3 cursor-pointer ${borderClass}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Status Indicator Icon */}
          <div className="shrink-0 flex items-center justify-center">
            {cardState.status === 'validating' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-blue)]" />
            ) : cardState.status === 'success' && cardState.report ? (
              cardState.report.status === 'VALID' ? (
                <div className="w-4 h-4 rounded-full bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 flex items-center justify-center text-[var(--accent-green)]">
                  <Check className="w-2.5 h-2.5" />
                </div>
              ) : (
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  cardState.report.status === 'WARNING' 
                    ? 'bg-[var(--accent-amber)]/15 border-[var(--accent-amber)]/30 text-[var(--accent-amber)]' 
                    : 'bg-[var(--accent-red)]/15 border-[var(--accent-red)]/30 text-[var(--accent-red)]'
                }`}>
                  <AlertTriangle className="w-2.5 h-2.5" />
                </div>
              )
            ) : cardState.status === 'error' ? (
              <div className="w-4 h-4 rounded-full bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 flex items-center justify-center text-[var(--accent-red)]">
                <AlertTriangle className="w-2.5 h-2.5" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--tx-muted)]">
                <Upload className="w-3.5 h-3.5" style={{ color: config.iconColor }} />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-[var(--tx-primary)] uppercase">{config.title}</span>
              <span className="text-[8px] font-mono text-[var(--tx-muted)] px-1 rounded bg-white/[0.02] border border-[var(--border)]">{config.extension}</span>
            </div>
            {cardState.file ? (
              <p className="text-[10px] text-[var(--tx-secondary)] truncate font-mono mt-0.5" title={cardState.file.name}>
                {cardState.file.name}
              </p>
            ) : (
              <p className="text-[9px] text-[var(--tx-muted)] truncate mt-0.5">
                {cardState.status === 'validating' ? 'Validating file...' : 'Click or drop to validate'}
              </p>
            )}
          </div>
        </div>

        {/* Right Action: Clear or Status indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {cardState.status === 'success' && cardState.report && (
            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
              cardState.report.status === 'VALID' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/20' :
              cardState.report.status === 'WARNING' ? 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] border border-[var(--accent-amber)]/20' :
              'bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/20'
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
  }

  // Expanded Layout (Standard 5-card grid)
  return (
    <div
      onClick={handleCardClick}
      onDragOver={handleDrag}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative group rounded-2xl border-2 transition-all duration-300 p-6 flex flex-col items-center text-center gap-3 cursor-pointer ${borderClass}`}
    >
      {/* Top right status/clear options */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {cardState.status === 'success' && cardState.report && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono ${
            cardState.report.status === 'VALID' ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/25' :
            cardState.report.status === 'WARNING' ? 'bg-[var(--accent-amber)]/15 text-[var(--accent-amber)] border border-[var(--accent-amber)]/25' :
            'bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/25'
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
            className="text-[var(--tx-muted)] hover:text-[var(--accent-red)] transition-colors p-1 rounded-full hover:bg-[var(--bg-elevated)]"
            title="Remove File"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center Icon Indicator */}
      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--tx-muted)] transition-colors group-hover:text-[var(--tx-secondary)]">
        {cardState.status === 'validating' ? (
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-blue)]" />
        ) : cardState.status === 'success' && cardState.report ? (
          cardState.report.status === 'VALID' ? (
            <Check className="w-6 h-6 text-[var(--accent-green)]" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-[var(--accent-amber)]" />
          )
        ) : cardState.status === 'error' ? (
          <AlertTriangle className="w-6 h-6 text-[var(--accent-red)]" />
        ) : (
          <Upload className="w-6 h-6" style={{ color: config.iconColor }} />
        )}
      </div>

      {/* Label and Info */}
      <div className="space-y-1 w-full">
        <h3 className="text-[13px] font-bold text-[var(--tx-primary)] transition-colors">
          {config.title}
        </h3>
        <p className="text-[11px] text-[var(--tx-secondary)] leading-relaxed truncate px-2">
          {config.description}
        </p>
        
        <div className="pt-1 flex items-center justify-center gap-2">
          <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded font-mono bg-white/[0.03] border border-[var(--border)] text-[var(--tx-muted)]">
            {config.extension}
          </span>
          {cardState.report && (
            <span className="text-[9px] font-bold font-mono text-[var(--tx-secondary)]">
              {Math.round(cardState.report.confidence_score * 100)}% Match
            </span>
          )}
        </div>
      </div>

      {/* File status or drop prompt */}
      {cardState.file ? (
        <div 
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full w-full max-w-[220px] justify-center"
          style={{ 
            background: cardState.status === 'success' && cardState.report?.status === 'VALID' ? 'rgba(24,212,138,0.08)' : 
                        cardState.status === 'success' && cardState.report?.status === 'WARNING' ? 'rgba(251,191,36,0.08)' :
                        cardState.status === 'error' || (cardState.status === 'success' && cardState.report?.status === 'INVALID') ? 'rgba(240,82,82,0.08)' :
                        'rgba(79,142,247,0.08)', 
            border: '1px solid rgba(255,255,255,0.06)' 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[9px] text-[var(--tx-primary)] truncate font-mono flex-1 text-center" title={cardState.file.name}>
            {cardState.file.name}
          </span>
        </div>
      ) : (
        <p className="text-[10px] text-[var(--tx-muted)] mt-1 select-none">
          {cardState.status === 'validating' ? 'Analyzing structure...' : 'Click to browse or drag & drop'}
        </p>
      )}

      {/* File specific error message inline if present */}
      {cardState.error && (
        <p className="text-[9px] text-[var(--accent-red)] font-semibold w-full truncate leading-none mt-1">
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

export default function ModelValidationPanel() {
  const [cards, setCards] = useState<Record<string, CardState>>({
    STIL:         { file: null, status: 'idle', error: null, report: null },
    ATE_LOG:      { file: null, status: 'idle', error: null, report: null },
    ATPG_REPORT:  { file: null, status: 'idle', error: null, report: null },
    MBIST_REPORT: { file: null, status: 'idle', error: null, report: null },
    LBIST_REPORT: { file: null, status: 'idle', error: null, report: null },
  });
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Active report being displayed
  const [activeReport, setActiveReport] = useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'issues' | 'columns'>('summary');
  
  // History list
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch history list
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/model-validation/history?limit=15');
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

  // Handle file validation upload
  const handleUpload = async (key: string, file: File) => {
    setActiveCardKey(key);
    setError(null);
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

      if (!res.ok) {
        throw new Error(`Upload failed with status code ${res.status}`);
      }

      const data = await res.json();
      
      setCards(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'success', report: data.report, error: null }
      }));
      setActiveReport(data.report);
      setActiveTab('summary');
      fetchHistory(); // refresh list
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || 'Error occurred during file validation.';
      setCards(prev => ({
        ...prev,
        [key]: { ...prev[key], status: 'error', error: errMsg, report: null }
      }));
      setError(`Validation failed for ${key}: ${errMsg}`);
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
    setError(null);
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
      if (!res.ok) {
        throw new Error('Could not fetch report details');
      }
      const data = await res.json();
      setActiveReport(data.reportJson);
      setActiveTab('summary');
    } catch (err: any) {
      setError(err?.message || 'Failed to load report.');
    }
  };

  // Helper formatting values
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card glass p-6 space-y-6">
      
      {/* ── Header Area ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="text-lg font-bold text-gradient bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-purple)]">
            AI Model Data Validator
          </h2>
          <p className="text-[11px] text-[var(--tx-secondary)]">
            Verify data schemas, image metrics, and integrity bounds before model execution
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="al-bs inline-flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 text-[var(--accent-blue)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {/* ── Main Container Grid ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Upload Zone & History Panel */}
        <div className={`space-y-4 ${activeReport ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
          
          {/* Card Selection Grid */}
          {activeReport ? (
            <div className="space-y-3">
              <p className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em] mb-1">
                Staged Files
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(CARD_CONFIGS).map(([key, config]) => (
                  <ValidationCard
                    key={key}
                    type={key}
                    config={config}
                    cardState={cards[key]}
                    isActive={activeCardKey === key}
                    onFileSelect={(file) => handleUpload(key, file)}
                    onClear={() => handleClearCard(key)}
                    onCardClick={() => handleCardClick(key)}
                    isCompact={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em] mb-3">
                  Required Files
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      isCompact={false}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em] mb-3">
                  Optional BIST Reports
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      isCompact={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="card-elevated p-4 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--tx-muted)] pb-2 border-b border-[var(--border)]">
                Recent Validations
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <p className="text-[10px] text-[var(--tx-muted)] text-center py-4">No validation history found.</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadReportDetails(item.id)}
                      className="p-2 border border-[var(--border)] rounded-lg hover:border-[var(--border-bright)] cursor-pointer bg-[var(--bg-card)]/50 transition-colors flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate max-w-[150px]">
                        <p className="font-semibold text-[var(--tx-primary)] truncate">{item.filename}</p>
                        <p className="text-[9px] text-[var(--tx-muted)]">{item.fileCategory.replace('tabular_', '').toUpperCase()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge-pill text-[9px] px-2 py-0.5 rounded-full ${
                          item.status === 'VALID' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                          item.status === 'WARNING' ? 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]' :
                          'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                        }`}>
                          {item.status}
                        </span>
                        <span className="text-[9px] text-[var(--tx-muted)]">
                          {Math.round(item.confidenceScore * 100)}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Validation Report Area */}
        {activeReport && (
          <div className="lg:col-span-8 card-elevated p-5 space-y-5">
            
            {/* Report Header Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div>
                <span className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">File Report</span>
                <h3 className="text-md font-bold text-[var(--tx-primary)] truncate">{activeReport.filename}</h3>
                <p className="text-[10px] text-[var(--tx-muted)]">
                  ID: {activeReport.validation_id} · {new Date(activeReport.timestamp).toLocaleString()}
                </p>
              </div>

              {/* Status and Category Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`status-live font-bold ${
                  activeReport.status === 'VALID' ? 'text-[var(--accent-green)] border-[var(--accent-green)]/35 bg-[var(--accent-green)]/8' :
                  activeReport.status === 'WARNING' ? 'text-[var(--accent-amber)] border-[var(--accent-amber)]/35 bg-[var(--accent-amber)]/8' :
                  'text-[var(--accent-red)] border-[var(--accent-red)]/35 bg-[var(--accent-red)]/8'
                }`}>
                  {activeReport.status}
                </span>
                
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] font-mono text-[var(--tx-secondary)]">
                  {activeReport.data_type.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Confidence Score Panel */}
            <div className="space-y-1.5 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/50">
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-[var(--tx-secondary)]">Data Validation Confidence</span>
                <span className={
                  activeReport.confidence_score >= 0.85 ? 'text-[var(--accent-green)]' :
                  activeReport.confidence_score >= 0.50 ? 'text-[var(--accent-amber)]' :
                  'text-[var(--accent-red)]'
                }>
                  {Math.round(activeReport.confidence_score * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    activeReport.confidence_score >= 0.85 ? 'bg-[var(--accent-green)]' :
                    activeReport.confidence_score >= 0.50 ? 'bg-[var(--accent-amber)]' :
                    'bg-[var(--accent-red)]'
                  }`}
                  style={{ width: `${activeReport.confidence_score * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[var(--border)] text-xs">
              <button
                onClick={() => setActiveTab('summary')}
                className={`py-2 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'summary' ? 'border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'border-transparent text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                }`}
              >
                Summary Details
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-2 px-4 border-b-2 font-medium transition-colors relative ${
                  activeTab === 'issues' ? 'border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'border-transparent text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                }`}
              >
                Issues Found
                {activeReport.issues.length > 0 && (
                  <span className="absolute top-1 right-0 w-4 h-4 rounded-full bg-[var(--accent-red)] text-white text-[9px] flex items-center justify-center font-bold">
                    {activeReport.issues.length}
                  </span>
                )}
              </button>
              {activeReport.column_stats && activeReport.column_stats.length > 0 && (
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`py-2 px-4 border-b-2 font-medium transition-colors ${
                    activeTab === 'columns' ? 'border-[var(--accent-blue)] text-[var(--tx-primary)]' : 'border-transparent text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]'
                  }`}
                >
                  Column Profiler
                </button>
              )}
            </div>

            {/* Tab content panels */}
            <div className="space-y-4">
              
              {/* Tab 1: Summary Details */}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  
                  {/* General file details grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]/20">
                      <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider">File Size</p>
                      <p className="text-xs font-bold mt-1">{formatBytes(activeReport.file_size_bytes)}</p>
                    </div>
                    <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]/20">
                      <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider">Format</p>
                      <p className="text-xs font-bold mt-1">{activeReport.file_category.replace('tabular_', '').toUpperCase()}</p>
                    </div>
                    <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]/20">
                      <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider">Rows / Columns</p>
                      <p className="text-xs font-bold mt-1">
                        {activeReport.row_count ? `${activeReport.row_count} x ${activeReport.column_count}` : 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 border border-[var(--border)] rounded-lg bg-[var(--bg-elevated)]/20">
                      <p className="text-[9px] text-[var(--tx-muted)] uppercase tracking-wider">Resolution</p>
                      <p className="text-xs font-bold mt-1">
                        {activeReport.image_width ? `${activeReport.image_width}x${activeReport.image_height}` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Recommendation and Next step pipeline */}
                  <div className="p-4 border border-[var(--accent-blue)]/25 rounded-lg bg-[var(--accent-blue)]/5 space-y-2">
                    <h4 className="text-xs font-bold text-[var(--tx-primary)] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-blue)] animate-ping" />
                      Recommended Prediction Pipeline
                    </h4>
                    <p className="text-[11px] text-[var(--tx-secondary)]">
                      The validation model suggests processing this data using the endpoint:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[10px] bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded font-mono text-[var(--accent-cyan)]">
                        {activeReport.recommended_pipeline}
                      </code>
                      {activeReport.trigger_prediction && (
                        <span className="inline-flex items-center gap-1 rounded border border-[var(--accent-green)]/40 bg-[var(--accent-green)]/8 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-green)]">
                          Active Queue Pipeline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Domain Meta Details */}
                  {activeReport.metadata && Object.keys(activeReport.metadata).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">Metadata Parameters</p>
                      <pre className="text-[10px] font-mono p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg max-h-[160px] overflow-auto whitespace-pre-wrap text-[var(--tx-secondary)]">
                        {JSON.stringify(activeReport.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                </div>
              )}

              {/* Tab 2: Issues Found */}
              {activeTab === 'issues' && (
                <div className="space-y-3">
                  {activeReport.issues.length === 0 ? (
                    <div className="p-6 border border-dashed border-[var(--border)] rounded-lg text-center">
                      <p className="text-xs text-[var(--accent-green)] font-semibold flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No issues found! File fully satisfies prediction constraints.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeReport.issues.map((issue, index) => (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg flex items-start gap-3 text-[11px] ${
                            issue.severity === 'error' ? 'border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5 text-[var(--accent-red)]' :
                            issue.severity === 'warning' ? 'border-[var(--accent-amber)]/30 bg-[var(--accent-amber)]/5 text-[var(--accent-amber)]' :
                            'border-[var(--border)] bg-[var(--bg-card)] text-[var(--tx-secondary)]'
                          }`}
                        >
                          {/* Status Icon */}
                          {issue.severity === 'error' ? (
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <div className="flex-1">
                            <span className="font-mono font-bold text-[9px] uppercase mr-2 tracking-wider">
                              [{issue.code}]
                            </span>
                            {issue.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Column Profiler */}
              {activeTab === 'columns' && activeReport.column_stats && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-[var(--tx-muted)] uppercase tracking-wider">Structured Column Attributes</p>
                  <div className="border border-[var(--border)] rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="al-tbl">
                      <thead>
                        <tr>
                          <th className="w-[30%]">Column Name</th>
                          <th className="w-[15%]">Data Type</th>
                          <th className="w-[15%]">Nulls %</th>
                          <th className="w-[15%]">Unique</th>
                          <th>Sample Values</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeReport.column_stats.map((col, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-[var(--tx-primary)] truncate">{col.name}</td>
                            <td className="font-mono text-[10px] text-[var(--tx-secondary)]">{col.dtype}</td>
                            <td className={col.null_pct > 0.1 ? 'text-[var(--accent-amber)]' : 'text-[var(--tx-secondary)]'}>
                              {Math.round(col.null_pct * 100)}%
                            </td>
                            <td>{col.unique_count}</td>
                            <td className="font-mono text-[9px] truncate max-w-[200px] text-[var(--tx-muted)]">
                              {JSON.stringify(col.sample_values)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
