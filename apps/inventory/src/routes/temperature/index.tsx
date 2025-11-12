import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Thermometer,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Upload,
  Download,
  FileText,
  AlertCircle,
  Check
} from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'
import CSVImportDialog from '@/components/temperature/CSVImportDialog'
import TemperatureLogForm from '@/components/temperature/TemperatureLogForm'
import TemperatureDetailDrawer from '@/components/temperature/TemperatureDetailDrawer'

// Types
interface TemperatureReading {
  id: string
  locationName: string
  locationCode: string
  sensorId?: string
  temperature: number
  unit: 'celsius' | 'fahrenheit'
  minThreshold: number
  maxThreshold: number
  status: 'normal' | 'warning' | 'critical'
  trend: 'stable' | 'rising' | 'falling'
  humidity?: number
  notes?: string
  recordedAt: string
  recordedBy: string
  lastAlertAt?: string
  alertCount: number
}

interface CSVImportResult {
  success: boolean
  totalRows: number
  importedRows: number
  failedRows: number
  errors: string[]
}

// Mock data
const mockTemperatureReadings: TemperatureReading[] = [
  {
    id: '1',
    locationName: 'Main Cooler',
    locationCode: 'MC-001',
    sensorId: 'TEMP-001',
    temperature: 4.5,
    unit: 'celsius',
    minThreshold: 2.0,
    maxThreshold: 8.0,
    status: 'normal',
    trend: 'stable',
    humidity: 65,
    recordedAt: '2024-01-15T10:30:00Z',
    recordedBy: 'Sarah Chen',
    alertCount: 0,
  },
  {
    id: '2',
    locationName: 'Freezer Section A',
    locationCode: 'FS-A001',
    sensorId: 'TEMP-002',
    temperature: -18.2,
    unit: 'celsius',
    minThreshold: -25.0,
    maxThreshold: -15.0,
    status: 'normal',
    trend: 'falling',
    humidity: 45,
    recordedAt: '2024-01-15T10:25:00Z',
    recordedBy: 'Mike Johnson',
    alertCount: 0,
  },
  {
    id: '3',
    locationName: 'Dry Storage',
    locationCode: 'DS-001',
    sensorId: 'TEMP-003',
    temperature: 24.8,
    unit: 'celsius',
    minThreshold: 18.0,
    maxThreshold: 26.0,
    status: 'warning',
    trend: 'rising',
    humidity: 55,
    recordedAt: '2024-01-15T10:20:00Z',
    recordedBy: 'Alex Rivera',
    lastAlertAt: '2024-01-15T10:35:00Z',
    alertCount: 2,
  },
  {
    id: '4',
    locationName: 'Prep Area',
    locationCode: 'PA-001',
    sensorId: 'TEMP-004',
    temperature: 22.1,
    unit: 'celsius',
    minThreshold: 20.0,
    maxThreshold: 25.0,
    status: 'normal',
    trend: 'stable',
    humidity: 60,
    recordedAt: '2024-01-15T10:15:00Z',
    recordedBy: 'Sarah Chen',
    alertCount: 0,
  },
]

// Status badge component
const StatusBadge = ({ status, trend }: { status: TemperatureReading['status']; trend: TemperatureReading['trend'] }) => {
  const statusConfig = {
    normal: { variant: 'default' as const, color: 'bg-green-100 text-green-800', label: 'Normal' },
    warning: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
    critical: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', label: 'Critical' },
  }

  const trendConfig = {
    stable: <div className="w-2 h-2 bg-gray-400 rounded-full"></div>,
    rising: <TrendingUp className="h-3 w-3 text-red-500" />,
    falling: <TrendingDown className="h-3 w-3 text-blue-500" />,
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
      {trendConfig[trend]}
    </div>
  )
}

