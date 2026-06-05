import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WaferAiService } from './wafer-ai.service';
import { WaferAiResponseDto } from './dto/wafer-ai-response.dto';

@Controller('wafer-ai')
export class WaferAiController {
  constructor(private readonly waferAiService: WaferAiService) {}

  @Get()
  health() {
    return { status: 'ok', service: 'WaferVision AI Proxy', model: 'ResNet50' };
  }

  @Post('predict')
  @UseInterceptors(FileInterceptor('file'))
  async predict(@UploadedFile() file: Express.Multer.File): Promise<WaferAiResponseDto> {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return this.waferAiService.predict(file);
  }

  @Get('lots')
  async getLots() {
    return this.waferAiService.getLots();
  }

  @Delete('lots/:lotId/wafers/:waferName')
  async deleteWafer(
    @Param('lotId') lotId: string,
    @Param('waferName') waferName: string,
  ) {
    return this.waferAiService.deleteWafer(lotId, waferName);
  }

  @Delete('lots/:lotId')
  async clearLot(@Param('lotId') lotId: string) {
    return this.waferAiService.clearLot(lotId);
  }

  @Delete('lots')
  async clearAll() {
    return this.waferAiService.clearAll();
  }

  @Get('status')
  getStatus() {
    return this.waferAiService.getServiceStatus();
  }
}
