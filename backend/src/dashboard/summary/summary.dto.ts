import { IsOptional, IsString, IsISO8601 } from 'class-validator';

export class SummaryQueryDto {
  @IsOptional()
  @IsString()
  fabId?: string;

  @IsOptional()
  @IsString()
  testerId?: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export interface KpiMetric {
  value: number;
  currency?: 'USD';
  unit?: string;
  deltaPercent: number;
  deltaDirection: 'up' | 'down';
}

export class SummaryResponseDto {
  totalTestCost!: KpiMetric;
  costPerWafer!: KpiMetric;
  costPerDie!: KpiMetric;
  testTimeAvg!: KpiMetric;
  yieldOverall!: KpiMetric;
  roiImprovement!: KpiMetric;
}
