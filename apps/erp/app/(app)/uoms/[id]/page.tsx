"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UomForm } from "@/components/uoms/uom-form";
import type { UomCreate } from "@contracts/erp";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";

interface UomEditPageProps {
  params: {
    id: string;
  };
}

export default function UomEditPage({ params }: UomEditPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [uom, setUom] = useState<any>(null);

  useEffect(() => {
    fetchUom();
  }, [params.id]);

  const fetchUom = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/uoms/${params.id}`,
        {
          credentials: "include",
        }
      );

      if (response.ok) {
        const result = await response.json();
        setUom(result.data);
      } else {
        toast.error("Failed to load UOM details");
        router.push("/uoms");
      }
    } catch (error) {
      toast.error("Failed to load UOM details");
      router.push("/uoms");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (data: UomCreate) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/uoms/${params.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );

      if (response.ok) {
        toast.success("UOM updated successfully");
        router.push("/uoms");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update UOM");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!uom) {
    return null;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/uoms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit UOM</h1>
          <p className="text-muted-foreground">
            Update unit of measure information
          </p>
        </div>
      </div>

      <UomForm
        defaultValues={uom}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onCancel={() => router.push("/uoms")}
      />
    </div>
  );
}
