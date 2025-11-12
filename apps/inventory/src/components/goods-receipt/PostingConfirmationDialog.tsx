import { useState } from 'react'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Calendar, User, Package } from 'lucide-react'

// Types
interface LineItem {
  productId: string
  productName: string
  quantity: number
  unitCost: number
  lotNumber?: string
  expiryDate?: string
}

interface GoodsReceiptSummary {
  documentNumber: string
  supplierName: string
  supplierCode: string
  receiptDate: string
  invoiceNumber?: string
  totalAmount: number
  lineItemCount: number
  createdBy: string
  notes?: string
  lineItems: LineItem[]
}

// Mock data - will be replaced with API calls
const mockProducts = {
  '1': { name: 'Tomatoes', sku: 'PROD001' },
  '2': { name: 'Lettuce', sku: 'PROD002' },
  '3': { name: 'Chicken Breast', sku: 'PROD003' },
  '4': { name: 'Rice', sku: 'PROD004' },
}

// Props
interface PostingConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goodsReceipt: GoodsReceiptSummary
  onConfirm: () => void
  isLoading?: boolean
}

export default function PostingConfirmationDialog({
  open,
  onOpenChange,
  goodsReceipt,
  onConfirm,
  isLoading = false,
}: PostingConfirmationDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const handleConfirm = () => {
    if (!acknowledged) return
    onConfirm()
  }

  const hasExpiringItems = goodsReceipt.lineItems.some(item => {
    if (!item.expiryDate) return false
    const expiry = new Date(item.expiryDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiry <= thirtyDaysFromNow
  })

  const hasHighValueItems = goodsReceipt.lineItems.some(item => {
    return item.quantity * item.unitCost > 1000
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Post Goods Receipt
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the details below before posting this goods receipt.
            Once posted, inventory levels will be updated and this document cannot be modified.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Warnings */}
          {(hasExpiringItems || hasHighValueItems) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Please Review</h4>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {hasExpiringItems && (
                      <li>• Some items have expiry dates within 30 days</li>
                    )}
                    {hasHighValueItems && (
                      <li>• Some line items exceed $1,000 in value</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Document Number:</span>
                  <div className="text-muted-foreground">{goodsReceipt.documentNumber}</div>
                </div>
                <div>
                  <span className="font-medium">Receipt Date:</span>
                  <div className="text-muted-foreground">
                    {format(new Date(goodsReceipt.receiptDate), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Supplier:</span>
                  <div className="text-muted-foreground">
                    {goodsReceipt.supplierName} ({goodsReceipt.supplierCode})
                  </div>
                </div>
                <div>
                  <span className="font-medium">Invoice Number:</span>
                  <div className="text-muted-foreground">
                    {goodsReceipt.invoiceNumber || 'Not specified'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Created By:</span>
                  <div className="text-muted-foreground">{goodsReceipt.createdBy}</div>
                </div>
                <div>
                  <span className="font-medium">Total Amount:</span>
                  <div className="font-semibold text-lg">
                    ${goodsReceipt.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {goodsReceipt.notes && (
                <div>
                  <span className="font-medium text-sm">Notes:</span>
                  <div className="text-sm text-muted-foreground mt-1">
                    {goodsReceipt.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items ({goodsReceipt.lineItemCount})</CardTitle>
              <CardDescription>
                Products that will be added to inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {goodsReceipt.lineItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity} × ${item.unitCost.toFixed(2)} = ${(item.quantity * item.unitCost).toFixed(2)}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        {item.lotNumber && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Lot: {item.lotNumber}
                          </span>
                        )}
                        {item.expiryDate && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            new Date(item.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? 'bg-red-100 text-red-800'
                              : new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Expires: {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${(item.quantity * item.unitCost).toFixed(2)}
                      </div>
                      {item.quantity * item.unitCost > 1000 && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          High Value
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total Value:</span>
                <span>${goodsReceipt.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
              />
              <div className="text-sm">
                <div className="font-medium text-blue-800">I acknowledge that:</div>
                <ul className="text-blue-700 mt-1 space-y-1">
                  <li>• This action will permanently update inventory levels</li>
                  <li>• Posted goods receipts cannot be modified</li>
                  <li>• All financial data will be recorded in the system</li>
                  <li>• I have verified all line items and quantities</li>
                </ul>
              </div>
            </label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={!acknowledged || isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Posting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Post Receipt
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}