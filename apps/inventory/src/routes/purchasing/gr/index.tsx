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
import { Plus, Search, Filter, Eye } from 'lucide-react'
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
import GoodsReceiptForm from '@/components/goods-receipt/GoodsReceiptForm'
import GoodsReceiptDetailDrawer from '@/components/goods-receipt/GoodsReceiptDetailDrawer'

// Types
interface GoodsReceipt {
  id: string
  documentNumber: string
  supplierName: string
  supplierCode: string
  status: 'draft' | 'posted' | 'cancelled'
  receiptDate: string
  totalAmount: number
  lineItemCount: number
  createdBy: string
  createdAt: string
  postedAt?: string
  invoiceNumber?: string
  notes?: string
  lineItems?: Array<{
    id: string
    productName: string
    productCode: string
    quantity: number
    unitCost: number
    totalCost: number
    lotNumber?: string
    expiryDate?: string
    notes?: string
    isPerishable?: boolean
  }>
}

// Mock data - will be replaced with API call
const mockGoodsReceipts: GoodsReceipt[] = [
  {
    id: '1',
    documentNumber: 'GR-2024-001',
    supplierName: 'Fresh Produce Co',
    supplierCode: 'SUP001',
    status: 'posted',
    receiptDate: '2024-01-15',
    totalAmount: 2500.00,
    lineItemCount: 15,
    createdBy: 'John Doe',
    createdAt: '2024-01-15T09:30:00Z',
    postedAt: '2024-01-15T10:15:00Z',
    invoiceNumber: 'INV-001234',
    lineItems: [
      {
        id: '1',
        productName: 'Fresh Tomatoes',
        productCode: 'TOM001',
        quantity: 100,
        unitCost: 2.50,
        totalCost: 250.00,
        lotNumber: 'LOT-001',
        expiryDate: '2024-01-25',
        isPerishable: true,
      },
      {
        id: '2',
        productName: 'Lettuce',
        productCode: 'LET001',
        quantity: 50,
        unitCost: 1.80,
        totalCost: 90.00,
        lotNumber: 'LOT-002',
        expiryDate: '2024-01-20',
        isPerishable: true,
      },
      // ... more items
    ],
  },
  {
    id: '2',
    documentNumber: 'GR-2024-002',
    supplierName: 'Dairy Suppliers Inc',
    supplierCode: 'SUP002',
    status: 'draft',
    receiptDate: '2024-01-16',
    totalAmount: 1800.50,
    lineItemCount: 8,
    createdBy: 'Jane Smith',
    createdAt: '2024-01-16T14:20:00Z',
    lineItems: [
      {
        id: '3',
        productName: 'Milk',
        productCode: 'MLK001',
        quantity: 200,
        unitCost: 3.20,
        totalCost: 640.00,
        isPerishable: true,
      },
      // ... more items
    ],
  },
  {
    id: '3',
    documentNumber: 'GR-2024-003',
    supplierName: 'Meat & Poultry Ltd',
    supplierCode: 'SUP003',
    status: 'posted',
    receiptDate: '2024-01-17',
    totalAmount: 3200.75,
    lineItemCount: 12,
    createdBy: 'Bob Johnson',
    createdAt: '2024-01-17T08:45:00Z',
    postedAt: '2024-01-17T09:30:00Z',
    lineItems: [
      {
        id: '4',
        productName: 'Chicken Breast',
        productCode: 'CHK001',
        quantity: 150,
        unitCost: 8.50,
        totalCost: 1275.00,
        lotNumber: 'LOT-003',
        expiryDate: '2024-01-24',
        isPerishable: true,
      },
      // ... more items
    ],
  },
]

// Status badge component
const StatusBadge = ({ status }: { status: GoodsReceipt['status'] }) => {
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

// Column definitions
const columns: ColumnDef<GoodsReceipt>[] = [
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
    accessorKey: 'supplierName',
    header: 'Supplier',
    cell: ({ row }) => {
      const supplierCode = row.original.supplierCode
      return (
        <div>
          <div className="font-medium">{row.getValue("supplierName")}</div>
          <div className="text-sm text-muted-foreground">{supplierCode}</div>
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
    accessorKey: 'receiptDate',
    header: 'Receipt Date',
    cell: ({ row }) => {
      const date = new Date(row.getValue('receiptDate'))
      return format(date, 'MMM dd, yyyy')
    },
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total Amount',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'))
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    },
  },
  {
    accessorKey: 'lineItemCount',
    header: 'Line Items',
    cell: ({ row }) => {
      return <div className="text-center">{row.getValue("lineItemCount")}</div>
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
      const gr = row.original

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
              setSelectedGR(gr)
              setShowDetailDrawer(true)
            }}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            {gr.status === 'draft' && (
              <>
                <DropdownMenuItem>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function GoodsReceiptComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedGR, setSelectedGR] = useState<GoodsReceipt | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  // Form submit handler
  const handleFormSubmit = (data: any) => {
    console.log('Goods Receipt data:', data)
    // TODO: Save to API
    // Invalidate query to refresh data
  }

  // Query for fetching goods receipts
  const { data: goodsReceipts = [], isLoading } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return mockGoodsReceipts
    },
  })

  const table = useReactTable({
    data: goodsReceipts,
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
          <h1 className="text-2xl font-bold">Goods Receipts</h1>
          <p className="text-muted-foreground">
            Manage supplier deliveries and inventory receipts
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Goods Receipt
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GRs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{goodsReceipts.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goodsReceipts.filter(gr => gr.status === 'draft').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pending posting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {goodsReceipts.filter(gr => gr.status === 'posted').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${goodsReceipts.reduce((sum, gr) => sum + gr.totalAmount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              All receipts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Goods Receipts</CardTitle>
          <CardDescription>
            View and manage all goods receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search goods receipts..."
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
                          No goods receipts found.
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
                Showing {table.getFilteredSelectedRowModel().rows.length} of{" "}
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

      {/* Goods Receipt Form */}
      <GoodsReceiptForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleFormSubmit}
      />

      {/* Detail Drawer */}
      {selectedGR && (
        <GoodsReceiptDetailDrawer
          open={showDetailDrawer}
          onOpenChange={setShowDetailDrawer}
          goodsReceipt={selectedGR}
        />
      )}
    </div>
  )
}

export const Route = createFileRoute('/purchasing/gr/')({
  component: GoodsReceiptComponent,
})