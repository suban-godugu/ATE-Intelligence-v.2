// d:\officw work -1\ai-1\backend\src\database\prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isDbOnline = false;
  private checkInterval: any = null;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : [],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.isDbOnline = true;
      this.logger.log('Database connection initialized successfully via Prisma Client.');
    } catch (error: any) {
      this.isDbOnline = false;
      this.logger.warn(`Failed to connect to the database on module initialization (${error.message || error}). Fallback mode is active.`);
    }

    // Polling database status every 15 seconds to automatically recover when DB comes back online
    this.checkInterval = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`;
        if (!this.isDbOnline) {
          this.isDbOnline = true;
          this.logger.log('Database connection recovered. PostgreSQL is back online.');
        }
      } catch (err) {
        if (this.isDbOnline) {
          this.isDbOnline = false;
          this.logger.warn('Database connection lost. Switched to fallback mode.');
        }
      }
    }, 15000);
    
    if (this.checkInterval && typeof this.checkInterval.unref === 'function') {
      this.checkInterval.unref();
    }
  }

  async onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    try {
      await this.$disconnect();
      this.logger.log('Database connection disconnected cleanly.');
    } catch (error) {
      this.logger.error('Error during database disconnection on module destruction.', error);
    }
  }

  /**
   * Returns whether PostgreSQL database is online.
   */
  isOnline(): boolean {
    return this.isDbOnline;
  }

  /**
   * Performs a simple SQL raw execution check ('SELECT 1') to verify database engine health.
   */
  async healthCheck(): Promise<number> {
    try {
      const result = await this.$executeRawUnsafe('SELECT 1');
      return result;
    } catch {
      return 0;
    }
  }
}
