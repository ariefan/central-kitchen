"use client";

import { useEffect, useState } from "react";

// Loading placeholder
function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6">
      <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <div className="h-80 bg-muted animate-pulse rounded" />
    </div>
  );
}

export default function DailySalesClient() {
  const [DailySalesContent, setDailySalesContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only import the recharts component on the client side after mount
    import("@/components/reports/daily-sales-content").then((mod) => {
      setDailySalesContent(() => mod.default);
    });
  }, []);

  if (!DailySalesContent) {
    return <LoadingSkeleton />;
  }

  return <DailySalesContent />;
}
