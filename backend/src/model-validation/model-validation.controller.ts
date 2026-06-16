// d:\officw work -1\ai-1\backend\src\model-validation\model-validation.controller.ts
import {
  Controller, Post, Get, Param, Query,
  UploadedFile, UploadedFiles, UseInterceptors,
  ParseIntPipe, DefaultValuePipe, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ModelValidationService } from './model-validation.service';
 
@Controller('model-validation')
export class ModelValidationController {
  constructor(private readonly svc: ModelValidationService) {}
 
  /** POST /model-validation/validate — single file */
  @Post('validate')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  async validateSingle(@UploadedFile() file: Express.Multer.File) {
    return this.svc.validateFile(file.buffer, file.originalname, file.mimetype);
  }
 
  /** POST /model-validation/validate-batch — up to 20 files */
  @Post('validate-batch')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 200 * 1024 * 1024 } }))
  async validateBatch(@UploadedFiles() files: Express.Multer.File[]) {
    return this.svc.validateBatch(files);
  }
 
  /** GET /model-validation/history */
  @Get('history')
  async history(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.svc.getHistory(limit, offset);
  }
 
  /** GET /model-validation/:id */
  @Get(':id')
  async detail(@Param('id') id: string) {
    const record = await this.svc.getReportDetail(id);
    if (!record) throw new NotFoundException(`Validation report ${id} not found`);
    return record;
  }
}
