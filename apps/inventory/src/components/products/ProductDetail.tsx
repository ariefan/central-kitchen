import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Edit, Package, Eye, DollarSign, Clock } from 'lucide-react'
import type { Product } from '@/types/inventory'
import { ProductKind } from '@/types/inventory'

interface ProductDetailProps {
  product: Product | null
  open: boolean
  onClose: () => void
  onEdit?: (product: Product) => void
}

const productKindColors: Record<ProductKind, string> = {
  [ProductKind.RAW_MATERIAL]: 'bg-blue-100 text-blue-800',
  [ProductKind.SEMI_FINISHED]: 'bg-purple-100 text-purple-800',
  [ProductKind.FINISHED_GOOD]: 'bg-green-100 text-green-800',
  [ProductKind.PACKAGING]: 'bg-orange-100 text-orange-800',
  [ProductKind.CONSUMABLE]: 'bg-gray-100 text-gray-800',
}

const stockStatusColors: Record<string, string> = {
  'in-stock': 'bg-green-100 text-green-800',
  'low-stock': 'bg-yellow-100 text-yellow-800',
  'out-of-stock': 'bg-red-100 text-red-800',
}

export default function ProductDetail({ product, open, onClose, onEdit }: ProductDetailProps) {
  if (!product) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{product.name}</span>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </SheetTitle>
          <SheetDescription>
            Product details and inventory information
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SKU</label>
                  <p className="font-mono">{product.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Kind</label>
                  <div className="mt-1">
                    <Badge className={productKindColors[product.kind]}>
                      {product.kind?.replace('_', ' ') || product.kind}
                    </Badge>
                  </div>
                </div>
              </div>

              {product.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{product.description}</p>
                </div>
              )}

              {product.categoryName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="mt-1">{product.categoryName}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                  <p className="text-2xl font-bold">{product.stock?.toLocaleString() || '0'}</p>
                  <div className="mt-1">
                    <Badge className={stockStatusColors[product.status || 'unknown']}>
                      {product.status?.replace('-', ' ') || product.status || 'Unknown'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Base UoM</label>
                  <p className="text-lg">{product.baseUomName}</p>
                </div>
              </div>

              {(product.minStockLevel !== undefined || product.maxStockLevel !== undefined) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    {product.minStockLevel !== undefined && product.minStockLevel !== null && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Min Stock Level</label>
                        <p className="text-lg">{product.minStockLevel.toLocaleString()}</p>
                      </div>
                    )}
                    {product.maxStockLevel !== undefined && product.maxStockLevel !== null && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Max Stock Level</label>
                        <p className="text-lg">{product.maxStockLevel.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Standard Cost</label>
                <p className="text-2xl font-bold">${product.stdCost?.toFixed(2) || '0.00'}</p>
              </div>

              {product.stock && product.stdCost && product.stock > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Value</label>
                  <p className="text-lg">
                    ${(product.stock * product.stdCost).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Flags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Perishable</span>
                </div>
                <Badge variant={product.perishable ? 'default' : 'secondary'}>
                  {product.perishable ? 'Yes' : 'No'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active</span>
                </div>
                <Badge variant={product.active ? 'default' : 'destructive'}>
                  {product.active ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">
                    {product.lastUpdated ? new Date(product.lastUpdated).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">
                    {product.createdAt ? new Date(product.createdAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}