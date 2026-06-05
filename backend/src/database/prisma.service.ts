// d:\officw work -1\ai-1\backend\src\database\prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection initialized successfully via Prisma Client.');
    } catch (error) {
      this.logger.error('Failed to connect to the database on module initialization.', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Database connection disconnected cleanly.');
    } catch (error) {
      this.logger.error('Error during database disconnection on module destruction.', error);
    }
  }

  /**
   * Performs a simple SQL raw execution check ('SELECT 1') to verify database engine health.
   */
  async healthCheck(): Promise<number> {
    const result = await this.$executeRawUnsafe('SELECT 1');
    return result;
  }
}
