import { useState, useRef } from 'react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import type { Product } from '@/types/inventory'
import { ProductKind } from '@/types/inventory'
import { useExcelExport } from '@/hooks/useExcelExport'
import { useBulkOperations } from '@/hooks/useBulkOperations'
import { toast } from 'sonner'

interface ProductsTableProps {
  data: Product[]
  loading?: boolean
  onEdit?: (product: Product) => void
  onView?: (product: Product) => void
  onDelete?: (product: Product) => void
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkUpdateStatus?: (ids: string[], status: boolean) => Promise<void>
  onImport?: (products: Partial<Product>[]) => Promise<void>
}

const productKindColors: Record<ProductKind, string> = {
  [ProductKind.RAW_MATERIAL]: 'bg-blue-100 text-blue-800',
  [ProductKind.SEMI_FINISHED]: 'bg-purple-100 text-purple-800',
  [ProductKind.FINISHED_GOOD]: 'bg-green-100 text-green-800',
  [ProductKind.PACKAGING]: 'bg-orange-100 text-orange-800',
  [ProductKind.CONSUMABLE]: 'bg-gray-100 text-gray-800',
}

const EXCEL_COLUMNS = [
  { header: 'SKU', key: 'sku', width: 15 },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Description', key: 'description', width: 40 },
  { header: 'Kind', key: 'kind', width: 15 },
  { header: 'Base UoM', key: 'baseUom', width: 12 },
  { header: 'Standard Cost', key: 'standardCost', width: 15 },
  { header: 'Perishable', key: 'isPerishable', width: 12 },
  { header: 'Active', key: 'isActive', width: 10 },
  { header: 'Category ID', key: 'categoryId', width: 15 },
  { header: 'Min Stock', key: 'minStockLevel', width: 12 },
  { header: 'Max Stock', key: 'maxStockLevel', width: 12 },
]

export default function ProductsTable({
  data,
  loading,
  onEdit,
  onView,
  onDelete,
  onBulkDelete,
  onBulkUpdateStatus,
  onImport,
}: ProductsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState({})
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<Partial<Product>[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { exportToExcel, downloadTemplate, parseExcelFile } = useExcelExport<Product>()
  const { bulkDelete, bulkUpdateStatus, isProcessing, progress } = useBulkOperations<Product>()

  const columns: ColumnDef<Product>[] = [
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
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('sku')}</div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.getValue('name')}>
          {row.getValue('name')}
        </div>
      ),
    },
    {
      accessorKey: 'kind',
      header: 'Kind',
      cell: ({ row }) => {
        const kind = row.getValue('kind') as ProductKind
        return (
          <Badge className={productKindColors[kind]}>
            {kind?.replace('_', ' ') || kind}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'baseUom',
      header: 'Base UoM',
      cell: ({ row }) => {
        const baseUom = row.getValue('baseUom') as { name?: string; symbol?: string } | null
        return (
          <span>
            {baseUom?.name || baseUom?.symbol || '-'}
          </span>
        )
      },
    },
    {
      accessorKey: 'standardCost',
      header: 'Std Cost',
      cell: ({ row }) => {
        const cost = row.getValue('standardCost') as number
        return (
          <span className="font-mono">
            ${cost ? parseFloat(cost.toString()).toFixed(2) : '0.00'}
          </span>
        )
      },
    },
    {
      accessorKey: 'isPerishable',
      header: 'Perishable',
      cell: ({ row }) => (
        <Badge variant={row.getValue('isPerishable') ? 'default' : 'secondary'}>
          {row.getValue('isPerishable') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.getValue('isActive') ? 'default' : 'destructive'}>
          {row.getValue('isActive') ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(product)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(product)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedProducts = selectedRows.map((row) => row.original)

  // Export handlers
  const handleExportAll = () => {
    exportToExcel(data, {
      filename: 'products.xlsx',
      sheetName: 'Products',
      columns: EXCEL_COLUMNS,
    })
    toast.success('Export successful', {
      description: `Exported ${data.length} products to Excel`,
    })
  }

  const handleExportSelected = () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected', {
        description: 'Please select products to export',
      })
      return
    }
    exportToExcel(selectedProducts, {
      filename: 'products-selected.xlsx',
      sheetName: 'Products',
      columns: EXCEL_COLUMNS,
    })
    toast.success('Export successful', {
      description: `Exported ${selectedProducts.length} selected products`,
    })
  }

  const handleDownloadTemplate = () => {
    downloadTemplate({
      filename: 'products-template.xlsx',
      sheetName: 'Products',
      columns: EXCEL_COLUMNS,
    })
    toast.success('Template downloaded', {
      description: 'Use this template to import products',
    })
  }

  // Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    try {
      const parsedData = await parseExcelFile(file, EXCEL_COLUMNS)
      setImportPreview(parsedData)
      setShowImportDialog(true)
    } catch (error) {
      toast.error('Import error', {
        description: error instanceof Error ? error.message : 'Failed to parse Excel file',
      })
    }
  }

  const handleImport = async () => {
    if (!onImport || importPreview.length === 0) return

    setIsImporting(true)
    try {
      await onImport(importPreview)
      toast.success('Import successful', {
        description: `Imported ${importPreview.length} products`,
      })
      setShowImportDialog(false)
      setImportFile(null)
      setImportPreview([])
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Failed to import products',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Bulk operation handlers
  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0 || !onBulkDelete) return

    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      return
    }

    await bulkDelete(
      selectedProducts,
      async (id) => {
        await onBulkDelete([id.toString()])
      }
    )

    table.resetRowSelection()
  }

  const handleBulkActivate = async () => {
    if (selectedProducts.length === 0 || !onBulkUpdateStatus) return

    await bulkUpdateStatus(
      selectedProducts,
      true,
      async (id, data) => {
        await onBulkUpdateStatus([id.toString()], data.isActive)
      }
    )

    table.resetRowSelection()
  }

  const handleBulkDeactivate = async () => {
    if (selectedProducts.length === 0 || !onBulkUpdateStatus) return

    await bulkUpdateStatus(
      selectedProducts,
      false,
      async (id, data) => {
        await onBulkUpdateStatus([id.toString()], data.isActive)
      }
    )

    table.resetRowSelection()
  }

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
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Filter products..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />

        <div className="flex items-center gap-2">
          {/* Export buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportAll}>
                <FileText className="mr-2 h-4 w-4" />
                Export All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportSelected}
                disabled={selectedProducts.length === 0}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Export Selected ({selectedProducts.length})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Import button */}
          {onImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
            </>
          )}

          {/* Bulk operations */}
          {selectedProducts.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions ({selectedProducts.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onBulkUpdateStatus && (
                  <>
                    <DropdownMenuItem onClick={handleBulkActivate} disabled={isProcessing}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBulkDeactivate} disabled={isProcessing}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Deactivate Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onBulkDelete && (
                  <DropdownMenuItem
                    onClick={handleBulkDelete}
                    disabled={isProcessing}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Processing {progress.current} of {progress.total}...</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <Progress value={(progress.current / progress.total) * 100} />
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
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
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

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Products Preview</DialogTitle>
            <DialogDescription>
              Review the data before importing {importPreview.length} products
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Base UoM</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.slice(0, 50).map((product, index) => (
                  <TableRow key={index}>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.kind}</TableCell>
                    <TableCell>{product.baseUom}</TableCell>
                    <TableCell>{product.standardCost}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {importPreview.length > 50 && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                And {importPreview.length - 50} more...
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(false)}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {importPreview.length} Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
