import { Controller, Post, Get, Param, Body, UsePipes, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { OptimizerService } from './optimizer.service';
import { OptimizeRequestDto } from './optimizer.dto';

@Controller('dashboard/optimize')
export class OptimizerController {
  constructor(private readonly optimizerService: OptimizerService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async submit(@Body() dto: OptimizeRequestDto) {
    return this.optimizerService.submit(dto);
  }

  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.optimizerService.getJobStatus(jobId);
  }
}
