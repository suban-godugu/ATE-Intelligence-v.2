import { WaferImageType, StorageBackend } from '@prisma/client';

export class WaferAiImageDto {
  type: WaferImageType;
  url: string;
  backend: StorageBackend;
}

export class WaferAiResponseDto {
  id: string;
  patternLabel: string;
  confidence: number;
  lot: string;
  good: number;
  fail: number;
  total: number;
  yield: number;
  probabilities: any;
  timestamp: string;
  images: WaferAiImageDto[];
}
