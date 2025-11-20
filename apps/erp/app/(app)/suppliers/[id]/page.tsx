"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SupplierForm } from "@/components/suppliers/supplier-form";
import { type SupplierCreate } from "@contracts/erp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface SupplierEditPageProps {
  params: {
    id: string;
  };
}

export default function SupplierEditPage({ params }: SupplierEditPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [supplier, setSupplier] = useState<any>(null);

  useEffect(() => {
    fetchSupplier();
  }, [params.id]);

  const fetchSupplier = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/suppliers/${params.id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch supplier");
      }

      const result = await response.json();
      setSupplier(result.data);
    } catch (error) {
      toast.error("Failed to load supplier details");
      router.push("/suppliers");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (data: SupplierCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/suppliers/${params.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update supplier");
      }

      toast.success("Supplier updated successfully");

      router.push("/suppliers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update supplier"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

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
        <h1 className="text-3xl font-bold">Edit Supplier</h1>
        <p className="text-muted-foreground mt-2">
          Update supplier information
        </p>
      </div>

      <SupplierForm
        initialData={supplier}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.back()}
      />
    </div>
  );
}
