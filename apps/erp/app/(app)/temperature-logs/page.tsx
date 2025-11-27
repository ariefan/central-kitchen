"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/common/data-table";
import { Plus, AlertTriangle } from "lucide-react";

interface TemperatureLog {
  id: string;
  locationId: string;
  area: string | null;
  temperature: string;
  humidity: string | null;
  recordedAt: string;
  isAlert: boolean;
  alertReason: string | null;
  expectedMinTemp?: number;
  expectedMaxTemp?: number;
  notes?: string;
  location?: {
    id: string;
    name: string;
    code: string;
  };
  recordedByUser?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function TemperatureLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchLogs = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(
        `/api/v1/temperature-logs?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: { items: [...], total, limit, offset, ... } }
        const data = result.data || {};
        setLogs(Array.isArray(data.items) ? data.items : []);
        setPagination({
          page: Math.floor((data.offset || 0) / pageSize) + 1,
          pageSize: data.limit || pageSize,
          total: data.total || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch temperature logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: Column<TemperatureLog>[] = [
    {
      key: "recordedAt",
      label: "Date/Time",
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: "location",
      label: "Location",
      render: (value) => value?.name || "-"
    },
    {
      key: "area",
      label: "Area",
      render: (value) => value ? (
        <Badge variant="outline" className="capitalize">{value.replace(/_/g, " ")}</Badge>
      ) : <span className="text-muted-foreground">-</span>
    },
    {
      key: "temperature",
      label: "Temperature",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${row.isAlert ? 'text-destructive' : ''}`}>
            {parseFloat(value).toFixed(1)}°C
          </span>
          {row.isAlert && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
      )
    },
    {
      key: "expectedMinTemp",
      label: "Range",
      render: (_, row) => {
        if (row.expectedMinTemp === undefined && row.expectedMaxTemp === undefined) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {row.expectedMinTemp ?? '-'} to {row.expectedMaxTemp ?? '-'}°C
          </span>
        );
      }
    },
    {
      key: "recordedByUser",
      label: "Recorded By",
      render: (value) => value?.name || value?.email || "-"
    },
    {
      key: "notes",
      label: "Notes",
      render: (value) => value ? (
        <span className="text-sm">{value}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )
    },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Temperature Logs</CardTitle>
              <CardDescription>
                Monitor and track equipment temperatures for food safety compliance
              </CardDescription>
            </div>
            <Button onClick={() => router.push("/temperature-logs/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Log Temperature
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: pagination.total,
              onPageChange: (page) => fetchLogs(page, pagination.pageSize),
              onPageSizeChange: (pageSize) => fetchLogs(1, pageSize),
            }}
            emptyMessage="No temperature logs found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
