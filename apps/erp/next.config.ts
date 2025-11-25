import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  // Configure server to run on port 3001
  ...(process.env.NODE_ENV === 'development' && {
    async headers() {
      return [];
    },
  }),

  async rewrites() {
    // In production, proxy API requests to the API service
    // This solves cross-origin cookie issues by serving everything from the same domain
    const apiBaseUrl = process.env.API_SERVICE_URL || 'http://localhost:8000';

    // Log the configuration for debugging
    console.log('[Next.js Config] API_SERVICE_URL:', process.env.API_SERVICE_URL);
    console.log('[Next.js Config] Using API base URL:', apiBaseUrl);
    console.log('[Next.js Config] Rewrite rule: /api/:path* -> ' + apiBaseUrl + '/:path*');

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
