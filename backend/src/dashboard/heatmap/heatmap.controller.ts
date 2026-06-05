import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';
import { WaferHeatmapQueryDto } from './heatmap.dto';

@Controller('dashboard/wafer-heatmap')
export class HeatmapController {
  constructor(private readonly heatmapService: HeatmapService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getHeatmap(@Query() query: WaferHeatmapQueryDto) {
    return this.heatmapService.getHeatmap(query);
  }
}
