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

import { Package, Eye, Calendar, AlertTriangle, Clock } from 'lucide-react'
import type { Lot, Location } from '@/types/inventory'
import { LotStatus } from '@/types/inventory'
import { isLotExpiring } from '@/hooks/useLots'

interface LotsTableProps {
  data: Lot[]
  loading?: boolean
  locations?: Location[]
  selectedLocation?: string
  selectedStatus?: string
  fefoMode?: boolean
  onLocationChange?: (locationId: string) => void
  onStatusChange?: (status: string) => void
  onView?: (lot: Lot) => void
  onMerge?: (selectedLots: Lot[]) => void
  onLedger?: (lot: Lot) => void
  onPrintLabel?: (lot: Lot) => void
}

export default function LotsTable({
  data,
  loading,
  locations,
  selectedLocation,
  selectedStatus,
  fefoMode = false,
  onLocationChange,
  onStatusChange,
  onView,
  onMerge,
  onLedger,
  onPrintLabel,
}: LotsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})

  const lotStatusColors: Record<LotStatus, string> = {
    [LotStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [LotStatus.EXPIRED]: 'bg-red-100 text-red-800',
    [LotStatus.CONSUMED]: 'bg-gray-100 text-gray-800',
    [LotStatus.DAMAGED]: 'bg-orange-100 text-orange-800',
  }

  const columns: ColumnDef<Lot>[] = [
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
            {product.perishable && (
              <Badge variant="outline" className="text-xs mt-1">
                Perishable
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'locationName',
      header: 'Location',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('locationName')}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.locationType?.replace('_', ' ') || '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'lotNumber',
      header: 'Lot Number',
      cell: ({ row }) => (
        <div className="font-mono">{row.getValue('lotNumber')}</div>
      ),
    },
    {
      id: 'expiry',
      header: 'Expiry Date',
      cell: ({ row }) => {
        const lot = row.original
        if (!lot.expiryDate) {
          return <span className="text-muted-foreground">-</span>
        }

        const expiryInfo = isLotExpiring(lot)
        return (
          <div className="flex items-center space-x-2">
            <Badge className={expiryInfo.color}>
              {expiryInfo.daysToExpiry !== null && (
                <Calendar className="w-3 h-3 mr-1" />
              )}
              {new Date(lot.expiryDate).toLocaleDateString()}
            </Badge>
            {expiryInfo.daysToExpiry !== null && (
              <span className="text-xs text-muted-foreground">
                {expiryInfo.daysToExpiry < 0
                  ? `${Math.abs(expiryInfo.daysToExpiry)} days ago`
                  : `${expiryInfo.daysToExpiry} days`}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'receivedDate',
      header: 'Received',
      cell: ({ row }) => {
        const dateValue = row.getValue('receivedDate')
        if (!dateValue) {
          return <span className="text-muted-foreground">-</span>
        }
        const date = new Date(dateValue)
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">
              {date.toLocaleTimeString()}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'qtyBase',
      header: 'Quantity',
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
      accessorKey: 'costPerUnit',
      header: 'Cost/Unit',
      cell: ({ row }) => {
        const cost = row.getValue('costPerUnit') as number
        return (
          <div className="font-mono">
            {cost !== undefined && cost !== null ? `$${cost.toFixed(2)}` : '-'}
          </div>
        )
      },
    },
    {
      id: 'value',
      header: 'Total Value',
      cell: ({ row }) => {
        const lot = row.original
        if (lot.qtyBase === undefined || lot.qtyBase === null ||
            lot.costPerUnit === undefined || lot.costPerUnit === null) {
          return <div className="font-mono">-</div>
        }
        const value = lot.qtyBase * lot.costPerUnit
        return (
          <div className="font-mono">
            ${value.toFixed(2)}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as LotStatus
        return (
          <Badge className={lotStatusColors[status]}>
            {status?.replace('_', ' ') || status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.getValue('supplierName') || '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const lot = row.original

        return (
          <div className="flex items-center space-x-2">
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onView(lot)
                }}
                type="button"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onLedger && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onLedger(lot)
                }}
                type="button"
              >
                <Package className="h-4 w-4" />
              </Button>
            )}
            {onPrintLabel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onPrintLabel(lot)
                }}
                type="button"
              >
                <Calendar className="h-4 w-4" />
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
    initialState: {
      sorting: fefoMode ? [{ id: 'expiry', desc: false }] : [],
    },
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

  const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Filter lot numbers..."
            value={(table.getColumn('lotNumber')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('lotNumber')?.setFilterValue(event.target.value)
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

        <Select value={selectedStatus || 'all'} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="consumed">Consumed</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
          </SelectContent>
        </Select>

        {fefoMode && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">FEFO Mode</span>
          </div>
        )}
      </div>

      {/* Merge Button */}
      {onMerge && selectedRows.length > 1 && (
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">
            {selectedRows.length} lots selected for merging
          </span>
          <Button
            size="sm"
            onClick={() => onMerge(selectedRows)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Merge Lots
          </Button>
        </div>
      )}

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
                  No lots found.
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