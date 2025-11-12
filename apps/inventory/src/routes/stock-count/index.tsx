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
import { Plus, Search, Filter, Eye, Calculator, CheckCircle, Clock, AlertTriangle, Smartphone, Play } from 'lucide-react'
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
import StockCountWizard from '@/components/stock-count/StockCountWizard'
import StockCountDetailDrawer from '@/components/stock-count/StockCountDetailDrawer'

// Types
interface StockCount {
  id: string
  documentNumber: string
  description: string
  status: 'draft' | 'in-progress' | 'completed' | 'variance-review' | 'approved' | 'cancelled'
  countType: 'full' | 'partial' | 'cycle' | 'spot'
  locationName: string
  locationCode: string
  categoryScope?: string
  totalItems: number
  countedItems: number
  varianceCount: number
  totalValue: number
  varianceValue: number
  variancePercentage: number
  scheduledDate: string
  startedAt?: string
  completedAt?: string
  approvedBy?: string
  approvedAt?: string
  createdBy: string
  createdAt: string
  notes?: string
  requiresSupervisorApproval: boolean
}

// Mock data - will be replaced with API calls
const mockStockCounts: StockCount[] = [
  {
    id: '1',
    documentNumber: 'SC-2024-001',
    description: 'Monthly warehouse stock count',
    status: 'approved',
    countType: 'full',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    totalItems: 245,
    countedItems: 245,
    varianceCount: 8,
    totalValue: 28450.00,
    varianceValue: 320.50,
    variancePercentage: 1.13,
    scheduledDate: '2024-01-15',
    startedAt: '2024-01-15T09:00:00Z',
    completedAt: '2024-01-15T15:30:00Z',
    approvedBy: 'Sarah Manager',
    approvedAt: '2024-01-16T08:30:00Z',
    createdBy: 'John Doe',
    createdAt: '2024-01-14T14:20:00Z',
    requiresSupervisorApproval: true,
  },
  {
    id: '2',
    documentNumber: 'SC-2024-002',
    description: 'Perishable items cycle count',
    status: 'in-progress',
    countType: 'cycle',
    locationName: 'Cooler Storage',
    locationCode: 'CS-001',
    categoryScope: 'Perishables',
    totalItems: 85,
    countedItems: 62,
    varianceCount: 0,
    totalValue: 8750.00,
    varianceValue: 0,
    variancePercentage: 0,
    scheduledDate: '2024-01-18',
    startedAt: '2024-01-18T07:30:00Z',
    createdBy: 'Jane Smith',
    createdAt: '2024-01-17T16:45:00Z',
    requiresSupervisorApproval: false,
  },
  {
    id: '3',
    documentNumber: 'SC-2024-003',
    description: 'Spot check dairy products',
    status: 'variance-review',
    countType: 'spot',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    categoryScope: 'Dairy',
    totalItems: 35,
    countedItems: 35,
    varianceCount: 12,
    totalValue: 2100.00,
    varianceValue: 485.00,
    variancePercentage: 23.10,
    scheduledDate: '2024-01-16',
    startedAt: '2024-01-16T11:00:00Z',
    completedAt: '2024-01-16T13:45:00Z',
    createdBy: 'Bob Johnson',
    createdAt: '2024-01-16T09:15:00Z',
    requiresSupervisorApproval: true,
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: StockCount['status'] }) => {
  const variants = {
    draft: 'secondary',
    'in-progress': 'default',
    completed: 'outline',
    'variance-review': 'destructive',
    approved: 'default',
    cancelled: 'destructive',
  } as const

  const labels = {
    draft: 'Draft',
    'in-progress': 'In Progress',
    completed: 'Completed',
    'variance-review': 'Variance Review',
    approved: 'Approved',
    cancelled: 'Cancelled',
  }

  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    completed: 'bg-purple-100 text-purple-800',
    'variance-review': 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const icons = {
    draft: <Clock className="h-3 w-3" />,
    'in-progress': <Calculator className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    'variance-review': <AlertTriangle className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    cancelled: <AlertTriangle className="h-3 w-3" />,
  }

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      <div className="flex items-center space-x-1">
        {icons[status]}
        <span>{labels[status]}</span>
      </div>
    </Badge>
  )
}

