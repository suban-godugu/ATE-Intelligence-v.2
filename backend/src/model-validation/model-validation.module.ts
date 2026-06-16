// d:\officw work -1\ai-1\backend\src\model-validation\model-validation.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { ModelValidationController } from './model-validation.controller';
import { ModelValidationService } from './model-validation.service';
import { ModelValidationProcessor } from './model-validation.processor';
 
@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: 'model-validation' }),
  ],
  controllers: [ModelValidationController],
  providers: [ModelValidationService, ModelValidationProcessor],
  exports: [ModelValidationService],
})
export class ModelValidationModule {}
