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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import {
  Package,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Download,
  Edit,
  CheckCircle,
  Clock
} from 'lucide-react'

// Types
interface InventoryAdjustment {
  id: string
  documentNumber: string
  adjustmentType: 'positive' | 'negative'
  reasonCode: 'damage' | 'expiry' | 'theft' | 'found' | 'count_variance' | 'return' | 'other'
  reasonDescription: string
  referenceDocument?: string
  status: 'draft' | 'posted' | 'cancelled'
  adjustmentDate: string
  locationName: string
  locationCode: string
  lineItemCount: number
  totalQuantity: number
  totalValue: number
  postedAt?: string
  createdBy: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
  requiresSupervisorApproval: boolean
}

interface AdjustmentLine {
  id: string
  productName: string
  productCode: string
  locationBin: string
  systemQuantity: number
  adjustmentQuantity: number
  newQuantity: number
  unitCost: number
  adjustmentValue: number
  lotNumber?: string
  expiryDate?: string
  reasonDetail?: string
}

interface InventoryAdjustmentDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  adjustment: InventoryAdjustment
}

// Mock adjustment lines data
const generateMockAdjustmentLines = (adjustment: InventoryAdjustment): AdjustmentLine[] => {
  const items: AdjustmentLine[] = [
    {
      id: '1',
      productName: 'Fresh Tomatoes',
      productCode: 'TOM001',
      locationBin: 'A-01-01',
      systemQuantity: 50,
      adjustmentQuantity: adjustment.adjustmentType === 'positive' ? 5 : -8,
      newQuantity: adjustment.adjustmentType === 'positive' ? 55 : 42,
      unitCost: 2.50,
      adjustmentValue: adjustment.adjustmentType === 'positive' ? 12.50 : -20.00,
      lotNumber: 'LOT-001',
      expiryDate: '2024-01-25',
      reasonDetail: 'Package damage during handling',
    },
    {
      id: '2',
      productName: 'Whole Milk',
      productCode: 'MLK001',
      locationBin: 'B-02-03',
      systemQuantity: 100,
      adjustmentQuantity: adjustment.adjustmentType === 'positive' ? 2 : -12,
      newQuantity: adjustment.adjustmentType === 'positive' ? 102 : 88,
      unitCost: 3.20,
      adjustmentValue: adjustment.adjustmentType === 'positive' ? 6.40 : -38.40,
      lotNumber: 'LOT-002',
      expiryDate: '2024-01-20',
      reasonDetail: 'Temperature control failure',
    },
    {
      id: '3',
      productName: 'All-Purpose Flour',
      productCode: 'FLR001',
      locationBin: 'C-03-02',
      systemQuantity: 75,
      adjustmentQuantity: adjustment.adjustmentType === 'positive' ? 3 : -5,
      newQuantity: adjustment.adjustmentType === 'positive' ? 78 : 70,
      unitCost: 1.80,
      adjustmentValue: adjustment.adjustmentType === 'positive' ? 5.40 : -9.00,
      reasonDetail: 'Pest contamination discovered',
    },
  ]

  // For negative adjustments, show all items that were lost
  // For positive adjustments, show all items that were found
  return items
}

// Helper components
const StatusBadge = ({ status }: { status: InventoryAdjustment['status'] }) => {
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

  const icons = {
    draft: <Clock className="h-3 w-3" />,
    posted: <CheckCircle className="h-3 w-3" />,
    cancelled: <AlertTriangle className="h-3 w-3" />,
  }

  return (
    <Badge variant={variants[status]} className="flex items-center space-x-1">
      {icons[status]}
      <span>{labels[status]}</span>
    </Badge>
  )
}

