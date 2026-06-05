import { Module } from '@nestjs/common';
import { CostTrendController } from './cost-trend.controller';
import { CostTrendService } from './cost-trend.service';

@Module({
  controllers: [CostTrendController],
  providers: [CostTrendService],
  exports: [CostTrendService],
})
export class CostTrendModule {}
