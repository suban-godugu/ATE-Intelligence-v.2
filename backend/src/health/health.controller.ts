// d:\officw work -1\ai-1\backend\src\health\health.controller.ts
import { Controller, Get, Res, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as express from 'express';
import { Client } from 'minio';
import { PrismaService } from '../database/prisma.service';
import { MINIO_CLIENT } from '../minio/minio.module';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MINIO_CLIENT) private readonly minioClient: Client,
    private readonly configService: ConfigService,
  ) {}

  @Get('db')
  async checkDatabaseHealth(@Res() res: express.Response): Promise<express.Response> {
    try {
      // Execute the database health ping query SELECT 1 as requested
      await this.prisma.$queryRaw`SELECT 1`;
      
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        db: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Return 503 Service Unavailable with the exact failure payload requested
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        db: 'disconnected',
      });
    }
  }

  @Get('minio')
  async checkMinioHealth(@Res() res: express.Response): Promise<express.Response> {
    const bucket = this.configService.get<string>('MINIO_BUCKET_WAFER') || 'wafer-images';
    try {
      // Validate MinIO connection health via bucket existence check
      await this.minioClient.bucketExists(bucket);
      
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        minio: 'connected',
        bucket,
      });
    } catch (error) {
      // Return 503 Service Unavailable with the exact failure payload requested
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        minio: 'disconnected',
      });
    }
  }
}