const ReasonBadge = ({ reasonCode }: { reasonCode: InventoryAdjustment['reasonCode'] }) => {
  const variants = {
    damage: 'destructive',
    expiry: 'destructive',
    theft: 'destructive',
    found: 'default',
    count_variance: 'secondary',
    return: 'outline',
    other: 'secondary',
  } as const

  const labels = {
    damage: 'Damage',
    expiry: 'Expiry',
    theft: 'Theft',
    found: 'Found',
    count_variance: 'Count Variance',
    return: 'Return',
    other: 'Other',
  }

  const icons = {
    damage: <AlertTriangle className="h-3 w-3" />,
    expiry: <AlertTriangle className="h-3 w-3" />,
    theft: <AlertTriangle className="h-3 w-3" />,
    found: <TrendingUp className="h-3 w-3" />,
    count_variance: <Package className="h-3 w-3" />,
    return: <TrendingUp className="h-3 w-3" />,
    other: <FileText className="h-3 w-3" />,
  }

  return (
    <Badge variant={variants[reasonCode]} className="flex items-center space-x-1">
      {icons[reasonCode]}
      <span>{labels[reasonCode]}</span>
    </Badge>
  )
}

const TypeIndicator = ({ adjustmentType }: { adjustmentType: InventoryAdjustment['adjustmentType'] }) => {
  if (adjustmentType === 'positive') {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <TrendingUp className="h-4 w-4" />
        <span className="font-medium">Positive Adjustment</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <TrendingDown className="h-4 w-4" />
      <span className="font-medium">Negative Adjustment</span>
    </div>
  )
}

