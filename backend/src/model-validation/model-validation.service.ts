// d:\officw work -1\ai-1\backend\src\model-validation\model-validation.service.ts
import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { ValidationReportDto } from './dto/validation-report.dto';
 
@Injectable()
export class ModelValidationService {
  private readonly logger = new Logger(ModelValidationService.name);
  private readonly fastapi: AxiosInstance;
 
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue('model-validation') private readonly validationQueue: Queue,
  ) {
    this.fastapi = axios.create({
      baseURL: process.env.FASTAPI_URL ?? 'http://localhost:8000',
      timeout: 60_000,
    });
  }
 
  // ── Single file validate ──────────────────────────────────────────────────
  async validateFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ) {
    // 1. Forward to FastAPI validator
    const form = new FormData();
    form.append('file', buffer, { filename: originalName, contentType: mimeType });
 
    let report: ValidationReportDto;
    try {
      const { data } = await this.fastapi.post<ValidationReportDto>(
        '/validate/upload',
        form,
        { headers: form.getHeaders() },
      );
      report = data;
    } catch (err: any) {
      this.logger.error('FastAPI validation failed', err?.message);
      throw new BadGatewayException('AI validation service unavailable');
    }
 
    // 2. Persist to PostgreSQL or Redis fallback
    const isDbOnline = this.prisma.isOnline();
    let savedId = report.validation_id;

    if (isDbOnline) {
      try {
        const saved = await this.prisma.validationReport.create({
          data: {
            validationId:       report.validation_id,
            filename:           report.filename,
            fileSizeBytes:      report.file_size_bytes,
            fileCategory:       report.file_category,
            dataType:           report.data_type,
            status:             report.status,
            confidenceScore:    report.confidence_score,
            rowCount:           report.row_count ?? null,
            columnCount:        report.column_count ?? null,
            imageWidth:         report.image_width ?? null,
            imageHeight:        report.image_height ?? null,
            imageChannels:      report.image_channels ?? null,
            issueCount:         report.issues.length,
            errorCount:         report.issues.filter(i => i.severity === 'error').length,
            warningCount:       report.issues.filter(i => i.severity === 'warning').length,
            recommendedPipeline: report.recommended_pipeline,
            reportJson:         JSON.stringify(report),
            triggerPrediction:  report.trigger_prediction,
            createdAt:          new Date(report.timestamp),
          },
        });
        savedId = saved.id;
      } catch (err: any) {
        this.logger.warn(`Failed writing validation report to Postgres: ${err.message}. Swapping to Redis fallback.`);
        await this.saveValidationReportToRedis(report);
      }
    } else {
      await this.saveValidationReportToRedis(report);
    }
 
    this.logger.log(
      `Validation ${report.status} — ${report.filename} ` +
      `(${report.data_type}, confidence ${report.confidence_score})`,
    );
 
    // 3. Enqueue prediction job if validation passed / warned
    if (report.trigger_prediction) {
      try {
        await this.validationQueue.add(
          'run-prediction',
          {
            validationId:        savedId,
            validationReportId:  report.validation_id,
            recommendedPipeline: report.recommended_pipeline,
            filename:            report.filename,
            dataType:            report.data_type,
            fileCategory:        report.file_category,
            metadata:            report.metadata,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        );
        this.logger.log(`Queued prediction job for ${report.filename}`);
      } catch (err: any) {
        this.logger.warn(`Failed queueing prediction job (BullMQ/Redis is likely down or disconnected): ${err.message}`);
      }
    }
 
    return { report, savedId };
  }

  private async saveValidationReportToRedis(report: any): Promise<any> {
    const data = {
      id: report.validation_id,
      validationId: report.validation_id,
      filename: report.filename,
      fileSizeBytes: report.file_size_bytes ?? 0,
      fileCategory: report.file_category ?? 'unknown',
      dataType: report.data_type ?? 'unknown',
      status: report.status,
      confidenceScore: report.confidence_score ?? 0,
      rowCount: report.row_count ?? null,
      columnCount: report.column_count ?? null,
      imageWidth: report.image_width ?? null,
      imageHeight: report.image_height ?? null,
      imageChannels: report.image_channels ?? null,
      issueCount: (report.issues ?? []).length,
      errorCount: (report.issues ?? []).filter((i: any) => i.severity === 'error').length,
      warningCount: (report.issues ?? []).filter((i: any) => i.severity === 'warning').length,
      recommendedPipeline: report.recommended_pipeline ?? '',
      reportJson: JSON.stringify(report),
      triggerPrediction: report.trigger_prediction ?? false,
      createdAt: new Date(report.timestamp || Date.now()).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.redis.set(`fallback:validationReport:${report.validation_id}`, JSON.stringify(data));
    await this.redis.lpush('fallback:validationReports_list', report.validation_id);
    return data;
  }
 
  // ── Batch files ───────────────────────────────────────────────────────────
  async validateBatch(
    files: Array<{ buffer: Buffer; originalname: string; mimetype: string }>,
  ) {
    const form = new FormData();
    for (const f of files) {
      form.append('files', f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
 
    let reports: ValidationReportDto[];
    try {
      const { data } = await this.fastapi.post<{ count: number; results: ValidationReportDto[] }>(
        '/validate/upload-batch',
        form,
        { headers: form.getHeaders() },
      );
      reports = data.results;
    } catch (err: any) {
      throw new BadGatewayException('AI validation service unavailable');
    }
 
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        await Promise.all(
          reports.map(report =>
            this.prisma.validationReport.create({
              data: {
                validationId:        (report as any).validation_id ?? 'batch',
                filename:            report.filename,
                fileSizeBytes:       report.file_size_bytes ?? 0,
                fileCategory:        report.file_category ?? 'unknown',
                dataType:            report.data_type ?? 'unknown',
                status:              report.status,
                confidenceScore:     report.confidence_score ?? 0,
                issueCount:          (report.issues ?? []).length,
                errorCount:          (report.issues ?? []).filter(i => i.severity === 'error').length,
                warningCount:        (report.issues ?? []).filter(i => i.severity === 'warning').length,
                recommendedPipeline: report.recommended_pipeline ?? '',
                reportJson:          JSON.stringify(report),
                triggerPrediction:   report.trigger_prediction ?? false,
              },
            }),
          ),
        );
      } catch (err: any) {
        this.logger.warn(`Failed writing validation batch to Postgres: ${err.message}. Swapping to Redis fallback.`);
        await Promise.all(reports.map(report => this.saveValidationReportToRedis(report)));
      }
    } else {
      await Promise.all(reports.map(report => this.saveValidationReportToRedis(report)));
    }
 
    return { count: reports.length, results: reports };
  }
 
  // ── History ───────────────────────────────────────────────────────────────
  async getHistory(limit = 50, offset = 0) {
    let items: any[] = [];
    let total = 0;
    const isDbOnline = this.prisma.isOnline();

    if (isDbOnline) {
      try {
        [items, total] = await Promise.all([
          this.prisma.validationReport.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            select: {
              id: true,
              validationId: true,
              filename: true,
              fileCategory: true,
              dataType: true,
              status: true,
              confidenceScore: true,
              rowCount: true,
              issueCount: true,
              errorCount: true,
              warningCount: true,
              recommendedPipeline: true,
              triggerPrediction: true,
              createdAt: true,
            },
          }),
          this.prisma.validationReport.count(),
        ]);
      } catch {}
    }

    try {
      const redisIds = await this.redis.lrange('fallback:validationReports_list', 0, -1);
      const redisItems: any[] = [];
      for (const valId of redisIds) {
        const raw = await this.redis.get(`fallback:validationReport:${valId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed.reportJson;
          redisItems.push(parsed);
        }
      }

      const mappedDbItems = items.map(i => ({
        ...i,
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
      }));
      const merged = [...redisItems, ...mappedDbItems];
      const sliced = merged.slice(offset, offset + limit);

      return {
        items: sliced,
        total: total + redisItems.length,
        limit,
        offset,
      };
    } catch {
      return { items, total, limit, offset };
    }
  }
 
  async getReportDetail(id: string) {
    const isDbOnline = this.prisma.isOnline();
    if (isDbOnline) {
      try {
        const record = await this.prisma.validationReport.findUnique({ where: { id } });
        if (record) {
          return {
            ...record,
            reportJson: JSON.parse(record.reportJson as string),
          };
        }
      } catch {}
    }

    try {
      const raw = await this.redis.get(`fallback:validationReport:${id}`);
      if (raw) {
        const record = JSON.parse(raw);
        return {
          ...record,
          reportJson: JSON.parse(record.reportJson as string),
        };
      }
    } catch {}

    return null;
  }
}
