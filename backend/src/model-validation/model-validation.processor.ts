// d:\officw work -1\ai-1\backend\src\model-validation\model-validation.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
 
interface ValidationJobData {
  validationId: string;
  validationReportId: string;
  recommendedPipeline: string;
  filename: string;
  dataType: string;
  fileCategory: string;
  metadata: Record<string, any>;
}
 
@Processor('model-validation')
@Injectable()
export class ModelValidationProcessor extends WorkerHost {
  private readonly logger = new Logger(ModelValidationProcessor.name);
 
  constructor(private readonly prisma: PrismaService) {
    super();
  }
 
  async process(job: Job<ValidationJobData, any, string>): Promise<any> {
    const { validationId, filename, recommendedPipeline, dataType } = job.data;
    this.logger.log(`[BullMQ Worker] Starting prediction pipeline for file: ${filename} (ID: ${validationId})`);
    this.logger.log(`[BullMQ Worker] Targeting pipeline endpoint: ${recommendedPipeline}`);
 
    try {
      // Simulate pipeline latency
      await new Promise(resolve => setTimeout(resolve, 2000));
 
      // Update validation report in PostgreSQL to show it successfully triggered predictions
      await this.prisma.validationReport.update({
        where: { id: validationId },
        data: {
          triggerPrediction: false, // reset trigger state once processed
        },
      });
 
      this.logger.log(`[BullMQ Worker] Successfully completed prediction trigger for ${filename}.`);
      return { success: true, processedAt: new Date().toISOString() };
    } catch (error: any) {
      this.logger.error(`[BullMQ Worker] Failed to run prediction pipeline for ${filename}`, error.stack);
      throw error;
    }
  }
}
