"use client"

import * as React from "react"
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  Plus,
  Search,
  Edit,
  Eye,
  MapPin,
  Package,
  User,
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ChevronDown,
  MoreHorizontal,
  Filter,
  Phone,
  Mail
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

// API types
interface Delivery {
  id: string
  orderId: string
  provider?: string
  trackingCode?: string
  fee: string
  status: 'requested' | 'assigned' | 'picked_up' | 'delivered' | 'failed'
  updatedAt: string
  order?: {
    id: string
    orderNumber: string
    customerId: string
    type: 'dine_in' | 'take_away' | 'delivery'
    status: 'open' | 'paid' | 'voided' | 'refunded'
    totalAmount: string
    expectedDeliveryDate?: string
    actualDeliveryDate?: string
    notes?: string
  }
  customer?: {
    id: string
    code: string
    name: string
    type: string
    contactPerson?: string
    email?: string
    phone?: string
  }
  address?: {
    id: string
    customerId: string
    label?: string
    line1: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    isDefault: boolean
  }
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  type: 'dine_in' | 'take_away' | 'delivery'
  status: 'open' | 'paid' | 'voided' | 'refunded'
  totalAmount: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  notes?: string
}

interface Customer {
  id: string
  code: string
  name: string
  type: string
  contactPerson?: string
  email?: string
  phone?: string
}

interface Address {
  id: string
  customerId: string
  label?: string
  line1: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  isDefault: boolean
}

// Mock data for development
const mockDeliveries: Delivery[] = [
  {
    id: "del-001",
    orderId: "ord-001",
    provider: "Fast Delivery Co",
    trackingCode: "FD-123456",
    fee: "5.99",
    status: "delivered",
    updatedAt: "2024-01-15T14:30:00Z",
    order: {
      id: "ord-001",
      orderNumber: "ORD-2024-001",
      customerId: "cust-001",
      type: "delivery",
      status: "paid",
      totalAmount: "45.99",
      expectedDeliveryDate: "2024-01-15T16:00:00Z",
      actualDeliveryDate: "2024-01-15T14:30:00Z",
      notes: "Leave at front door",
    },
    customer: {
      id: "cust-001",
      code: "CUST-001",
      name: "John Doe",
      type: "external",
      contactPerson: "John Doe",
      email: "john.doe@example.com",
      phone: "+1-555-0123",
    },
    address: {
      id: "addr-001",
      customerId: "cust-001",
      label: "Home",
      line1: "123 Main Street",
      line2: "Apt 4B",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
      isDefault: true,
    },
  },
  {
    id: "del-002",
    orderId: "ord-002",
    provider: "Quick Ship",
    trackingCode: "QS-789012",
    fee: "7.50",
    status: "picked_up",
    updatedAt: "2024-01-15T12:15:00Z",
    order: {
      id: "ord-002",
      orderNumber: "ORD-2024-002",
      customerId: "cust-002",
      type: "delivery",
      status: "paid",
      totalAmount: "67.25",
      expectedDeliveryDate: "2024-01-15T15:00:00Z",
    },
    customer: {
      id: "cust-002",
      code: "CUST-002",
      name: "Jane Smith",
      type: "external",
      contactPerson: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+1-555-0456",
    },
    address: {
      id: "addr-002",
      customerId: "cust-002",
      line1: "456 Oak Avenue",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90210",
      country: "USA",
      isDefault: false,
    },
  },
  {
    id: "del-003",
    orderId: "ord-003",
    fee: "0.00",
    status: "requested",
    updatedAt: "2024-01-15T10:30:00Z",
    order: {
      id: "ord-003",
      orderNumber: "ORD-2024-003",
      customerId: "cust-003",
      type: "delivery",
      status: "paid",
      totalAmount: "89.50",
      expectedDeliveryDate: "2024-01-15T18:00:00Z",
    },
    customer: {
      id: "cust-003",
      code: "CUST-003",
      name: "Corporate Client",
      type: "corporate",
      contactPerson: "Mike Johnson",
      email: "mike@corporate.com",
      phone: "+1-555-0789",
    },
  },
]

const mockOrders: Order[] = [
  { id: "ord-004", orderNumber: "ORD-2024-004", customerId: "cust-001", type: "delivery", status: "paid", totalAmount: "32.75" },
  { id: "ord-005", orderNumber: "ORD-2024-005", customerId: "cust-002", type: "delivery", status: "paid", totalAmount: "55.00" },
]

const mockCustomers: Customer[] = [
  { id: "cust-001", code: "CUST-001", name: "John Doe", type: "external", contactPerson: "John Doe", email: "john.doe@example.com", phone: "+1-555-0123" },
  { id: "cust-002", code: "CUST-002", name: "Jane Smith", type: "external", contactPerson: "Jane Smith", email: "jane.smith@example.com", phone: "+1-555-0456" },
  { id: "cust-003", code: "CUST-003", name: "Corporate Client", type: "corporate", contactPerson: "Mike Johnson", email: "mike@corporate.com", phone: "+1-555-0789" },
]

