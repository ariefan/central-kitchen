// Build information - use environment variables set at build time
// to avoid hydration mismatches between server and client
export const BUILD_INFO = {
  timestamp: process.env.NEXT_PUBLIC_BUILD_TIME || 'dev',
  commit: process.env.NEXT_PUBLIC_GIT_COMMIT || 'unknown',
  version: '1.0.0',
};
