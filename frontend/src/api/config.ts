/**
 * Build a full API URL routing through the Next.js proxy.
 *
 * In the browser we ALWAYS use a relative path (/api/...) so requests
 * go through the Next.js rewrite → backend, avoiding CORS / port issues.
 * On the server side (SSR) we need an absolute URL to the backend.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const joined = `/api${p}`.replace(/\/+/g, '/');

  // Browser: use relative URL so Next.js rewrites proxy it
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${joined}`;
  }

  // SSR: use absolute URL directly to backend
  const backend = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ?? 'http://localhost:3001';
  return `${backend}${joined}`;
}

/** Absolute origin of the API (for EventSource, WebSocket, etc.). */
export function getApiOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ?? 'http://localhost:3001';
}

/** Path prefix used by the axios client. */
export function getApiBasePath(): string {
  return '/api';
}

export function uploadProgressUrl(uploadId: string): string {
  return apiUrl(`/upload/progress/${uploadId}`);
}
