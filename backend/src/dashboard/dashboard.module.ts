import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { SummaryModule } from './summary/summary.module';
import { HeatmapModule } from './heatmap/heatmap.module';
import { PatternCostModule } from './pattern-cost/pattern-cost.module';
import { CostTrendModule } from './cost-trend/cost-trend.module';
import { LotsModule } from './lots/lots.module';
import { OptimizerModule } from './optimizer/optimizer.module';
import { DashboardGatewayModule } from './gateway/dashboard.gateway.module';
import { AggregationModule } from './aggregation/aggregation.module';
import { PatternAnalysisModule } from './pattern-analysis/pattern-analysis.module';
import { WaferAiModule } from './wafer-ai/wafer-ai.module';

@Module({
  imports: [
    SummaryModule,
    HeatmapModule,
    PatternCostModule,
    CostTrendModule,
    LotsModule,
    OptimizerModule,
    DashboardGatewayModule,
    AggregationModule,
    PatternAnalysisModule,
    WaferAiModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
