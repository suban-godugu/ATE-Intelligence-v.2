import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CostTrendService } from './cost-trend.service';
import { CostTrendQueryDto } from './cost-trend.dto';

@Controller('dashboard/cost-trend')
export class CostTrendController {
  constructor(private readonly costTrendService: CostTrendService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTrend(@Query() query: CostTrendQueryDto) {
    return this.costTrendService.getTrend(query);
  }
}
