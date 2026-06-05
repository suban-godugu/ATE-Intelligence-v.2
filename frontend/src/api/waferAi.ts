'use client';

import { apiUrl } from './config';

// ─── Types ────────────────────────────────────────────────
export interface WaferAiImage {
  type: 'RAW_BIN_MAP' | 'DEFECT_MASK' | 'GRADCAM_OVERLAY' | 'PROCESSED_THUMBNAIL';
  url: string;
  backend: 'POSTGRES' | 'MINIO';
}

export interface WaferPredictResult {
  id?: string;
  class: string;
  confidence: number;
  class_index?: number;
  probabilities: Record<string, number>;
  lot: string;
  good: number;
  fail: number;
  total: number;
  yield: number;
  images?: WaferAiImage[];
  waferImageUrl?: string;
  overlayDataUrl?: string;
  densityDataUrl?: string;
  attentionDataUrl?: string;
}

export interface WaferEntry extends WaferPredictResult {
  name: string;
  timestamp: string;
}

export interface LotData {
  defect_type: string;
  wafers: WaferEntry[];
}

export type LotDatabase = Record<string, LotData>;

// ─── LOT MAPPING (matches dashboard.py) ──────────────────
export const LOT_MAPPING: Record<string, string> = {
  Center:    'LOT_1',
  Donut:     'LOT_2',
  'Edge-Loc':'LOT_3',
  'Edge-Ring':'LOT_4',
  Scratch:   'LOT_5',
  'Near-Full':'LOT_6',
  Random:    'LOT_7',
  Local:     'LOT_8',
  Normal:    'LOT_9',
};

export const DEFAULT_LOT_DB: LotDatabase = {
  LOT_1: { defect_type: 'Center',    wafers: [] },
  LOT_2: { defect_type: 'Donut',     wafers: [] },
  LOT_3: { defect_type: 'Edge-Loc',  wafers: [] },
  LOT_4: { defect_type: 'Edge-Ring', wafers: [] },
  LOT_5: { defect_type: 'Scratch',   wafers: [] },
  LOT_6: { defect_type: 'Near-Full', wafers: [] },
  LOT_7: { defect_type: 'Random',    wafers: [] },
  LOT_8: { defect_type: 'Local',     wafers: [] },
  LOT_9: { defect_type: 'Normal',    wafers: [] },
};

export const DEFECT_CLASS_NAMES = [
  'Center','Donut','Edge-Loc','Edge-Ring',
  'Local','Near-Full','Normal','Random','Scratch',
];

// ─── Class colour map ─────────────────────────────────────
export const DEFECT_COLORS: Record<string, string> = {
  Center:     '#ef4444',
  Donut:      '#f97316',
  'Edge-Loc': '#f59e0b',
  'Edge-Ring':'#eab308',
  Scratch:    '#8b5cf6',
  'Near-Full':'#ec4899',
  Random:     '#06b6d4',
  Local:      '#3b82f6',
  Normal:     '#10b981',
};

// ─── AI PREDICT (calls backend proxy → FastAPI) ───────────
export async function predictWaferImage(file: File): Promise<WaferPredictResult> {
  const form = new FormData();
  form.append('file', file);

  try {
    // Try NestJS backend proxy first
    const res = await fetch(apiUrl('/wafer-ai/predict'), {
      method: 'POST',
      body: form,
    });

    if (res.ok) {
      const json = await res.json();
      const patternClass = json.patternLabel || json.class || 'Normal';
      const lot = LOT_MAPPING[patternClass] ?? 'LOT_UNKNOWN';

      const rawUrl = json.images?.find((i: any) => i.type === 'RAW_BIN_MAP')?.url;
      const overlayUrl = json.images?.find((i: any) => i.type === 'DEFECT_MASK')?.url;
      const densityUrl = json.images?.find((i: any) => i.type === 'PROCESSED_THUMBNAIL')?.url;
      const attentionUrl = json.images?.find((i: any) => i.type === 'GRADCAM_OVERLAY')?.url;

      return {
        ...json,
        class: patternClass,
        lot,
        good:  json.good  ?? 0,
        fail:  json.fail  ?? 0,
        total: json.total ?? 0,
        yield: json.yield ?? 0,
        probabilities: json.probabilities ?? {},
        waferImageUrl: rawUrl,
        overlayDataUrl: overlayUrl,
        densityDataUrl: densityUrl,
        attentionDataUrl: attentionUrl,
      };
    }
  } catch (err) {
    console.error('API proxy predict error:', err);
  }

  // Direct FastAPI fallback (returns old shape, so we adapt it statefully)
  try {
    const res = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      body: form,
    });
    if (res.ok) {
      const json = await res.json();
      const patternClass = json.patternLabel || json.class || 'Normal';
      const lot = LOT_MAPPING[patternClass] ?? 'LOT_UNKNOWN';

      // Simulate URLs or adapt base64 for direct fallback
      const rawUrl = json.rawImageBase64 ? `data:image/png;base64,${json.rawImageBase64}` : undefined;
      const overlayUrl = json.maskBase64 ? `data:image/png;base64,${json.maskBase64}` : undefined;
      const attentionUrl = json.gradcamBase64 ? `data:image/png;base64,${json.gradcamBase64}` : undefined;

      const imagesList = [
        { type: 'RAW_BIN_MAP', url: rawUrl || '', backend: 'POSTGRES' },
        { type: 'DEFECT_MASK', url: overlayUrl || '', backend: 'POSTGRES' },
        { type: 'GRADCAM_OVERLAY', url: attentionUrl || '', backend: 'POSTGRES' },
      ].filter(img => img.url) as any[];

      return {
        ...json,
        class: patternClass,
        lot,
        good:  json.good  ?? 0,
        fail:  json.fail  ?? 0,
        total: json.total ?? 0,
        yield: json.yield ?? 0,
        probabilities: json.probabilities ?? {},
        images: imagesList,
        waferImageUrl: rawUrl,
        overlayDataUrl: overlayUrl,
        attentionDataUrl: attentionUrl,
      };
    }
  } catch {
    throw new Error(
      "WaferVision AI FastAPI server is offline. Please make sure the Python server is running on http://127.0.0.1:8000."
    );
  }

  throw new Error(
    "WaferVision AI API proxy failed. Please make sure the NestJS backend and the Python FastAPI server on http://127.0.0.1:8000 are online."
  );
}

export async function fetchLotsFromDb(): Promise<LotDatabase> {
  try {
    const res = await fetch(apiUrl('/wafer-ai/lots'), { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[WaferAI] /wafer-ai/lots returned ${res.status} — using empty lot database`);
      return { ...DEFAULT_LOT_DB };
    }
    return res.json();
  } catch (err) {
    console.warn('[WaferAI] Could not reach backend — using empty lot database', err);
    return { ...DEFAULT_LOT_DB };
  }
}

export async function deleteWaferInDb(lotId: string, waferName: string): Promise<void> {
  const res = await fetch(apiUrl(`/wafer-ai/lots/${lotId}/wafers/${encodeURIComponent(waferName)}`), {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete wafer ${waferName} from database`);
  }
}

export async function clearLotInDb(lotId: string): Promise<void> {
  const res = await fetch(apiUrl(`/wafer-ai/lots/${lotId}`), {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to clear lot ${lotId} from database`);
  }
}

export async function clearAllInDb(): Promise<void> {
  const res = await fetch(apiUrl('/wafer-ai/lots'), {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to clear all wafers from database');
  }
}
