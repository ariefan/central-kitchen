"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierCreateSchema, type SupplierCreate } from "@contracts/erp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface SupplierFormProps {
  initialData?: Partial<SupplierCreate>;
  onSubmit: (data: SupplierCreate) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function SupplierForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierCreate>({
    resolver: zodResolver(supplierCreateSchema) as any,
    defaultValues: {
      isActive: true,
      paymentTerms: 30,
      leadTimeDays: 7,
      ...initialData,
    },
  });

  const isActive = watch("isActive");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter the basic details for this supplier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Supplier Code</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="SUP-001 (optional - auto-generated)"
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="ABC Trading Co."
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>


          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", !!checked)}
              disabled={isLoading}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active Supplier
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Supplier contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="supplier@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+62 812 3456 7890"
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register("website")}
                placeholder="https://supplier.com"
                disabled={isLoading}
              />
              {errors.website && (
                <p className="text-sm text-destructive">
                  {errors.website.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>Supplier address information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="123 Supplier Street"
              disabled={isLoading}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="Jakarta"
                disabled={isLoading}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province/State</Label>
              <Input
                id="province"
                {...register("province")}
                placeholder="DKI Jakarta"
                disabled={isLoading}
              />
              {errors.province && (
                <p className="text-sm text-destructive">
                  {errors.province.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                {...register("postalCode")}
                placeholder="12345"
                disabled={isLoading}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">
                  {errors.postalCode.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              {...register("country")}
              placeholder="Indonesia"
              disabled={isLoading}
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Terms</CardTitle>
          <CardDescription>Payment and delivery terms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTermsDays">Payment Terms (Days)</Label>
              <Input
                id="paymentTermsDays"
                type="number"
                {...register("paymentTermsDays", { valueAsNumber: true })}
                placeholder="30"
                disabled={isLoading}
              />
              {errors.paymentTermsDays && (
                <p className="text-sm text-destructive">
                  {errors.paymentTermsDays.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Number of days for payment (default: 30)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                {...register("leadTimeDays", { valueAsNumber: true })}
                placeholder="7"
                disabled={isLoading}
              />
              {errors.leadTimeDays && (
                <p className="text-sm text-destructive">
                  {errors.leadTimeDays.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Typical delivery lead time in days
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating">Supplier Rating (0-5)</Label>
            <Input
              id="rating"
              type="number"
              step="0.1"
              {...register("rating", { valueAsNumber: true })}
              placeholder="4.5"
              disabled={isLoading}
              min="0"
              max="5"
            />
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Performance rating (0-5 stars)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
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
          {isLoading ? "Saving..." : initialData ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}
