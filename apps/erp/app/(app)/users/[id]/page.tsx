"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { UserForm, type UserFormData } from "@/components/users/user-form";

interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: string;
  locationId?: string;
  isActive: boolean;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchUser(params.id as string);
    }
  }, [params.id]);

  const fetchUser = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/users/${id}`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else {
        toast.error("Failed to load user");
        router.push("/users");
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      toast.error("Failed to load user");
      router.push("/users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success("User updated successfully");
        router.push("/users");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update user");
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
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
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-muted-foreground mt-2">
          Update user account details
        </p>
      </div>

      <UserForm
        initialData={{
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role as UserFormData["role"],
          locationId: user.locationId,
          isActive: user.isActive,
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        onCancel={() => router.back()}
      />
    </div>
  );
}
