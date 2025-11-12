import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { Plus, Search, Filter, Eye, Bell, Thermometer, AlertTriangle, Clock, CheckCircle, Pause, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import AlertForm from '@/components/alerts/AlertForm'
import AlertDetailDrawer from '@/components/alerts/AlertDetailDrawer'
import TemperatureLogDialog from '@/components/alerts/TemperatureLogDialog'

// Types
interface Alert {
  id: string
  alertType: 'temperature' | 'expiry' | 'stock_out' | 'negative_stock' | 'quality' | 'security' | 'maintenance'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'snoozed' | 'cancelled'
  locationName: string
  locationCode: string
  productName?: string
  productCode?: string
  lotNumber?: string
  currentTemperature?: number
  targetTemperature?: number
  expiryDate?: string
  triggeredAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  snoozedUntil?: string
  acknowledgedBy?: string
  resolvedBy?: string
  assignedTo?: string
  notes?: string
  actions?: string[]
}

// Mock data - will be replaced with API calls
const mockAlerts: Alert[] = [
  {
    id: '1',
    alertType: 'temperature',
    priority: 'critical',
    title: 'High Temperature Alert - Cooler Storage',
    description: 'Temperature exceeded safe threshold in cooler storage zone A',
    status: 'active',
    locationName: 'Cooler Storage',
    locationCode: 'CS-001',
    currentTemperature: 8.5,
    targetTemperature: 4.0,
    triggeredAt: '2024-01-18T14:30:00Z',
    assignedTo: 'Maintenance Team',
    actions: ['Check cooling system', 'Monitor temperature trends', 'Verify product safety'],
  },
  {
    id: '2',
    alertType: 'expiry',
    priority: 'high',
    title: 'Expiring Products Alert',
    description: 'Multiple dairy products expiring within 3 days',
    status: 'acknowledged',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    productName: 'Whole Milk',
    productCode: 'MLK001',
    expiryDate: '2024-01-21',
    triggeredAt: '2024-01-18T09:15:00Z',
    acknowledgedAt: '2024-01-18T10:30:00Z',
    acknowledgedBy: 'Jane Smith',
    actions: ['Review expiry dates', 'Plan product usage', 'Create markdown plan'],
  },
  {
    id: '3',
    alertType: 'stock_out',
    priority: 'medium',
    title: 'Low Stock Alert',
    description: 'Fresh Tomatoes running low - need restock soon',
    status: 'in_progress',
    locationName: 'Kitchen Storage',
    locationCode: 'KT-001',
    productName: 'Fresh Tomatoes',
    productCode: 'TOM001',
    triggeredAt: '2024-01-18T07:45:00Z',
    assignedTo: 'Purchasing Team',
    actions: ['Check current inventory', 'Create purchase order', 'Notify kitchen staff'],
  },
  {
    id: '4',
    alertType: 'negative_stock',
    priority: 'critical',
    title: 'Negative Stock Alert',
    description: 'Chicken Breast showing negative inventory after adjustment',
    status: 'resolved',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    productName: 'Chicken Breast',
    productCode: 'CHK001',
    triggeredAt: '2024-01-17T16:20:00Z',
    acknowledgedAt: '2024-01-17T16:45:00Z',
    resolvedAt: '2024-01-18T08:30:00Z',
    acknowledgedBy: 'Bob Johnson',
    resolvedBy: 'Alice Brown',
    actions: ['Investigate adjustment error', 'Correct inventory records', 'Review approval process'],
  },
  {
    id: '5',
    alertType: 'temperature',
    priority: 'low',
    title: 'Temperature Fluctuation Warning',
    description: 'Minor temperature fluctuation detected in freezer storage',
    status: 'snoozed',
    locationName: 'Freezer Storage',
    locationCode: 'FS-001',
    currentTemperature: -18.5,
    targetTemperature: -18.0,
    triggeredAt: '2024-01-18T06:00:00Z',
    snoozedUntil: '2024-01-19T06:00:00Z',
    assignedTo: 'Facilities Team',
    actions: ['Monitor temperature stability', 'Schedule maintenance check'],
  },
]

// Alert type configurations
const alertTypeConfigs = {
  temperature: {
    label: 'Temperature',
    icon: <Thermometer className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  expiry: {
    label: 'Expiry',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  stock_out: {
    label: 'Stock Out',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  negative_stock: {
    label: 'Negative Stock',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  quality: {
    label: 'Quality',
    icon: <Bell className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  security: {
    label: 'Security',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  maintenance: {
    label: 'Maintenance',
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
}

// Priority configurations
const priorityConfigs = {
  critical: {
    label: 'Critical',
    variant: 'destructive' as const,
  },
  high: {
    label: 'High',
    variant: 'destructive' as const,
  },
  medium: {
    label: 'Medium',
    variant: 'default' as const,
  },
  low: {
    label: 'Low',
    variant: 'secondary' as const,
  },
}

// Status configurations
const statusConfigs = {
  active: {
    label: 'Active',
    icon: <Bell className="h-3 w-3" />,
    variant: 'destructive' as const,
  },
  acknowledged: {
    label: 'Acknowledged',
    icon: <Eye className="h-3 w-3" />,
    variant: 'default' as const,
  },
  in_progress: {
    label: 'In Progress',
    icon: <RotateCcw className="h-3 w-3" />,
    variant: 'default' as const,
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'outline' as const,
  },
  snoozed: {
    label: 'Snoozed',
    icon: <Pause className="h-3 w-3" />,
    variant: 'secondary' as const,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: 'secondary' as const,
  },
}

// Alert type badge component
const AlertTypeBadge = ({ alertType }: { alertType: Alert['alertType'] }) => {
  const config = alertTypeConfigs[alertType]
  return (
    <Badge variant="outline" className={`${config.bgColor} ${config.color} border-current`}>
      <div className="flex items-center space-x-1">
        {config.icon}
        <span>{config.label}</span>
      </div>
    </Badge>
  )
}

// Status badge component
const StatusBadge = ({ status }: { status: Alert['status'] }) => {
  const config = statusConfigs[status]
  return (
    <Badge variant={config.variant} className="flex items-center space-x-1">
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}

// Priority badge component
const PriorityBadge = ({ priority }: { priority: Alert['priority'] }) => {
  const config = priorityConfigs[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// Column definitions
const columns: ColumnDef<Alert>[] = [
  {
    accessorKey: 'title',
    header: 'Alert',
    cell: ({ row }) => {
      const alert = row.original
      const typeConfig = alertTypeConfigs[alert.alertType]

      return (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
              {typeConfig.icon}
            </div>
            <div className="font-medium">{row.getValue('title')}</div>
          </div>
          <div className="text-sm text-muted-foreground ml-7">
            {row.getValue('description')}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    cell: ({ row }) => {
      return <PriorityBadge priority={row.getValue('priority')} />
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      return <StatusBadge status={row.getValue('status')} />
    },
  },
  {
    accessorKey: 'locationName',
    header: 'Location',
    cell: ({ row }) => {
      const locationCode = row.original.locationCode
      return (
        <div>
          <div className="font-medium">{row.getValue('locationName')}</div>
          <div className="text-sm text-muted-foreground">{locationCode}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'productName',
    header: 'Product',
    cell: ({ row }) => {
      const productName = row.original.productName
      const productCode = row.original.productCode

      if (!productName) return <div className="text-muted-foreground">-</div>

      return (
        <div>
          <div className="font-medium">{productName}</div>
          {productCode && (
            <div className="text-sm text-muted-foreground">{productCode}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'triggeredAt',
    header: 'Triggered',
    cell: ({ row }) => {
      const date = new Date(row.getValue('triggeredAt'))
      return (
        <div>
          <div>{format(date, 'MMM dd, yyyy')}</div>
          <div className="text-sm text-muted-foreground">
            {format(date, 'HH:mm')}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'assignedTo',
    header: 'Assigned To',
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo
      return assignedTo ? <div className="font-medium">{assignedTo}</div> : <div className="text-muted-foreground">Unassigned</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const alert = row.original

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
              setSelectedAlert(alert)
              setShowDetailDrawer(true)
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {alert.status === 'active' && (
              <DropdownMenuItem>
                <CheckCircle className="mr-2 h-4 w-4" />
                Acknowledge
              </DropdownMenuItem>
            )}
            {alert.status === 'acknowledged' && (
              <DropdownMenuItem>
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Work
              </DropdownMenuItem>
            )}
            {(alert.status === 'active' || alert.status === 'acknowledged') && (
              <DropdownMenuItem>
                <Pause className="mr-2 h-4 w-4" />
                Snooze
              </DropdownMenuItem>
            )}
            {alert.alertType === 'temperature' && (
              <DropdownMenuItem onClick={() => {
                setSelectedAlert(alert)
                setShowTemperatureDialog(true)
              }}>
                <Thermometer className="mr-2 h-4 w-4" />
                Log Temperature
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function AlertComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)
  const [showTemperatureDialog, setShowTemperatureDialog] = useState(false)

  // Form submit handler
  const handleFormSubmit = (data: any) => {
    console.log('Alert data:', data)
    // TODO: Save to API
    // Invalidate query to refresh data
  }

  const handleTemperatureSubmit = (data: any) => {
    console.log('Temperature log data:', data)
    // TODO: Save temperature log
    setShowTemperatureDialog(false)
  }

  // Query for fetching alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockAlerts
    },
  })

  const table = useReactTable({
    data: alerts,
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

  // Calculate summary statistics
  const activeAlerts = alerts.filter(alert => alert.status === 'active').length
  const criticalAlerts = alerts.filter(alert => alert.priority === 'critical' && alert.status !== 'resolved').length
  const temperatureAlerts = alerts.filter(alert => alert.alertType === 'temperature' && alert.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Alerts & Monitoring</h1>
          <p className="text-muted-foreground">
            Manage system alerts for temperature, expiry, stock levels, and quality issues
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Thermometer className="mr-2 h-4 w-4" />
            Log Temperature
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Alert
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              High priority issues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature Alerts</CardTitle>
            <Thermometer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{temperatureAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Temperature issues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              All time periods
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>
            Monitor and manage all system alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
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
          <div className="mt-4">
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
                          No alerts found.
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

      {/* Alert Form */}
      <AlertForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleFormSubmit}
      />

      {/* Detail Drawer */}
      {selectedAlert && (
        <AlertDetailDrawer
          open={showDetailDrawer}
          onOpenChange={setShowDetailDrawer}
          alert={selectedAlert}
        />
      )}

      {/* Temperature Dialog */}
      {selectedAlert && (
        <TemperatureLogDialog
          open={showTemperatureDialog}
          onOpenChange={setShowTemperatureDialog}
          alert={selectedAlert}
          onSubmit={handleTemperatureSubmit}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/alerts/')({
  component: AlertComponent,
})