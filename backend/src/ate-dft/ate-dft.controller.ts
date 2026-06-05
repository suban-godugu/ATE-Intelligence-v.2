// d:\officw work -1\ai-1\backend\src\ate-dft\ate-dft.controller.ts
import {
  Controller, Post, Get, Param,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as crypto from 'crypto';
import { AteDftService } from './ate-dft.service';

@Controller('ate-dft')
export class AteDftController {
  constructor(private readonly ateDftService: AteDftService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/ate-dft',
      filename: (req, file, cb) => {
        const id = crypto.randomUUID();
        const ext = path.extname(file.originalname);
        cb(null, `${id}${ext}`);
      },
    }),
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.ateDftService.processFile(file);
  }

  @Get('files')
  getFiles() {
    return this.ateDftService.getAllFiles();
  }

  @Get('summary')
  getSummary() {
    return this.ateDftService.getDashboardSummary();
  }

  @Get('results/:module')
  getResults(@Param('module') module: string) {
    return this.ateDftService.getModuleResults(module);
  }
}
