import { NextRequest, NextResponse } from 'next/server';
import { getDb, clearAllFromDb } from '../_db';

const DEFAULT_LOT_DB = {
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

// GET /api/wafer-ai/lots
// Tries NestJS backend first (PostgreSQL data), falls back to in-memory DB
export async function GET(_req: NextRequest) {
  const nestjsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${nestjsUrl}/api/wafer-ai/lots`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const nestData = await res.json();

      // Merge NestJS data with our in-memory data (in-memory takes precedence for new uploads)
      const inMemory = getDb();
      const merged = { ...DEFAULT_LOT_DB } as Record<string, any>;

      for (const lotId of Object.keys(merged)) {
        const nestWafers = nestData[lotId]?.wafers ?? [];
        const localWafers = inMemory[lotId]?.wafers ?? [];

        // De-duplicate: prefer local over NestJS for same file names
        const localNames = new Set(localWafers.map((w: any) => w.name));
        const filteredNest = nestWafers.filter((w: any) => !localNames.has(w.name));

        merged[lotId] = {
          defect_type: nestData[lotId]?.defect_type ?? merged[lotId].defect_type,
          wafers: [...localWafers, ...filteredNest],
        };
      }

      return NextResponse.json(merged);
    }
  } catch {
    // NestJS offline — fall through to in-memory
  }

  // Return in-memory DB as fallback
  return NextResponse.json(getDb());
}

// DELETE /api/wafer-ai/lots — clear all wafers
export async function DELETE(_req: NextRequest) {
  clearAllFromDb();

  // Also try to clear NestJS backend
  const nestjsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
  try {
    await fetch(`${nestjsUrl}/api/wafer-ai/lots`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Ignore if NestJS is offline
  }

  return NextResponse.json({ success: true });
}
