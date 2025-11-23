import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  async rewrites() {
    // In production, proxy API requests to the API service
    // This solves cross-origin cookie issues by serving everything from the same domain
    const apiBaseUrl = process.env.API_SERVICE_URL || 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
