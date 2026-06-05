'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Brain, Check, AlertTriangle, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDashboard } from '@/context/DashboardContext';
import apiClient from '@/api/client';
import { uploadProgressUrl } from '@/api/config';
import { toast } from '@/hooks/useToast';
import { useWaferAi } from '@/hooks/useWaferAi';
import { DEFECT_COLORS, LOT_MAPPING } from '@/api/waferAi';
import { cn } from '@/lib/utils';

interface FileUploadState {
  file: File | null;
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
}

interface ProgressEvent {
  stage: string;
  message: string;
  timestamp: string;
  data?: any;
}

// ─── Upload Card ─────────────────────────────────────────────────
interface UploadCardProps {
  title: string;
  description: string;
  extension: string;
  iconColor: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
}

const UploadCard: React.FC<UploadCardProps> = ({
  title,
  description,
  extension,
  iconColor,
  onFileSelect,
  selectedFile,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`
        relative group rounded-[var(--radius-xl)] border-2 transition-all duration-300 p-6 flex flex-col items-center text-center gap-3 cursor-pointer
        ${selectedFile
          ? 'border-[var(--accent-green)]/80 bg-[rgba(16,185,129,0.03)] backdrop-blur-md shadow-[0_0_25px_rgba(16,185,129,0.08)]'
          : dragOver
            ? 'border-[var(--accent-blue)] bg-[rgba(108,99,255,0.05)] backdrop-blur-md shadow-[0_0_25px_rgba(108,99,255,0.08)]'
            : 'border-[var(--border)]/80 bg-[var(--bg-card)]/50 backdrop-blur-sm hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5'
        }
      `}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      {/* Icon zone */}
      <div
        className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border transition-colors ${selectedFile ? 'border-[var(--accent-green)]/40 text-[var(--accent-green)] bg-[var(--accent-green)]/10' : 'border-[var(--border)] text-[var(--tx-muted)] bg-white/[0.02] group-hover:bg-white/[0.04]'}`}
      >
        {selectedFile ? 'READY' : 'STIL / LOG'}
      </div>

      {/* Labels */}
      <div className="space-y-0.5">
        <h3 className="text-[13px] font-bold text-[var(--tx-primary)]">{title}</h3>
        <p className="text-[11px] text-[var(--tx-secondary)] leading-relaxed">{description}</p>
        <span
          className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded font-mono"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--tx-muted)', border: '1px solid var(--border)' }}
        >
          {extension}
        </span>
      </div>

      {/* Drop zone hint */}
      {!selectedFile && (
        <p className="text-[10px] text-[var(--tx-muted)] mt-1">
          Click to browse or drag & drop
        </p>
      )}

      {/* Selected file pill */}
      {selectedFile && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full w-full max-w-[200px] justify-between"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-[var(--accent-green)] font-bold font-mono select-none">●</span>
          <span
            className="text-[10px] text-[var(--accent-green)] font-semibold truncate flex-1 text-left"
            title={selectedFile.name}
          >
            {selectedFile.name}
          </span>
          <button
            className="text-[var(--tx-muted)] hover:text-[var(--accent-red)] font-bold text-[10px] font-mono transition-colors shrink-0"
            onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
            aria-label="Remove file"
          >
            [X]
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
      />
    </div>
  );
};

// ─── Progress Step ───────────────────────────────────────────────
const ProgressStep = ({ event, index, total }: { event: ProgressEvent; index: number; total: number }) => {
  const isError    = event.stage === 'Error';
  const isComplete = event.stage === 'Complete';
  const isActive   = index === total - 1;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0 h-full min-h-[48px]">
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 font-mono text-[9px] font-bold transition-colors ${
            isError    ? 'border-[var(--accent-red)] bg-[rgba(239,68,68,0.1)] text-[var(--accent-red)]' :
            isComplete ? 'border-[var(--accent-green)] bg-[rgba(16,185,129,0.1)] text-[var(--accent-green)]' :
            isActive   ? 'border-[var(--accent-blue)] bg-[rgba(108,99,255,0.1)] text-[var(--accent-blue)]' :
                         'border-[var(--accent-green)]/40 bg-[rgba(16,185,129,0.04)] text-[var(--accent-green)]/70'
          }`}
        >
          {isError    ? '!' :
           isComplete ? '✓' :
           isActive   ? '•' :
                        '✓'
          }
        </div>
        {index < total - 1 && (
          <div className="w-px flex-1 bg-[var(--border)] mt-1 min-h-[16px]" />
        )}
      </div>

      <div className="pt-1 pb-3 flex-1 min-w-0">
        <p className="text-[13px] text-[var(--tx-primary)] font-medium leading-snug whitespace-pre-line">{event.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[9px] font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--tx-muted)', border: '1px solid var(--border)' }}
          >
            {new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })}
          </span>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider ${
              isError    ? 'text-[var(--accent-red)]' :
              isComplete ? 'text-[var(--accent-green)]' :
                           'text-[var(--accent-blue)]'
            }`}
          >
            {event.stage}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Wafer Image Drop Zone (mini) ────────────────────────────────
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
        'relative flex flex-col items-center justify-center gap-4 rounded-[var(--radius-2xl)] border-2 border-dashed p-10 cursor-pointer transition-all duration-300 shadow-md',
        dragging
          ? 'border-[var(--accent-purple)] bg-[var(--accent-purple)]/10 scale-[1.01] shadow-[0_0_30px_rgba(168,85,247,0.15)]'
          : 'border-[var(--border)] bg-[var(--bg-card)]/30 backdrop-blur-sm hover:border-[var(--accent-purple)]/50 hover:bg-[var(--bg-hover)]/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.15)] hover:-translate-y-0.5',
        predicting && 'cursor-not-allowed opacity-50 pointer-events-none',
      )}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handle(e.target.files)} />

      {predicting ? (
        <>
          <div className="h-10 w-10 rounded-full border-2 border-[var(--accent-purple)] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-[var(--accent-purple)]">Classifying wafer…</p>
          <p className="text-[11px] text-[var(--tx-muted)]">ResNet50 AI model running</p>
        </>
      ) : (
        <>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/30">
            <Upload className="h-5 w-5 text-[var(--accent-purple)]" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--tx-primary)]">Drop wafer images here</p>
            <p className="text-[11px] text-[var(--tx-muted)] mt-1">PNG · JPG · JPEG · Multi-file supported</p>
          </div>
          <span className="rounded-full border border-[var(--accent-purple)]/40 bg-[var(--accent-purple)]/10 px-3 py-1 text-[10px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">
            AI-Powered Classification
          </span>
        </>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────
export default function UploadPage() {
  const queryClient = useQueryClient();
  const { state, setLot } = useDashboard();
  const { lotDatabase, predicting, error: waferError, predict, clearAll: clearWafer, deleteWafer } = useWaferAi();
  const [showWaferResults, setShowWaferResults] = useState(true);

  const [files, setFiles] = useState<Record<string, FileUploadState>>({
    STIL:         { file: null, status: 'idle', message: '' },
    ATE_LOG:      { file: null, status: 'idle', message: '' },
    ATPG_REPORT:  { file: null, status: 'idle', message: '' },
    MBIST_REPORT: { file: null, status: 'idle', message: '' },
    LBIST_REPORT: { file: null, status: 'idle', message: '' },
  });

  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [progress, setProgress]         = useState<ProgressEvent[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleFileChange = (type: string, file: File | null) => {
    setFiles(prev => ({
      ...prev,
      [type]: { ...prev[type], file, status: file ? 'success' : 'idle' },
    }));
  };

  const { data: storedLots, refetch: refetchLots } = useQuery({
    queryKey: ['stored-lots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/lots');
      // If the endpoint wraps the array, extract it
      return Array.isArray(data) ? data : data?.data ?? [];
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/lots/${id}`);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stored-lots'] });
      refetchLots();
      setDeleteConfirm(null);
      if (state.activeLotId === id) {
        setLot(null);
      }
      toast.success('File Deleted', 'Lot run history wiped out.');
    } catch {
      console.error('Delete failed');
      toast.error('Deletion Failed', 'Unable to wipe out the lot run history.');
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
      toast.success('Fleet Cleared', 'All forensic lots deleted.');
    } catch {
      console.error('Delete all failed');
      toast.error('Clear All Failed', 'Unable to delete all forensic lots.');
    }
  };

  const handleAnalyze = async () => {
    if (!files.STIL.file && !files.ATE_LOG.file) return;
    setIsAnalyzing(true);
    setProgress([]);

    const formData = new FormData();
    if (files.STIL.file)         formData.append('STIL',         files.STIL.file);
    if (files.ATE_LOG.file)      formData.append('ATE_LOG',      files.ATE_LOG.file);
    if (files.ATPG_REPORT.file)  formData.append('ATPG_REPORT',  files.ATPG_REPORT.file);
    if (files.MBIST_REPORT.file) formData.append('MBIST_REPORT', files.MBIST_REPORT.file);
    if (files.LBIST_REPORT.file) formData.append('LBIST_REPORT', files.LBIST_REPORT.file);

    try {
      const { data } = await apiClient.post('/upload', formData);
      const uploadId = data.uploadId ?? data.data?.uploadId;
      if (!uploadId) {
        throw new Error('No upload id returned from server');
      }
      const eventSource = new EventSource(uploadProgressUrl(uploadId));

      eventSource.onmessage = (e) => {
        const newEvents: ProgressEvent[] = JSON.parse(e.data);
        setProgress(prev => [...prev, ...newEvents]);
        if (newEvents.some(ev => ev.stage === 'Complete')) {
          const completeEvent = newEvents.find(ev => ev.stage === 'Complete');
          if (completeEvent?.data?.lotId) {
            setLot(completeEvent.data.lotId);
          }
          eventSource.close();
          setIsAnalyzing(false);
          refetchLots();
          toast.success('Ingestion Finished', 'forensics pipeline executed successfully.');
        } else if (newEvents.some(ev => ev.stage === 'Error')) {
          eventSource.close();
          setIsAnalyzing(false);
          toast.error('Pipeline Error', 'Forensic pipeline analysis encountered errors.');
        }
      };
      eventSource.onerror = () => {
        eventSource.close();
        setIsAnalyzing(false);
      };
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      toast.error('Upload failed', 'Check that the API is running and files are valid.');
      setIsAnalyzing(false);
    }
  };

  const canAnalyze = (files.STIL.file || files.ATE_LOG.file) && !isAnalyzing;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader
        title="Forensic Data Ingestion"
        subtitle="Upload STIL, ATE Logs, and ATPG Reports to power the analysis engine"
        badge="v2.4"
      />

      {/* Primary upload row */}
      <div>
        <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em] mb-3">
          Required Files
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UploadCard
            title="STIL"
            description="Standard Test Interface Language"
            extension=".stil"
            iconColor="var(--accent-green)"
            onFileSelect={(f) => handleFileChange('STIL', f)}
            selectedFile={files.STIL.file}
          />
          <UploadCard
            title="ATE LOG"
            description="Tester log — SmarTest, G-XL, CSV"
            extension=".log / .csv"
            iconColor="var(--accent-blue)"
            onFileSelect={(f) => handleFileChange('ATE_LOG', f)}
            selectedFile={files.ATE_LOG.file}
          />
          <UploadCard
            title="ATPG REPORT"
            description="Fault report — TetraMAX, Modus"
            extension=".rpt"
            iconColor="var(--accent-purple)"
            onFileSelect={(f) => handleFileChange('ATPG_REPORT', f)}
            selectedFile={files.ATPG_REPORT.file}
          />
        </div>
      </div>

      {/* Optional files */}
      <div>
        <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em] mb-3">
          Optional BIST Reports
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadCard
            title="MBIST REPORT"
            description="Memory BIST diagnostics"
            extension=".rpt / .xml"
            iconColor="var(--accent-blue)"
            onFileSelect={(f) => handleFileChange('MBIST_REPORT', f)}
            selectedFile={files.MBIST_REPORT.file}
          />
          <UploadCard
            title="LBIST REPORT"
            description="Logic BIST diagnostics"
            extension=".rpt / .xml"
            iconColor="var(--accent-cyan)"
            onFileSelect={(f) => handleFileChange('LBIST_REPORT', f)}
            selectedFile={files.LBIST_REPORT.file}
          />
        </div>
      </div>

      {/* Validation hint */}
      {!files.STIL.file && !files.ATE_LOG.file && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border text-[12px] text-[var(--tx-secondary)]"
          style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-amber)] shrink-0" />
          At minimum, upload a STIL file or ATE LOG to begin analysis.
        </div>
      )}

      {/* Analyze CTA */}
      <div className="flex justify-center">
        <button
          id="analyze-btn"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className={`
            flex items-center gap-2.5 px-10 py-3.5 rounded-[var(--radius-lg)] font-bold text-[14px] transition-all duration-200
            ${canAnalyze
              ? 'bg-[var(--accent-blue)] text-white hover:bg-blue-600 shadow-[0_0_24px_rgba(59,130,246,0.3)] hover:shadow-[0_0_32px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-white/[0.04] text-[var(--tx-muted)] cursor-not-allowed border border-[var(--border)]'
            }
          `}
        >
          {isAnalyzing && (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {isAnalyzing ? 'Analysing…' : 'Run Analysis'}
        </button>
      </div>

      {/* Progress Timeline */}
      {progress.length > 0 && (
        <div
          className="w-full max-w-2xl mx-auto rounded-[var(--radius-xl)] border overflow-hidden"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div
            className="px-5 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-widest">
              Analysis Pipeline
            </span>
            <span className="rounded-full bg-[var(--accent-blue)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-blue)] uppercase tracking-widest border border-[var(--accent-blue)]/20 leading-none">{progress.length} steps</span>
          </div>
          <div className="px-5 py-4 space-y-0">
            {progress.map((event, i) => (
              <ProgressStep key={i} event={event} index={i} total={progress.length} />
            ))}
          </div>
        </div>
      )}

      {/* ── Wafer Image Upload (AI Classification) ────────── */}
      <div>
        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-[0.15em]">
              Wafer Image Upload
            </p>
            <span className="rounded-full border border-[var(--accent-purple)]/30 bg-[var(--accent-purple)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-purple)] uppercase tracking-wider">
              AI · ResNet50
            </span>
          </div>
          {/* Show/hide results toggle + clear */}
          <div className="flex items-center gap-2">
            {Object.values(lotDatabase).some(l => l.wafers.length > 0) && (
              <>
                <button
                  onClick={() => setShowWaferResults(v => !v)}
                  className="flex items-center gap-1 text-[10px] text-[var(--tx-muted)] hover:text-[var(--tx-secondary)] transition"
                >
                  {showWaferResults ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showWaferResults ? 'Hide' : 'Show'} Results
                </button>
                <button
                  onClick={async () => {
                    await clearWafer();
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    toast.success('Wafers Cleared', 'All wafer image assignments cleared.');
                  }}
                  className="flex items-center gap-1 text-[10px] text-[var(--tx-muted)] hover:text-red-400 transition"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Drop zone */}
        <WaferDropZone
          predicting={predicting}
          onFiles={async (imgs) => {
            for (const img of imgs) await predict(img);
          }}
        />

        {/* AI error */}
        {waferError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{waferError}</p>
          </div>
        )}

        {/* Results table — all classified wafers */}
        {showWaferResults && Object.values(lotDatabase).some(l => l.wafers.length > 0) && (
          <div
            className="mt-4 rounded-[var(--radius-xl)] border border-[var(--border)]/80 bg-[var(--bg-card)]/50 backdrop-blur-md overflow-hidden shadow-2xl transition-all duration-300"
          >
            {/* Table header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[var(--accent-purple)]" />
                <span className="text-[11px] font-bold text-[var(--tx-muted)] uppercase tracking-widest">
                  AI Classification Results
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[var(--accent-purple)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-purple)] border border-[var(--accent-purple)]/20 leading-none">
                  {Object.values(lotDatabase).reduce((a, l) => a + l.wafers.length, 0)} wafers classified
                </span>
                <button
                  onClick={async () => {
                    await clearWafer();
                    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                    toast.success('Cleared', 'All AI classification results removed.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[10px] font-bold uppercase tracking-wider border transition-all active:scale-95"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    borderColor: 'rgba(239,68,68,0.22)',
                    color: 'var(--accent-red)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['File Name', 'Defect Class', 'Confidence', 'Assigned LOT', 'Defect Type', 'Status', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="py-2 px-4 text-[9px] font-bold uppercase tracking-wider text-[var(--tx-muted)] border-b"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(lotDatabase).flatMap(([, lotData]) =>
                    lotData.wafers.map((wafer, i) => {
                      const color = DEFECT_COLORS[wafer.class] ?? '#8b9cc8';
                      const isNormal = wafer.class === 'Normal';
                      return (
                        <tr
                          key={`${wafer.name}-${i}`}
                          className="border-b transition-colors hover:bg-[var(--bg-hover)]/30"
                          style={{ borderColor: 'rgba(30,45,69,0.5)' }}
                        >
                          {/* File name */}
                          <td className="py-3 px-4">
                            <p className="text-xs font-medium text-[var(--tx-primary)] truncate max-w-[160px]">{wafer.name}</p>
                            <p className="text-[9px] text-[var(--tx-disabled)] font-mono">
                              {new Date(wafer.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                            </p>
                          </td>

                          {/* Defect class badge */}
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                              style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                              {wafer.class}
                            </span>
                          </td>

                          {/* Confidence */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${wafer.confidence}%`, background: color }}
                                />
                              </div>
                              <span className="text-[10px] font-bold font-mono" style={{ color }}>
                                {wafer.confidence.toFixed(1)}%
                              </span>
                            </div>
                          </td>

                          {/* Lot */}
                          <td className="py-3 px-4">
                            <span className="text-xs font-bold font-mono text-[var(--tx-secondary)]">{wafer.lot}</span>
                          </td>

                          {/* Defect type */}
                          <td className="py-3 px-4">
                            <span className="text-[10px] text-[var(--tx-muted)]">{lotDatabase[wafer.lot]?.defect_type ?? wafer.class}</span>
                          </td>

                          {/* Pass/Fail */}
                          <td className="py-3 px-4">
                            {isNormal ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                <Check className="h-3 w-3" /> PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
                                <AlertTriangle className="h-3 w-3" /> DEFECT
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <button
                              onClick={async () => {
                                await deleteWafer(wafer.lot, wafer.name);
                                queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                                toast.success('Wafer Removed', `${wafer.name} has been removed from assignment.`);
                              }}
                              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/45 hover:text-red-300 transition-all active:scale-95 flex items-center justify-center shrink-0"
                              title="Delete Wafer Assignment"
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

      {/* ── Stored Lots ──────────────────────────────── */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3
              className="text-[15px] font-bold text-[var(--tx-primary)]"
              style={{ letterSpacing: '-0.015em' }}
            >
              Stored Forensic Lots
            </h3>
            {storedLots && storedLots.length > 0 && (
              <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)] leading-none">{storedLots.length} files</span>
            )}
          </div>

          {storedLots && storedLots.length > 0 && (
            deleteConfirm === 'all' ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-[12px]"
                style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.18)' }}
              >
                <span className="text-[var(--accent-red)] font-semibold">Confirm delete all?</span>
                <button
                  onClick={handleDeleteAll}
                  className="text-[var(--accent-red)] font-bold hover:underline"
                >Yes</button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="text-[var(--tx-muted)] hover:text-[var(--tx-secondary)]"
                >Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm('all')}
                className="flex items-center justify-center bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.2)] transition text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-[var(--radius-sm)]"
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
                      ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/5 backdrop-blur-md shadow-[0_0_25px_rgba(59,130,246,0.15)]'
                      : 'border-[var(--border)]/80 bg-[var(--bg-card)]/50 backdrop-blur-sm hover:border-[var(--border-bright)] hover:bg-[var(--bg-hover)]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                    }
                  `}
                >
                  {/* Active badge */}
                  {isActiveLot && (
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-[var(--accent-blue)]/10 px-2 py-0.5 text-[9px] font-bold text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 leading-none">Active</span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border border-[var(--accent-blue)]/30 text-[var(--accent-blue)] bg-[var(--accent-blue)]/5">
                      LOT
                    </span>

                    {deleteConfirm === lot.id ? (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-[var(--accent-red)] font-semibold">Delete?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(lot.id); }}
                          className="text-[var(--accent-red)] font-bold hover:underline"
                        >Yes</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                          className="text-[var(--tx-muted)]"
                        >No</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(lot.id); }}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[9px] font-bold text-[var(--tx-muted)] hover:text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.08)] border border-[var(--border)] rounded-[var(--radius-sm)] transition-all font-mono uppercase tracking-wider"
                        aria-label="Delete lot"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Lot info */}
                  <h4 className="text-[13px] font-bold text-[var(--tx-primary)] mb-0.5">
                    Lot {lot.lotNumber}
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lot.product && (
                      <span className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)] leading-none">{lot.product}</span>
                    )}
                    {lot.tester && (
                      <span className="rounded bg-[var(--border)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--tx-secondary)] border border-[var(--border-bright)] leading-none">{lot.tester}</span>
                    )}
                  </div>

                  {/* Stats row */}
                  <div
                    className="grid grid-cols-2 gap-3 pt-3 border-t"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div>
                      <p className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-widest">Patterns</p>
                      <p className="text-[13px] font-mono mt-0.5">{lot._count?.patterns ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[var(--tx-muted)] uppercase tracking-widest">Uploaded</p>
                      <p className="text-[13px] font-mono mt-0.5">
                        {new Date(lot.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="rounded-[var(--radius-2xl)] border p-16 flex flex-col items-center justify-center text-center"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <span className="inline-block px-2.5 py-1 text-[10px] font-bold text-[var(--tx-disabled)] border border-[var(--border)] bg-[var(--bg-card)] rounded uppercase tracking-wider mb-2.5 font-mono">
              EMPTY LOT STORAGE
            </span>
            <p className="text-[13px] font-semibold text-[var(--tx-secondary)] mb-1">
              No stored files found
            </p>
            <p className="text-[11px] text-[var(--tx-muted)]">
              Uploaded lots will appear here after analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
