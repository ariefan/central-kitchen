"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { uomCreateSchema, type UomCreate } from "@contracts/erp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface UomFormProps {
  onSubmit: (data: UomCreate) => void;
  isLoading?: boolean;
  onCancel?: () => void;
  defaultValues?: Partial<UomCreate>;
}

export function UomForm({
  onSubmit,
  isLoading = false,
  onCancel,
  defaultValues,
}: UomFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<UomCreate>({
    resolver: zodResolver(uomCreateSchema) as any,
    defaultValues: defaultValues || {
      code: "",
      name: "",
      uomType: "weight",
      symbol: "",
      description: "",
      isActive: true,
    },
  });

  const isActive = watch("isActive");
  const uomType = watch("uomType");

  return (
    <Card>
      <CardHeader>
        <CardTitle>UOM Details</CardTitle>
        <CardDescription>
          Define a unit of measure for inventory and transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="e.g., kg, L, pcs"
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Kilogram, Liter, Pieces"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="uomType">
                UOM Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={uomType}
                onValueChange={(value) => setValue("uomType", value as any)}
                disabled={isLoading}
              >
                <SelectTrigger id="uomType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="length">Length</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                </SelectContent>
              </Select>
              {errors.uomType && (
                <p className="text-sm text-destructive">{errors.uomType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                {...register("symbol")}
                placeholder="e.g., kg, L, pcs"
                disabled={isLoading}
              />
              {errors.symbol && (
                <p className="text-sm text-destructive">{errors.symbol.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Optional description of this unit of measure"
              rows={3}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive UOMs cannot be used in new transactions
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLoading ? "Creating..." : "Create UOM"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
