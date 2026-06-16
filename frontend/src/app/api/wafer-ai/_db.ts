/**
 * In-memory wafer lot database (server-side singleton).
 * This keeps state across Next.js API route calls without needing NestJS.
 */

// LOT mapping (must stay in sync with waferAi.ts)
const LOT_MAPPING: Record<string, string> = {
  Center:     'LOT_1',
  Donut:      'LOT_2',
  'Edge-Loc': 'LOT_3',
  'Edge-Ring':'LOT_4',
  Scratch:    'LOT_5',
  'Near-Full':'LOT_6',
  Random:     'LOT_7',
  Local:      'LOT_8',
  Normal:     'LOT_9',
};

export interface WaferEntry {
  name: string;
  timestamp: string;
  class: string;
  confidence: number;
  probabilities: Record<string, number>;
  lot: string;
  good: number;
  fail: number;
  total: number;
  yield: number;
  waferImageUrl?: string;
  overlayDataUrl?: string;
  densityDataUrl?: string;
  attentionDataUrl?: string;
}

export interface LotData {
  defect_type: string;
  wafers: WaferEntry[];
}

export type LotDatabase = Record<string, LotData>;

// Module-level singleton (persists for the Next.js server process lifetime)
const DB: LotDatabase = {
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

export function getDb(): LotDatabase {
  return DB;
}

export function addWaferToDb(entry: WaferEntry): void {
  const lotId = LOT_MAPPING[entry.class] ?? 'LOT_1';
  if (!DB[lotId]) {
    DB[lotId] = { defect_type: entry.class, wafers: [] };
  }
  // Avoid duplicates by name
  DB[lotId].wafers = DB[lotId].wafers.filter(w => w.name !== entry.name);
  DB[lotId].wafers.push({ ...entry, lot: lotId });
}

export function deleteWaferFromDb(lotId: string, waferName: string): void {
  if (DB[lotId]) {
    DB[lotId].wafers = DB[lotId].wafers.filter(w => w.name !== waferName);
  }
}

export function clearLotFromDb(lotId: string): void {
  if (DB[lotId]) {
    DB[lotId].wafers = [];
  }
}

export function clearAllFromDb(): void {
  for (const lotId of Object.keys(DB)) {
    DB[lotId].wafers = [];
  }
}
