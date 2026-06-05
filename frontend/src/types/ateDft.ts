// d:\officw work -1\ai-1\frontend\src\types\ateDft.ts
export type ModuleType = 'MBIST' | 'LBIST' | 'SCAN' | 'WAFER' | 'ATPG' | 'UNKNOWN';

export type FileStatus =
  | 'uploaded'
  | 'detected'
  | 'parsed'
  | 'predicted'
  | 'parse_failed'
  | 'predict_failed';

export interface UploadedFile {
  fileId: string;
  fileName: string;
  detectedType: ModuleType;
  confidence: number;
  status: FileStatus;
  uploadTime: string;
  parserUsed?: string;
}

export interface MbistFeatures {
  failAddresses: string[];
  failBits: number[];
  repairRate: number;
  memoryType: string;
  totalFails: number;
  totalRepairs: number;
}

export interface LbistFeatures {
  misrSignatures: string[];
  signatureMismatch: number;
  patternCount: number;
  coveragePct: number;
  expectedSignature?: string;
  actualSignature?: string;
}

export interface ScanFeatures {
  chains: {
    chainId: string;
    stuckFaults: number;
    shiftErrors: number;
    chainBreaks: number;
    chainLength: number;
  }[];
  totalStuckFaults: number;
  totalShiftErrors: number;
  totalChainBreaks: number;
  chainCount: number;
}

export interface WaferFeatures {
  waferId: string;
  yieldPct: number;
  totalDies: number;
  failDies: number;
  binFailures: Record<string, number>;
  hotspotCount: number;
  dieCoordinates: { x: number; y: number }[];
}

export interface AtpgFeatures {
  coveragePct: number;
  patternCount: number;
  undetectedFaults: number;
  stuckAtCount: number;
  redundantFaults: number;
  testTimeSec: number;
}

export type AnyFeatures =
  | MbistFeatures
  | LbistFeatures
  | ScanFeatures
  | WaferFeatures
  | AtpgFeatures;

export interface AiPrediction {
  module: ModuleType;
  prediction: string;
  riskScore: number;
  recommendation: string;
  modelConfidence?: number;
  inputsUsed?: Record<string, unknown>;
}

export interface AnalysisResult {
  fileId: string;
  fileName: string;
  detectedType: ModuleType;
  confidence: number;
  features: AnyFeatures;
  prediction: AiPrediction;
  message?: string;
}

export interface DashboardSummary {
  totalFilesUploaded: number;
  mbist: { totalRecords: number };
  lbist: { totalRecords: number };
  scan:  { totalRecords: number };
  wafer: { totalRecords: number };
  atpg:  { totalRecords: number };
}

export const RISK_LABEL: Record<string, string> = {
  CRITICAL_FAILURE:    'Critical',
  HIGH_RISK:           'High Risk',
  BROKEN_CHAIN:        'Broken',
  CRITICAL_YIELD_LOSS: 'Critical',
  LOW_YIELD:           'Low Yield',
  LOGIC_FAILURE:       'Failure',
  LOW_COVERAGE:        'Low Cov.',
  DEGRADED:            'Degraded',
  MARGINAL:            'Marginal',
  HOTSPOT_DETECTED:    'Hotspot',
  UNDETECTED_FAULTS:   'Undetected',
  ACCEPTABLE_COVERAGE: 'Acceptable',
  HIGH_FAULT_DENSITY:  'Fault Dense',
  NORMAL_YIELD:        'Normal',
  EXCELLENT_YIELD:     'Excellent',
  FULL_COVERAGE:       'Full Cov.',
  PASS:                'Pass',
};
