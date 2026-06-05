// d:\officw work -1\ai-1\backend\src\wafer-image\dto\save-image.dto.ts
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WaferImageType } from '@prisma/client';

export class SaveImageDto {
  @IsString()
  @IsNotEmpty()
  waferId: string;

  @IsString()
  @IsOptional()
  aiWaferId?: string | null;

  @IsEnum(WaferImageType)
  @IsNotEmpty()
  imageType: WaferImageType;

  buffer: Buffer;

  @IsString()
  @IsNotEmpty()
  mimeType: string;
}
