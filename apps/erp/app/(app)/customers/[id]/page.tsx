"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerForm } from "@/components/customers/customer-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

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

interface CustomerEditPageProps {
  params: {
    id: string;
  };
}

export default function CustomerEditPage({ params }: CustomerEditPageProps) {
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  const fetchCustomer = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/${params.id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch customer");
      }

      const result = await response.json();
      setCustomer(result.data);
    } catch (error) {
      toast.error("Failed to load customer details");
      router.push("/customers");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (data: CustomerCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/customers/${params.id}`,
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
        throw new Error(error.message || "Failed to update customer");
      }

      toast.success("Customer updated successfully");

      router.push("/customers");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer"
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

  if (!customer) {
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
        <h1 className="text-3xl font-bold">Edit Customer</h1>
        <p className="text-muted-foreground mt-2">
          Update customer information
        </p>
      </div>

      <CustomerForm
        initialData={customer}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.back()}
      />
    </div>
  );
}
