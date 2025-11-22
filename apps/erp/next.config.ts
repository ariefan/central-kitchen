import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
  },
};

export default nextConfig;
