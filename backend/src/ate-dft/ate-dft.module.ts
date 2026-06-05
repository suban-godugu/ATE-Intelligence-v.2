// d:\officw work -1\ai-1\backend\src\ate-dft\ate-dft.module.ts
import { Module } from '@nestjs/common';
import { AteDftController } from './ate-dft.controller';
import { AteDftService } from './ate-dft.service';

@Module({
  controllers: [AteDftController],
  providers:   [AteDftService],
})
export class AteDftModule {}
