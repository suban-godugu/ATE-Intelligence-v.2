/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: false,
  // Turbopack Package Optimization
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
    ],
  },

  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // Bypass proxy for patterns so local mock catch-all routes handle it
      {
        source: '/api/patterns',
        destination: '/api/patterns',
      },
      {
        source: '/api/patterns/:path*',
        destination: '/api/patterns/:path*',
      },
      // Proxy all other /api/* requests from the browser → NestJS backend
      // This avoids CORS issues and the need to set NEXT_PUBLIC_API_URL
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
