import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WaferImageStorageService } from '../../wafer-image/wafer-image-storage.service';
import { WaferImageType, StorageBackend } from '@prisma/client';

const LOT_MAPPING: Record<string, string> = {
  Center:      'LOT_1',
  Donut:       'LOT_2',
  'Edge-Loc':  'LOT_3',
  'Edge-Ring': 'LOT_4',
  Scratch:     'LOT_5',
  'Near-Full': 'LOT_6',
  Random:      'LOT_7',
  Local:       'LOT_8',
  Normal:      'LOT_9',
};

export interface WaferEntry {
  id?: string;
  name: string;
  class: string;
  confidence: number;
  lot: string;
  good: number;
  fail: number;
  total: number;
  yield: number;
  probabilities: any;
  waferImageUrl?: string | null;
  overlayDataUrl?: string | null;
  densityDataUrl?: string | null;
  attentionDataUrl?: string | null;
  timestamp: string;
}

export interface LotData {
  defect_type: string;
  wafers: WaferEntry[];
}

// Service for wafer-ai analysis and database storage
@Injectable()
export class WaferAiService {
  private readonly logger = new Logger(WaferAiService.name);
  private readonly aiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: WaferImageStorageService,
    private readonly redis: RedisService,
  ) {
    this.aiUrl = this.configService.get<string>('WAFER_AI_URL') ?? 'http://localhost:8000';
    this.logger.log(`WaferAI service URL: ${this.aiUrl}`);
  }

  private extractWaferId(name: string): string {
    const match = name.match(/(?:wafer_)?(\d+)/i);
    return match ? match[1] : name.replace(/\.[^/.]+$/, "");
  }

  async predict(file: Express.Multer.File) {
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await axios.post(`${this.aiUrl}/predict`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      const result = response.data;
      const patternLabel = result.patternLabel || result.class || 'Normal';
      const confidence = Number(result.confidence ?? 0);
      const lot = LOT_MAPPING[patternLabel] ?? 'LOT_UNKNOWN';

      const aiWaferData = {
        name: file.originalname,
        class: patternLabel,
        confidence,
        lot,
        good: Number(result.good ?? 0),
        fail: Number(result.fail ?? 0),
        total: Number(result.total ?? 0),
        yield: Number(result.yield ?? 0),
        probabilities: result.probabilities ?? {},
      };

      const wafer = await this.prisma.aiWafer.upsert({
        where: {
          lot_name: {
            lot,
            name: file.originalname,
          },
        },
        update: aiWaferData,
        create: aiWaferData,
      });

      // Locate or create the necessary relational records
      const extractedWaferId = this.extractWaferId(file.originalname);
      
      // A. Find or create Lot record
      let dbLot = await this.prisma.lot.findFirst({
        where: { lotId: lot },
      });
      
      if (!dbLot) {
        try {
          let fab = await this.prisma.fab.findFirst();
          if (!fab) {
            fab = await this.prisma.fab.create({ data: { name: 'Fab 1', location: 'Oregon' } });
          }

          let tester = await this.prisma.tester.findFirst();
          if (!tester) {
            tester = await this.prisma.tester.create({
              data: { name: 'Tester A', equipmentRate: 0.15, fabId: fab.id },
            });
          }

          dbLot = await this.prisma.lot.create({
            data: {
              lotId: lot,
              fabId: fab.id,
              testerId: tester.id,
            },
          });
        } catch (err) {
          dbLot = await this.prisma.lot.findFirst({
            where: { lotId: lot },
          });
        }
      }

      if (!dbLot) {
        throw new Error(`Failed to resolve or create Lot for ID ${lot}`);
      }

      // B. Find or create Wafer record
      let dbWafer = await this.prisma.wafer.findFirst({
        where: {
          lotId: dbLot.id,
          waferId: extractedWaferId,
        },
      });

      if (!dbWafer) {
        try {
          dbWafer = await this.prisma.wafer.create({
            data: {
              waferId: extractedWaferId,
              lotId: dbLot.id,
            },
          });
        } catch (err) {
          dbWafer = await this.prisma.wafer.findFirst({
            where: {
              lotId: dbLot.id,
              waferId: extractedWaferId,
            },
          });
        }
      }

      if (!dbWafer) {
        throw new Error(`Failed to resolve or create Wafer for ID ${extractedWaferId}`);
      }

      // C. Clear any existing images for this wafer to prevent unique constraint conflicts
      await this.prisma.waferImage.deleteMany({
        where: { waferId: dbWafer.id },
      });

      // Decode and save all 4 images using storageService
      const imagesToSave = [
        { type: WaferImageType.RAW_BIN_MAP,    b64: result.rawImageBase64 || Buffer.from(file.buffer).toString('base64') },
        { type: WaferImageType.DEFECT_MASK,     b64: result.maskBase64 || result.overlayDataUrl?.split(',')[1] || '' },
        { type: WaferImageType.GRADCAM_OVERLAY, b64: result.gradcamBase64 || result.attentionDataUrl?.split(',')[1] || '' },
        { type: WaferImageType.PROCESSED_THUMBNAIL, b64: result.densityDataUrl?.split(',')[1] || '' },
      ].filter(item => item.b64);

      const savedImages = await Promise.all(
        imagesToSave.map(({ type, b64 }) =>
          this.storageService.saveImage({
            waferId: dbWafer.id,
            aiWaferId: wafer.id,
            imageType: type,
            buffer: Buffer.from(b64, 'base64'),
            mimeType: 'image/png',
          })
        )
      );

      // Build image URL map for API response
      const imageUrls = await Promise.all(
        savedImages.map(async img => ({
          type: img.imageType,
          url: await this.storageService.getAccessUrl(img.id),
          backend: img.storageBackend,
        }))
      );

      // Find original image ID to link
      const rawImg = savedImages.find(img => img.imageType === WaferImageType.RAW_BIN_MAP);
      const originalImageId = rawImg ? rawImg.id : null;

      // D. Update waferImageId link inside the AiWafer record
      await this.prisma.aiWafer.update({
        where: { id: wafer.id },
        data: { waferImageId: originalImageId },
      });

      // E. Clear existing dies for this wafer and insert newly analyzed ones
      await this.prisma.die.deleteMany({
        where: { waferId: dbWafer.id },
      });

      if (result.dies && Array.isArray(result.dies)) {
        const diesToCreate = result.dies.map((d: any) => ({
          waferId: dbWafer.id,
          x: d.die_col,
          y: d.die_row,
          bin: d.label === 'GOOD' ? 1 : 2,
          failType: d.label === 'FAIL' ? patternLabel : null,
        }));
        
        await this.prisma.die.createMany({
          data: diesToCreate,
        });
        this.logger.log(`Saved ${diesToCreate.length} Die records to database for wafer.`);
      }

      this.logger.log(`Predicted & Saved to DB with binary WaferImage: ${patternLabel} (${confidence}%) → ${lot}`);

      return {
        id: wafer.id,
        patternLabel,
        confidence,
        images: imageUrls,
        lot,
        good: wafer.good,
        fail: wafer.fail,
        total: wafer.total,
        yield: wafer.yield,
        probabilities: wafer.probabilities,
        timestamp: wafer.timestamp.toISOString(),
      };
    } catch (error: any) {
      this.logger.error(`FastAPI prediction error: ${error.message}`);
      throw new ServiceUnavailableException(
        'WaferVision AI service is not reachable. Ensure the FastAPI server is running on port 8000.',
      );
    }
  }

  async getLots(): Promise<Record<string, LotData>> {
    const wafers = await this.prisma.aiWafer.findMany({
      orderBy: { timestamp: 'asc' },
    });

    // Bulk query all associated WaferImage records to prevent N+1 queries
    const waferIds = wafers.map((w) => w.id);
    const waferImages = await this.prisma.waferImage.findMany({
      where: { aiWaferId: { in: waferIds } },
      select: {
        aiWaferId: true,
        imageType: true,
        mimeType: true,
        rawBytes: true,
      },
    });

    // Map the binary image data into on-the-fly base64 Data URLs by wafer and image type
    const imageMap = new Map<string, Map<string, string>>();
    for (const img of waferImages) {
      if (img.aiWaferId && img.rawBytes) {
        if (!imageMap.has(img.aiWaferId)) {
          imageMap.set(img.aiWaferId, new Map());
        }
        const base64Url = `data:${img.mimeType};base64,${Buffer.from(img.rawBytes).toString('base64')}`;
        imageMap.get(img.aiWaferId)!.set(img.imageType, base64Url);
      }
    }

    const lotDatabase: Record<string, LotData> = {
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

    for (const wafer of wafers) {
      if (lotDatabase[wafer.lot]) {
        const waferImagesForEntry = imageMap.get(wafer.id);
        
        lotDatabase[wafer.lot].wafers.push({
          id: wafer.id,
          name: wafer.name,
          class: wafer.class,
          confidence: wafer.confidence,
          lot: wafer.lot,
          good: wafer.good,
          fail: wafer.fail,
          total: wafer.total,
          yield: wafer.yield,
          probabilities: wafer.probabilities,
          waferImageUrl: waferImagesForEntry?.get('RAW_BIN_MAP') || null,
          overlayDataUrl: waferImagesForEntry?.get('DEFECT_MASK') || null,
          densityDataUrl: waferImagesForEntry?.get('PROCESSED_THUMBNAIL') || null,
          attentionDataUrl: waferImagesForEntry?.get('GRADCAM_OVERLAY') || null,
          timestamp: wafer.timestamp.toISOString(),
        });
      }
    }

    return lotDatabase;
  }

  async deleteWafer(lot: string, name: string) {
    try {
      const wafer = await this.prisma.aiWafer.findUnique({
        where: {
          lot_name: {
            lot,
            name,
          },
        },
      });

      if (wafer) {
        // Manually cascade delete custom related WaferImage records
        await this.prisma.waferImage.deleteMany({
          where: { aiWaferId: wafer.id },
        });

        await this.prisma.aiWafer.delete({
          where: { id: wafer.id },
        });

        // Invalidate Redis cache keys for all dashboard telemetry
        await this.redis.delWildcard('lots:*');
        await this.redis.delWildcard('summary:*');
        await this.redis.delWildcard('patterns:*');
        await this.redis.delWildcard('dashboard:lot-context:*');
        await this.redis.delWildcard('dashboard:heatmap:*');
        await this.redis.delWildcard('cost-trend:*');
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error deleting wafer ${name} from lot ${lot}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async clearLot(lotId: string) {
    try {
      const wafers = await this.prisma.aiWafer.findMany({
        where: { lot: lotId },
        select: { id: true },
      });
      
      const waferIds = wafers.map((w) => w.id);
      
      // Manually cascade delete associated WaferImages
      await this.prisma.waferImage.deleteMany({
        where: { aiWaferId: { in: waferIds } },
      });

      await this.prisma.aiWafer.deleteMany({
        where: {
          lot: lotId,
        },
      });

      // Invalidate Redis cache keys for all dashboard telemetry
      await this.redis.delWildcard('lots:*');
      await this.redis.delWildcard('summary:*');
      await this.redis.delWildcard('patterns:*');
      await this.redis.delWildcard('dashboard:lot-context:*');
      await this.redis.delWildcard('dashboard:heatmap:*');
      await this.redis.delWildcard('cost-trend:*');

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error clearing lot ${lotId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async clearAll() {
    try {
      // Clear all wafer images and predictions
      await this.prisma.waferImage.deleteMany({});
      await this.prisma.aiWafer.deleteMany({});

      // Invalidate Redis cache keys for all dashboard telemetry
      await this.redis.delWildcard('lots:*');
      await this.redis.delWildcard('summary:*');
      await this.redis.delWildcard('patterns:*');
      await this.redis.delWildcard('dashboard:lot-context:*');
      await this.redis.delWildcard('dashboard:heatmap:*');
      await this.redis.delWildcard('cost-trend:*');

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Error clearing all wafers: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getServiceStatus() {
    try {
      await axios.get(`${this.aiUrl}/`, { timeout: 3000 });
      return { online: true, url: this.aiUrl, model: 'ResNet50' };
    } catch {
      return { online: false, url: this.aiUrl, model: 'ResNet50' };
    }
  }
}
