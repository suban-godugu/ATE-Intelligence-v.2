import { WaferPredictResult, WaferAiImage } from '../api/waferAi';

/**
 * WaferAI Frontend Service
 * Provides helper utilities for rendering size-routed wafer images (Postgres bytea and MinIO S3).
 */
export class WaferAiService {
  /**
   * Safe utility to find a routed image of a specific type.
   */
  static getImageUrl(
    result: Partial<WaferPredictResult>,
    type: 'RAW_BIN_MAP' | 'DEFECT_MASK' | 'GRADCAM_OVERLAY' | 'PROCESSED_THUMBNAIL'
  ): string | undefined {
    return result.images?.find((img: WaferAiImage) => img.type === type)?.url;
  }

  /**
   * Helper mapping for original wafer map rendering.
   * Matches the specification requirement:
   * To render original image: <img src={WaferAiService.getOriginalImageUrl(result)} />
   */
  static getOriginalImageUrl(result: Partial<WaferPredictResult>): string | undefined {
    return this.getImageUrl(result, 'RAW_BIN_MAP');
  }

  /**
   * Helper mapping for U-Net defect mask rendering.
   */
  static getDefectMaskUrl(result: Partial<WaferPredictResult>): string | undefined {
    return this.getImageUrl(result, 'DEFECT_MASK');
  }

  /**
   * Helper mapping for Grad-CAM overlay rendering.
   */
  static getGradcamOverlayUrl(result: Partial<WaferPredictResult>): string | undefined {
    return this.getImageUrl(result, 'GRADCAM_OVERLAY');
  }
}
