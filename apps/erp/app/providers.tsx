"use client";

import { useEffect, useState } from 'react';

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [mswReady, setMswReady] = useState(false);

  useEffect(() => {
    // Only enable MSW in development with explicit flag
    const enableMSW = process.env.NEXT_PUBLIC_ENABLE_MSW === 'true';

    if (enableMSW && typeof window !== 'undefined') {
      import('../mocks/browser').then(({ worker }) => {
        worker.start({
          onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
        }).then(() => {
          console.log('[MSW] Mocking enabled');
          setMswReady(true);
        });
      });
    } else {
      setMswReady(true);
    }
  }, []);

  if (!mswReady) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
