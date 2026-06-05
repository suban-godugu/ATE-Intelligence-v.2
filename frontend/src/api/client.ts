import axios from 'axios';

// Always use a relative /api base so requests route through the Next.js
// rewrite proxy → NestJS backend (avoids CORS and port conflicts).
// For SSR, Next.js handles the absolute URL internally.
const baseURL = typeof window !== 'undefined'
  ? '/api'                                                                    // browser → Next.js proxy
  : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api');        // SSR → direct

const apiClient = axios.create({
  baseURL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
});

// Minimal request interceptor to prevent any token check crashes
apiClient.interceptors.request.use((config) => {
  return config;
});

export default apiClient;

