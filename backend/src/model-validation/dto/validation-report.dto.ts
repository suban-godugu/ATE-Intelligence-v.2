// d:\officw work -1\ai-1\backend\src\model-validation\dto\validation-report.dto.ts
export interface ColumnStatDto {
  name: string;
  dtype: string;
  null_pct: number;
  unique_count: number;
  sample_values: unknown[];
}
 
export interface ValidationIssueDto {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
}
 
export interface ValidationReportDto {
  validation_id: string;
  timestamp: string;
  filename: string;
  file_size_bytes: number;
  file_category: string;
  data_type: 'structured' | 'unstructured' | 'mixed' | 'unknown';
  status: 'VALID' | 'INVALID' | 'WARNING';
  confidence_score: number;
  row_count?: number;
  column_count?: number;
  column_stats?: ColumnStatDto[];
  image_width?: number;
  image_height?: number;
  image_channels?: number;
  issues: ValidationIssueDto[];
  recommended_pipeline: string;
  metadata: Record<string, unknown>;
  trigger_prediction: boolean;
}
