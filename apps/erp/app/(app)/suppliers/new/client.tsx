"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { type SupplierCreate } from "@contracts/erp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewSupplierClient() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: SupplierCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create supplier");
      }

      const result = await response.json();

      toast.success("Supplier created successfully");
      router.push("/suppliers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create supplier"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">New Supplier</h1>
        <p className="text-muted-foreground mt-2">
          Add a new supplier to your system
        </p>
      </div>

      <SupplierForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.back()}
      />
    </div>
  );
}
