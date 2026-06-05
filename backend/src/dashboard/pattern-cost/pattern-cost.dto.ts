import { IsOptional, IsString, IsISO8601, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PatternType } from '@prisma/client';

export class PatternCostQueryDto {
  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsString()
  fabId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @IsString()
  @IsIn(['roiScore', 'costUsd', 'testTime', 'failRate'])
  sortBy: 'roiScore' | 'costUsd' | 'testTime' | 'failRate' = 'roiScore';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}

export class PatternRow {
  patternId!: string;
  patternType!: PatternType;
  testTimeMs!: number;
  costUsd!: number;
  failRate!: number;
  detectPower!: 'HIGH' | 'MEDIUM' | 'LOW';
  roiScore!: number;
  recommendation!: 'KEEP' | 'REVIEW' | 'REMOVE';
}

export class PatternCostResponseDto {
  data!: PatternRow[];
  total!: number;
  limit!: number;
  offset!: number;
}
