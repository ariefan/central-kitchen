import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { format } from 'date-fns'
import {
  FileText,
  Package,
  Calendar,
  User,
  MapPin,
  DollarSign,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

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
  notes?: string
  invoiceNumber?: string
  lineItems: Array<{
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

interface GoodsReceiptDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goodsReceipt: GoodsReceipt
}

// Mock ledger data - would come from API
const generateLedgerData = (gr: GoodsReceipt) => {
  const entries = []

  // Initial stock levels
  gr.lineItems.forEach(item => {
    entries.push({
      id: `initial-${item.id}`,
      transactionType: 'Opening Balance',
      documentReference: '-',
      quantity: 0,
      unitCost: item.unitCost,
      value: 0,
      balanceQuantity: 0,
      balanceValue: 0,
      transactionDate: gr.createdAt,
      notes: `Starting balance for ${item.productName}`,
    })
  })

  // Goods receipt posting
  gr.lineItems.forEach(item => {
    entries.push({
      id: `gr-${item.id}`,
      transactionType: 'Goods Receipt',
      documentReference: gr.documentNumber,
      quantity: item.quantity,
      unitCost: item.unitCost,
      value: item.totalCost,
      balanceQuantity: item.quantity,
      balanceValue: item.totalCost,
      transactionDate: gr.postedAt || gr.createdAt,
      notes: item.lotNumber ? `Lot: ${item.lotNumber}` : 'Received inventory',
    })
  })

  // Mock inventory movements after GR
  gr.lineItems.slice(0, 2).forEach(item => {
    entries.push({
      id: `usage-${item.id}`,
      transactionType: 'Usage',
      documentReference: 'PRD-001',
      quantity: -Math.floor(item.quantity * 0.3),
      unitCost: item.unitCost,
      value: -Math.floor(item.quantity * 0.3 * item.unitCost * 100) / 100,
      balanceQuantity: item.quantity - Math.floor(item.quantity * 0.3),
      balanceValue: item.totalCost - Math.floor(item.quantity * 0.3 * item.unitCost * 100) / 100,
      transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Production consumption',
    })
  })

  return entries.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime())
}

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

  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    posted: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <Badge variant={variants[status]} className={colors[status]}>
      {labels[status]}
    </Badge>
  )
}

export default function GoodsReceiptDetailDrawer({
  open,
  onOpenChange,
  goodsReceipt
}: GoodsReceiptDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('details')
  const ledgerData = generateLedgerData(goodsReceipt)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full max-w-4xl">
        <DrawerHeader>
          <DrawerTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{goodsReceipt.documentNumber}</span>
            <StatusBadge status={goodsReceipt.status} />
          </DrawerTitle>
          <DrawerDescription>
            View detailed information and inventory ledger for this goods receipt
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="ledger">Inventory Ledger</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Receipt Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Receipt Date:</span>
                      <span>{format(new Date(goodsReceipt.receiptDate), 'MMM dd, yyyy')}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Created By:</span>
                      <span>{goodsReceipt.createdBy}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Created:</span>
                      <span>{format(new Date(goodsReceipt.createdAt), 'MMM dd, yyyy HH:mm')}</span>
                    </div>

                    {goodsReceipt.postedAt && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Posted:</span>
                        <span>{format(new Date(goodsReceipt.postedAt), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}

                    {goodsReceipt.invoiceNumber && (
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Invoice:</span>
                        <span>{goodsReceipt.invoiceNumber}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Supplier Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Name:</span>
                      <span>{goodsReceipt.supplierName}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">Code:</span>
                      <span>{goodsReceipt.supplierCode}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{goodsReceipt.lineItemCount}</div>
                    <p className="text-xs text-gray-500">Line items</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${goodsReceipt.totalAmount.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">Receipt value</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${(goodsReceipt.totalAmount / goodsReceipt.lineItemCount).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500">Per item</p>
                  </CardContent>
                </Card>
              </div>

              {goodsReceipt.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{goodsReceipt.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Line Items Tab */}
            <TabsContent value="items">
              <Card>
                <CardHeader>
                  <CardTitle>Line Items ({goodsReceipt.lineItemCount})</CardTitle>
                  <CardDescription>
                    Detailed breakdown of all items received in this goods receipt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Lot Info</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goodsReceipt.lineItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.productName}</div>
                              <div className="text-sm text-gray-500">{item.productCode}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            ${item.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.lotNumber ? (
                              <div>
                                <div className="text-sm font-medium">{item.lotNumber}</div>
                                {item.expiryDate && (
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(item.expiryDate), 'MMM dd, yyyy')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">No lot</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.isPerishable ? (
                              <Badge variant="outline" className="text-xs">Perishable</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Standard</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ledger Tab */}
            <TabsContent value="ledger">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Ledger</CardTitle>
                  <CardDescription>
                    Complete transaction history for items in this goods receipt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead className="text-right">Balance Qty</TableHead>
                        <TableHead className="text-right">Balance Value</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(entry.transactionDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={entry.transactionType === 'Goods Receipt' ? 'default' :
                                     entry.transactionType === 'Usage' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {entry.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {entry.documentReference}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`flex items-center justify-end space-x-1 ${
                              entry.quantity < 0 ? 'text-red-600' : entry.quantity > 0 ? 'text-green-600' : ''
                            }`}>
                              {entry.quantity !== 0 && (
                                entry.quantity > 0 ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )
                              )}
                              <span className="font-mono">
                                {Math.abs(entry.quantity).toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${entry.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <div className={`flex items-center justify-end space-x-1 ${
                              entry.value < 0 ? 'text-red-600' : entry.value > 0 ? 'text-green-600' : ''
                            }`}>
                              {entry.value !== 0 && (
                                entry.value > 0 ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )
                              )}
                              <span>
                                ${Math.abs(entry.value).toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {entry.balanceQuantity.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${entry.balanceValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs">
                            {entry.notes}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {goodsReceipt.status === 'posted' && (
            <Button onClick={() => {
              // TODO: Print/export functionality
              console.log('Export goods receipt:', goodsReceipt.documentNumber)
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Export/Print
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}