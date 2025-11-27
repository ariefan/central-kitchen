"use client";

import { useEffect, useState } from "react";

// Loading placeholder
function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="h-10 w-20 bg-muted animate-pulse rounded mb-4" />
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
      </div>
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  );
}

export default function NewCustomerClient() {
  const [CustomerFormPage, setCustomerFormPage] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    // Only import the form component on the client side after mount
    import("@/components/customers/customer-form-page").then((mod) => {
      setCustomerFormPage(() => mod.default);
    });
  }, []);

  if (!CustomerFormPage) {
    return <LoadingSkeleton />;
  }

  return <CustomerFormPage />;
}
