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

  // Note: API proxying is now handled by route handlers in /api/v1/[...path] and /api/auth/[...path]
  // This is more reliable than rewrites in standalone mode as it reads API_SERVICE_URL at runtime

  // Allow external images from Unsplash
  images: {
    unoptimized: true, // Disable image optimization in standalone mode (sharp not available)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
