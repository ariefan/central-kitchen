import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'

// Helper function to safely format dates without hydration issues
function safeFormat(date: string | undefined | null, formatStr: string): string {
  if (!date) return '-'
  try {
    return format(new Date(date), formatStr)
  } catch {
    return '-'
  }
}
import {
  Package,
  Calendar,
  MapPin,
  DollarSign,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileText,
  User,
} from 'lucide-react'
import type { Lot } from '@/types/inventory'
import { LotStatus } from '@/types/inventory'
import { isLotExpiring } from '@/hooks/useLots'

interface LotDetailDrawerProps {
  lot: Lot | null
  open: boolean
  onClose: () => void
}

const lotStatusColors: Record<LotStatus, string> = {
  [LotStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [LotStatus.EXPIRED]: 'bg-red-100 text-red-800',
  [LotStatus.CONSUMED]: 'bg-gray-100 text-gray-800',
  [LotStatus.DAMAGED]: 'bg-orange-100 text-orange-800',
}

export default function LotDetailDrawer({ lot, open, onClose }: LotDetailDrawerProps) {
  if (!lot) return null

  const expiryInfo = isLotExpiring(lot)
  const totalValue = lot.qtyBase * lot.costPerUnit

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh] overflow-y-auto">
        <DrawerHeader className="pb-4">
          <DrawerTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{lot.lotNumber}</span>
              <Badge className={lotStatusColors[lot.status]}>
                {lot.status?.replace('_', ' ') || lot.status}
              </Badge>
            </div>
          </DrawerTitle>
          <DrawerDescription>
            {lot.product?.name || 'Unknown Product'} • {lot.locationName}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
          {/* Quick Stats - Compact Header */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-700">{lot.qtyBase?.toLocaleString() || '0'}</div>
              <div className="text-xs text-blue-600">{lot.product?.baseUomName || 'EA'}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-700">${(totalValue || 0).toFixed(0)}</div>
              <div className="text-xs text-green-600">Total Value</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-700">${lot.costPerUnit?.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-purple-600">Unit Cost</div>
            </div>
            <div className={`rounded-lg p-3 ${expiryInfo.color}`}>
              <div className="text-lg font-bold">
                {expiryInfo.daysToExpiry !== null ?
                  (expiryInfo.daysToExpiry < 0 ? `${Math.abs(expiryInfo.daysToExpiry)}d ago` :
                   expiryInfo.daysToExpiry === 0 ? 'Today' : `${expiryInfo.daysToExpiry}d`) :
                  'No expiry'
                }
              </div>
              <div className="text-xs">Days to expiry</div>
            </div>
          </div>

          {/* All Information in Compact Layout */}
          <div className="space-y-3">
            {/* Product & Location Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Product
                </h4>
                <div className="space-y-1 text-sm">
                  <div><span className="font-mono text-xs text-muted-foreground">SKU:</span> {lot.product?.sku || '-'}</div>
                  <div className="font-medium">{lot.product?.name || 'Unknown Product'}</div>
                  <div className="text-xs text-muted-foreground">{lot.product?.categoryName || '-'}</div>
                  {lot.product?.perishable && (
                    <Badge variant="outline" className="text-xs">Perishable</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location & Supplier
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{lot.locationName}</div>
                  <div className="text-xs text-muted-foreground">{lot.locationType?.replace('_', ' ') || '-'}</div>
                  <div className="font-medium">{lot.supplierName || 'Unknown Supplier'}</div>
                  <div className="text-xs text-muted-foreground">ID: {lot.supplierId || '-'}</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates & IDs Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Received:</span>{' '}
                    {safeFormat(lot.receivedDate, 'MMM d, yyyy')}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Expiry:</span>{' '}
                    {lot.expiryDate ? safeFormat(lot.expiryDate, 'MMM d, yyyy') : 'No expiry'}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Updated:</span>{' '}
                    {safeFormat(lot.lastUpdated, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Identifiers
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Lot ID:</span>{' '}
                    <span className="font-mono text-xs">{lot.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Product ID:</span>{' '}
                    <span className="font-mono text-xs">{lot.productId}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Created:</span>{' '}
                    {safeFormat(lot.createdAt, 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            {/* Expiry Alert */}
            {expiryInfo.status !== 'none' && (
              <div className={`p-3 rounded-lg border ${
                expiryInfo.status === 'expired' ? 'bg-red-50 border-red-200 text-red-800' :
                expiryInfo.status === 'danger' ? 'bg-red-50 border-red-200 text-red-800' :
                expiryInfo.status === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : ''
              }`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Expiry Alert
                </div>
                <div className="text-sm mt-1">
                  {expiryInfo.daysToExpiry !== null && (
                    <>
                      {expiryInfo.daysToExpiry < 0
                        ? `This lot expired ${Math.abs(expiryInfo.daysToExpiry)} days ago`
                        : expiryInfo.daysToExpiry === 0
                        ? 'This lot expires today'
                        : `This lot will expire in ${expiryInfo.daysToExpiry} days`
                      }
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}