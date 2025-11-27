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
  equipmentName: string;
  temperature: number;
  minThreshold?: number;
  maxThreshold?: number;
  loggedAt: string;
  notes?: string;
}

export default function TemperatureLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<TemperatureLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchLogs = async (page: number = 1, pageSize: number = 20) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const response = await fetch(
        `/api/v1/temperature-logs?${params}`,
        { credentials: "include" }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(Array.isArray(data.data) ? data.data : []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.limit || pageSize,
          total: data.pagination?.total || 0,
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

  const isOutOfRange = (log: TemperatureLog) => {
    if (log.minThreshold !== undefined && log.temperature < log.minThreshold) return true;
    if (log.maxThreshold !== undefined && log.temperature > log.maxThreshold) return true;
    return false;
  };

  const columns: Column<TemperatureLog>[] = [
    {
      key: "loggedAt",
      label: "Date/Time",
      render: (value) => new Date(value).toLocaleString()
    },
    { key: "equipmentName", label: "Equipment" },
    {
      key: "temperature",
      label: "Temperature",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isOutOfRange(row) ? 'text-destructive' : ''}`}>
            {value}°C
          </span>
          {isOutOfRange(row) && (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          )}
        </div>
      )
    },
    {
      key: "minThreshold",
      label: "Range",
      render: (_, row) => {
        if (row.minThreshold === undefined && row.maxThreshold === undefined) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <span className="text-sm text-muted-foreground">
            {row.minThreshold ?? '-'} to {row.maxThreshold ?? '-'}°C
          </span>
        );
      }
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
