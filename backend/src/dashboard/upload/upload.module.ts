// d:\officw work -1\ai-1\backend\src\dashboard\upload\upload.module.ts
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
