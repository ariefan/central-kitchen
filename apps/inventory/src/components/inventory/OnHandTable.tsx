import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

import { Package, Eye, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import type { InventoryOnHand, Location, Category } from '@/types/inventory'

interface OnHandTableProps {
  data: InventoryOnHand[]
  loading?: boolean
  locations?: Location[]
  categories?: Category[]
  selectedLocation?: string
  selectedCategory?: string
  onLocationChange?: (locationId: string) => void
  onCategoryChange?: (categoryId: string) => void
  onView?: (item: InventoryOnHand) => void
  onLots?: (item: InventoryOnHand) => void
}

export default function OnHandTable({
  data,
  loading,
  locations,
  categories,
  selectedLocation,
  selectedCategory,
  onLocationChange,
  onCategoryChange,
  onView,
  onLots,
}: OnHandTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})

  const getStockStatus = (item: InventoryOnHand) => {
    if (item.qtyBase <= 0) return { status: 'out-of-stock', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    if (item.minStock && item.qtyBase <= item.minStock) return { status: 'low-stock', color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown }
    if (item.maxStock && item.qtyBase >= item.maxStock) return { status: 'overstock', color: 'bg-blue-100 text-blue-800', icon: TrendingUp }
    return { status: 'in-stock', color: 'bg-green-100 text-green-800', icon: Package }
  }

  const getStockValue = (item: InventoryOnHand) => {
    if (!item.product || item.product.stdCost === undefined || item.qtyBase === undefined) {
      return '0.00'
    }
    return (item.qtyBase * item.product.stdCost).toFixed(2)
  }

  const columns: ColumnDef<InventoryOnHand>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'product.sku',
      header: 'SKU',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.product?.sku || '-'}</div>
      ),
    },
    {
      id: 'product',
      accessorKey: 'product.name',
      header: 'Product',
      cell: ({ row }) => {
        const product = row.original.product
        if (!product) {
          return <div className="text-muted-foreground">-</div>
        }
        return (
          <div className="max-w-[200px]">
            <div className="font-medium truncate" title={product.name}>
              {product.name}
            </div>
            {product.description && (
              <div className="text-xs text-muted-foreground truncate" title={product.description}>
                {product.description}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'locationName',
      header: 'Location',
      cell: ({ row }) => {
        const locationType = row.original.locationType
        return (
          <div>
            <div className="font-medium">{row.getValue('locationName')}</div>
            <Badge variant="outline" className="text-xs">
              {locationType?.replace('_', ' ') || locationType || '-'}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: 'qtyBase',
      header: 'On-Hand (Base)',
      cell: ({ row }) => {
        const qty = row.getValue('qtyBase') as number
        return (
          <div className="font-mono">
            {qty !== undefined && qty !== null ? qty.toLocaleString() : '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'qtyDefaultSellUom',
      header: 'On-Hand (Sell UoM)',
      cell: ({ row }) => {
        const qty = row.getValue('qtyDefaultSellUom') as number
        return (
          <div className="font-mono">
            {qty !== undefined && qty !== null ? qty.toLocaleString() : '-'}
          </div>
        )
      },
    },
    {
      id: 'stockStatus',
      header: 'Status',
      cell: ({ row }) => {
        const item = row.original
        const stockStatus = getStockStatus(item)
        const Icon = stockStatus.icon
        return (
          <Badge className={stockStatus.color}>
            <Icon className="w-3 h-3 mr-1" />
            {stockStatus.status?.replace('-', ' ') || stockStatus.status}
          </Badge>
        )
      },
    },
    {
      id: 'stockLevels',
      header: 'Stock Levels',
      cell: ({ row }) => {
        const item = row.original
        if (!item.minStock && !item.maxStock) return <span className="text-muted-foreground">-</span>

        return (
          <div className="text-sm space-y-1">
            {item.minStock !== undefined && item.minStock !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-mono">{item.minStock.toLocaleString()}</span>
              </div>
            )}
            {item.maxStock !== undefined && item.maxStock !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-mono">{item.maxStock.toLocaleString()}</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: 'value',
      header: 'Value',
      cell: ({ row }) => {
        const item = row.original
        const value = getStockValue(item)
        return (
          <div className="font-mono">
            ${parseFloat(value).toLocaleString()}
          </div>
        )
      },
    },
    {
      id: 'lastMovement',
      header: 'Last Movement',
      cell: ({ row }) => {
        const lastMovement = row.original.lastMovementAt
        if (!lastMovement) return <span className="text-muted-foreground">-</span>

        const date = new Date(lastMovement)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        return (
          <div className="text-sm">
            <div className="font-medium">{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground">
              {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`}
            </div>
          </div>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original

        return (
          <div className="flex items-center space-x-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onView(item)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onLots && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLots(item)}
              >
                <Package className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Filter products..."
            value={(table.getColumn('product')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('product')?.setFilterValue(event.target.value)
            }
          />
        </div>

        <Select value={selectedLocation || 'all'} onValueChange={onLocationChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations?.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory || 'all'} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
                  data-state={row.getIsSelected() && 'selected'}
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
                  No inventory data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
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
  )
}