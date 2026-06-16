// d:\officw work -1\ai-1\backend\src\wafer-image\wafer-image-storage.service.ts
import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MINIO_CLIENT } from '../minio/minio.module';
import { Client } from 'minio';
import { WaferImage, WaferImageType, StorageBackend } from '@prisma/client';
import { SaveImageDto } from './dto/save-image.dto';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

@Injectable()
export class WaferImageStorageService {
  private readonly logger = new Logger(WaferImageStorageService.name);
  private readonly thresholdBytes: number;
  private readonly bucketName: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MINIO_CLIENT) private readonly minioClient: Client,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.thresholdBytes = Number(this.configService.get<number>('WAFER_IMAGE_THRESHOLD_BYTES') || 5242880); // Default 5MB
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_WAFER') || 'wafer-images';
    this.logger.log(`WaferImageStorageService initialized. S3 Threshold: ${this.thresholdBytes} bytes.`);
  }

  private async isMinioOnline(): Promise<boolean> {
    try {
      await this.minioClient.bucketExists(this.bucketName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Automatically routes the wafer image to Postgres (bytea) or MinIO (S3 object) based on size,
   * falling back to Redis if either PostgreSQL or MinIO is disconnected.
   */
  async saveImage(dto: SaveImageDto): Promise<Omit<WaferImage, 'rawBytes'>> {
    const size = dto.buffer.length;
    this.logger.log(`Processing image upload for wafer: ${dto.waferId}, type: ${dto.imageType}, size: ${size} bytes.`);

    // 1. Get image metadata (width/height) using sharp
    let width: number | null = null;
    let height: number | null = null;
    try {
      const metadata = await sharp(dto.buffer).metadata();
      width = metadata.width || null;
      height = metadata.height || null;
    } catch (err: any) {
      this.logger.warn(`Failed to extract image metadata using sharp: ${err.message}`);
    }

    const isDbOnline = this.prisma.isOnline();
    const isS3Online = await this.isMinioOnline();
    const imageId = randomUUID();

    // Fallback Case A: Database is down
    if (!isDbOnline) {
      this.logger.warn(`PostgreSQL is offline. Storing wafer image and metadata inside Redis fallback.`);
      const redisKey = `fallback:wafer-image-bytes:${imageId}`;
      
      // Store raw Buffer in Redis with a 7-day TTL (604800 seconds)
      await this.redisService.setBuffer(redisKey, dto.buffer, 604800);
      
      const meta = {
        id: imageId,
        waferId: dto.waferId,
        aiWaferId: dto.aiWaferId || null,
        imageType: dto.imageType,
        storageBackend: 'MINIO' as StorageBackend,
        storageKey: `redis://${redisKey}`,
        mimeType: dto.mimeType,
        fileSizeBytes: size,
        width,
        height,
        createdAt: new Date(),
      };
      
      await this.redisService.set(`fallback:wafer-image-meta:${imageId}`, JSON.stringify(meta));
      await this.redisService.lpush('fallback:wafer-images_list', imageId);
      
      return meta;
    }

    // Fallback Case B: Database is online, but large wafer image needs MinIO which is offline
    if (size >= this.thresholdBytes && !isS3Online) {
      this.logger.warn(`MinIO is offline for large wafer image (${size} bytes). Routing binary payload to Redis fallback.`);
      const redisKey = `fallback:wafer-image-bytes:${imageId}`;
      
      // Store raw Buffer in Redis with a 7-day TTL (604800 seconds)
      await this.redisService.setBuffer(redisKey, dto.buffer, 604800);
      
      const savedRecord = await this.prisma.waferImage.create({
        data: {
          id: imageId,
          waferId: dto.waferId,
          aiWaferId: dto.aiWaferId || null,
          imageType: dto.imageType,
          storageBackend: 'MINIO' as StorageBackend,
          storageKey: `redis://${redisKey}`,
          mimeType: dto.mimeType,
          fileSizeBytes: size,
          width,
          height,
        },
        select: {
          id: true,
          waferId: true,
          aiWaferId: true,
          imageType: true,
          storageBackend: true,
          storageKey: true,
          mimeType: true,
          fileSizeBytes: true,
          width: true,
          height: true,
          createdAt: true,
        },
      });
      
      return savedRecord;
    }

    // Standard Case: System is online
    let backend: StorageBackend;
    let rawBytes: Buffer | null = null;
    let storageKey: string | null = null;

    if (size < this.thresholdBytes) {
      this.logger.log(`Image size ${size} < threshold ${this.thresholdBytes}. Storing inside PostgreSQL.`);
      backend = StorageBackend.POSTGRES;
      rawBytes = dto.buffer;
      storageKey = null;
    } else {
      this.logger.log(`Image size ${size} >= threshold ${this.thresholdBytes}. Uploading to S3-compatible MinIO.`);
      backend = StorageBackend.MINIO;
      rawBytes = null;
      storageKey = `wafers/${dto.waferId}/${dto.imageType}/${randomUUID()}.png`;

      await this.minioClient.putObject(
        this.bucketName,
        storageKey,
        dto.buffer,
        size,
        { 'Content-Type': dto.mimeType }
      );
      this.logger.log(`Successfully uploaded object to MinIO S3. Key: ${storageKey}`);
    }

    const savedRecord = await this.prisma.waferImage.upsert({
      where: {
        waferId_imageType: {
          waferId: dto.waferId,
          imageType: dto.imageType,
        },
      },
      update: {
        aiWaferId: dto.aiWaferId || null,
        storageBackend: backend,
        rawBytes,
        storageKey,
        mimeType: dto.mimeType,
        fileSizeBytes: size,
        width,
        height,
      },
      create: {
        waferId: dto.waferId,
        aiWaferId: dto.aiWaferId || null,
        imageType: dto.imageType,
        storageBackend: backend,
        rawBytes,
        storageKey,
        mimeType: dto.mimeType,
        fileSizeBytes: size,
        width,
        height,
      },
      select: {
        id: true,
        waferId: true,
        aiWaferId: true,
        imageType: true,
        storageBackend: true,
        storageKey: true,
        mimeType: true,
        fileSizeBytes: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    return savedRecord;
  }

  /**
   * Retrieves image bytes from PostgreSQL, S3, or Redis fallback, caching results as base64 in Redis.
   */
  async getImageBuffer(imageId: string): Promise<Buffer> {
    const cacheKey = `wafer-img-buf:${imageId}`;

    // 1. Check Redis cache-aside (stored as base64 string)
    try {
      const cachedBase64 = await this.redisService.get(cacheKey);
      if (cachedBase64) {
        this.logger.log(`Image buffer cache HIT inside Redis for key: ${cacheKey}`);
        return Buffer.from(cachedBase64, 'base64');
      }
    } catch (err) {
      this.logger.error(`Redis read failure for key: ${cacheKey}`, err);
    }

    // 2. Fetch record from database or Redis fallback
    let record: any = null;
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        record = await this.prisma.waferImage.findUnique({
          where: { id: imageId },
        });
      } catch {}
    }

    if (!record) {
      try {
        const rawMeta = await this.redisService.get(`fallback:wafer-image-meta:${imageId}`);
        if (rawMeta) {
          record = JSON.parse(rawMeta);
        }
      } catch {}
    }

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found.`);
    }

    let buffer: Buffer;

    // 3. Retrieve binary data from appropriate backend
    if (record.storageKey && record.storageKey.startsWith('redis://')) {
      const redisKey = record.storageKey.replace('redis://', '');
      this.logger.log(`Retrieving wafer image ID ${imageId} bytes from Redis fallback key: ${redisKey}`);
      const fallbackBytes = await this.redisService.getBuffer(redisKey);
      if (!fallbackBytes) {
        throw new NotFoundException(`Redis fallback bytes are empty/expired for image ${imageId}.`);
      }
      buffer = fallbackBytes;
    } else if (record.storageBackend === StorageBackend.POSTGRES) {
      if (!record.rawBytes) {
        throw new NotFoundException(`PostgreSQL raw bytes are empty for image ${imageId}.`);
      }
      this.logger.log(`Retrieving wafer image ID ${imageId} bytes from PostgreSQL.`);
      buffer = Buffer.from(record.rawBytes);
    } else {
      if (!record.storageKey) {
        throw new Error(`MinIO storage key is missing for image ${imageId}.`);
      }

      const isMinioUp = await this.isMinioOnline();
      if (!isMinioUp) {
        this.logger.log(`MinIO is offline. Attempting to retrieve wafer image ID ${imageId} from Redis backup.`);
        const fallbackBytes = await this.redisService.getBuffer(`fallback:wafer-image-bytes:${imageId}`);
        if (fallbackBytes) {
          buffer = fallbackBytes;
        } else {
          throw new Error(`MinIO is offline and no Redis backup exists for image ${imageId}.`);
        }
      } else {
        this.logger.log(`Streaming wafer image ID ${imageId} bytes from MinIO S3. Key: ${record.storageKey}`);
        const dataStream = await this.minioClient.getObject(this.bucketName, record.storageKey);
        buffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          dataStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          dataStream.on('end', () => resolve(Buffer.concat(chunks)));
          dataStream.on('error', (err) => reject(err));
        });
      }
    }

    // 4. Set in Redis cache (store as base64 string with 10 minutes expiration)
    try {
      const base64Str = buffer.toString('base64');
      await this.redisService.set(cacheKey, base64Str, 600);
      this.logger.log(`Cached image buffer key: ${cacheKey} inside Redis.`);
    } catch (err) {
      this.logger.error(`Failed to cache image buffer key: ${cacheKey} inside Redis`, err);
    }

    return buffer;
  }

  /**
   * Retrieves or generates presigned GET access URLs, falling back to local proxy endpoints if MinIO is down.
   */
  async getAccessUrl(imageId: string): Promise<string> {
    let record: any = null;
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        record = await this.prisma.waferImage.findUnique({
          where: { id: imageId },
          select: { id: true, storageBackend: true, storageKey: true },
        });
      } catch {}
    }

    if (!record) {
      try {
        const rawMeta = await this.redisService.get(`fallback:wafer-image-meta:${imageId}`);
        if (rawMeta) {
          record = JSON.parse(rawMeta);
        }
      } catch {}
    }

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found.`);
    }

    // For local Postgres database store or Redis fallback keys, route via our raw HTTP proxy stream
    if (record.storageKey && record.storageKey.startsWith('redis://')) {
      return `/api/wafer-images/${record.id}/raw`;
    }

    if (record.storageBackend === StorageBackend.POSTGRES) {
      return `/api/wafer-images/${record.id}/raw`;
    }

    // Check if MinIO is reachable
    const isMinioUp = await this.isMinioOnline();
    if (!isMinioUp) {
      this.logger.log(`MinIO offline. Routing image URL through local raw HTTP proxy stream.`);
      return `/api/wafer-images/${record.id}/raw`;
    }

    const cacheKey = `wafer-url:${imageId}`;
    try {
      const cachedUrl = await this.redisService.get(cacheKey);
      if (cachedUrl) {
        this.logger.log(`URL cache HIT inside Redis for key: ${cacheKey}`);
        return cachedUrl;
      }
    } catch (err) {
      this.logger.error(`Redis read failure for S3 URL key: ${cacheKey}`, err);
    }

    if (!record.storageKey) {
      throw new Error(`MinIO storage key is missing for image ${imageId}.`);
    }

    this.logger.log(`Generating presigned S3 GET URL for MinIO image ID ${imageId}.`);
    const presignedUrl = await this.minioClient.presignedGetObject(this.bucketName, record.storageKey, 3600);

    try {
      await this.redisService.set(cacheKey, presignedUrl, 55 * 60);
      this.logger.log(`Cached presigned URL key: ${cacheKey} in Redis.`);
    } catch (err) {
      this.logger.error(`Failed to cache presigned URL key: ${cacheKey} inside Redis`, err);
    }

    return presignedUrl;
  }

  /**
   * Deletes database records, S3 objects, and flushes Redis fallback keys.
   */
  async deleteImage(imageId: string): Promise<void> {
    this.logger.log(`Initiating deletion for wafer image ID: ${imageId}.`);

    let record: any = null;
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        record = await this.prisma.waferImage.findUnique({
          where: { id: imageId },
          select: { id: true, storageBackend: true, storageKey: true },
        });
      } catch {}
    }

    if (!record) {
      try {
        const rawMeta = await this.redisService.get(`fallback:wafer-image-meta:${imageId}`);
        if (rawMeta) {
          record = JSON.parse(rawMeta);
        }
      } catch {}
    }

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found.`);
    }

    // 1. If MinIO S3 backend, remove the object from S3 if online
    if (record.storageBackend === StorageBackend.MINIO && record.storageKey && !record.storageKey.startsWith('redis://')) {
      const isMinioUp = await this.isMinioOnline();
      if (isMinioUp) {
        try {
          this.logger.log(`Deleting MinIO S3 object. Key: ${record.storageKey}`);
          await this.minioClient.removeObject(this.bucketName, record.storageKey);
        } catch (err: any) {
          this.logger.warn(`Failed to delete S3 object: ${err.message}`);
        }
      }
    }

    // 2. Clean Redis fallback keys
    try {
      await this.redisService.del(`fallback:wafer-image-bytes:${imageId}`);
      await this.redisService.del(`fallback:wafer-image-meta:${imageId}`);
      const client = this.redisService.getClient();
      await client.lrem('fallback:wafer-images_list', 0, imageId);
    } catch {}

    // 3. Delete database record if online
    if (isDbOnline) {
      try {
        await this.prisma.waferImage.delete({
          where: { id: imageId },
        });
        this.logger.log('Database record deleted successfully.');
      } catch {}
    }

    // 4. Invalidate Redis cache keys
    try {
      await this.redisService.del(`wafer-img-buf:${imageId}`);
      await this.redisService.del(`wafer-url:${imageId}`);
      this.logger.log('Successfully invalidated Redis cache keys.');
    } catch (err) {
      this.logger.error(`Failed to clear cache keys for image ID: ${imageId}`, err);
    }
  }

  /**
   * Queries metadata lists for a wafer, merging database records and Redis fallback entries.
   */
  async getMetadataByWafer(waferId: string, imageType?: WaferImageType): Promise<Omit<WaferImage, 'rawBytes'>[]> {
    this.logger.log(`Retrieving wafer image metadata lists for Wafer ${waferId}.`);
    
    let records: any[] = [];
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        const where: any = { waferId };
        if (imageType) {
          where.imageType = imageType;
        }
        records = await this.prisma.waferImage.findMany({
          where,
          select: {
            id: true,
            waferId: true,
            aiWaferId: true,
            imageType: true,
            storageBackend: true,
            storageKey: true,
            mimeType: true,
            fileSizeBytes: true,
            width: true,
            height: true,
            createdAt: true,
          },
        });
      } catch {}
    }

    try {
      const redisIds = await this.redisService.lrange('fallback:wafer-images_list', 0, -1);
      const redisMeta: any[] = [];
      for (const imgId of redisIds) {
        const raw = await this.redisService.get(`fallback:wafer-image-meta:${imgId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.waferId === waferId && (!imageType || parsed.imageType === imageType)) {
            redisMeta.push(parsed);
          }
        }
      }
      const mappedDbRecords = records.map(r => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      }));
      return [...redisMeta, ...mappedDbRecords];
    } catch {
      return records;
    }
  }

  async getImageMetaFromRedis(imageId: string): Promise<any> {
    try {
      const raw = await this.redisService.get(`fallback:wafer-image-meta:${imageId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
