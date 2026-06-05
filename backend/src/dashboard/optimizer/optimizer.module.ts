import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OptimizerController } from './optimizer.controller';
import { OptimizerService } from './optimizer.service';
import { join } from 'path';

// Resolve sandboxed worker path dynamically (supports TS during dev, JS in build)
const isTs = __filename.endsWith('.ts');
const workerPath = isTs 
  ? join(__dirname, 'optimizer.worker.ts') 
  : join(__dirname, 'optimizer.worker.js');

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'optimization',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      },
      processors: [
        {
          path: workerPath,
          concurrency: 2,
          limiter: {
            max: 5,
            duration: 10000, // 10 seconds
          },
        }
      ],
    }),
  ],
  controllers: [OptimizerController],
  providers: [OptimizerService],
  exports: [OptimizerService],
})
export class OptimizerModule {}
