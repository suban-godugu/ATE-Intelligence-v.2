import { Controller, Get, Query, ValidationPipe, UsePipes } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { SummaryQueryDto } from './summary.dto';

@Controller('dashboard/summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSummary(@Query() query: SummaryQueryDto) {
    return this.summaryService.getSummary(query);
  }
}
