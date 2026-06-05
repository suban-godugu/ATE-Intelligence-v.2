import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsQueryDto } from './lots.dto';

@Controller('dashboard/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getLots(@Query() query: LotsQueryDto) {
    return this.lotsService.getLots(query);
  }

  @Get(':lotId/context')
  async getLotContext(@Param('lotId') lotId: string) {
    return this.lotsService.getLotContext(lotId);
  }
}
