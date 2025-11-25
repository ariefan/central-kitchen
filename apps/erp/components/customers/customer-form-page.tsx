"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm } from "./customer-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type CustomerCreate = {
  code?: string;
  name: string;
  type?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  paymentTerms?: number;
  creditLimit?: string;
  isActive?: boolean;
};

export default function CustomerFormPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CustomerCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create customer");
      }

      toast.success("Customer created successfully");
      router.push("/customers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create customer"
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
        <h1 className="text-3xl font-bold">New Customer</h1>
        <p className="text-muted-foreground mt-2">
          Add a new customer to your system
        </p>
      </div>
      <CustomerForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.back()}
      />
    </div>
  );
}
