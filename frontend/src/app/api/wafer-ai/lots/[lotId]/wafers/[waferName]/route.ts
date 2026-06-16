import { NextRequest, NextResponse } from 'next/server';
import { deleteWaferFromDb } from '../../../../_db';

// DELETE /api/wafer-ai/lots/[lotId]/wafers/[waferName]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { lotId: string; waferName: string } }
) {
  const waferName = decodeURIComponent(params.waferName);
  deleteWaferFromDb(params.lotId, waferName);

  // Also forward to NestJS backend
  const nestjsUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';
  try {
    await fetch(
      `${nestjsUrl}/api/wafer-ai/lots/${params.lotId}/wafers/${encodeURIComponent(waferName)}`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      }
    );
  } catch {
    // Ignore if NestJS is offline
  }

  return NextResponse.json({ success: true });
}
