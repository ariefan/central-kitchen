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
import { Plus, Search, Filter, Eye, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
import InventoryAdjustmentForm from '@/components/adjustments/InventoryAdjustmentForm'
import InventoryAdjustmentDetailDrawer from '@/components/adjustments/InventoryAdjustmentDetailDrawer'

// Types
interface InventoryAdjustment {
  id: string
  documentNumber: string
  adjustmentType: 'positive' | 'negative'
  reasonCode: 'damage' | 'expiry' | 'theft' | 'found' | 'count_variance' | 'return' | 'other'
  reasonDescription: string
  referenceDocument?: string
  status: 'draft' | 'posted' | 'cancelled'
  adjustmentDate: string
  locationName: string
  locationCode: string
  lineItemCount: number
  totalQuantity: number
  totalValue: number
  postedAt?: string
  createdBy: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
  requiresSupervisorApproval: boolean
}

// Mock data - will be replaced with API calls
const mockInventoryAdjustments: InventoryAdjustment[] = [
  {
    id: '1',
    documentNumber: 'ADJ-2024-001',
    adjustmentType: 'negative',
    reasonCode: 'damage',
    reasonDescription: 'Damaged goods during handling',
    status: 'posted',
    adjustmentDate: '2024-01-15',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    lineItemCount: 5,
    totalQuantity: -25,
    totalValue: -187.50,
    postedAt: '2024-01-15T14:30:00Z',
    createdBy: 'John Smith',
    createdAt: '2024-01-15T09:20:00Z',
    approvedBy: 'Sarah Manager',
    approvedAt: '2024-01-15T11:45:00Z',
    requiresSupervisorApproval: true,
  },
  {
    id: '2',
    documentNumber: 'ADJ-2024-002',
    adjustmentType: 'negative',
    reasonCode: 'expiry',
    reasonDescription: 'Expired perishable items',
    status: 'draft',
    adjustmentDate: '2024-01-16',
    locationName: 'Cooler Storage',
    locationCode: 'CS-001',
    lineItemCount: 8,
    totalQuantity: -42,
    totalValue: -326.40,
    createdBy: 'Jane Doe',
    createdAt: '2024-01-16T10:15:00Z',
    requiresSupervisorApproval: true,
  },
  {
    id: '3',
    documentNumber: 'ADJ-2024-003',
    adjustmentType: 'positive',
    reasonCode: 'found',
    reasonDescription: 'Found items during physical count',
    status: 'posted',
    adjustmentDate: '2024-01-17',
    locationName: 'Kitchen Storage',
    locationCode: 'KT-001',
    lineItemCount: 3,
    totalQuantity: 15,
    totalValue: 89.25,
    postedAt: '2024-01-17T16:20:00Z',
    createdBy: 'Bob Johnson',
    createdAt: '2024-01-17T08:30:00Z',
    requiresSupervisorApproval: false,
  },
  {
    id: '4',
    documentNumber: 'ADJ-2024-004',
    adjustmentType: 'negative',
    reasonCode: 'theft',
    reasonDescription: 'Theft reported and documented',
    status: 'posted',
    adjustmentDate: '2024-01-18',
    locationName: 'Main Warehouse',
    locationCode: 'WH-001',
    lineItemCount: 2,
    totalQuantity: -8,
    totalValue: -156.00,
    postedAt: '2024-01-18T13:10:00Z',
    createdBy: 'Alice Brown',
    createdAt: '2024-01-18T07:45:00Z',
    approvedBy: 'Security Manager',
    approvedAt: '2024-01-18T09:30:00Z',
    requiresSupervisorApproval: true,
    referenceDocument: 'INC-2024-001',
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: InventoryAdjustment['status'] }) => {
  const variants = {
    draft: 'secondary',
    posted: 'default',
    cancelled: 'destructive',
  } as const

  const labels = {
    draft: 'Draft',
    posted: 'Posted',
    cancelled: 'Cancelled',
  }

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
    </Badge>
  )
}