// Column definitions
const columns: ColumnDef<TemperatureReading>[] = [
  {
    accessorKey: 'locationName',
    header: 'Location',
    cell: ({ row }) => {
      const locationCode = row.original.locationCode
      const sensorId = row.original.sensorId
      return (
        <div>
          <div className="font-medium">{row.getValue('locationName')}</div>
          <div className="text-sm text-muted-foreground">{locationCode}</div>
          {sensorId && (
            <div className="text-xs text-blue-600">Sensor: {sensorId}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'temperature',
    header: 'Temperature',
    cell: ({ row }) => {
      const temperature = row.getValue('temperature') as number
      const unit = row.original.unit
      const minThreshold = row.original.minThreshold
      const maxThreshold = row.original.maxThreshold
      const status = row.original.status

      return (
        <div className="flex items-center space-x-2">
          <div className={`font-semibold text-lg ${
            status === 'critical' ? 'text-red-600' :
            status === 'warning' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {temperature}°{unit === 'celsius' ? 'C' : 'F'}
          </div>
          <div className="text-xs text-muted-foreground">
            {minThreshold}° - {maxThreshold}°
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      return <StatusBadge status={row.getValue('status')} trend={row.original.trend} />
    },
  },
  {
    accessorKey: 'humidity',
    header: 'Humidity',
    cell: ({ row }) => {
      const humidity = row.getValue('humidity') as number
      return humidity ? `${humidity}%` : '—'
    },
  },
  {
    accessorKey: 'alertCount',
    header: 'Alerts',
    cell: ({ row }) => {
      const alertCount = row.getValue('alertCount') as number
      const lastAlertAt = row.original.lastAlertAt

      if (alertCount === 0) {
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">No alerts</span>
          </div>
        )
      }

      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium">{alertCount}</span>
          </div>
          {lastAlertAt && (
            <div className="text-xs text-muted-foreground">
              Last: {format(new Date(lastAlertAt), 'MMM dd, HH:mm')}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'recordedAt',
    header: 'Last Reading',
    cell: ({ row }) => {
      const date = new Date(row.getValue('recordedAt'))
      const recordedBy = row.original.recordedBy
      return (
        <div>
          <div className="font-medium">{format(date, 'MMM dd, yyyy HH:mm')}</div>
          <div className="text-sm text-muted-foreground">{recordedBy}</div>
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const reading = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <Eye className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedReading(reading)
              setShowDetailDrawer(true)
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedReading(reading)
              setShowLogForm(true)
            }}>
              <Thermometer className="mr-2 h-4 w-4" />
              Log Reading
            </DropdownMenuItem>
            <DropdownMenuItem>
              <AlertTriangle className="mr-2 h-4 w-4" />
              View Alerts
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FileText className="mr-2 h-4 w-4" />
              Export Data
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function TemperatureComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showLogForm, setShowLogForm] = useState(false)
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [selectedReading, setSelectedReading] = useState<TemperatureReading | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()

  // Query for fetching temperature readings
  const { data: readings = [], isLoading } = useQuery({
    queryKey: ['temperature-readings'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 800))
      return mockTemperatureReadings
    },
  })

  // CSV Import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (file: File): Promise<CSVImportResult> => {
      // Simulate CSV processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock import result
      return {
        success: true,
        totalRows: 150,
        importedRows: 142,
        failedRows: 8,
        errors: [
          'Row 23: Invalid temperature format',
          'Row 45: Missing location code',
          'Row 67: Temperature below minimum threshold',
          'Row 89: Invalid date format',
          'Row 112: Duplicate reading for same time',
          'Row 134: Humidity value out of range (0-100%)',
          'Row 145: Missing required field "location"',
          'Row 149: Temperature above maximum threshold',
        ]
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temperature-readings'] })
    },
  })

  const table = useReactTable({
    data: readings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      csvImportMutation.mutate(file)
    }
  }

  const handleCSVImportSubmit = (data: any) => {
    console.log('CSV Import data:', data)
    // Process CSV import
    setShowCSVImport(false)
  }

  const handleLogFormSubmit = (data: any) => {
    console.log('Temperature log data:', data)
    // Save temperature reading
    setShowLogForm(false)
    queryClient.invalidateQueries({ queryKey: ['temperature-readings'] })
  }

  // Calculate stats
  const normalCount = readings.filter(r => r.status === 'normal').length
  const warningCount = readings.filter(r => r.status === 'warning').length
  const criticalCount = readings.filter(r => r.status === 'critical').length
  const totalAlerts = readings.reduce((sum, r) => sum + r.alertCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Temperature Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor temperature readings across all storage locations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowCSVImport(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowLogForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Log Reading
          </Button>
        </div>
      </div>

      {/* Hidden file input for CSV upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readings.length}</div>
            <p className="text-xs text-muted-foreground">
              Monitored locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{normalCount}</div>
            <p className="text-xs text-muted-foreground">
              Within range
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount + criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Total alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Readings</CardTitle>
          <CardDescription>
            Real-time and historical temperature data from all monitored locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(String(e.target.value))}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No temperature readings found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s).
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import Progress */}
      {csvImportMutation.isPending && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Upload className="h-4 w-4 animate-bounce" />
                <span className="font-medium">Importing CSV file...</span>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-sm text-muted-foreground">
                Processing temperature readings, please wait...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Import Result */}
      {csvImportMutation.data && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium">Import Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">{csvImportMutation.data.totalRows}</div>
                  <div className="text-muted-foreground">Total rows</div>
                </div>
                <div>
                  <div className="font-medium text-green-600">{csvImportMutation.data.importedRows}</div>
                  <div className="text-muted-foreground">Imported</div>
                </div>
                <div>
                  <div className="font-medium text-red-600">{csvImportMutation.data.failedRows}</div>
                  <div className="text-muted-foreground">Failed</div>
                </div>
              </div>

              {csvImportMutation.data.errors.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Import Errors:</div>
                    <ul className="text-sm space-y-1">
                      {csvImportMutation.data.errors.slice(0, 3).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {csvImportMutation.data.errors.length > 3 && (
                        <li>• and {csvImportMutation.data.errors.length - 3} more errors</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temperature Log Form */}
      <TemperatureLogForm
        open={showLogForm}
        onOpenChange={setShowLogForm}
        onSubmit={handleLogFormSubmit}
        initialData={selectedReading}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCSVImport}
        onOpenChange={setShowCSVImport}
        onSubmit={handleCSVImportSubmit}
      />

      {/* Detail Drawer */}
      {selectedReading && (
        <TemperatureDetailDrawer
          open={showDetailDrawer}
          onOpenChange={setShowDetailDrawer}
          reading={selectedReading}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/temperature/')({
  component: TemperatureComponent,
})