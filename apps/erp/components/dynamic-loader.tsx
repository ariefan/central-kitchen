"use client";

import dynamic from "next/dynamic";
import { ComponentType, ReactNode } from "react";

interface DynamicLoaderProps {
  loader: () => Promise<{ default: ComponentType<unknown> }>;
  fallback?: ReactNode;
}

export function createClientLoader<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  fallback?: ReactNode
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => <>{fallback || <div>Loading...</div>}</>,
  });
}
