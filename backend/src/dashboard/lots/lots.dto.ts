import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class LotsQueryDto {
  @IsOptional()
  @IsString()
  fabId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'COMPLETED', 'IN_TEST', 'active', 'completed', 'in-test'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;
}

export class LotSelectorItemDto {
  lotId!: string;
  fabId!: string;
  status!: 'ACTIVE' | 'COMPLETED' | 'IN_TEST';
  completedAt!: Date | null;
  waferCount!: number;
  yieldPct!: number | null;
}

export class LotContextResponseDto {
  lotId!: string;
  fabId!: string;
  testerId!: string;
  startedAt!: Date;
  completedAt!: Date | null;
  waferCount!: number;
  totalDies!: number;
  activeSince!: string;
}
