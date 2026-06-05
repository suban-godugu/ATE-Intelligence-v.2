// d:\officw work -1\ai-1\backend\src\wafer-image\wafer-image.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WaferImage, WaferImageType, StorageBackend } from '@prisma/client';

@Injectable()
export class WaferImageService {
  private readonly logger = new Logger(WaferImageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Saves raw image bytes directly to PostgreSQL using bytea columns.
   */
  async saveToPostgres(
    waferId: string,
    imageType: WaferImageType,
    buffer: Buffer,
    mimeType: string = 'image/png',
    aiWaferId?: string | null,
  ): Promise<WaferImage> {
    this.logger.log(`Saving image of type ${imageType} for Wafer ${waferId} (Size: ${buffer.length} bytes) to Postgres.`);
    
    return this.prisma.waferImage.create({
      data: {
        waferId,
        imageType,
        rawBytes: buffer,
        mimeType,
        fileSizeBytes: buffer.length,
        storageBackend: StorageBackend.POSTGRES,
        aiWaferId: aiWaferId || null,
      },
    });
  }

  /**
   * Fetches image raw bytes from Postgres with cache-aside via Redis.
   * Leverages ioredis raw getBuffer to prevent string encoding overhead.
   */
  async getFromPostgres(imageId: string): Promise<Buffer | null> {
    const cacheKey = `wafer-img:${imageId}`;
    const redisClient = this.redisService.getClient();

    try {
      // 1. Try reading directly from Redis cache as binary Buffer
      const cachedBuffer = await redisClient.getBuffer(cacheKey);
      if (cachedBuffer) {
        this.logger.log(`Cache HIT for wafer image key: ${cacheKey}`);
        return cachedBuffer;
      }
    } catch (err) {
      this.logger.error(`Failed to read from Redis cache for key: ${cacheKey}`, err);
    }

    this.logger.log(`Cache MISS for wafer image ID: ${imageId}. Fetching from PostgreSQL.`);

    // 2. Fetch the bytea field from Postgres using Prisma
    const imageRecord = await this.prisma.waferImage.findUnique({
      where: { id: imageId },
      select: { rawBytes: true },
    });

    if (!imageRecord || !imageRecord.rawBytes) {
      this.logger.warn(`Wafer image with ID ${imageId} not found in database.`);
      return null;
    }

    const buffer = Buffer.from(imageRecord.rawBytes);

    try {
      // 3. Cache the binary Buffer in Redis with a 10-minute (600s) expiration
      await redisClient.set(cacheKey, buffer, 'EX', 600);
      this.logger.log(`Successfully cached wafer image key: ${cacheKey} in Redis.`);
    } catch (err) {
      this.logger.error(`Failed to write to Redis cache for key: ${cacheKey}`, err);
    }

    return buffer;
  }

  /**
   * Retrieves all metadata records for a given wafer, explicitly selecting
   * all columns EXCEPT the heavy rawBytes content to keep payloads light.
   */
  async getMetadataList(waferId: string): Promise<Omit<WaferImage, 'rawBytes'>[]> {
    this.logger.log(`Retrieving image metadata list for Wafer ${waferId}.`);
    
    return this.prisma.waferImage.findMany({
      where: { waferId },
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

  /**
   * Deletes the image from the database and purges its matching Redis cache entry.
   */
  async deleteImage(imageId: string): Promise<void> {
    this.logger.log(`Deleting wafer image ID: ${imageId}.`);
    
    // Check if the image exists in DB first to throw appropriate NestJS exceptions
    const exists = await this.prisma.waferImage.findUnique({
      where: { id: imageId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Wafer image with ID "${imageId}" not found.`);
    }

    // 1. Delete database record
    await this.prisma.waferImage.delete({
      where: { id: imageId },
    });

    // 2. Invalidate Redis cache
    const cacheKey = `wafer-img:${imageId}`;
    try {
      await this.redisService.getClient().del(cacheKey);
      this.logger.log(`Successfully invalidated Redis cache key: ${cacheKey}`);
    } catch (err) {
      this.logger.error(`Failed to delete Redis cache key: ${cacheKey}`, err);
    }
  }
}
