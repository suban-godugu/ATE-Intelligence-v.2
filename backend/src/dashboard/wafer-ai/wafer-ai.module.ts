import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { WaferAiController } from './wafer-ai.controller';
import { WaferAiService } from './wafer-ai.service';
import { WaferImageModule } from '../../wafer-image/wafer-image.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
    }),
    WaferImageModule,
  ],
  controllers: [WaferAiController],
  providers: [WaferAiService],
  exports: [WaferAiService],
})
export class WaferAiModule {}
