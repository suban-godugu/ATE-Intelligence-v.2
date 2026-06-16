'use client';


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

// ─── AI PREDICT — routes through Next.js proxy → FastAPI ─────────────────
// All calls go to /api/wafer-ai/* (Next.js route handlers) which handle
// the NestJS ↔ FastAPI chain. No direct cross-origin requests from the browser.
export async function predictWaferImage(file: File): Promise<WaferPredictResult> {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch('/api/wafer-ai/predict', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    let errMsg = `Prediction failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) errMsg = body.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(errMsg);
  }

  const json = await res.json();
  const patternClass: string = json.patternLabel || json.class || 'Normal';
  const lot = LOT_MAPPING[patternClass] ?? 'LOT_UNKNOWN';

  return {
    ...json,
    class: patternClass,
    lot,
    good:  json.good  ?? 0,
    fail:  json.fail  ?? 0,
    total: json.total ?? 0,
    yield: json.yield ?? 0,
    probabilities: json.probabilities ?? {},
    waferImageUrl:   json.waferImageUrl,
    overlayDataUrl:  json.overlayDataUrl,
    densityDataUrl:  json.densityDataUrl,
    attentionDataUrl: json.attentionDataUrl,
  };
}

// ─── Lot database helpers — use Next.js proxy routes ─────────────────────
export async function fetchLotsFromDb(): Promise<LotDatabase> {
  try {
    const res = await fetch('/api/wafer-ai/lots', { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[WaferAI] /wafer-ai/lots returned ${res.status} — using empty lot database`);
      return { ...DEFAULT_LOT_DB };
    }
    return res.json();
  } catch (err) {
    console.warn('[WaferAI] Could not reach lots endpoint — using empty lot database', err);
    return { ...DEFAULT_LOT_DB };
  }
}

export async function deleteWaferInDb(lotId: string, waferName: string): Promise<void> {
  const res = await fetch(`/api/wafer-ai/lots/${lotId}/wafers/${encodeURIComponent(waferName)}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete wafer ${waferName} from database`);
  }
}

export async function clearLotInDb(lotId: string): Promise<void> {
  const res = await fetch(`/api/wafer-ai/lots/${lotId}`, {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to clear lot ${lotId} from database`);
  }
}

export async function clearAllInDb(): Promise<void> {
  const res = await fetch('/api/wafer-ai/lots', {
    method: 'DELETE',
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to clear all wafers from database');
  }
}
