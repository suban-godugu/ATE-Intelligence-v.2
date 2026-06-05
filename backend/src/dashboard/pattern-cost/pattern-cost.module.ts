import { Module } from '@nestjs/common';
import { PatternCostController } from './pattern-cost.controller';
import { PatternCostService } from './pattern-cost.service';

@Module({
  controllers: [PatternCostController],
  providers: [PatternCostService],
  exports: [PatternCostService],
})
export class PatternCostModule {}
