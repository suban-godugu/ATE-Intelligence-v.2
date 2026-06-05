// d:\officw work -1\ai-1\frontend\src\hooks\useAteDft.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { ateDftClient } from '@/api/ateDftClient';
import type {
  AnalysisResult,
  DashboardSummary,
  UploadedFile,
} from '@/types/ateDft';

/* ── Upload hook ─────────────────────────────────────── */
export function useAteDftUpload() {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await ateDftClient.uploadFile(file);
      setResults(prev => [result, ...prev]);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { results, uploading, error, upload };
}

/* ── Dashboard summary hook ──────────────────────────── */
export function useAteDftSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ateDftClient.getSummary();
      setSummary(data);
    } catch {
      // backend offline — use zeros
      setSummary({
        totalFilesUploaded: 0,
        mbist: { totalRecords: 0 },
        lbist: { totalRecords: 0 },
        scan:  { totalRecords: 0 },
        wafer: { totalRecords: 0 },
        atpg:  { totalRecords: 0 },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { summary, loading, refresh };
}

/* ── File tracker hook ───────────────────────────────── */
export function useAteDftFiles() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ateDftClient.getFiles();
      setFiles(data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { files, loading, refresh };
}

/* ── Module results hook ─────────────────────────────── */
export function useAteDftModuleResults(module: string) {
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ateDftClient.getModuleResults(module)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [module]);

  return { rows, loading };
}
