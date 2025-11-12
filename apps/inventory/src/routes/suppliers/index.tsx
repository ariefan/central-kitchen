import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search, Phone, Mail, MapPin, Star, Clock, AlertTriangle, Users, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import SupplierDetailDrawer from '@/components/suppliers/SupplierDetailDrawer'
import SupplierForm from '@/components/suppliers/SupplierForm'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// Types
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

// Mock data
const mockSuppliers: Supplier[] = [
  {
    id: '1',
    code: 'SUP-001',
    name: 'Fresh Produce Co.',
    legalName: 'Fresh Produce Company LLC',
    status: 'active',
    contactInfo: {
      primaryContact: 'John Smith',
      email: 'orders@freshproduce.com',
      phone: '+1-555-0123',
      mobile: '+1-555-0124',
      website: 'https://freshproduce.com'
    },
    address: {
      line1: '123 Agriculture Blvd',
      line2: 'Suite 100',
      city: 'Fresno',
      state: 'CA',
      postalCode: '93701',
      country: 'USA'
    },
    businessDetails: {
      taxId: '12-3456789',
      paymentTerms: 'NET 30',
      currency: 'IDR',
      leadTimeDays: 2,
      minimumOrderValue: 500
    },
    performance: {
      rating: 4.8,
      onTimeDelivery: 98.5,
      qualityScore: 4.7,
      lastOrderDate: '2024-01-18',
      totalOrders: 142,
      activeSince: '2022-03-15'
    },
    categories: ['Produce', 'Vegetables', 'Fruits'],
    notes: 'Primary produce supplier. Excellent quality and reliability.',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: '2',
    code: 'SUP-002',
    name: 'Dairy Farmers Supply',
    legalName: 'Dairy Farmers Supply Chain Inc.',
    status: 'active',
    contactInfo: {
      primaryContact: 'Sarah Johnson',
      email: 'sarah.j@dairyfarmers.com',
      phone: '+1-555-0234',
      website: 'https://dairyfarmers.com'
    },
    address: {
      line1: '456 Dairy Road',
      city: 'Madison',
      state: 'WI',
      postalCode: '53703',
      country: 'USA'
    },
    businessDetails: {
      taxId: '87-6543210',
      paymentTerms: 'NET 15',
      currency: 'IDR',
      leadTimeDays: 1,
      minimumOrderValue: 250
    },
    performance: {
      rating: 4.6,
      onTimeDelivery: 99.2,
      qualityScore: 4.8,
      lastOrderDate: '2024-01-17',
      totalOrders: 87,
      activeSince: '2022-05-20'
    },
    categories: ['Dairy', 'Cheese', 'Yogurt'],
    notes: 'Local dairy supplier. Fresh products daily.',
    createdAt: '2022-05-20T10:30:00Z',
    updatedAt: '2024-01-17T16:45:00Z'
  },
  {
    id: '3',
    code: 'SUP-003',
    name: 'Meat & Poultry Wholesale',
    legalName: 'Premium Meats International',
    status: 'under_review',
    contactInfo: {
      primaryContact: 'Mike Wilson',
      email: 'mike@meatwholesale.com',
      phone: '+1-555-0345',
      mobile: '+1-555-0346'
    },
    address: {
      line1: '789 Processing Ave',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'USA'
    },
    businessDetails: {
      taxId: '45-6789012',
      paymentTerms: 'NET 45',
      currency: 'IDR',
      leadTimeDays: 3,
      minimumOrderValue: 1000
    },
    performance: {
      rating: 3.9,
      onTimeDelivery: 91.2,
      qualityScore: 4.1,
      lastOrderDate: '2024-01-10',
      totalOrders: 34,
      activeSince: '2023-08-10'
    },
    categories: ['Meat', 'Poultry', 'Frozen'],
    notes: 'Quality issues with last shipment. Under review.',
    createdAt: '2023-08-10T08:15:00Z',
    updatedAt: '2024-01-10T11:20:00Z'
  },
  {
    id: '4',
    code: 'SUP-004',
    name: 'Dry Goods Storage Co.',
    legalName: 'Dry Goods Storage Solutions LLC',
    status: 'inactive',
    contactInfo: {
      primaryContact: 'Robert Chen',
      email: 'info@drygoods.com',
      phone: '+1-555-0456'
    },
    address: {
      line1: '321 Warehouse Lane',
      city: 'Houston',
      state: 'TX',
      postalCode: '77002',
      country: 'USA'
    },
    businessDetails: {
      taxId: '76-5432109',
      paymentTerms: 'NET 60',
      currency: 'IDR',
      leadTimeDays: 5,
      minimumOrderValue: 2000
    },
    performance: {
      rating: 4.2,
      onTimeDelivery: 89.5,
      qualityScore: 4.3,
      lastOrderDate: '2023-12-01',
      totalOrders: 23,
      activeSince: '2023-02-01'
    },
    categories: ['Grains', 'Pasta', 'Canned Goods'],
    notes: 'Suspended due to consistent delivery delays.',
    createdAt: '2023-02-01T13:45:00Z',
    updatedAt: '2023-12-01T09:30:00Z'
  }
]

export const Route = createFileRoute('/suppliers/')({
  component: SuppliersComponent,
})

function SuppliersComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  // Mock API call
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', { searchTerm, statusFilter }],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      let filtered = mockSuppliers

      if (searchTerm) {
        filtered = filtered.filter(supplier =>
          supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.contactInfo.primaryContact.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(supplier => supplier.status === statusFilter)
      }

      return filtered
    }
  })

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

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600'
    if (rating >= 4.0) return 'text-blue-600'
    if (rating >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setShowForm(true)
  }

  const handleFormSubmit = (data: any) => {
    console.log('Supplier data:', data)
    setShowForm(false)
    setEditingSupplier(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    underReview: suppliers.filter(s => s.status === 'under_review').length,
    avgRating: suppliers.length > 0 ? (suppliers.reduce((acc, s) => acc + s.performance.rating, 0) / suppliers.length).toFixed(1) : '0.0'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage supplier information and relationships</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Supplier</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registered suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{((stats.active / stats.total) * 100).toFixed(0)}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.underReview}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgRating}</div>
            <p className="text-xs text-muted-foreground">Performance score</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
          <CardDescription>
            Manage your supplier relationships and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first supplier'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedSupplier(supplier)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{supplier.code}</div>
                        <div className="text-sm text-muted-foreground">{supplier.legalName}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.contactInfo.primaryContact}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.contactInfo.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.contactInfo.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {supplier.categories.slice(0, 2).map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {supplier.categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{supplier.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className={`flex items-center space-x-1 ${getPerformanceColor(supplier.performance.rating)}`}>
                          <Star className="h-3 w-3" />
                          <span className="font-medium">{supplier.performance.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          OTD: {supplier.performance.onTimeDelivery}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {supplier.performance.totalOrders} orders
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSupplier(supplier)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(supplier)
                            }}
                          >
                            Edit Supplier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log('Delete supplier:', supplier.id)
                            }}
                          >
                            Delete Supplier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <SupplierDetailDrawer
        supplier={selectedSupplier}
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
      />

      {/* Supplier Form */}
      <SupplierForm
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingSupplier || undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}