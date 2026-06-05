import { Module } from '@nestjs/common';
import { PatternAnalysisController } from './pattern-analysis.controller';
import { PatternAnalysisService } from './pattern-analysis.service';
import { PatternAnalysisRedesignController } from './pattern-analysis-redesign.controller';
import { PatternAnalysisRedesignService } from './pattern-analysis-redesign.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [PatternAnalysisController, PatternAnalysisRedesignController],
  providers: [PatternAnalysisService, PatternAnalysisRedesignService],
  exports: [PatternAnalysisService, PatternAnalysisRedesignService],
})
export class PatternAnalysisModule {}