// Progress bar component
const ProgressBar = ({ counted, total }: { counted: number; total: number }) => {
  const percentage = total > 0 ? (counted / total) * 100 : 0

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// Column definitions
const columns: ColumnDef<StockCount>[] = [
  {
    accessorKey: 'documentNumber',
    header: 'Document #',
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          {row.getValue('documentNumber')}
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      const countType = row.original.countType
      const typeLabels = {
        full: 'Full Count',
        partial: 'Partial Count',
        cycle: 'Cycle Count',
        spot: 'Spot Check',
      }
      return (
        <div>
          <div className="font-medium">{row.getValue('description')}</div>
          <div className="text-sm text-muted-foreground">{typeLabels[countType]}</div>
        </div>
      )
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
      const categoryScope = row.original.categoryScope
      return (
        <div>
          <div className="font-medium">{row.getValue('locationName')}</div>
          <div className="text-sm text-muted-foreground">{locationCode}</div>
          {categoryScope && (
            <div className="text-xs text-blue-600">{categoryScope}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const counted = row.getValue('countedItems') as number
      const total = row.getValue('totalItems') as number
      const percentage = total > 0 ? (counted / total) * 100 : 0

      return (
        <div className="w-28">
          <div className="text-sm font-medium mb-1">
            {counted}/{total} ({percentage.toFixed(0)}%)
          </div>
          <ProgressBar counted={counted} total={total} />
        </div>
      )
    },
  },
  {
    accessorKey: 'variancePercentage',
    header: 'Variance',
    cell: ({ row }) => {
      const percentage = row.getValue('variancePercentage') as number
      const count = row.original.varianceCount

      if (percentage === 0) {
        return (
          <div className="text-green-600 font-medium">
            Perfect
          </div>
        )
      }

      return (
        <div>
          <div className={`font-medium ${percentage > 5 ? 'text-red-600' : 'text-yellow-600'}`}>
            {percentage.toFixed(2)}%
          </div>
          <div className="text-sm text-muted-foreground">
            {count} items
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'scheduledDate',
    header: 'Scheduled',
    cell: ({ row }) => {
      const date = new Date(row.getValue('scheduledDate'))
      return format(date, 'MMM dd, yyyy')
    },
  },
  {
    accessorKey: 'createdBy',
    header: 'Created By',
    cell: ({ row }) => {
      return <div>{row.getValue('createdBy')}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const stockCount = row.original

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
              setSelectedStockCount(stockCount)
              setShowDetailDrawer(true)
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {stockCount.status === 'draft' && (
              <>
                <DropdownMenuItem>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Start Count
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Delete
                </DropdownMenuItem>
              </>
            )}
            {stockCount.status === 'in-progress' && (
              <>
                <DropdownMenuItem onClick={() => window.location.href = '/stock-count/mobile'}>
                  <Play className="mr-2 h-4 w-4" />
                  Mobile Counting
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Continue Counting
                </DropdownMenuItem>
              </>
            )}
            {stockCount.status === 'completed' && (
              <DropdownMenuItem>
                Review Variances
              </DropdownMenuItem>
            )}
            {stockCount.status === 'variance-review' && (
              <DropdownMenuItem>
                Approve Count
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function StockCountComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showWizard, setShowWizard] = useState(false)
  const [selectedStockCount, setSelectedStockCount] = useState<StockCount | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  // Form submit handler
  const handleWizardSubmit = (data: any) => {
    console.log('Stock Count data:', data)
    // TODO: Save to API
    // Invalidate query to refresh data
  }

  // Query for fetching stock counts
  const { data: stockCounts = [], isLoading } = useQuery({
    queryKey: ['stock-counts'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockStockCounts
    },
  })

  const table = useReactTable({
    data: stockCounts,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Stock Counts</h1>
          <p className="text-muted-foreground">
            Manage inventory counting with variance tracking and approval workflows
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/stock-count/mobile'}
            className="hidden sm:flex"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Mobile Count
          </Button>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Stock Count
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockCounts.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockCounts.filter(sc => sc.status === 'in-progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently counting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockCounts.filter(sc => ['completed', 'variance-review'].includes(sc.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Need approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stockCounts.length > 0
                ? (stockCounts.reduce((sum, sc) => sum + sc.variancePercentage, 0) / stockCounts.length).toFixed(2)
                : '0.00'}%
            </div>
            <p className="text-xs text-muted-foreground">
              All counts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Counts</CardTitle>
          <CardDescription>
            View and manage all stock counts and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stock counts..."
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
                          No stock counts found.
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

      {/* Stock Count Wizard */}
      <StockCountWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onSubmit={handleWizardSubmit}
      />

      {/* Detail Drawer */}
      {selectedStockCount && (
        <StockCountDetailDrawer
          open={showDetailDrawer}
          onOpenChange={setShowDetailDrawer}
          stockCount={selectedStockCount}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/stock-count/')({
  component: StockCountComponent,
})