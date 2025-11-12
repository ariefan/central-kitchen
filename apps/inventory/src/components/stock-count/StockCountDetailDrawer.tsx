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
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import {
  Package,
  MapPin,
  Calendar,
  User,
  Calculator,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  BarChart3,
  Download,
  Edit,
  Play
} from 'lucide-react'

// Types
interface StockCount {
  id: string
  documentNumber: string
  description: string
  status: 'draft' | 'in-progress' | 'completed' | 'variance-review' | 'approved' | 'cancelled'
  countType: 'full' | 'partial' | 'cycle' | 'spot'
  locationName: string
  locationCode: string
  categoryScope?: string
  totalItems: number
  countedItems: number
  varianceCount: number
  totalValue: number
  varianceValue: number
  variancePercentage: number
  scheduledDate: string
  startedAt?: string
  completedAt?: string
  approvedBy?: string
  approvedAt?: string
  createdBy: string
  createdAt: string
  notes?: string
  requiresSupervisorApproval: boolean
}

interface StockCountLine {
  id: string
  productName: string
  productCode: string
  category: string
  locationBin: string
  systemQuantity: number
  countedQuantity?: number
  variance: number
  unitCost: number
  systemValue: number
  countedValue?: number
  varianceValue: number
  variancePercentage: number
  isPerishable: boolean
  lotNumber?: string
  expiryDate?: string
  countedAt?: string
  countedBy?: string
  notes?: string
}

interface StockCountDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stockCount: StockCount
}

// Mock count lines data
const generateMockCountLines = (stockCount: StockCount): StockCountLine[] => {
  const items: StockCountLine[] = [
    {
      id: '1',
      productName: 'Fresh Tomatoes',
      productCode: 'TOM001',
      category: 'Produce',
      locationBin: 'A-01-01',
      systemQuantity: 50,
      countedQuantity: stockCount.status !== 'draft' ? 48 : undefined,
      variance: stockCount.status !== 'draft' ? -2 : 0,
      unitCost: 2.50,
      systemValue: 125.00,
      countedValue: stockCount.status !== 'draft' ? 120.00 : undefined,
      varianceValue: stockCount.status !== 'draft' ? -5.00 : 0,
      variancePercentage: stockCount.status !== 'draft' ? -4.0 : 0,
      isPerishable: true,
      lotNumber: 'LOT-001',
      expiryDate: '2024-01-25',
      countedAt: stockCount.status !== 'draft' ? '2024-01-15T10:30:00Z' : undefined,
      countedBy: stockCount.status !== 'draft' ? 'John Smith' : undefined,
    },
    {
      id: '2',
      productName: 'Whole Milk',
      productCode: 'MLK001',
      category: 'Dairy',
      locationBin: 'B-02-03',
      systemQuantity: 100,
      countedQuantity: stockCount.status !== 'draft' ? 100 : undefined,
      variance: 0,
      unitCost: 3.20,
      systemValue: 320.00,
      countedValue: stockCount.status !== 'draft' ? 320.00 : undefined,
      varianceValue: 0,
      variancePercentage: 0,
      isPerishable: true,
      lotNumber: 'LOT-002',
      expiryDate: '2024-01-20',
      countedAt: stockCount.status !== 'draft' ? '2024-01-15T11:00:00Z' : undefined,
      countedBy: stockCount.status !== 'draft' ? 'Jane Doe' : undefined,
    },
    {
      id: '3',
      productName: 'All-Purpose Flour',
      productCode: 'FLR001',
      category: 'Dry Goods',
      locationBin: 'C-03-02',
      systemQuantity: 75,
      countedQuantity: stockCount.status !== 'draft' ? 78 : undefined,
      variance: stockCount.status !== 'draft' ? 3 : 0,
      unitCost: 1.80,
      systemValue: 135.00,
      countedValue: stockCount.status !== 'draft' ? 140.40 : undefined,
      varianceValue: stockCount.status !== 'draft' ? 5.40 : 0,
      variancePercentage: stockCount.status !== 'draft' ? 4.0 : 0,
      isPerishable: false,
      countedAt: stockCount.status !== 'draft' ? '2024-01-15T11:30:00Z' : undefined,
      countedBy: stockCount.status !== 'draft' ? 'Bob Johnson' : undefined,
    },
    {
      id: '4',
      productName: 'Chicken Breast',
      productCode: 'CHK001',
      category: 'Meat',
      locationBin: 'D-04-01',
      systemQuantity: 25,
      countedQuantity: stockCount.status !== 'draft' ? 22 : undefined,
      variance: stockCount.status !== 'draft' ? -3 : 0,
      unitCost: 8.50,
      systemValue: 212.50,
      countedValue: stockCount.status !== 'draft' ? 187.00 : undefined,
      varianceValue: stockCount.status !== 'draft' ? -25.50 : 0,
      variancePercentage: stockCount.status !== 'draft' ? -12.0 : 0,
      isPerishable: true,
      lotNumber: 'LOT-003',
      expiryDate: '2024-01-22',
      countedAt: stockCount.status !== 'draft' ? '2024-01-15T12:00:00Z' : undefined,
      countedBy: stockCount.status !== 'draft' ? 'Sarah Smith' : undefined,
    },
  ]

  // For draft status, show only a subset
  if (stockCount.status === 'draft') {
    return items.slice(0, 2)
  }

  return items
}

