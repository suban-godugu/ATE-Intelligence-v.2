import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { PatternCostService } from './pattern-cost.service';
import { PatternCostQueryDto } from './pattern-cost.dto';

@Controller('dashboard/pattern-cost')
export class PatternCostController {
  constructor(private readonly patternCostService: PatternCostService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getPatterns(@Query() query: PatternCostQueryDto) {
    return this.patternCostService.getPatterns(query);
  }
}
