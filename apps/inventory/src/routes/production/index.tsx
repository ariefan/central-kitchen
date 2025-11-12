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
import { Plus, Search, Filter, Eye, Clock, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react'
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
import ProductionOrderForm from '@/components/production/ProductionOrderForm'
import ProductionWorkflowDialog from '@/components/production/ProductionWorkflowDialog'

// Types
interface ProductionOrder {
  id: string
  documentNumber: string
  recipeName: string
  recipeCode: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'posted' | 'cancelled'
  scheduledDate: string
  scheduledQuantity: number
  actualQuantity?: number
  unitOfMeasure: string
  completionPercentage: number
  createdBy: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  postedAt?: string
  notes?: string
}

// Mock data - will be replaced with API calls
const mockProductionOrders: ProductionOrder[] = [
  {
    id: '1',
    documentNumber: 'PO-2024-001',
    recipeName: 'Fresh Tomato Sauce',
    recipeCode: 'RCP-001',
    status: 'posted',
    scheduledDate: '2024-01-16',
    scheduledQuantity: 50,
    actualQuantity: 48.5,
    unitOfMeasure: 'L',
    completionPercentage: 100,
    createdBy: 'John Doe',
    createdAt: '2024-01-16T08:00:00Z',
    startedAt: '2024-01-16T09:00:00Z',
    completedAt: '2024-01-16T11:30:00Z',
    postedAt: '2024-01-16T12:00:00Z',
  },
  {
    id: '2',
    documentNumber: 'PO-2024-002',
    recipeName: 'Caesar Dressing',
    recipeCode: 'RCP-002',
    status: 'in-progress',
    scheduledDate: '2024-01-17',
    scheduledQuantity: 25,
    actualQuantity: 15,
    unitOfMeasure: 'L',
    completionPercentage: 60,
    createdBy: 'Jane Smith',
    createdAt: '2024-01-17T07:30:00Z',
    startedAt: '2024-01-17T08:00:00Z',
  },
  {
    id: '3',
    documentNumber: 'PO-2024-003',
    recipeName: 'Pesto Sauce',
    recipeCode: 'RCP-003',
    status: 'scheduled',
    scheduledDate: '2024-01-18',
    scheduledQuantity: 30,
    unitOfMeasure: 'L',
    completionPercentage: 0,
    createdBy: 'Bob Johnson',
    createdAt: '2024-01-18T09:15:00Z',
  },
  {
    id: '4',
    documentNumber: 'PO-2024-004',
    recipeName: 'Marinara Sauce',
    recipeCode: 'RCP-004',
    status: 'completed',
    scheduledDate: '2024-01-15',
    scheduledQuantity: 40,
    actualQuantity: 40,
    unitOfMeasure: 'L',
    completionPercentage: 100,
    createdBy: 'Alice Brown',
    createdAt: '2024-01-15T06:00:00Z',
    startedAt: '2024-01-15T07:00:00Z',
    completedAt: '2024-01-15T10:15:00Z',
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: ProductionOrder['status'] }) => {
  const variants = {
    scheduled: 'secondary',
    'in-progress': 'default',
    completed: 'outline',
    posted: 'default',
    cancelled: 'destructive',
  } as const

  const labels = {
    scheduled: 'Scheduled',
    'in-progress': 'In Progress',
    completed: 'Completed',
    posted: 'Posted',
    cancelled: 'Cancelled',
  }

  const colors = {
    scheduled: 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-purple-100 text-purple-800',
    posted: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  const icons = {
    scheduled: <Clock className="h-3 w-3" />,
    'in-progress': <PlayCircle className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    posted: <CheckCircle className="h-3 w-3" />,
    cancelled: <AlertCircle className="h-3 w-3" />,
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
const ProgressBar = ({ percentage }: { percentage: number }) => {
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
const columns: ColumnDef<ProductionOrder>[] = [
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
    accessorKey: 'recipeName',
    header: 'Recipe',
    cell: ({ row }) => {
      const recipeCode = row.original.recipeCode
      return (
        <div>
          <div className="font-medium">{row.getValue('recipeName')}</div>
          <div className="text-sm text-muted-foreground">{recipeCode}</div>
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
    accessorKey: 'scheduledDate',
    header: 'Scheduled Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('scheduledDate'))
      return format(date, 'MMM dd, yyyy')
    },
  },
  {
    accessorKey: 'scheduledQuantity',
    header: 'Quantity',
    cell: ({ row }) => {
      const scheduled = parseFloat(row.getValue('scheduledQuantity'))
      const actual = row.original.actualQuantity
      const uom = row.original.unitOfMeasure

      return (
        <div>
          <div className="font-medium">
            {scheduled.toFixed(1)} {uom}
          </div>
          {actual !== undefined && actual !== scheduled && (
            <div className="text-sm text-muted-foreground">
              Actual: {actual.toFixed(1)} {uom}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'completionPercentage',
    header: 'Progress',
    cell: ({ row }) => {
      const percentage = row.getValue('completionPercentage') as number
      return (
        <div className="w-24">
          <div className="text-sm font-medium mb-1">{percentage}%</div>
          <ProgressBar percentage={percentage} />
        </div>
      )
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
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return format(date, 'MMM dd, yyyy HH:mm')
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const order = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <Eye className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {order.status === 'scheduled' && (
              <>
                <DropdownMenuItem>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWorkflowAction('start', order)}>
                  Start Production
                </DropdownMenuItem>
              </>
            )}
            {order.status === 'in-progress' && (
              <>
                <DropdownMenuItem>
                  Update Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWorkflowAction('complete', order)}>
                  Complete Production
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleWorkflowAction('cancel', order)}>
                  Cancel Order
                </DropdownMenuItem>
              </>
            )}
            {order.status === 'completed' && (
              <DropdownMenuItem onClick={() => handleWorkflowAction('post', order)}>
                Post Production
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function ProductionOrderComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [workflowAction, setWorkflowAction] = useState<'start' | 'complete' | 'post' | 'cancel' | null>(null)
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false)

  // Form submit handler
  const handleFormSubmit = (data: any) => {
    console.log('Production Order data:', data)
    // TODO: Save to API
    // Invalidate query to refresh data
  }

  // Workflow action handlers
  const handleWorkflowAction = (action: 'start' | 'complete' | 'post' | 'cancel', order: ProductionOrder) => {
    setSelectedOrder(order)
    setWorkflowAction(action)
    setShowWorkflowDialog(true)
  }

  const handleWorkflowSubmit = (data?: any) => {
    if (!selectedOrder || !workflowAction) return

    console.log(`Workflow action: ${workflowAction}`, { order: selectedOrder, data })

    // TODO: Call API to perform the action
    switch (workflowAction) {
      case 'start':
        // TODO: Start production
        break
      case 'complete':
        // TODO: Complete production with actual quantity and finished goods
        break
      case 'post':
        // TODO: Post production
        break
      case 'cancel':
        // TODO: Cancel production
        break
    }

    // Reset workflow state
    setSelectedOrder(null)
    setWorkflowAction(null)
    setShowWorkflowDialog(false)
  }

  // Query for fetching production orders
  const { data: productionOrders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockProductionOrders
    },
  })

  const table = useReactTable({
    data: productionOrders,
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
          <h1 className="text-2xl font-bold">Production Orders</h1>
          <p className="text-muted-foreground">
            Manage production scheduling and track manufacturing progress
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Production Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.filter(po => po.status === 'scheduled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending start
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.filter(po => po.status === 'in-progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently producing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionOrders.filter(po => ['completed', 'posted'].includes(po.status)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Finished production
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Production Orders</CardTitle>
          <CardDescription>
            View and manage all production orders and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search production orders..."
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
                          No production orders found.
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

      {/* Production Order Form */}
      <ProductionOrderForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleFormSubmit}
      />

      {/* Workflow Dialog */}
      {selectedOrder && workflowAction && (
        <ProductionWorkflowDialog
          open={showWorkflowDialog}
          onOpenChange={setShowWorkflowDialog}
          order={selectedOrder}
          action={workflowAction}
          onAction={handleWorkflowSubmit}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/production/')({
  component: ProductionOrderComponent,
})