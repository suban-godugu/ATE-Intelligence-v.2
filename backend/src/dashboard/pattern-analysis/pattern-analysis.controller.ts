import {
  Controller,
  Get,
  Query,
  ParseEnumPipe,
  Optional,
} from '@nestjs/common';
import { PatternAnalysisService } from './pattern-analysis.service';
import { PatternDomain, FaultClass } from '@prisma/client';

@Controller('dashboard/pattern-analysis')
export class PatternAnalysisController {
  constructor(private readonly paService: PatternAnalysisService) {}

  /** GET /dashboard/pattern-analysis/overview */
  @Get('overview')
  getOverview(
    @Query('lotId') lotId?: string,
    @Query('fabId') fabId?: string,
  ) {
    return this.paService.getOverview({ lotId, fabId });
  }

  /** GET /dashboard/pattern-analysis/fail-analysis */
  @Get('fail-analysis')
  getFailAnalysis(
    @Query('lotId') lotId?: string,
    @Query('domain') domain?: PatternDomain,
    @Query('faultClass') faultClass?: FaultClass,
  ) {
    return this.paService.getFailAnalysis({ lotId, domain, faultClass });
  }

  /** GET /dashboard/pattern-analysis/coverage */
  @Get('coverage')
  getCoverage(
    @Query('lotId') lotId?: string,
    @Query('domain') domain?: PatternDomain,
  ) {
    return this.paService.getCoverage({ lotId, domain });
  }

  /** GET /dashboard/pattern-analysis/scan-chain */
  @Get('scan-chain')
  getScanChain(@Query('lotId') lotId?: string) {
    return this.paService.getScanChain({ lotId });
  }

  /** GET /dashboard/pattern-analysis/mbist */
  @Get('mbist')
  getMbist(@Query('lotId') lotId?: string) {
    return this.paService.getMbist({ lotId });
  }

  /** GET /dashboard/pattern-analysis/lbist */
  @Get('lbist')
  getLbist(@Query('lotId') lotId?: string) {
    return this.paService.getLbist({ lotId });
  }

  /** GET /dashboard/pattern-analysis/bist */
  @Get('bist')
  getBist(@Query('lotId') lotId?: string) {
    return this.paService.getBist({ lotId });
  }

  /** GET /dashboard/pattern-analysis/redundancy */
  @Get('redundancy')
  getRedundancy(
    @Query('lotId') lotId?: string,
    @Query('waferId') waferId?: string,
  ) {
    return this.paService.getRedundancy({ lotId, waferId });
  }
}
