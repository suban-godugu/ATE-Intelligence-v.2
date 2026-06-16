import { NextRequest, NextResponse } from 'next/server';
import { clearLotFromDb } from '../../_db';

// DELETE /api/wafer-ai/lots/[lotId] — clear a single lot
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { lotId: string } }
) {
  clearLotFromDb(params.lotId);

  // Also forward to NestJS backend
  const nestjsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
  try {
    await fetch(`${nestjsUrl}/api/wafer-ai/lots/${params.lotId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Ignore if NestJS is offline
  }

  return NextResponse.json({ success: true });
}
