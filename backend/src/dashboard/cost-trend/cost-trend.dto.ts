import { IsOptional, IsString, IsISO8601, IsIn } from 'class-validator';

export class CostTrendQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly'])
  granularity: 'daily' | 'weekly' = 'daily';

  @IsOptional()
  @IsString()
  fabId?: string;

  @IsOptional()
  @IsString()
  testerId?: string;
}

export interface TrendPoint {
  date: string;
  value: number | null;
}

export interface TrendSeries {
  key: string;
  label: string;
  points: TrendPoint[];
}

export class CostTrendResponseDto {
  granularity!: 'daily' | 'weekly';
  series!: TrendSeries[];
  yAxisMin!: number;
  yAxisMax!: number;
}
