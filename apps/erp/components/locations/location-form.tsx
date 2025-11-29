"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationCreateSchema, locationUpdateSchema, type LocationCreate, type LocationUpdate } from "@contracts/erp";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface LocationFormProps {
  initialData?: Partial<LocationCreate | LocationUpdate>;
  onSubmit: (data: LocationCreate | LocationUpdate) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function LocationForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}: LocationFormProps) {
  // Determine if this is an update operation (has initialData with id)
  const isUpdate = !!initialData && 'id' in initialData;

  // Use appropriate schema based on operation type
  const schema = isUpdate ? locationUpdateSchema : locationCreateSchema;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof locationCreateSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...initialData,
      locationType: initialData?.locationType || "central_kitchen",
      isActive: initialData?.isActive ?? true,
      country: initialData?.country ?? "Singapore",
    },
    mode: "onChange",
  });

  // Use controller for better type safety and avoid watch() warnings
  const [locationType, setLocationType] = useState<"central_kitchen" | "outlet" | "warehouse">(
    initialData?.locationType || "central_kitchen"
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleFormSubmit = (data: z.infer<typeof locationCreateSchema>) => {
    console.log("Form submitted with data:", data);
    console.log("Validation errors:", errors);
    onSubmit(data as LocationCreate | LocationUpdate);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter basic details for this location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={isUpdate ? "space-y-4" : "grid grid-cols-2 gap-4"}>
            {!isUpdate && (
              <div className="space-y-2">
                <Label htmlFor="code">
                  Location Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="LOC-CK01"
                  disabled={isLoading}
                />
                {!isUpdate && errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Uppercase letters, numbers, and hyphens only
                </p>
              </div>
            )}
            {isUpdate && (
              <div className="space-y-2">
                <Label htmlFor="code">
                  Location Code
                </Label>
                <Input
                  id="code"
                  value={(initialData as LocationCreate)?.code || ''}
                  disabled={true}
                />
                <p className="text-xs text-muted-foreground">
                  Location code cannot be changed
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">
                Location Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Central Kitchen - Main"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationType">
              Location Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={locationType}
              onValueChange={(value) => {
                const typedValue = value as "central_kitchen" | "outlet" | "warehouse";
                setLocationType(typedValue);
                setValue("locationType", typedValue);
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="central_kitchen">Central Kitchen</SelectItem>
                <SelectItem value="outlet">Outlet</SelectItem>
                <SelectItem value="warehouse">Warehouse</SelectItem>
              </SelectContent>
            </Select>
            {errors.locationType && (
              <p className="text-sm text-destructive">
                {errors.locationType.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address Details</CardTitle>
          <CardDescription>Location address information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="123 Industrial Road"
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Location contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+62 21 1234567"
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="location@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Location operational status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => {
                const isActiveValue = checked === true;
                setIsActive(isActiveValue);
                setValue("isActive", isActiveValue);
              }}
              disabled={isLoading}
            />
            <Label htmlFor="isActive" className="cursor-pointer font-normal">
              Location is active and available for transactions
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || isSubmitting}
          onClick={() => console.log("Submit button clicked, errors:", errors)}
        >
          {isLoading || isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Location"
              : "Create Location"}
        </Button>
      </div>
    </form>
  );
}
