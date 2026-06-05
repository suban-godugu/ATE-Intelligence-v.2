import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class WaferHeatmapQueryDto {
  @IsNotEmpty()
  @IsString()
  lotId!: string;

  @IsOptional()
  @IsString()
  waferId: string = '01';

  @IsOptional()
  @IsString()
  @IsIn(['bin', 'cost', 'failType'])
  colorMode: 'bin' | 'cost' | 'failType' = 'cost';
}

export interface DieCell {
  x: number;
  y: number;
  bin: number;
  costPerDie: number;
  failType: string | null;
  normalizedCost: number;
}

export interface Cluster {
  type: 'edge_ring' | 'center_point' | 'random' | 'linear_scratch';
  dieCount: number;
  avgCost: number;
  aiProbability: number;
}

export class HeatmapResponseDto {
  lotId!: string;
  waferId!: string;
  totalDies!: number;
  passingDies!: number;
  failedDies!: number;
  spatialYield!: number;
  dieGrid!: DieCell[];
  clusters!: Cluster[];
  colorMode!: string;
  highCostThreshold!: number;
  lowCostThreshold!: number;
}
