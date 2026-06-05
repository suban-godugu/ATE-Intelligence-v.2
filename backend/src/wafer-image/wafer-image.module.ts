// d:\officw work -1\ai-1\backend\src\wafer-image\wafer-image.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WaferImageService } from './wafer-image.service';
import { WaferImageStorageService } from './wafer-image-storage.service';
import { WaferImageController } from './wafer-image.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'ate-vision-secret-key-10029',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [WaferImageController],
  providers: [WaferImageService, WaferImageStorageService],
  exports: [WaferImageService, WaferImageStorageService],
})
export class WaferImageModule {}
