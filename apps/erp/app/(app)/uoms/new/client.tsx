"use client";

import { useRouter } from "next/navigation";
import { UomForm } from "@/components/uoms/uom-form";
import type { UomCreate } from "@contracts/erp";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

export default function NewUomClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: UomCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/uoms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        toast.success("UOM created successfully");
        router.push("/uoms");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create UOM");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/uoms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create UOM</h1>
          <p className="text-muted-foreground">
            Add a new unit of measure for inventory and transactions
          </p>
        </div>
      </div>

      <UomForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.push("/uoms")}
      />
    </div>
  );
}
