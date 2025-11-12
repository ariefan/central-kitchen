import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import BulkOperations, { commonBulkOperations } from './BulkOperations'
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Column {
  key: string
  label: string
  sortable?: boolean
  searchable?: boolean
  width?: string
  render?: (value: any, item: any) => React.ReactNode
  className?: string
}

interface SelectableTableProps {
  data: any[]
  columns: Column[]
  loading?: boolean
  itemType: string
  onItemClick?: (item: any) => void
  onViewItem?: (item: any) => void
  onEditItem?: (item: any) => void
  onDeleteItem?: (item: any) => void
  bulkOperations?: any[]
  onBulkAction?: (action: string, selectedIds: string[], selectedItems: any[]) => void
  searchPlaceholder?: string
  enablePagination?: boolean
  pageSize?: number
  emptyMessage?: string
  rowActions?: {
    label: string
    icon: React.ReactNode
    action: (item: any) => void
    variant?: 'default' | 'destructive'
  }[]
}

export default function SelectableTable({
  data,
  columns,
  loading = false,
  itemType,
  onItemClick,
  onViewItem,
  onEditItem,
  onDeleteItem,
  bulkOperations = [],
  onBulkAction,
  searchPlaceholder = `Search ${itemType}s...`,
  enablePagination = true,
  pageSize = 10,
  emptyMessage = `No ${itemType}s found`,
  rowActions = []
}: SelectableTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter and sort data
  const filteredData = data.filter(item => {
    if (!searchQuery) return true

    return columns.some(column => {
      if (!column.searchable) return false
      const value = item[column.key]
      if (!value) return false

      const searchValue = searchQuery.toLowerCase()
      const stringValue = String(value).toLowerCase()
      return stringValue.includes(searchValue)
    })
  })

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0

    const aValue = a[sortColumn]
    const bValue = b[sortColumn]

    let comparison = 0
    if (aValue < bValue) comparison = -1
    if (aValue > bValue) comparison = 1

    return sortDirection === 'desc' ? -comparison : comparison
  })

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = enablePagination
    ? sortedData.slice(startIndex, startIndex + pageSize)
    : sortedData

  const selectedItems = data.filter(item => selectedIds.includes(item.id))

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, itemId])
    } else {
      setSelectedIds(selectedIds.filter(id => id !== itemId))
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([])
    } else {
      const allIds = paginatedData.map(item => item.id)
      setSelectedIds(allIds)
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleBulkOperation = (operationId: string, selectedIds: string[], selectedItems: any[]) => {
    if (onBulkAction) {
      onBulkAction(operationId, selectedIds, selectedItems)
    }
  }

  const getOperationActions = () => {
    const operations = bulkOperations.length > 0 ? bulkOperations : commonBulkOperations[itemType] || []

    return operations.map(op => ({
      id: op.id,
      label: op.label,
      icon: op.icon,
      action: (selectedIds: string[], selectedItems: any[]) => {
        handleBulkOperation(op.id, selectedIds, selectedItems)
      },
      variant: op.variant,
      requiresConfirmation: op.requiresConfirmation,
      confirmationTitle: op.confirmationTitle,
      confirmationMessage: op.confirmationMessage
    }))
  }

  const isAllSelected = paginatedData.length > 0 && selectedIds.length === paginatedData.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < paginatedData.length

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-10"
          />
        </div>

        {/* Quick Filters */}
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk Actions (if items selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {selectedIds.length} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Bulk Operations Bar */}
      <BulkOperations
        selectedItems={selectedItems}
        selectedIds={selectedIds}
        totalItems={paginatedData.length}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        operations={getOperationActions()}
        itemType={itemType}
      />

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Select All Checkbox */}
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* Column Headers */}
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={column.className}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                column.label
              )}
            </TableHead>
          ))}

          {/* Actions Column */}
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {loading ? (
          // Loading State
          Array.from({ length: pageSize }).map((_, index) => (
            <TableRow key={`loading-${index}`}>
              <TableCell>
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <div className="h-4 bg-muted animate-pulse rounded" />
                </TableCell>
              ))}
              <TableCell>
                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              </TableCell>
            </TableRow>
          ))
        ) : paginatedData.length === 0 ? (
          // Empty State
          <TableRow>
            <TableCell colSpan={columns.length + 2} className="text-center py-8">
              <div className="text-muted-foreground">
                {searchQuery ? (
                  <>
                    <p>No {itemType}s found matching "{searchQuery}"</p>
                    <Button
                      variant="link"
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  </>
                ) : (
                  emptyMessage
                )}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          // Data Rows
          paginatedData.map((item) => (
            <TableRow
              key={item.id}
              className={`cursor-pointer hover:bg-muted/50 ${
                selectedIds.includes(item.id) ? 'bg-blue-50/50' : ''
              }`}
              onClick={() => onItemClick?.(item)}
            >
              {/* Select Checkbox */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  onCheckedChange={(checked) =>
                    handleSelectItem(item.id, checked as boolean)
                  }
                  aria-label={`Select ${itemType}`}
                />
              </TableCell>

              {/* Column Data */}
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={column.className}
                  onClick={(e) => e.stopPropagation()}
                >
                  {column.render ? (
                    column.render(item[column.key], item)
                  ) : (
                    item[column.key]
                  )}
                </TableCell>
              ))}

              {/* Row Actions */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-1">
                  {onViewItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewItem(item)}
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}

                  {onEditItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditItem(item)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {/* Additional Row Actions */}
                  {rowActions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {rowActions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => action.action(item)}
                            className={action.variant === 'destructive' ? 'text-red-600' : ''}
                          >
                            {action.icon}
                            <span className="ml-2">{action.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {onDeleteItem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteItem(item)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>

  {/* Pagination */}
  {enablePagination && !loading && paginatedData.length > 0 && (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(startIndex + pageSize, sortedData.length)} of{' '}
        {sortedData.length} {itemType}s
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNumber
            if (totalPages <= 5) {
              pageNumber = i + 1
            } else if (currentPage <= 3) {
              pageNumber = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i
            } else {
              pageNumber = currentPage - 2 + i
            }

            return (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )}
</div>
  )
}