import { IsNotEmpty, IsString, IsNumber, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConstraintsDto {
  @IsNumber()
  @Min(0)
  maxCostPerWafer!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  yieldTarget!: number;

  @IsNumber()
  @Min(0)
  maxTestTimeMs!: number;
}

export class OptimizeRequestDto {
  @IsNotEmpty()
  @IsString()
  lotId!: string;

  @IsNotEmpty()
  @IsString()
  fabId!: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints!: ConstraintsDto;
}
