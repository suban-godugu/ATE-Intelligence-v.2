export class WaferAiImageDto {
  type: string;
  url: string;
  backend: string;
}

export class WaferAiResponseDto {
  id?: string;
  patternLabel: string;
  class?: string;
  confidence: number;
  lot: string;
  good: number;
  fail: number;
  total: number;
  yield: number;
  probabilities: any;
  timestamp: string;
  images: WaferAiImageDto[];
  // Returned as base64 data URLs when MinIO is unavailable
  overlayDataUrl?: string;
  densityDataUrl?: string;
  attentionDataUrl?: string;
}
