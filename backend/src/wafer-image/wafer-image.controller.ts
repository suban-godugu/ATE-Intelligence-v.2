// d:\officw work -1\ai-1\backend\src\wafer-image\wafer-image.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Query, 
  Body, 
  Res, 
  HttpStatus, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException, 
  NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { WaferImageStorageService } from './wafer-image-storage.service';
import { SaveImageDto } from './dto/save-image.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { WaferImageType, StorageBackend } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import * as express from 'express';

@Controller('wafer-images')
export class WaferImageController {
  constructor(
    private readonly storageService: WaferImageStorageService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Uploads and routes wafer images dynamically to S3 or Postgres based on file size.
   * Limits maximum file uploads to 100MB.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { waferId: string; aiWaferId?: string; imageType: WaferImageType },
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided in multipart "file" field.');
    }
    if (!body.waferId || !body.imageType) {
      throw new BadRequestException('Missing required fields: "waferId" and "imageType" must be supplied.');
    }

    const saveImageDto: SaveImageDto = {
      waferId: body.waferId,
      aiWaferId: body.aiWaferId || null,
      imageType: body.imageType,
      buffer: file.buffer,
      mimeType: file.mimetype,
    };

    return this.storageService.saveImage(saveImageDto);
  }

  /**
   * Streams raw image bytes directly to clients.
   * Sets appropriate Content-Type and inline Content-Disposition headers.
   */
  @Get(':id/raw')
  async getRawImage(
    @Param('id') id: string,
    @Res() res: express.Response,
  ): Promise<express.Response> {
    let record: any = null;
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        record = await this.prisma.waferImage.findUnique({
          where: { id },
          select: { mimeType: true, imageType: true },
        });
      } catch {}
    }

    if (!record) {
      try {
        record = await this.storageService.getImageMetaFromRedis(id);
      } catch {}
    }

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${id}" not found.`);
    }

    // Retrieve binary image Buffer (resolves from Postgres bytea, streams from MinIO, or fallback from Redis)
    const buffer = await this.storageService.getImageBuffer(id);

    const filename = `wafer-${id}-${record.imageType.toLowerCase()}.png`;

    res.setHeader('Content-Type', record.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day client cache
    
    return res.status(HttpStatus.OK).send(buffer);
  }

  /**
   * Generates or fetches pre-signed S3 access URLs.
   * Identifies storage backend (POSTGRES or MINIO) and supplies expiration dates.
   */
  @Get(':id/url')
  async getAccessUrl(@Param('id') id: string) {
    let record: any = null;
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        record = await this.prisma.waferImage.findUnique({
          where: { id },
          select: { storageBackend: true },
        });
      } catch {}
    }

    if (!record) {
      try {
        record = await this.storageService.getImageMetaFromRedis(id);
      } catch {}
    }

    if (!record) {
      throw new NotFoundException(`Wafer image with ID "${id}" not found.`);
    }

    const url = await this.storageService.getAccessUrl(id);

    // Compute exact pre-signed S3 URL expiration datetime
    let expiresAt: string | null = null;
    if (record.storageBackend === StorageBackend.MINIO) {
      const durationSeconds = Number(this.configService.get<number>('MINIO_PRESIGNED_URL_EXPIRY') || 3600);
      expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    }

    return {
      url,
      expiresAt,
      backend: record.storageBackend,
    };
  }

  /**
   * Retrieves image metadata lists for a wafer, supporting optional image type filtering.
   */
  @Get('wafer/:id')
  async getMetadataByWafer(
    @Param('id') waferId: string,
    @Query('imageType') imageType?: WaferImageType,
  ) {
    return this.storageService.getMetadataByWafer(waferId, imageType);
  }

  /**
   * Deletes database records, S3 objects, and flushes Redis cache keys.
   * Requires JWT Authorization Bearer Token.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteImage(@Param('id') id: string) {
    await this.storageService.deleteImage(id);
    return {
      success: true,
      message: `Wafer image "${id}" successfully deleted from storage engine and caches.`,
    };
  }
}
