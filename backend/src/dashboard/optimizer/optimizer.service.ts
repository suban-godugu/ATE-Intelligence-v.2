import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { OptimizeRequestDto } from './optimizer.dto';
import { randomUUID } from 'crypto';
import { JobStatus } from '@prisma/client';

@Injectable()
export class OptimizerService {
  private readonly logger = new Logger(OptimizerService.name);

  constructor(
    @InjectQueue('optimization') private readonly optimizationQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async submit(dto: OptimizeRequestDto): Promise<{ jobId: string; status: JobStatus }> {
    const jobId = randomUUID(); // Pre-generate custom unique ID
    this.logger.log(`Submitting optimization job for lot: ${dto.lotId}, generated JobId: ${jobId}`);

    // Fetch redis connection options to pass to the sandboxed worker child process
    const redisOptions = {
      host: this.configService.get<string>('redis.host') || 'localhost',
      port: this.configService.get<number>('redis.port') || 6379,
    };

    // 1. Persist optimization job to PostgreSQL
    await this.prisma.optimizationJob.create({
      data: {
        jobId,
        lotId: dto.lotId,
        fabId: dto.fabId,
        constraints: dto.constraints as any,
        status: JobStatus.QUEUED,
      },
    });

    // 2. Enqueue job to BullMQ
    await this.optimizationQueue.add(
      'optimize',
      {
        jobId,
        lotId: dto.lotId,
        fabId: dto.fabId,
        constraints: dto.constraints,
        redisOptions,
      },
      {
        jobId, // Set explicit BullMQ jobId to map cleanly
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );

    return { jobId, status: JobStatus.QUEUED };
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.prisma.optimizationJob.findUnique({
      where: { jobId },
    });

    if (!job) {
      throw new NotFoundException(`Optimization job not found with ID: ${jobId}`);
    }

    const results = job.results as any;

    return {
      jobId: job.jobId,
      lotId: job.lotId,
      fabId: job.fabId,
      constraints: job.constraints,
      status: job.status,
      results: results || null,
      optimizedPatternSet: results?.optimizedPatternSet || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
