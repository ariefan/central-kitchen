import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, User, Mail, Phone, MapPin, CreditCard, Calendar, Building, Star, TrendingUp, Users, Clock, CheckCircle, XCircle, AlertCircle, Home, Globe, Filter, MoreVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
interface Customer {
  id: string
  tenantId: string
  authUserId?: string
  code: string
  name: string
  type: 'external' | 'internal' | 'vip' | 'wholesale' | 'corporate'
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  paymentTerms?: number
  creditLimit?: string
  isActive: boolean
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  // Additional computed fields for UI
  orderCount?: number
  totalSpent?: string
  lastOrderDate?: string
  loyaltyPoints?: number
  addresses?: Address[]
}

interface Address {
  id: string
  customerId: string
  label: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode?: string
  country?: string
  lat?: number
  lon?: number
  isDefault: boolean
  createdAt: string
}

// API service functions
const API_BASE_URL = 'http://localhost:3001/api/v1'

async function fetchCustomers(params?: {
  search?: string
  isActive?: boolean
  limit?: number
  offset?: number
}): Promise<{ items: Customer[]; total: number; limit: number; offset: number }> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())

  const response = await fetch(`${API_BASE_URL}/customers?${searchParams}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch customers')
  }

  const data = await response.json()
  return data.data || { items: [], total: 0, limit: 100, offset: 0 }
}

async function createCustomer(customerData: Partial<Customer>): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    throw new Error('Failed to create customer')
  }

  const data = await response.json()
  return data.data
}

async function updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerData),
  })

  if (!response.ok) {
    throw new Error('Failed to update customer')
  }

  const data = await response.json()
  return data.data
}

async function getCustomer(id: string): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch customer')
  }

  const data = await response.json()
  return data.data
}

// Mock data for development
const mockCustomers: Customer[] = [
  {
    id: '1',
    tenantId: 'tenant-1',
    code: 'CUST-001',
    name: 'Coffee Lovers Club',
    type: 'vip',
    contactPerson: 'Sarah Johnson',
    email: 'sarah@coffeelovers.com',
    phone: '+1 (555) 123-4567',
    address: '123 Main Street',
    city: 'San Francisco',
    paymentTerms: 30,
    creditLimit: '5000.00',
    isActive: true,
    metadata: { membershipLevel: 'Gold', joinDate: '2024-01-15' },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-11-08T14:30:00Z',
    orderCount: 45,
    totalSpent: '2456.75',
    lastOrderDate: '2024-11-07T09:15:00Z',
    loyaltyPoints: 245,
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    code: 'CUST-002',
    name: 'Tech Startups Inc.',
    type: 'corporate',
    contactPerson: 'Mike Chen',
    email: 'orders@techstartups.com',
    phone: '+1 (555) 987-6543',
    address: '456 Innovation Drive',
    city: 'Palo Alto',
    paymentTerms: 60,
    creditLimit: '10000.00',
    isActive: true,
    metadata: { accountManager: 'John Doe', industry: 'Technology' },
    createdAt: '2024-02-01T11:00:00Z',
    updatedAt: '2024-11-08T10:45:00Z',
    orderCount: 23,
    totalSpent: '3789.50',
    lastOrderDate: '2024-11-06T14:20:00Z',
    loyaltyPoints: 379,
  },
  {
    id: '3',
    tenantId: 'tenant-1',
    code: 'CUST-003',
    name: 'Morning Regular',
    type: 'external',
    contactPerson: 'Jane Smith',
    email: 'jane.smith@email.com',
    phone: '+1 (555) 456-7890',
    address: '789 Coffee Lane',
    city: 'Oakland',
    paymentTerms: 0,
    creditLimit: '500.00',
    isActive: true,
    metadata: { favoriteProducts: ['Cappuccino', 'Croissant'], frequency: 'daily' },
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-11-08T12:00:00Z',
    orderCount: 156,
    totalSpent: '892.30',
    lastOrderDate: '2024-11-08T08:30:00Z',
    loyaltyPoints: 89,
  },
]

function CustomerForm({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const [formData, setFormData] = useState({
    code: customer?.code || '',
    name: customer?.name || '',
    type: customer?.type || 'external',
    contactPerson: customer?.contactPerson || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    city: customer?.city || '',
    paymentTerms: customer?.paymentTerms?.toString() || '0',
    creditLimit: customer?.creditLimit || '0',
    isActive: customer?.isActive ?? true,
    metadata: customer?.metadata || {},
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to create customer:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; customerData: Partial<Customer> }) =>
      updateCustomer(data.id, data.customerData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to update customer:', error)
    },
  })

  const handleSubmit = () => {
    const customerData = {
      ...formData,
      paymentTerms: formData.paymentTerms ? parseInt(formData.paymentTerms) : undefined,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
    }

    if (customer?.id) {
      updateMutation.mutate({ id: customer.id, customerData })
    } else {
      createMutation.mutate(customerData)
    }
  }

  const customerTypes = [
    { value: 'external', label: 'External Customer', description: 'Regular customers' },
    { value: 'internal', label: 'Internal', description: 'Company internal accounts' },
    { value: 'vip', label: 'VIP', description: 'High-value customers' },
    { value: 'wholesale', label: 'Wholesale', description: 'B2B wholesale accounts' },
    { value: 'corporate', label: 'Corporate', description: 'Corporate accounts' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Code *</label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="e.g., CUST-001"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Type *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
          >
            {customerTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {customerTypes.find(t => t.value === formData.type)?.description && (
            <p className="text-xs text-muted-foreground">
              {customerTypes.find(t => t.value === formData.type)?.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Customer Name *</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter customer name"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Contact Person</label>
        <Input
          value={formData.contactPerson}
          onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
          placeholder="Primary contact person"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Street address"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="City"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Terms (days)</label>
          <Input
            type="number"
            value={formData.paymentTerms}
            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            placeholder="e.g., 30"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Credit Limit</label>
        <Input
          type="number"
          step="0.01"
          value={formData.creditLimit}
          onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Customer is Active
        </label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending || !formData.name.trim() || !formData.code.trim()}
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
           customer ? 'Update Customer' : 'Create Customer'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/customers/')({
  component: CustomersIndex,
})

function CustomersIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Fetch data using React Query
  const { data: customersData, isLoading, error } = useQuery({
    queryKey: ['customers', searchTerm, selectedStatus, currentPage],
    queryFn: () => fetchCustomers({
      search: searchTerm || undefined,
      isActive: selectedStatus === 'all' ? undefined : selectedStatus === 'active',
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }),
  })

  const customers = customersData?.items || mockCustomers
  const total = customersData?.total || mockCustomers.length

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || customer.type === selectedType
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'active' && customer.isActive) ||
      (selectedStatus === 'inactive' && !customer.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  const getTypeBadge = (type: string) => {
    const variants = {
      external: { variant: 'default' as const, label: 'External' },
      internal: { variant: 'secondary' as const, label: 'Internal' },
      vip: { variant: 'outline' as const, label: 'VIP', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' },
      wholesale: { variant: 'outline' as const, label: 'Wholesale' },
      corporate: { variant: 'outline' as const, label: 'Corporate', className: 'border-blue-500 text-blue-700 bg-blue-50' },
    }

    const config = variants[type as keyof typeof variants] || variants.external
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'} className="flex items-center gap-1">
        {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: string) => {
    return parseFloat(amount || '0').toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
    })
  }

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.isActive).length,
    vip: customers.filter(c => c.type === 'vip').length,
    corporate: customers.filter(c => c.type === 'corporate').length,
    totalRevenue: customers.reduce((sum, c) => sum + parseFloat(c.totalSpent || '0'), 0),
    averageOrderValue: customers.length > 0 ?
      customers.reduce((sum, c) => sum + parseFloat(c.totalSpent || '0'), 0) / customers.filter(c => c.orderCount && c.orderCount > 0).length : 0,
  }

  const totalPages = Math.ceil(total / pageSize)

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading customers</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message || 'Failed to fetch customers from the server'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">Manage customer relationships and loyalty programs</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
            </DialogHeader>
            <CustomerForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">VIP Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.vip}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Corporate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.corporate}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue.toString())}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-md"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="external">External</option>
            <option value="internal">Internal</option>
            <option value="vip">VIP</option>
            <option value="wholesale">Wholesale</option>
            <option value="corporate">Corporate</option>
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-2" />
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(customer.type)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.contactPerson && (
                            <div className="font-medium">{customer.contactPerson}</div>
                          )}
                          {customer.email && (
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(customer.isActive)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{customer.orderCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          <span className="font-medium">{formatCurrency(customer.totalSpent || '0')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomer(customer)
                              setIsViewOpen(true)
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedCustomer(customer)
                              setIsEditOpen(true)
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Are you sure you want to deactivate ${customer.name}?`)) {
                                  updateCustomer(customer.id, { isActive: false })
                                }
                              }}
                              className="text-red-600"
                              disabled={!customer.isActive}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Are you sure you want to activate ${customer.name}?`)) {
                                  updateCustomer(customer.id, { isActive: true })
                                }
                              }}
                              className="text-green-600"
                              disabled={customer.isActive}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} customers
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, currentPage - 2 + i)
                        if (page > totalPages) return null
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Customer</SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <CustomerForm
              customer={selectedCustomer}
              onClose={() => {
                setIsEditOpen(false)
                setSelectedCustomer(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* View Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-full max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Customer Details</SheetTitle>
          </SheetHeader>
          {selectedCustomer && (
            <div className="space-y-6 mt-6">
              {/* Customer Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedCustomer.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Customer Code:</span> {selectedCustomer.code}</div>
                    <div><span className="font-medium">Type:</span> {getTypeBadge(selectedCustomer.type)}</div>
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedCustomer.isActive)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Created:</span> {formatDate(selectedCustomer.createdAt)}</div>
                    <div><span className="font-medium">Updated:</span> {formatDate(selectedCustomer.updatedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedCustomer.contactPerson && (
                    <div>
                      <span className="font-medium">Contact Person:</span> {selectedCustomer.contactPerson}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div>
                      <span className="font-medium">Email:</span> {selectedCustomer.email}
                    </div>
                  )}
                  {selectedCustomer.phone && (
                    <div>
                      <span className="font-medium">Phone:</span> {selectedCustomer.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              {(selectedCustomer.address || selectedCustomer.city) && (
                <div className="bg-muted/50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Address</h4>
                  <div className="text-sm">
                    {selectedCustomer.address && <div>{selectedCustomer.address}</div>}
                    {selectedCustomer.city && <div>{selectedCustomer.city}</div>}
                  </div>
                </div>
              )}

              {/* Business Information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Business Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Payment Terms:</span> {selectedCustomer.paymentTerms || 0} days
                  </div>
                  <div>
                    <span className="font-medium">Credit Limit:</span> {formatCurrency(selectedCustomer.creditLimit || '0')}
                  </div>
                </div>
              </div>

              {/* Customer Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2 text-blue-900">Order Statistics</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Total Orders:</span> {selectedCustomer.orderCount || 0}</div>
                    <div><span className="font-medium">Total Spent:</span> {formatCurrency(selectedCustomer.totalSpent || '0')}</div>
                    <div><span className="font-medium">Average Order:</span> {formatCurrency((parseFloat(selectedCustomer.totalSpent || '0') / (selectedCustomer.orderCount || 1)).toString())}</div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-md">
                  <h4 className="font-medium mb-2 text-green-900">Loyalty Program</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Points Balance:</span> {selectedCustomer.loyaltyPoints || 0}</div>
                    <div><span className="font-medium">Membership Level:</span>
                      {selectedCustomer.metadata?.membershipLevel || 'Standard'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {selectedCustomer.metadata && Object.keys(selectedCustomer.metadata).length > 0 && (
                <div className="bg-muted/50 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Additional Information</h4>
                  <div className="text-sm">
                    {Object.entries(selectedCustomer.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}