// Reason badge component
const ReasonBadge = ({ reasonCode }: { reasonCode: InventoryAdjustment['reasonCode'] }) => {
  const variants = {
    damage: 'destructive',
    expiry: 'destructive',
    theft: 'destructive',
    found: 'default',
    count_variance: 'secondary',
    return: 'outline',
    other: 'secondary',
  } as const

  const labels = {
    damage: 'Damage',
    expiry: 'Expiry',
    theft: 'Theft',
    found: 'Found',
    count_variance: 'Count Variance',
    return: 'Return',
    other: 'Other',
  }

  const icons = {
    damage: <AlertTriangle className="h-3 w-3" />,
    expiry: <AlertTriangle className="h-3 w-3" />,
    theft: <AlertTriangle className="h-3 w-3" />,
    found: <Plus className="h-3 w-3" />,
    count_variance: <Minus className="h-3 w-3" />,
    return: <TrendingUp className="h-3 w-3" />,
    other: <Minus className="h-3 w-3" />,
  }

  return (
    <Badge variant={variants[reasonCode]} className="flex items-center space-x-1">
      {icons[reasonCode]}
      <span>{labels[reasonCode]}</span>
    </Badge>
  )
}

// Type indicator component
const TypeIndicator = ({ adjustmentType }: { adjustmentType: InventoryAdjustment['adjustmentType'] }) => {
  if (adjustmentType === 'positive') {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="font-medium">Positive</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <TrendingDown className="h-4 w-4" />
      <span className="font-medium">Negative</span>
    </div>
  )
}

// Column definitions
const columns: ColumnDef<InventoryAdjustment>[] = [
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
    accessorKey: 'reasonDescription',
    header: 'Reason',
    cell: ({ row }) => {
      const reasonCode = row.original.reasonCode
      return (
        <div>
          <div className="font-medium">{row.getValue('reasonDescription')}</div>
          <div className="mt-1">
            <ReasonBadge reasonCode={reasonCode} />
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'adjustmentType',
    header: 'Type',
    cell: ({ row }) => {
      return <TypeIndicator adjustmentType={row.getValue('adjustmentType')} />
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
    accessorKey: 'totalQuantity',
    header: 'Total Qty',
    cell: ({ row }) => {
      const quantity = row.getValue('totalQuantity') as number
      const adjustmentType = row.original.adjustmentType

      return (
        <div className={`font-medium ${adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {quantity > 0 ? '+' : ''}{quantity}
        </div>
      )
    },
  },
  {
    accessorKey: 'totalValue',
    header: 'Total Value',
    cell: ({ row }) => {
      const value = parseFloat(row.getValue('totalValue') as string)
      const adjustmentType = row.original.adjustmentType

      return (
        <div className={`font-medium ${adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
          {value > 0 ? '+' : ''}${value.toFixed(2)}
        </div>
      )
    },
  },
  {
    accessorKey: 'adjustmentDate',
    header: 'Adjustment Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('adjustmentDate'))
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
      const adjustment = row.original

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
              setSelectedAdjustment(adjustment)
              setShowDetailDrawer(true)
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {adjustment.status === 'draft' && (
              <>
                <DropdownMenuItem>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Post Adjustment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function InventoryAdjustmentComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedAdjustment, setSelectedAdjustment] = useState<InventoryAdjustment | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  // Form submit handler
  const handleFormSubmit = (data: any) => {
    console.log('Inventory Adjustment data:', data)
    // TODO: Save to API
    // Invalidate query to refresh data
  }

  // Query for fetching inventory adjustments
  const { data: adjustments = [], isLoading } = useQuery({
    queryKey: ['inventory-adjustments'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockInventoryAdjustments
    },
  })

  const table = useReactTable({
    data: adjustments,
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
  const totalPositiveValue = adjustments
    .filter(adj => adj.adjustmentType === 'positive' && adj.status === 'posted')
    .reduce((sum, adj) => sum + adj.totalValue, 0)

  const totalNegativeValue = Math.abs(
    adjustments
      .filter(adj => adj.adjustmentType === 'negative' && adj.status === 'posted')
      .reduce((sum, adj) => sum + adj.totalValue, 0)
  )

  const netValue = totalPositiveValue - totalNegativeValue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory Adjustments</h1>
          <p className="text-muted-foreground">
            Manage inventory adjustments for damage, expiry, theft, and found items
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Adjustment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adjustments.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${totalPositiveValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Found/returned items
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -${totalNegativeValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Damage/expiry/theft
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Impact</CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netValue >= 0 ? '+' : ''}${netValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall impact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Adjustments</CardTitle>
          <CardDescription>
            View and manage all inventory adjustments and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search adjustments..."
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
                          No inventory adjustments found.
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

      {/* Inventory Adjustment Form */}
      <InventoryAdjustmentForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleFormSubmit}
      />

      {/* Detail Drawer */}
      {selectedAdjustment && (
        <InventoryAdjustmentDetailDrawer
          open={showDetailDrawer}
          onOpenChange={setShowDetailDrawer}
          adjustment={selectedAdjustment}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/adjustments/')({
  component: InventoryAdjustmentComponent,
})