export default function InventoryAdjustmentDetailDrawer({
  open,
  onOpenChange,
  adjustment,
}: InventoryAdjustmentDetailDrawerProps) {
  const [adjustmentLines] = useState<AdjustmentLine[]>(generateMockAdjustmentLines(adjustment))

  const handleExport = () => {
    console.log('Exporting adjustment:', adjustment.documentNumber)
    // TODO: Implement export functionality
  }

  const handleEdit = () => {
    console.log('Editing adjustment:', adjustment.documentNumber)
    // TODO: Implement edit functionality
  }

  const handlePost = () => {
    console.log('Posting adjustment:', adjustment.documentNumber)
    // TODO: Implement post functionality
  }

  const hasNegativeStock = adjustmentLines.some(line => line.newQuantity < 0)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center space-x-2">
                <span>{adjustment.documentNumber}</span>
                <StatusBadge status={adjustment.status} />
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                {adjustment.reasonDescription}
              </DrawerDescription>
            </div>
            <div className="flex space-x-2">
              {adjustment.status === 'draft' && (
                <>
                  <Button variant="outline" onClick={handleEdit} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={handlePost} size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post Adjustment
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleExport} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Adjustment Items</TabsTrigger>
              <TabsTrigger value="impact">Value Impact</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Adjustment Type</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <TypeIndicator adjustmentType={adjustment.adjustmentType} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reason</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <ReasonBadge reasonCode={adjustment.reasonCode} />
                      <p className="text-sm text-gray-600">{adjustment.reasonDescription}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Location</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{adjustment.locationName}</div>
                    <div className="text-sm text-muted-foreground">{adjustment.locationCode}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Impact</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {adjustment.adjustmentType === 'positive' ? '+' : ''}${adjustment.totalValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {adjustment.lineItemCount} items
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Adjustment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Document Number:</span>
                      <span className="font-medium">{adjustment.documentNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <StatusBadge status={adjustment.status} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Adjustment Date:</span>
                      <span className="font-medium">
                        {format(new Date(adjustment.adjustmentDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Quantity:</span>
                      <span className={`font-medium ${
                        adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adjustment.adjustmentType === 'positive' ? '+' : ''}{adjustment.totalQuantity}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Created By:</span>
                      <span className="font-medium">{adjustment.createdBy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Created At:</span>
                      <span className="font-medium">
                        {format(new Date(adjustment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {adjustment.postedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Posted At:</span>
                        <span className="font-medium">
                          {format(new Date(adjustment.postedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {adjustment.referenceDocument && (
                      <div className="flex justify-between text-sm">
                        <span>Reference Doc:</span>
                        <span className="font-medium">{adjustment.referenceDocument}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Approval Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Requires Supervisor Approval:</span>
                      <Badge variant={adjustment.requiresSupervisorApproval ? 'default' : 'secondary'}>
                        {adjustment.requiresSupervisorApproval ? 'Required' : 'Not Required'}
                      </Badge>
                    </div>
                    {adjustment.approvedBy && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Approved By:</span>
                          <span className="font-medium">{adjustment.approvedBy}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Approved At:</span>
                          <span className="font-medium">
                            {format(new Date(adjustment.approvedAt!), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                      </>
                    )}
                    {hasNegativeStock && (
                      <div className="p-3 border rounded-lg bg-red-50">
                        <div className="flex items-center space-x-2 text-red-800">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Negative Stock Warning</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">
                          Some items will have negative quantities after this adjustment
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {adjustment.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{adjustment.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Adjustment Items Tab */}
            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Adjustment Line Items</CardTitle>
                  <CardDescription>
                    Items included in this inventory adjustment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">System Qty</TableHead>
                        <TableHead className="text-right">Adjustment</TableHead>
                        <TableHead className="text-right">New Qty</TableHead>
                        <TableHead className="text-right">Value Impact</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adjustmentLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{line.productName}</div>
                              <div className="text-sm text-muted-foreground">{line.productCode}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{line.locationBin}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {line.systemQuantity}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adjustment.adjustmentType === 'positive' ? '+' : ''}{line.adjustmentQuantity}
                          </TableCell>
                          <TableCell className={`text-right ${
                            line.newQuantity < 0 ? 'text-red-600 font-medium' : ''
                          }`}>
                            {line.newQuantity}
                            {line.newQuantity < 0 && (
                              <div className="text-xs">Negative!</div>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adjustment.adjustmentType === 'positive' ? '+' : ''}${line.adjustmentValue.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {line.lotNumber && (
                                <div className="text-xs">
                                  <span className="font-medium">Lot:</span> {line.lotNumber}
                                </div>
                              )}
                              {line.expiryDate && (
                                <div className="text-xs">
                                  <span className="font-medium">Exp:</span> {format(new Date(line.expiryDate), 'MMM dd, yyyy')}
                                </div>
                              )}
                              {line.reasonDetail && (
                                <div className="text-xs text-gray-600 italic">
                                  {line.reasonDetail}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Value Impact Tab */}
            <TabsContent value="impact" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Summary Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {adjustment.lineItemCount}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Items</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className={`text-2xl font-bold ${
                          adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {adjustment.adjustmentType === 'positive' ? '+' : ''}{adjustment.totalQuantity}
                        </div>
                        <div className="text-sm text-muted-foreground">Quantity Change</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Value Impact:</span>
                        <span className={`font-medium text-lg ${
                          adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {adjustment.adjustmentType === 'positive' ? '+' : ''}${adjustment.totalValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Average Impact per Item:</span>
                        <span className="font-medium">
                          ${adjustment.lineItemCount > 0 ? (adjustment.totalValue / adjustment.lineItemCount).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`p-3 rounded-lg ${
                      hasNegativeStock ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                    }`}>
                      <div className={`flex items-center space-x-2 ${
                        hasNegativeStock ? 'text-red-800' : 'text-green-800'
                      }`}>
                        {hasNegativeStock ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                        <span className="font-medium">
                          {hasNegativeStock ? 'High Risk' : 'Low Risk'}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        hasNegativeStock ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {hasNegativeStock
                          ? 'This adjustment creates negative inventory levels that require immediate attention.'
                          : 'This adjustment maintains positive inventory levels.'
                        }
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Requires Approval:</span>
                        <Badge variant={adjustment.requiresSupervisorApproval ? 'destructive' : 'secondary'}>
                          {adjustment.requiresSupervisorApproval ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <StatusBadge status={adjustment.status} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Reference Document:</span>
                        <span className="font-medium">
                          {adjustment.referenceDocument || 'None'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Impact Analysis by Product</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adjustmentLines.map((line) => (
                      <div key={line.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{line.productName}</div>
                          <div className="text-sm text-muted-foreground">
                            {line.productCode} • {line.locationBin}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${
                            adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adjustment.adjustmentType === 'positive' ? '+' : ''}{line.adjustmentQuantity} qty
                          </div>
                          <div className={`text-sm ${
                            adjustment.adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {adjustment.adjustmentType === 'positive' ? '+' : ''}${line.adjustmentValue.toFixed(2)}
                          </div>
                          {line.newQuantity < 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              Results in negative stock
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {adjustment.status === 'draft' && (
              <Button onClick={handlePost}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Post Adjustment
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
