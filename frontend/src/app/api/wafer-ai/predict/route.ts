import { NextRequest, NextResponse } from 'next/server';
import { addWaferToDb } from '../_db';

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

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/wafer-ai/predict
 * 
 * 1. Forwards the multipart image to FastAPI at port 8000
 * 2. FastAPI returns base64 data URLs (overlayDataUrl, densityDataUrl, attentionDataUrl)
 * 3. We persist the result to our in-memory lot DB so /api/wafer-ai/lots can return it
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // ── Try NestJS backend first (it handles DB + MinIO storage) ──────────
    const nestjsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
    try {
      const nestForm = new FormData();
      nestForm.append('file', file);

      const nestRes = await fetch(`${nestjsUrl}/api/wafer-ai/predict`, {
        method: 'POST',
        body: nestForm,
        signal: AbortSignal.timeout(25_000),
      });

      if (nestRes.ok) {
        const data = await nestRes.json();
        const patternClass: string = data.patternLabel || data.class || 'Normal';
        const lot = LOT_MAPPING[patternClass] ?? 'LOT_UNKNOWN';

        const entry = {
          name: file.name,
          timestamp: new Date().toISOString(),
          class: patternClass,
          confidence: Number(data.confidence ?? 0),
          probabilities: data.probabilities ?? {},
          lot,
          good: Number(data.good ?? 0),
          fail: Number(data.fail ?? 0),
          total: Number(data.total ?? 0),
          yield: Number(data.yield ?? 0),
          waferImageUrl:    extractImageUrl(data, 'RAW_BIN_MAP')    || data.waferImageUrl,
          overlayDataUrl:   extractImageUrl(data, 'DEFECT_MASK')    || data.overlayDataUrl,
          densityDataUrl:   extractImageUrl(data, 'PROCESSED_THUMBNAIL') || data.densityDataUrl,
          attentionDataUrl: extractImageUrl(data, 'GRADCAM_OVERLAY') || data.attentionDataUrl,
        };

        addWaferToDb(entry);

        return NextResponse.json({
          ...data,
          ...entry,
        });
      }
    } catch (nestErr: any) {
      console.warn('[wafer-ai/predict] NestJS backend unavailable, falling back to FastAPI direct:', nestErr.message);
    }

    // ── Direct FastAPI fallback (no MinIO, images as base64 data URLs) ────
    const fastApiUrl = process.env.FASTAPI_URL ?? 'http://127.0.0.1:8000';
    const directForm = new FormData();
    directForm.append('file', file);

    const fastRes = await fetch(`${fastApiUrl}/predict`, {
      method: 'POST',
      body: directForm,
      signal: AbortSignal.timeout(45_000),
    });

    if (!fastRes.ok) {
      const text = await fastRes.text().catch(() => '');
      return NextResponse.json(
        { error: `FastAPI returned ${fastRes.status}: ${text}` },
        { status: fastRes.status }
      );
    }

    const data = await fastRes.json();
    const patternClass: string = data.patternLabel || data.class || 'Normal';
    const lot = LOT_MAPPING[patternClass] ?? 'LOT_UNKNOWN';

    // FastAPI returns base64 data URLs directly
    const rawImgB64 = data.rawImageBase64 
      ? `data:image/png;base64,${data.rawImageBase64}` 
      : undefined;

    const entry = {
      name: file.name,
      timestamp: new Date().toISOString(),
      class: patternClass,
      confidence: Number(data.confidence ?? 0),
      probabilities: data.probabilities ?? {},
      lot,
      good:  Number(data.good  ?? 0),
      fail:  Number(data.fail  ?? 0),
      total: Number(data.total ?? 0),
      yield: Number(data.yield ?? 0),
      waferImageUrl:    rawImgB64,
      overlayDataUrl:   data.overlayDataUrl   || (data.maskBase64     ? `data:image/png;base64,${data.maskBase64}`    : undefined),
      densityDataUrl:   data.densityDataUrl   || undefined,
      attentionDataUrl: data.attentionDataUrl || (data.gradcamBase64  ? `data:image/png;base64,${data.gradcamBase64}` : undefined),
    };

    // Persist to in-memory lot DB
    addWaferToDb(entry);

    return NextResponse.json({
      ...data,
      ...entry,
    });

  } catch (err: any) {
    const isOffline =
      err?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.name === 'AbortError' ||
      err?.name === 'TimeoutError';

    if (isOffline) {
      return NextResponse.json(
        {
          error: 'WaferVision AI FastAPI server is offline. Please make sure the Python server is running on http://127.0.0.1:8000.',
          offline: true,
        },
        { status: 503 }
      );
    }

    console.error('[wafer-ai/predict] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal proxy error', details: String(err) },
      { status: 500 }
    );
  }
}

/** Extract image URL from NestJS images[] array */
function extractImageUrl(data: any, type: string): string | undefined {
  return data.images?.find((i: any) => i.type === type)?.url;
}
