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

  /**
   * Automatically routes the wafer image to Postgres (bytea) or MinIO (S3 object) based on size.
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

    let backend: StorageBackend;
    let rawBytes: Buffer | null = null;
    let storageKey: string | null = null;

    // 2. Size Routing: Postgres bytea (< 5MB) or MinIO S3 (>= 5MB)
    if (size < this.thresholdBytes) {
      this.logger.log(`Image size ${size} < threshold ${this.thresholdBytes}. Storing inside PostgreSQL.`);
      backend = StorageBackend.POSTGRES;
      rawBytes = dto.buffer;
      storageKey = null;
    } else {
      this.logger.log(`Image size ${size} >= threshold ${this.thresholdBytes}. Uploading to S3-compatible MinIO.`);
      backend = StorageBackend.MINIO;
      rawBytes = null;
      // Define S3 storage key hierarchy
      storageKey = `wafers/${dto.waferId}/${dto.imageType}/${randomUUID()}.png`;

      // Upload raw Buffer directly to MinIO
      await this.minioClient.putObject(
        this.bucketName,
        storageKey,
        dto.buffer,
        size,
        { 'Content-Type': dto.mimeType }
      );
      this.logger.log(`Successfully uploaded object to MinIO S3. Key: ${storageKey}`);
    }

    // 3. Upsert record in database matching compound unique constraint waferId_imageType
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
   * Retrieves image bytes from PostgreSQL or streams from S3, caching the results as base64 in Redis.
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

    // 2. Fetch record from database to identify backend
    const record = await this.prisma.waferImage.findUnique({
      where: { id: imageId },
    });

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found in database.`);
    }

    let buffer: Buffer;

    // 3. Retrieve binary data from appropriate storage backend
    if (record.storageBackend === StorageBackend.POSTGRES) {
      if (!record.rawBytes) {
        throw new NotFoundException(`PostgreSQL raw bytes are empty for image ${imageId}.`);
      }
      this.logger.log(`Retrieving wafer image ID ${imageId} bytes from PostgreSQL.`);
      buffer = Buffer.from(record.rawBytes);
    } else {
      if (!record.storageKey) {
        throw new Error(`MinIO storage key is missing for image ${imageId}.`);
      }
      this.logger.log(`Streaming wafer image ID ${imageId} bytes from MinIO S3. Key: ${record.storageKey}`);
      
      // Stream S3 objects from MinIO client and aggregate chunks to Buffer
      const dataStream = await this.minioClient.getObject(this.bucketName, record.storageKey);
      buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        dataStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        dataStream.on('end', () => resolve(Buffer.concat(chunks)));
        dataStream.on('error', (err) => reject(err));
      });
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
   * Retrieves or generates presigned GET access URLs (caches S3 URLs for 55min).
   */
  async getAccessUrl(imageId: string): Promise<string> {
    // 1. Fetch backend type
    const record = await this.prisma.waferImage.findUnique({
      where: { id: imageId },
      select: { id: true, storageBackend: true, storageKey: true },
    });

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found in database.`);
    }

    // A. For POSTGRES backend, return local HTTP proxy endpoint
    if (record.storageBackend === StorageBackend.POSTGRES) {
      return `/api/wafer-images/${record.id}/raw`;
    }

    // B. For MINIO backend, check Redis S3 URL cache (TTL 55 minutes)
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

    // Generate fresh presigned GET URL valid for 3600 seconds (1 hour)
    this.logger.log(`Generating presigned S3 GET URL for MinIO image ID ${imageId}.`);
    const presignedUrl = await this.minioClient.presignedGetObject(this.bucketName, record.storageKey, 3600);

    // Cache pre-signed S3 URL in Redis for 55 minutes to prevent client-side expirations
    try {
      await this.redisService.set(cacheKey, presignedUrl, 55 * 60);
      this.logger.log(`Cached presigned URL key: ${cacheKey} in Redis.`);
    } catch (err) {
      this.logger.error(`Failed to cache presigned URL key: ${cacheKey} inside Redis`, err);
    }

    return presignedUrl;
  }

  /**
   * Deletes database records, S3 objects, and flushes Redis cache keys.
   */
  async deleteImage(imageId: string): Promise<void> {
    this.logger.log(`Initiating deletion for wafer image ID: ${imageId}.`);

    // 1. Fetch metadata record
    const record = await this.prisma.waferImage.findUnique({
      where: { id: imageId },
      select: { id: true, storageBackend: true, storageKey: true },
    });

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found in database.`);
    }

    // 2. If MinIO S3 backend, remove the object from S3
    if (record.storageBackend === StorageBackend.MINIO && record.storageKey) {
      this.logger.log(`Deleting MinIO S3 object. Key: ${record.storageKey}`);
      await this.minioClient.removeObject(this.bucketName, record.storageKey);
      this.logger.log('S3 object deleted successfully.');
    }

    // 3. Delete database record
    await this.prisma.waferImage.delete({
      where: { id: imageId },
    });
    this.logger.log('Database record deleted successfully.');

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
   * Queries metadata lists for a wafer, selecting all columns except the heavy binary rawBytes.
   */
  async getMetadataByWafer(waferId: string, imageType?: WaferImageType): Promise<Omit<WaferImage, 'rawBytes'>[]> {
    this.logger.log(`Retrieving wafer image metadata lists for Wafer ${waferId}.`);
    
    const where: any = { waferId };
    if (imageType) {
      where.imageType = imageType;
    }

    return this.prisma.waferImage.findMany({
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
  }
}