// Helper components
const StatusBadge = ({ status }: { status: StockCount['status'] }) => {
  const variants = {
    draft: 'secondary',
    'in-progress': 'default',
    completed: 'outline',
    'variance-review': 'destructive',
    approved: 'default',
    cancelled: 'destructive',
  } as const

  const labels = {
    draft: 'Draft',
    'in-progress': 'In Progress',
    completed: 'Completed',
    'variance-review': 'Variance Review',
    approved: 'Approved',
    cancelled: 'Cancelled',
  }

  const icons = {
    draft: <Clock className="h-3 w-3" />,
    'in-progress': <Calculator className="h-3 w-3" />,
    completed: <CheckCircle className="h-3 w-3" />,
    'variance-review': <AlertTriangle className="h-3 w-3" />,
    approved: <CheckCircle className="h-3 w-3" />,
    cancelled: <AlertTriangle className="h-3 w-3" />,
  }

  return (
    <Badge variant={variants[status]} className="flex items-center space-x-1">
      {icons[status]}
      <span>{labels[status]}</span>
    </Badge>
  )
}

const VarianceIndicator = ({ variancePercentage }: { variancePercentage: number }) => {
  if (variancePercentage === 0) {
    return (
      <div className="flex items-center space-x-1 text-green-600">
        <Minus className="h-4 w-4" />
        <span>No variance</span>
      </div>
    )
  }

  if (variancePercentage > 0) {
    return (
      <div className="flex items-center space-x-1 text-blue-600">
        <TrendingUp className="h-4 w-4" />
        <span>+{variancePercentage.toFixed(2)}%</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1 text-red-600">
      <TrendingDown className="h-4 w-4" />
      <span>{variancePercentage.toFixed(2)}%</span>
    </div>
  )
}

const ProgressBar = ({ counted, total }: { counted: number; total: number }) => {
  const percentage = total > 0 ? (counted / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{counted} of {total} items</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}

export default function StockCountDetailDrawer({
  open,
  onOpenChange,
  stockCount,
}: StockCountDetailDrawerProps) {
  const [countLines] = useState<StockCountLine[]>(generateMockCountLines(stockCount))

  const countTypeLabels = {
    full: 'Full Count',
    partial: 'Partial Count',
    cycle: 'Cycle Count',
    spot: 'Spot Check',
  }

  const handleStartCount = () => {
    console.log('Starting count for:', stockCount.documentNumber)
    // TODO: Implement start count functionality
  }

  const handleContinueCount = () => {
    console.log('Continuing count for:', stockCount.documentNumber)
    // TODO: Implement continue count functionality
  }

  const handleExport = () => {
    console.log('Exporting count:', stockCount.documentNumber)
    // TODO: Implement export functionality
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="flex items-center space-x-2">
                <span>{stockCount.documentNumber}</span>
                <StatusBadge status={stockCount.status} />
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                {stockCount.description}
              </DrawerDescription>
            </div>
            <div className="flex space-x-2">
              {stockCount.status === 'draft' && (
                <Button onClick={handleStartCount} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Count
                </Button>
              )}
              {stockCount.status === 'in-progress' && (
                <Button onClick={handleContinueCount} size="sm">
                  <Calculator className="h-4 w-4 mr-2" />
                  Continue Counting
                </Button>
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
              <TabsTrigger value="items">Count Items</TabsTrigger>
              <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Count Type</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {countTypeLabels[stockCount.countType]}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Location</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{stockCount.locationName}</div>
                    <div className="text-sm text-muted-foreground">{stockCount.locationCode}</div>
                    {stockCount.categoryScope && (
                      <Badge variant="secondary" className="mt-1">
                        {stockCount.categoryScope}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Progress</CardTitle>
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <ProgressBar counted={stockCount.countedItems} total={stockCount.totalItems} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Variance</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <VarianceIndicator variancePercentage={stockCount.variancePercentage} />
                    <div className="text-sm text-muted-foreground mt-1">
                      {stockCount.varianceCount} items affected
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Count Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Document Number:</span>
                      <span className="font-medium">{stockCount.documentNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <StatusBadge status={stockCount.status} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Scheduled Date:</span>
                      <span className="font-medium">
                        {format(new Date(stockCount.scheduledDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Created By:</span>
                      <span className="font-medium">{stockCount.createdBy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Created At:</span>
                      <span className="font-medium">
                        {format(new Date(stockCount.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {stockCount.startedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Started At:</span>
                        <span className="font-medium">
                          {format(new Date(stockCount.startedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {stockCount.completedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Completed At:</span>
                        <span className="font-medium">
                          {format(new Date(stockCount.completedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Count Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Total Items:</span>
                      <span className="font-medium">{stockCount.totalItems}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items Counted:</span>
                      <span className="font-medium">{stockCount.countedItems}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items with Variance:</span>
                      <span className="font-medium">{stockCount.varianceCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Value:</span>
                      <span className="font-medium">
                        ${stockCount.totalValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Variance Value:</span>
                      <span className={`font-medium ${stockCount.varianceValue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${Math.abs(stockCount.varianceValue).toFixed(2)}
                        {stockCount.varianceValue >= 0 ? ' (Surplus)' : ' (Shortage)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Supervisor Approval:</span>
                      <Badge variant={stockCount.requiresSupervisorApproval ? 'default' : 'secondary'}>
                        {stockCount.requiresSupervisorApproval ? 'Required' : 'Not Required'}
                      </Badge>
                    </div>
                    {stockCount.approvedBy && (
                      <div className="flex justify-between text-sm">
                        <span>Approved By:</span>
                        <span className="font-medium">{stockCount.approvedBy}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {stockCount.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{stockCount.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Count Items Tab */}
            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Count Items</CardTitle>
                  <CardDescription>
                    {stockCount.status === 'draft'
                      ? 'Items to be counted (system snapshot)'
                      : 'Counted items with variances'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">System Qty</TableHead>
                        {stockCount.status !== 'draft' && (
                          <TableHead className="text-right">Counted Qty</TableHead>
                        )}
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Perishable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{line.productName}</div>
                              <div className="text-sm text-muted-foreground">{line.productCode}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{line.locationBin}</div>
                              <div className="text-sm text-muted-foreground">{line.category}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {line.systemQuantity}
                          </TableCell>
                          {stockCount.status !== 'draft' && (
                            <TableCell className="text-right">
                              {line.countedQuantity || '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <VarianceIndicator variancePercentage={line.variancePercentage} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <div className="font-medium">
                                ${stockCount.status !== 'draft' && line.countedValue
                                  ? line.countedValue.toFixed(2)
                                  : line.systemValue.toFixed(2)
                                }
                              </div>
                              {line.varianceValue !== 0 && stockCount.status !== 'draft' && (
                                <div className={`text-sm ${line.varianceValue >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                  {line.varianceValue >= 0 ? '+' : ''}{line.varianceValue.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={line.isPerishable ? 'default' : 'secondary'}>
                                {line.isPerishable ? 'Yes' : 'No'}
                              </Badge>
                              {line.isPerishable && line.expiryDate && (
                                <div className="text-xs text-muted-foreground">
                                  Exp: {format(new Date(line.expiryDate), 'MMM dd, yyyy')}
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

            {/* Variance Analysis Tab */}
            <TabsContent value="variance" className="space-y-4">
              {stockCount.status === 'draft' ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Variance Data</h3>
                      <p className="text-muted-foreground">
                        Variance analysis will be available once counting begins and items are counted.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Variance Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {countLines.filter(l => l.variance > 0).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Surplus Items</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {countLines.filter(l => line.variance < 0).length}
                          </div>
                          <div className="text-sm text-muted-foreground">Shortage Items</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Surplus Value:</span>
                          <span className="font-medium text-blue-600">
                            ${countLines.filter(l => l.variance > 0).reduce((sum, l) => sum + l.varianceValue, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Shortage Value:</span>
                          <span className="font-medium text-red-600">
                            ${Math.abs(countLines.filter(l => l.variance < 0).reduce((sum, l) => sum + l.varianceValue, 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-medium pt-2 border-t">
                          <span>Net Variance:</span>
                          <span className={stockCount.varianceValue >= 0 ? 'text-blue-600' : 'text-red-600'}>
                            ${Math.abs(stockCount.varianceValue).toFixed(2)}
                            {stockCount.varianceValue >= 0 ? ' (Surplus)' : ' (Shortage)'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Variance by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Array.from(new Set(countLines.map(l => l.category))).map(category => {
                          const categoryLines = countLines.filter(l => l.category === category)
                          const totalVariance = categoryLines.reduce((sum, l) => sum + Math.abs(l.varianceValue), 0)
                          const variancePercentage = categoryLines.reduce((sum, l) => sum + Math.abs(l.variancePercentage), 0) / categoryLines.length

                          return (
                            <div key={category} className="flex justify-between items-center p-3 border rounded-lg">
                              <div>
                                <div className="font-medium">{category}</div>
                                <div className="text-sm text-muted-foreground">
                                  {categoryLines.length} items
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">${totalVariance.toFixed(2)}</div>
                                <div className="text-sm text-muted-foreground">
                                  {variancePercentage.toFixed(2)}% avg variance
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {stockCount.status === 'draft' && (
              <Button onClick={handleStartCount}>
                <Play className="h-4 w-4 mr-2" />
                Start Count
              </Button>
            )}
            {stockCount.status === 'in-progress' && (
              <Button onClick={handleContinueCount}>
                <Calculator className="h-4 w-4 mr-2" />
                Continue Counting
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}