// API functions
async function fetchDeliveries(filters?: {
  status?: string
  provider?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<Delivery[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.provider) params.append('provider', filters.provider)
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)

    const response = await fetch(`/api/v1/deliveries?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch deliveries')
    }
    const data = await response.json()

    // Transform the data to match our interface
    return data.data.map((item: any) => ({
      ...item.deliveries,
      order: item.orders,
      customer: item.customers,
    }))
  } catch (error) {
    console.log('Using mock data for deliveries')
    return mockDeliveries
  }
}

async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await fetch('/api/v1/orders?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch orders')
    }
    const data = await response.json()
    return data.data || mockOrders
  } catch (error) {
    console.log('Using mock data for orders')
    return mockOrders
  }
}

async function fetchCustomers(): Promise<Customer[]> {
  try {
    const response = await fetch('/api/v1/customers?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch customers')
    }
    const data = await response.json()
    return data.data || mockCustomers
  } catch (error) {
    console.log('Using mock data for customers')
    return mockCustomers
  }
}

async function fetchAddresses(customerId?: string): Promise<Address[]> {
  try {
    const params = customerId ? `?customerId=${customerId}` : ''
    const response = await fetch(`/api/v1/addresses${params}`)
    if (!response.ok) {
      throw new Error('Failed to fetch addresses')
    }
    const data = await response.json()
    return data.data.map((item: any) => item.addresses) || []
  } catch (error) {
    console.log('Using mock data for addresses')
    return [
      {
        id: "addr-001",
        customerId: "cust-001",
        label: "Home",
        line1: "123 Main Street",
        line2: "Apt 4B",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        isDefault: true,
      },
    ]
  }
}

// Form schemas
const deliveryCreateSchema = z.object({
  orderId: z.string().uuid("Order is required"),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).default(0),
})

const deliveryUpdateSchema = z.object({
  status: z.enum(['requested', 'assigned', 'picked_up', 'delivered', 'failed']).optional(),
  provider: z.string().max(64).optional(),
  trackingCode: z.string().max(128).optional(),
  fee: z.number().min(0).optional(),
})

type DeliveryCreateValues = z.infer<typeof deliveryCreateSchema>
type DeliveryUpdateValues = z.infer<typeof deliveryUpdateSchema>

export const Route = createFileRoute('/deliveries/')({
  component: DeliveriesIndex,
})

function DeliveriesIndex() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedProvider, setSelectedProvider] = useState<string>("all")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['deliveries', { status: selectedStatus, provider: selectedProvider, customerId: selectedCustomer, dateFrom, dateTo }],
    queryFn: () => fetchDeliveries({
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      provider: selectedProvider !== "all" ? selectedProvider : undefined,
      customerId: selectedCustomer !== "all" ? selectedCustomer : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    retry: false,
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    retry: false,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    retry: false,
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['addresses', selectedDelivery?.customer?.id],
    queryFn: () => selectedDelivery?.customer ? fetchAddresses(selectedDelivery.customer.id) : [],
    enabled: !!selectedDelivery?.customer?.id,
    retry: false,
  })

  // Forms
  const createForm = useForm<DeliveryCreateValues>({
    resolver: zodResolver(deliveryCreateSchema),
    defaultValues: {
      orderId: "",
      provider: "",
      trackingCode: "",
      fee: 0,
    },
  })

  const updateForm = useForm<DeliveryUpdateValues>({
    resolver: zodResolver(deliveryUpdateSchema),
    defaultValues: {
      status: undefined,
      provider: "",
      trackingCode: "",
      fee: 0,
    },
  })

  // Mutations
  const createDeliveryMutation = useMutation({
    mutationFn: async (data: DeliveryCreateValues) => {
      const response = await fetch('/api/v1/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fee: data.fee.toString(),
        }),
      })
      if (!response.ok) throw new Error('Failed to create delivery')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      setShowCreateDialog(false)
      createForm.reset()
      toast({
        title: "Success",
        description: "Delivery created successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: DeliveryUpdateValues }) => {
      const response = await fetch(`/api/v1/deliveries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          fee: data.fee?.toString(),
        }),
      })
      if (!response.ok) throw new Error('Failed to update delivery')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] })
      setShowDetailsDialog(false)
      updateForm.reset()
      toast({
        title: "Success",
        description: "Delivery updated successfully",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Filtered data
  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch = delivery.order?.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.trackingCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         delivery.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'requested', label: 'Requested' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' },
  ]

  const providers = Array.from(new Set(deliveries.map(d => d.provider).filter(Boolean)))

  function handleCreateDelivery(values: DeliveryCreateValues) {
    createDeliveryMutation.mutate(values)
  }

  function handleUpdateDelivery(values: DeliveryUpdateValues) {
    if (!selectedDelivery) return
    updateDeliveryMutation.mutate({ id: selectedDelivery.id, data: values })
  }

  function viewDeliveryDetails(delivery: Delivery) {
    setSelectedDelivery(delivery)
    updateForm.reset({
      status: delivery.status,
      provider: delivery.provider || "",
      trackingCode: delivery.trackingCode || "",
      fee: Number(delivery.fee),
    })
    setShowDetailsDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      requested: 'secondary',
      assigned: 'outline',
      picked_up: 'default',
      delivered: 'default',
      failed: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'assigned':
        return <Truck className="h-4 w-4 text-blue-500" />
      case 'picked_up':
        return <Package className="h-4 w-4 text-orange-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount))
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getAvailableOrders = () => {
    const deliveredOrderIds = deliveries.map(d => d.orderId)
    return orders.filter(order =>
      order.type === 'delivery' &&
      !deliveredOrderIds.includes(order.id)
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Delivery Management</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Delivery
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Delivery</DialogTitle>
                <DialogDescription>
                  Create a new delivery record for an order. Select an order and provide delivery details.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateDelivery)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="orderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select order" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getAvailableOrders().map((order) => (
                              <SelectItem key={order.id} value={order.id}>
                                {order.orderNumber} - {formatCurrency(order.totalAmount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter provider name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="trackingCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tracking Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter tracking code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Fee</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createDeliveryMutation.isPending}>
                      {createDeliveryMutation.isPending ? 'Creating...' : 'Create Delivery'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Date from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deliveries ({filteredDeliveries.length})</CardTitle>
          <CardDescription>
            Manage and track all your delivery orders in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading deliveries...
                  </TableCell>
                </TableRow>
              ) : filteredDeliveries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No deliveries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(delivery.status)}
                        {getStatusBadge(delivery.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{delivery.order?.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(delivery.order?.totalAmount || '0')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{delivery.customer?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {delivery.customer?.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {delivery.provider || (
                        <span className="text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {delivery.trackingCode || (
                        <span className="text-muted-foreground">No tracking</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(delivery.fee)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDateTime(delivery.updatedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => viewDeliveryDetails(delivery)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Truck className="mr-2 h-4 w-4" />
                            Track Package
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Phone className="mr-2 h-4 w-4" />
                            Contact Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delivery Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              Delivery Details - {selectedDelivery?.order?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Complete delivery information and management options.
            </DialogDescription>
          </DialogHeader>

          {selectedDelivery && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedDelivery.status)}
                  <div>
                    <div className="font-medium capitalize">
                      {selectedDelivery.status.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Last updated: {formatDateTime(selectedDelivery.updatedAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {formatCurrency(selectedDelivery.order?.totalAmount || '0')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Order Total
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer Information */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedDelivery.customer?.name}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedDelivery.customer?.type}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedDelivery.customer?.email || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedDelivery.customer?.phone || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedDelivery.address && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </h4>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <div className="font-medium">{selectedDelivery.address.label}</div>
                    <div>{selectedDelivery.address.line1}</div>
                    {selectedDelivery.address.line2 && <div>{selectedDelivery.address.line2}</div>}
                    <div>
                      {selectedDelivery.address.city}, {selectedDelivery.address.state} {selectedDelivery.address.postalCode}
                    </div>
                    <div>{selectedDelivery.address.country}</div>
                  </div>
                </div>
              )}

              {/* Order Information */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Order Number:</span> {selectedDelivery.order?.orderNumber}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedDelivery.order?.type}
                  </div>
                  <div>
                    <span className="font-medium">Expected Delivery:</span>{' '}
                    {selectedDelivery.order?.expectedDeliveryDate
                      ? formatDateTime(selectedDelivery.order.expectedDeliveryDate)
                      : 'Not specified'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Actual Delivery:</span>{' '}
                    {selectedDelivery.order?.actualDeliveryDate
                      ? formatDateTime(selectedDelivery.order.actualDeliveryDate)
                      : 'Not delivered yet'
                    }
                  </div>
                </div>
                {selectedDelivery.order?.notes && (
                  <div className="mt-3">
                    <span className="font-medium text-sm">Order Notes:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDelivery.order.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Update Form */}
              <div>
                <h4 className="font-medium mb-3">Update Delivery</h4>
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(handleUpdateDelivery)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={updateForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="requested">Requested</SelectItem>
                                <SelectItem value="assigned">Assigned</SelectItem>
                                <SelectItem value="picked_up">Picked Up</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="fee"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Delivery Fee</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={updateForm.control}
                        name="provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <FormControl>
                              <Input placeholder="Provider name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="trackingCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tracking Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Tracking code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={updateDeliveryMutation.isPending}>
                        {updateDeliveryMutation.isPending ? 'Updating...' : 'Update Delivery'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}