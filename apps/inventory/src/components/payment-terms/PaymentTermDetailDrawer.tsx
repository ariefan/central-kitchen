import { format } from 'date-fns'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  CreditCard,
  Calendar,
  Clock,
  Settings,
  FileText,
  Edit,
  Star,
  Users,
  TrendingUp,
  Info,
  CheckCircle,
  AlertTriangle,
  Calculator
} from 'lucide-react'

// Types
interface PaymentTerm {
  id: string
  code: string
  name: string
  description: string
  termType: 'net_days' | 'day_of_month' | 'day_following_month' | 'advance' | 'custom'
  settings: {
    netDays?: number
    dayOfMonth?: number
    cutoffDay?: number
    advancePercentage?: number
    advanceDays?: number
    customFormula?: string
  }
  isActive: boolean
  isDefault: boolean
  usageCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

// Mock usage data
const mockUsageData = [
  {
    id: '1',
    entityName: 'Fresh Produce Co.',
    entityType: 'supplier',
    lastOrderDate: '2024-01-18',
    totalOrders: 42,
    averagePaymentDays: 28
  },
  {
    id: '2',
    entityName: 'Dairy Farmers Supply',
    entityType: 'supplier',
    lastOrderDate: '2024-01-15',
    totalOrders: 15,
    averagePaymentDays: 30
  },
  {
    id: '3',
    entityName: 'City Restaurant Group',
    entityType: 'customer',
    lastOrderDate: '2024-01-20',
    totalOrders: 28,
    averagePaymentDays: 32
  }
]

// Mock recent invoices
const mockRecentInvoices = [
  {
    id: 'INV-2024-0189',
    entityName: 'Fresh Produce Co.',
    entityType: 'supplier',
    invoiceDate: '2024-01-18',
    dueDate: '2024-02-17',
    amount: 2450.00,
    status: 'pending',
    daysOverdue: 0
  },
  {
    id: 'INV-2024-0176',
    entityName: 'Dairy Farmers Supply',
    entityType: 'supplier',
    invoiceDate: '2024-01-15',
    dueDate: '2024-02-14',
    amount: 1820.50,
    status: 'paid',
    daysOverdue: -2
  },
  {
    id: 'INV-2024-0165',
    entityName: 'Meat & Poultry Wholesale',
    entityType: 'supplier',
    invoiceDate: '2024-01-10',
    dueDate: '2024-02-09',
    amount: 3200.00,
    status: 'overdue',
    daysOverdue: 3
  }
]

interface PaymentTermDetailDrawerProps {
  paymentTerm: PaymentTerm | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PaymentTermDetailDrawer({
  paymentTerm,
  open,
  onOpenChange
}: PaymentTermDetailDrawerProps) {
  if (!paymentTerm) return null

  const getTermTypeLabel = (termType: string) => {
    const labels = {
      net_days: 'Net Days',
      day_of_month: 'Day of Month',
      day_following_month: 'Following Month',
      advance: 'Advance Payment',
      custom: 'Custom'
    }
    return labels[termType as keyof typeof labels] || termType
  }

  const getTermTypeBadge = (termType: string) => {
    const colors = {
      net_days: 'bg-blue-100 text-blue-800',
      day_of_month: 'bg-green-100 text-green-800',
      day_following_month: 'bg-purple-100 text-purple-800',
      advance: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant="outline" className={colors[termType as keyof typeof colors]}>
        {getTermTypeLabel(termType)}
      </Badge>
    )
  }

  const getPaymentCalculation = () => {
    const today = new Date()
    const invoiceDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago

    switch (paymentTerm.termType) {
      case 'net_days':
        const dueDateNet = new Date(invoiceDate.getTime() + (paymentTerm.settings.netDays || 0) * 24 * 60 * 60 * 1000)
        return {
          example: `Invoice Jan ${invoiceDate.getDate()}, Due ${format(dueDateNet, 'MMM dd')}`,
          calculation: `Invoice date + ${paymentTerm.settings.netDays} days`
        }

      case 'day_of_month':
        return {
          example: `Invoice any time, Due on the ${paymentTerm.settings.dayOfMonth}th of current month`,
          calculation: `Payment due on day ${paymentTerm.settings.dayOfMonth} of current month`
        }

      case 'day_following_month':
        if (paymentTerm.settings.dayOfMonth) {
          return {
            example: `Invoice Jan ${invoiceDate.getDate()}, Due Feb ${paymentTerm.settings.dayOfMonth}`,
            calculation: `Payment due on day ${paymentTerm.settings.dayOfMonth} of following month`
          }
        } else {
          return {
            example: `Invoice Jan ${invoiceDate.getDate()}, Due end of February`,
            calculation: `Payment due by end of following month`
          }
        }

      case 'advance':
        return {
          example: `${paymentTerm.settings.advancePercentage}% payment required before delivery`,
          calculation: `${paymentTerm.settings.advancePercentage}% advance payment`
        }

      case 'custom':
        return {
          example: paymentTerm.settings.customFormula || 'Custom terms apply',
          calculation: paymentTerm.settings.customFormula || 'Custom formula'
        }

      default:
        return { example: 'N/A', calculation: 'N/A' }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      paid: 'secondary',
      overdue: 'destructive'
    }
    return variants[status as keyof typeof variants] || 'outline'
  }

  const getAveragePaymentPerformance = () => {
    const totalDays = mockUsageData.reduce((acc, item) => acc + item.averagePaymentDays, 0)
    const avgDays = Math.round(totalDays / mockUsageData.length)

    if (paymentTerm.termType === 'net_days') {
      const targetDays = paymentTerm.settings.netDays || 30
      const variance = avgDays - targetDays
      return {
        average: avgDays,
        target: targetDays,
        variance,
        performance: variance <= 2 ? 'good' : variance <= 5 ? 'fair' : 'poor'
      }
    }
    return { average: avgDays, target: 'N/A', variance: 0, performance: 'good' }
  }

  const paymentPerformance = getAveragePaymentPerformance()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{paymentTerm.name}</span>
                  {paymentTerm.isDefault && (
                    <Badge variant="outline" className="text-xs">DEFAULT</Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription>
                  {paymentTerm.code} • {paymentTerm.isActive ? 'Active' : 'Inactive'}
                </DrawerDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Term
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Info className="h-5 w-5" />
                      <span>Term Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="font-medium">Code</div>
                      <div className="text-sm text-muted-foreground">{paymentTerm.code}</div>
                    </div>
                    <div>
                      <div className="font-medium">Name</div>
                      <div className="text-sm text-muted-foreground">{paymentTerm.name}</div>
                    </div>
                    <div>
                      <div className="font-medium">Type</div>
                      <div className="mt-1">{getTermTypeBadge(paymentTerm.termType)}</div>
                    </div>
                    <div>
                      <div className="font-medium">Description</div>
                      <div className="text-sm text-muted-foreground">{paymentTerm.description}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calculator className="h-5 w-5" />
                      <span>Payment Calculation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="font-medium">Example</div>
                      <div className="text-sm text-muted-foreground">{getPaymentCalculation().example}</div>
                    </div>
                    <div>
                      <div className="font-medium">Formula</div>
                      <div className="text-sm text-muted-foreground">{getPaymentCalculation().calculation}</div>
                    </div>
                    <Separator />
                    <div className="flex items-center space-x-2">
                      {paymentTerm.isActive ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-sm">
                        Status: <strong>{paymentTerm.isActive ? 'Active' : 'Inactive'}</strong>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Usage Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{paymentTerm.usageCount}</div>
                      <div className="text-sm text-muted-foreground">Total Uses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{mockUsageData.length}</div>
                      <div className="text-sm text-muted-foreground">Active Entities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{paymentPerformance.average}d</div>
                      <div className="text-sm text-muted-foreground">Avg Payment Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {paymentTerm.lastUsed
                          ? format(new Date(paymentTerm.lastUsed), 'MMM dd')
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Last Used</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Entities Using This Term</CardTitle>
                  <CardDescription>
                    Suppliers and customers with this payment term
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Total Orders</TableHead>
                        <TableHead>Avg Payment Days</TableHead>
                        <TableHead>Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsageData.map((entity) => (
                        <TableRow key={entity.id}>
                          <TableCell className="font-medium">{entity.entityName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {entity.entityType}
                            </Badge>
                          </TableCell>
                          <TableCell>{entity.totalOrders}</TableCell>
                          <TableCell>{entity.averagePaymentDays} days</TableCell>
                          <TableCell>{format(new Date(entity.lastOrderDate), 'MMM dd, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              {/* Payment Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Performance Analysis</CardTitle>
                  <CardDescription>
                    How well entities are meeting this payment term
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{paymentPerformance.average} days</div>
                      <div className="text-sm text-muted-foreground">Average Payment Time</div>
                    </div>
                    {paymentPerformance.target !== 'N/A' && (
                      <>
                        <div className="text-center p-4 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{paymentPerformance.target} days</div>
                          <div className="text-sm text-muted-foreground">Target Payment Time</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                          <div className={`text-2xl font-bold ${
                            paymentPerformance.performance === 'good' ? 'text-green-600' :
                            paymentPerformance.performance === 'fair' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {paymentPerformance.variance > 0 ? '+' : ''}{paymentPerformance.variance} days
                          </div>
                          <div className="text-sm text-muted-foreground">Variance from Target</div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Latest invoices using this payment term
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Days Overdue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockRecentInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>{invoice.entityName}</TableCell>
                          <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              invoice.daysOverdue > 0 ? 'text-red-600' :
                              invoice.daysOverdue < 0 ? 'text-green-600' :
                              'text-gray-600'
                            }`}>
                              {invoice.daysOverdue > 0 ? '+' : ''}{invoice.daysOverdue}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detailed Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Created</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(paymentTerm.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Last Updated</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(paymentTerm.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">Configuration Details</div>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      {paymentTerm.termType === 'net_days' && (
                        <>
                          <div className="flex justify-between">
                            <span>Net Days:</span>
                            <span className="font-medium">{paymentTerm.settings.netDays} days</span>
                          </div>
                        </>
                      )}
                      {paymentTerm.termType === 'day_of_month' && (
                        <>
                          <div className="flex justify-between">
                            <span>Payment Day:</span>
                            <span className="font-medium">{paymentTerm.settings.dayOfMonth}th of month</span>
                          </div>
                        </>
                      )}
                      {paymentTerm.termType === 'day_following_month' && (
                        <>
                          {paymentTerm.settings.dayOfMonth && (
                            <div className="flex justify-between">
                              <span>Payment Day:</span>
                              <span className="font-medium">{paymentTerm.settings.dayOfMonth}th of following month</span>
                            </div>
                          )}
                          {paymentTerm.settings.cutoffDay !== undefined && (
                            <div className="flex justify-between">
                              <span>Cutoff Day:</span>
                              <span className="font-medium">
                                {paymentTerm.settings.cutoffDay === 0 ? 'End of month' : `${paymentTerm.settings.cutoffDay}th`}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      {paymentTerm.termType === 'advance' && (
                        <>
                          <div className="flex justify-between">
                            <span>Advance Percentage:</span>
                            <span className="font-medium">{paymentTerm.settings.advancePercentage}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Advance Required Within:</span>
                            <span className="font-medium">{paymentTerm.settings.advanceDays} days</span>
                          </div>
                        </>
                      )}
                      {paymentTerm.termType === 'custom' && (
                        <div>
                          <div className="font-medium mb-1">Custom Formula:</div>
                          <div className="text-sm bg-white p-2 rounded border">
                            {paymentTerm.settings.customFormula}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Default Term:</span>
                      <span className="font-medium">{paymentTerm.isDefault ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Active Status:</span>
                      <span className="font-medium">{paymentTerm.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Usage Count:</span>
                      <span className="font-medium">{paymentTerm.usageCount} transactions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}