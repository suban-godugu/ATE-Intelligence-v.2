// d:\officw work -1\ai-1\frontend\src\api\ateDftClient.ts
import type {
  AnalysisResult,
  DashboardSummary,
  UploadedFile,
} from '@/types/ateDft';

// Always use a relative /api base so requests route through the Next.js
// rewrite proxy → NestJS backend (avoids CORS and port conflicts).
const BASE = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api');

async function post<T>(path: string, body: FormData | object): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export const ateDftClient = {
  /** Upload a test file — returns full analysis result */
  uploadFile: (file: File): Promise<AnalysisResult> => {
    const fd = new FormData();
    fd.append('file', file);
    return post<AnalysisResult>('/ate-dft/upload', fd);
  },

  /** All uploaded files with tracking info */
  getFiles: (): Promise<UploadedFile[]> =>
    get<UploadedFile[]>('/ate-dft/files'),

  /** KPI summary for dashboard */
  getSummary: (): Promise<DashboardSummary> =>
    get<DashboardSummary>('/ate-dft/summary'),

  /** Results for a specific module */
  getModuleResults: (module: string): Promise<unknown[]> =>
    get<unknown[]>(`/ate-dft/results/${module.toLowerCase()}`),
};
