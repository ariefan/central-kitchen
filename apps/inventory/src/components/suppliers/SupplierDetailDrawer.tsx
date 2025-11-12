import { useState } from 'react'
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
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  Star,
  Calendar,
  Clock,
  FileText,
  Edit,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  CreditCard,
  Truck
} from 'lucide-react'

// Types (reused from index)
interface Supplier {
  id: string
  code: string
  name: string
  legalName: string
  status: 'active' | 'inactive' | 'suspended' | 'under_review'
  contactInfo: {
    primaryContact: string
    email: string
    phone: string
    mobile?: string
    website?: string
  }
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  businessDetails: {
    taxId: string
    paymentTerms: string
    currency: string
    leadTimeDays: number
    minimumOrderValue: number
  }
  performance: {
    rating: number
    onTimeDelivery: number
    qualityScore: number
    lastOrderDate?: string
    totalOrders: number
    activeSince: string
  }
  categories: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

// Mock recent orders
const mockRecentOrders = [
  {
    id: 'PO-2024-0189',
    date: '2024-01-18',
    items: 12,
    total: 2450.00,
    status: 'delivered',
    deliveryDate: '2024-01-20',
    onTime: true
  },
  {
    id: 'PO-2024-0176',
    date: '2024-01-15',
    items: 8,
    total: 1820.50,
    status: 'delivered',
    deliveryDate: '2024-01-17',
    onTime: true
  },
  {
    id: 'PO-2024-0165',
    date: '2024-01-10',
    items: 15,
    total: 3200.00,
    status: 'delivered',
    deliveryDate: '2024-01-13',
    onTime: false
  },
  {
    id: 'PO-2024-0152',
    date: '2024-01-05',
    items: 6,
    total: 1450.75,
    status: 'delivered',
    deliveryDate: '2024-01-06',
    onTime: true
  }
]

// Mock products
const mockProducts = [
  {
    id: '1',
    code: 'PROD-001',
    name: 'Organic Tomatoes',
    category: 'Produce',
    unitPrice: 2.50,
    lastOrderDate: '2024-01-18',
    orderFrequency: 'weekly'
  },
  {
    id: '2',
    code: 'PROD-015',
    name: 'Fresh Lettuce',
    category: 'Vegetables',
    unitPrice: 1.80,
    lastOrderDate: '2024-01-15',
    orderFrequency: 'bi-weekly'
  },
  {
    id: '3',
    code: 'PROD-032',
    name: 'Red Apples',
    category: 'Fruits',
    unitPrice: 3.20,
    lastOrderDate: '2024-01-10',
    orderFrequency: 'weekly'
  }
]

interface SupplierDetailDrawerProps {
  supplier: Supplier | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SupplierDetailDrawer({
  supplier,
  open,
  onOpenChange
}: SupplierDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('details')

  if (!supplier) return null

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive',
      under_review: 'outline'
    }
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      under_review: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className={colors[status as keyof typeof colors]}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getPerformanceColor = (value: number, good: number = 4.0) => {
    if (value >= good) return 'text-green-600'
    if (value >= good - 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getOTDColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600'
    if (percentage >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{supplier.name}</span>
                  {getStatusBadge(supplier.status)}
                </DrawerTitle>
                <DrawerDescription>
                  {supplier.code} • {supplier.legalName}
                </DrawerDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Supplier
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{supplier.contactInfo.primaryContact}</div>
                        <div className="text-sm text-muted-foreground">Primary Contact</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{supplier.contactInfo.email}</div>
                        <div className="text-sm text-muted-foreground">Email</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{supplier.contactInfo.phone}</div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                      </div>
                    </div>
                    {supplier.contactInfo.mobile && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{supplier.contactInfo.mobile}</div>
                          <div className="text-sm text-muted-foreground">Mobile</div>
                        </div>
                      </div>
                    )}
                    {supplier.contactInfo.website && (
                      <div className="flex items-center space-x-3">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-blue-600 hover:underline">
                            {supplier.contactInfo.website}
                          </div>
                          <div className="text-sm text-muted-foreground">Website</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <div className="font-medium">{supplier.address.line1}</div>
                        {supplier.address.line2 && (
                          <div className="font-medium">{supplier.address.line2}</div>
                        )}
                        <div className="text-muted-foreground">
                          {supplier.address.city}, {supplier.address.state} {supplier.address.postalCode}
                        </div>
                        <div className="text-muted-foreground">{supplier.address.country}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Business Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Tax ID</span>
                      </div>
                      <span className="font-medium">{supplier.businessDetails.taxId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Payment Terms</span>
                      </div>
                      <span className="font-medium">{supplier.businessDetails.paymentTerms}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Currency</span>
                      </div>
                      <span className="font-medium">{supplier.businessDetails.currency}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Lead Time</span>
                      </div>
                      <span className="font-medium">{supplier.businessDetails.leadTimeDays} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Min Order Value</span>
                      </div>
                      <span className="font-medium">${supplier.businessDetails.minimumOrderValue}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Product Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {supplier.categories.map((category) => (
                        <Badge key={category} variant="outline">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {supplier.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{supplier.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getPerformanceColor(supplier.performance.rating)}`}>
                      {supplier.performance.rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Out of 5.0 stars
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getOTDColor(supplier.performance.onTimeDelivery)}`}>
                      {supplier.performance.onTimeDelivery}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Delivery reliability
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getPerformanceColor(supplier.performance.qualityScore)}`}>
                      {supplier.performance.qualityScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Product quality rating
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance History */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>
                    Key metrics and relationship history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{supplier.performance.totalOrders}</div>
                      <div className="text-sm text-muted-foreground">Total Orders</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {format(new Date(supplier.performance.activeSince), 'MMM yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">Active Since</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {supplier.performance.lastOrderDate
                          ? format(new Date(supplier.performance.lastOrderDate), 'MMM dd')
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Last Order</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{supplier.businessDetails.leadTimeDays}d</div>
                      <div className="text-sm text-muted-foreground">Avg Lead Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Products Supplied</CardTitle>
                  <CardDescription>
                    Products regularly sourced from this supplier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Last Order</TableHead>
                        <TableHead>Frequency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">{product.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{product.category}</Badge>
                          </TableCell>
                          <TableCell>${product.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            {format(new Date(product.lastOrderDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="capitalize">{product.orderFrequency}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Last 10 purchase orders from this supplier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Delivery</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockRecentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{format(new Date(order.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{order.items}</TableCell>
                          <TableCell>${order.total.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={order.status === 'delivered' ? 'default' : 'secondary'}
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              {order.onTime ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="text-sm">
                                {format(new Date(order.deliveryDate), 'MMM dd')}
                              </span>
                            </div>
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
      </DrawerContent>
    </Drawer>
  )
}