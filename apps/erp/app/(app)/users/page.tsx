"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/common/data-table";
import { Users as UsersIcon } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  location?: {
    name: string;
  };
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/users?limit=100`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure data.data is an array
        setUsers(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const columns: Column<User>[] = [
    {
      key: "email",
      label: "Email",
    },
    {
      key: "firstName",
      label: "Name",
      render: (_, row) => {
        const name = [row.firstName, row.lastName].filter(Boolean).join(" ");
        return name || <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "role",
      label: "Role",
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: "location.name",
      label: "Location",
      render: (value) => value || <span className="text-muted-foreground">-</span>,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Users
              </CardTitle>
              <CardDescription>
                Manage user accounts and multi-location access
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="No users found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
