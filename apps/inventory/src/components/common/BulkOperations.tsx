import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  CheckSquare,
  Square,
  MoreHorizontal,
  Trash2,
  Edit,
  Download,
  Copy,
  Archive,
  Eye,
  Package,
  Tag,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface BulkOperation {
  id: string
  label: string
  icon: React.ReactNode
  action: (selectedIds: string[], selectedItems: any[]) => void
  variant?: 'default' | 'destructive' | 'secondary'
  requiresConfirmation?: boolean
  confirmationTitle?: string
  confirmationMessage?: string
}

interface BulkOperationsProps {
  selectedItems: any[]
  selectedIds: string[]
  totalItems: number
  onSelectAll: () => void
  onClearSelection: () => void
  operations: BulkOperation[]
  itemType: string
}

export default function BulkOperations({
  selectedItems,
  selectedIds,
  totalItems,
  onSelectAll,
  onClearSelection,
  operations,
  itemType
}: BulkOperationsProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    operation: BulkOperation | null
  }>({
    open: false,
    operation: null
  })

  const [bulkNotes, setBulkNotes] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)

  const handleOperationClick = (operation: BulkOperation) => {
    if (operation.requiresConfirmation) {
      setConfirmDialog({ open: true, operation })
    } else {
      operation.action(selectedIds, selectedItems)
    }
  }

  const handleConfirmOperation = () => {
    if (confirmDialog.operation) {
      confirmDialog.operation.action(selectedIds, selectedItems)
      setConfirmDialog({ open: false, operation: null })
      setBulkNotes('')
    }
  }

  const getItemIcon = () => {
    switch (itemType) {
      case 'product':
        return <Package className="h-4 w-4" />
      case 'category':
        return <Tag className="h-4 w-4" />
      case 'supplier':
        return <Package className="h-4 w-4" />
      case 'lot':
        return <Tag className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const isAllSelected = selectedIds.length === totalItems && totalItems > 0
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < totalItems

  if (selectedIds.length === 0) {
    return null
  }

  return (
    <>
      {/* Bulk Selection Bar */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Selection Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onSelectAll}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
                title={isAllSelected ? 'Deselect all' : 'Select all'}
              >
                {isAllSelected || isPartiallySelected ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5 text-blue-600" />
                )}
              </button>
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length} of {totalItems} {itemType}(s) selected
              </span>
            </div>

            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedIds.length}
            </Badge>

            <Separator orientation="vertical" className="h-6" />

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {operations.slice(0, 3).map((operation) => (
                <Button
                  key={operation.id}
                  variant={operation.variant || 'outline'}
                  size="sm"
                  onClick={() => handleOperationClick(operation)}
                  className="flex items-center space-x-1"
                >
                  {operation.icon}
                  <span className="hidden sm:inline">{operation.label}</span>
                </Button>
              ))}

              {operations.length > 3 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {operations.slice(3).map((operation) => (
                      <DropdownMenuItem
                        key={operation.id}
                        onClick={() => handleOperationClick(operation)}
                        className="flex items-center space-x-2"
                      >
                        {operation.icon}
                        <span>{operation.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-blue-600 hover:text-blue-800"
          >
            Clear selection
          </Button>
        </div>

        {/* Selected Items Summary */}
        {selectedItems.length > 0 && selectedItems.length <= 5 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Selected: </span>
              {selectedItems.map((item, index) => (
                <span key={item.id}>
                  {item.name || item.code || item.itemName}
                  {index < selectedItems.length - 1 && ', '}
                </span>
              ))}
            </div>
          </div>
        )}

        {selectedItems.length > 5 && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Selected: </span>
              {selectedItems.slice(0, 3).map((item, index) => (
                <span key={item.id}>
                  {item.name || item.code || item.itemName}
                  {index < Math.min(2, selectedItems.length - 1) && ', '}
                </span>
              ))}
              <span> and {selectedItems.length - 3} more...</span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>
                {confirmDialog.operation?.confirmationTitle || 'Confirm Bulk Operation'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.operation?.confirmationMessage ||
               `This action will affect ${selectedIds.length} selected ${itemType}(s). This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Items Preview */}
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Items to be affected:
              </div>
              <div className="space-y-1">
                {selectedItems.slice(0, 10).map((item) => (
                  <div key={item.id} className="text-sm text-gray-600 flex items-center space-x-2">
                    {getItemIcon()}
                    <span>{item.name || item.code || item.itemName}</span>
                  </div>
                ))}
                {selectedItems.length > 10 && (
                  <div className="text-sm text-gray-500 italic">
                    ... and {selectedItems.length - 10} more items
                  </div>
                )}
              </div>
            </div>

            {/* Operation-specific options */}
            {confirmDialog.operation?.id === 'bulk-edit' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-inactive"
                    checked={includeInactive}
                    onCheckedChange={setIncludeInactive}
                  />
                  <label htmlFor="include-inactive" className="text-sm">
                    Include inactive items
                  </label>
                </div>
              </div>
            )}

            {confirmDialog.operation?.id === 'bulk-delete' && (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <strong>Warning:</strong> This will permanently delete the selected {itemType}(s).
                      All associated data will be lost.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Notes */}
            {(['bulk-edit', 'bulk-assign', 'bulk-archive'].includes(confirmDialog.operation?.id || '')) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Add notes for this bulk operation..."
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, operation: null })}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.operation?.variant || 'default'}
              onClick={handleConfirmOperation}
              className={confirmDialog.operation?.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmDialog.operation?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Predefined bulk operations
export const commonBulkOperations = {
  // Product operations
  products: [
    {
      id: 'bulk-edit',
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Edit Products',
      confirmationMessage: 'You are about to edit multiple products at once. Please review the selected items before proceeding.'
    },
    {
      id: 'bulk-category',
      label: 'Assign Category',
      icon: <Tag className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Assign Category',
      confirmationMessage: 'This will update the category for all selected products.'
    },
    {
      id: 'bulk-activate',
      label: 'Activate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-deactivate',
      label: 'Deactivate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Deactivate Products',
      confirmationMessage: 'This will deactivate all selected products. They will no longer be available for transactions.'
    },
    {
      id: 'bulk-archive',
      label: 'Archive',
      icon: <Archive className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Archive Products',
      confirmationMessage: 'This will archive all selected products. They will be hidden from regular views but can be restored later.'
    },
    {
      id: 'bulk-export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-duplicate',
      label: 'Duplicate',
      icon: <Copy className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Duplicate Products',
      confirmationMessage: 'This will create duplicates of all selected products. Review the settings before proceeding.'
    },
    {
      id: 'bulk-delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Delete Products',
      confirmationMessage: 'This will permanently delete all selected products and all their data. This action cannot be undone.'
    }
  ],

  // Category operations
  categories: [
    {
      id: 'bulk-edit',
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Edit Categories',
      confirmationMessage: 'You are about to edit multiple categories at once.'
    },
    {
      id: 'bulk-activate',
      label: 'Activate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-deactivate',
      label: 'Deactivate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Deactivate Categories',
      confirmationMessage: 'This will deactivate all selected categories.'
    },
    {
      id: 'bulk-export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Delete Categories',
      confirmationMessage: 'This will permanently delete all selected categories. Products in these categories will be uncategorized.'
    }
  ],

  // Supplier operations
  suppliers: [
    {
      id: 'bulk-edit',
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Edit Suppliers',
      confirmationMessage: 'You are about to edit multiple suppliers at once.'
    },
    {
      id: 'bulk-payment-terms',
      label: 'Update Payment Terms',
      icon: <Tag className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Update Payment Terms',
      confirmationMessage: 'This will update the payment terms for all selected suppliers.'
    },
    {
      id: 'bulk-activate',
      label: 'Activate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-deactivate',
      label: 'Deactivate',
      icon: <Eye className="h-4 w-4" />,
      variant: 'secondary' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Deactivate Suppliers',
      confirmationMessage: 'This will deactivate all selected suppliers.'
    },
    {
      id: 'bulk-export',
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      variant: 'default' as const,
      requiresConfirmation: false
    },
    {
      id: 'bulk-delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive' as const,
      requiresConfirmation: true,
      confirmationTitle: 'Bulk Delete Suppliers',
      confirmationMessage: 'This will permanently delete all selected suppliers and their transaction history.'
    }
  ]
}