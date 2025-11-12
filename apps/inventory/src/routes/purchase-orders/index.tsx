"use client"

import * as React from "react"
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import {
  Plus,
  Search,
  Edit,
  Eye,
  Package,
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Send,
  FileText,
  Download,
  MoreHorizontal,
  PlusCircle,
  MinusCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

// API types
interface PurchaseOrder {
  id: string
  tenantId: string
  orderNumber: string
  supplierId: string
  locationId: string
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'confirmed' | 'partial_receipt' | 'completed' | 'cancelled'
  subtotal: string
  taxAmount: string
  shippingCost: string
  discount: string
  totalAmount: string
  paymentTerms?: number
  notes?: string
  createdBy?: string
  approvedBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  items?: PurchaseOrderItem[]
  supplier?: {
    id: string
    name: string
    code: string
    email?: string
    phone?: string
  }
  location?: {
    id: string
    name: string
    code: string
    type: string
  }
  createdByUser?: {
    id: string
    name: string
    email: string
  }
  approvedByUser?: {
    id: string
    name: string
    email: string
  }
}

interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  productId: string
  quantity: string
  uomId: string
  unitPrice: string
  discount: string
  taxRate: string
  lineTotal: string
  notes?: string
  createdAt: string
  product?: {
    id: string
    name: string
    sku: string
    baseUomId: string
  }
  uom?: {
    id: string
    name: string
    code: string
  }
}

interface Supplier {
  id: string
  code: string
  name: string
  email?: string
  phone?: string
  paymentTerms?: number
  isActive: boolean
}

interface Product {
  id: string
  name: string
  sku: string
  baseUomId: string
  category?: string
}

interface Location {
  id: string
  name: string
  code: string
  type: string
}

interface UOM {
  id: string
  name: string
  code: string
  baseUnit: boolean
}

// Mock data for development
const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-001",
    tenantId: "tenant-001",
    orderNumber: "PO-2024-001",
    supplierId: "sup-001",
    locationId: "loc-001",
    orderDate: "2024-01-15T08:00:00Z",
    expectedDeliveryDate: "2024-01-20T00:00:00Z",
    status: "approved",
    subtotal: "1250.00",
    taxAmount: "125.00",
    shippingCost: "50.00",
    discount: "0.00",
    totalAmount: "1425.00",
    paymentTerms: 30,
    notes: "Regular weekly produce order",
    createdBy: "user-001",
    approvedBy: "user-002",
    approvedAt: "2024-01-15T09:30:00Z",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T09:30:00Z",
    supplier: { id: "sup-001", name: "Fresh Produce Co", code: "SUP-001", email: "orders@freshproduce.com", phone: "+1-555-0101" },
    location: { id: "loc-001", name: "Central Kitchen", code: "CK-001", type: "central_kitchen" },
    createdByUser: { id: "user-001", name: "John Smith", email: "john@company.com" },
    approvedByUser: { id: "user-002", name: "Sarah Johnson", email: "sarah@company.com" },
  },
  {
    id: "po-002",
    tenantId: "tenant-001",
    orderNumber: "PO-2024-002",
    supplierId: "sup-002",
    locationId: "loc-002",
    orderDate: "2024-01-14T14:00:00Z",
    expectedDeliveryDate: "2024-01-18T00:00:00Z",
    status: "pending_approval",
    subtotal: "2500.00",
    taxAmount: "250.00",
    shippingCost: "100.00",
    discount: "50.00",
    totalAmount: "2800.00",
    paymentTerms: 15,
    notes: "Bulk dry goods order for monthly supply",
    createdBy: "user-003",
    createdAt: "2024-01-14T14:00:00Z",
    updatedAt: "2024-01-14T14:00:00Z",
    supplier: { id: "sup-002", name: "Bulk Foods Inc", code: "SUP-002", email: "procurement@bulkfoods.com" },
    location: { id: "loc-002", name: "Warehouse", code: "WH-001", type: "warehouse" },
    createdByUser: { id: "user-003", name: "Mike Chen", email: "mike@company.com" },
  },
  {
    id: "po-003",
    tenantId: "tenant-001",
    orderNumber: "PO-2024-003",
    supplierId: "sup-001",
    locationId: "loc-001",
    orderDate: "2024-01-13T10:00:00Z",
    expectedDeliveryDate: "2024-01-16T00:00:00Z",
    actualDeliveryDate: "2024-01-15T14:30:00Z",
    status: "completed",
    subtotal: "750.00",
    taxAmount: "75.00",
    shippingCost: "25.00",
    discount: "0.00",
    totalAmount: "850.00",
    paymentTerms: 30,
    notes: "Urgent meat delivery",
    createdBy: "user-001",
    createdAt: "2024-01-13T10:00:00Z",
    updatedAt: "2024-01-15T14:30:00Z",
    supplier: { id: "sup-001", name: "Fresh Produce Co", code: "SUP-001" },
    location: { id: "loc-001", name: "Central Kitchen", code: "CK-001", type: "central_kitchen" },
    createdByUser: { id: "user-001", name: "John Smith", email: "john@company.com" },
  },
]

const mockSuppliers: Supplier[] = [
  { id: "sup-001", code: "SUP-001", name: "Fresh Produce Co", email: "orders@freshproduce.com", phone: "+1-555-0101", paymentTerms: 30, isActive: true },
  { id: "sup-002", code: "SUP-002", name: "Bulk Foods Inc", email: "procurement@bulkfoods.com", phone: "+1-555-0102", paymentTerms: 15, isActive: true },
  { id: "sup-003", code: "SUP-003", name: "Quality Meats Ltd", email: "sales@qualitymeats.com", phone: "+1-555-0103", paymentTerms: 7, isActive: true },
]

const mockProducts: Product[] = [
  { id: "prod-001", name: "Tomatoes", sku: "VEG-001", baseUomId: "uom-001", category: "Vegetables" },
  { id: "prod-002", name: "Chicken Breast", sku: "MEAT-001", baseUomId: "uom-002", category: "Meat" },
  { id: "prod-003", name: "Flour", sku: "DRY-001", baseUomId: "uom-003", category: "Dry Goods" },
  { id: "prod-004", name: "Olive Oil", sku: "OIL-001", baseUomId: "uom-004", category: "Oils" },
  { id: "prod-005", name: "Lettuce", sku: "VEG-002", baseUomId: "uom-001", category: "Vegetables" },
]

const mockLocations: Location[] = [
  { id: "loc-001", name: "Central Kitchen", code: "CK-001", type: "central_kitchen" },
  { id: "loc-002", name: "Warehouse", code: "WH-001", type: "warehouse" },
  { id: "loc-003", name: "Downtown Cafe", code: "CAFE-001", type: "outlet" },
]

const mockUOMs: UOM[] = [
  { id: "uom-001", name: "Kilogram", code: "kg", baseUnit: true },
  { id: "uom-002", name: "Pound", code: "lb", baseUnit: true },
  { id: "uom-003", name: "Liter", code: "L", baseUnit: true },
  { id: "uom-004", name: "Gallon", code: "gal", baseUnit: true },
]

// API functions
async function fetchPurchaseOrders(filters?: {
  status?: string
  supplierId?: string
  locationId?: string
}): Promise<PurchaseOrder[]> {
  try {
    const params = new URLSearchParams()
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status)
    if (filters?.supplierId && filters.supplierId !== 'all') params.append('supplierId', filters.supplierId)
    if (filters?.locationId && filters.locationId !== 'all') params.append('locationId', filters.locationId)

    const response = await fetch(`/api/v1/purchase-orders?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to fetch purchase orders')
    }
    const data = await response.json()
    return data.data || mockPurchaseOrders
  } catch (error) {
    console.log('Using mock data for purchase orders')
    return mockPurchaseOrders
  }
}

async function fetchPurchaseOrderDetails(id: string): Promise<PurchaseOrder> {
  try {
    const response = await fetch(`/api/v1/purchase-orders/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch purchase order details')
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.log('Using mock data for purchase order details')
    const po = mockPurchaseOrders.find(p => p.id === id)
    if (po) {
      return {
        ...po,
        items: [
          {
            id: "poi-001",
            purchaseOrderId: id,
            productId: "prod-001",
            quantity: "50",
            uomId: "uom-001",
            unitPrice: "3.50",
            discount: "0.00",
            taxRate: "10.00",
            lineTotal: "192.50",
            product: { id: "prod-001", name: "Tomatoes", sku: "VEG-001", baseUomId: "uom-001" },
            uom: { id: "uom-001", name: "Kilogram", code: "kg", baseUnit: true },
          },
          {
            id: "poi-002",
            purchaseOrderId: id,
            productId: "prod-002",
            quantity: "25",
            uomId: "uom-002",
            unitPrice: "12.00",
            discount: "0.00",
            taxRate: "10.00",
            lineTotal: "330.00",
            product: { id: "prod-002", name: "Chicken Breast", sku: "MEAT-001", baseUomId: "uom-002" },
            uom: { id: "uom-002", name: "Pound", code: "lb", baseUnit: true },
          },
        ]
      }
    }
    throw new Error('Purchase order not found')
  }
}

async function fetchSuppliers(): Promise<Supplier[]> {
  try {
    const response = await fetch('/api/v1/suppliers?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch suppliers')
    }
    const data = await response.json()
    return data.data || mockSuppliers
  } catch (error) {
    console.log('Using mock data for suppliers')
    return mockSuppliers
  }
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/v1/products?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch products')
    }
    const data = await response.json()
    return data.data || mockProducts
  } catch (error) {
    console.log('Using mock data for products')
    return mockProducts
  }
}

async function fetchLocations(): Promise<Location[]> {
  try {
    const response = await fetch('/api/v1/locations?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch locations')
    }
    const data = await response.json()
    return data.data || mockLocations
  } catch (error) {
    console.log('Using mock data for locations')
    return mockLocations
  }
}

async function fetchUOMs(): Promise<UOM[]> {
  try {
    const response = await fetch('/api/v1/uoms?limit=100')
    if (!response.ok) {
      throw new Error('Failed to fetch UOMs')
    }
    const data = await response.json()
    return data.data || mockUOMs
  } catch (error) {
    console.log('Using mock data for UOMs')
    return mockUOMs
  }
}

// Form schemas
const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid("Product is required"),
  quantity: z.number().positive("Quantity must be positive"),
  uomId: z.string().uuid("UOM is required"),
  unitPrice: z.number().nonnegative("Unit price must be non-negative"),
  discount: z.number().nonnegative("Discount must be non-negative").default(0),
  taxRate: z.number().nonnegative("Tax rate must be non-negative").default(0),
  notes: z.string().optional(),
})

const purchaseOrderCreateSchema = z.object({
  supplierId: z.string().uuid("Supplier is required"),
  locationId: z.string().uuid("Location is required"),
  expectedDeliveryDate: z.string().datetime().optional(),
  paymentTerms: z.number().positive().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
})

type PurchaseOrderCreateValues = z.infer<typeof purchaseOrderCreateSchema>

export const Route = createFileRoute('/purchase-orders/')({
  component: PurchaseOrdersIndex,
})

function PurchaseOrdersIndex() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: purchaseOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['purchaseOrders', { status: selectedStatus, supplierId: selectedSupplier, locationId: selectedLocation }],
    queryFn: () => fetchPurchaseOrders({
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      supplierId: selectedSupplier !== "all" ? selectedSupplier : undefined,
      locationId: selectedLocation !== "all" ? selectedLocation : undefined,
    }),
    retry: false,
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    retry: false,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    retry: false,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    retry: false,
  })

  const { data: uoms = [] } = useQuery({
    queryKey: ['uoms'],
    queryFn: fetchUOMs,
    retry: false,
  })

  const { data: selectedPODetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['purchaseOrderDetails', selectedPO?.id],
    queryFn: () => selectedPO ? fetchPurchaseOrderDetails(selectedPO.id) : Promise.reject('No PO selected'),
    enabled: !!selectedPO && showDetailsDialog,
    retry: false,
  })

  // Forms
  const createForm = useForm<PurchaseOrderCreateValues>({
    resolver: zodResolver(purchaseOrderCreateSchema),
    defaultValues: {
      supplierId: "",
      locationId: "",
      expectedDeliveryDate: "",
      paymentTerms: 30,
      notes: "",
      items: [
        {
          productId: "",
          quantity: 1,
          uomId: "",
          unitPrice: 0,
          discount: 0,
          taxRate: 0,
          notes: "",
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "items",
  })

  // Mock mutations
  const createPOMutation = useMutation({
    mutationFn: async (data: PurchaseOrderCreateValues) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const newPO: PurchaseOrder = {
        id: `po-${Date.now()}`,
        tenantId: "tenant-001",
        orderNumber: `PO-2024-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        ...data,
        orderDate: new Date().toISOString(),
        subtotal: "0.00",
        taxAmount: "0.00",
        shippingCost: "0.00",
        discount: "0.00",
        totalAmount: "0.00",
        status: "draft",
        createdBy: "current-user",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplier: suppliers.find(s => s.id === data.supplierId),
        location: locations.find(l => l.id === data.locationId),
      }
      return newPO
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      setShowCreateDialog(false)
      createForm.reset()
      toast({
        title: "Success",
        description: "Purchase order created successfully",
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

  const approvePOMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id, status: "approved", approvedAt: new Date().toISOString() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] })
      toast({
        title: "Success",
        description: "Purchase order approved successfully",
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
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch = po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'sent', label: 'Sent' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'partial_receipt', label: 'Partial Receipt' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  function handleCreatePO(values: PurchaseOrderCreateValues) {
    createPOMutation.mutate(values)
  }

  function handleApprovePO() {
    if (!selectedPO) return
    approvePOMutation.mutate(selectedPO.id)
  }

  function viewPODetails(po: PurchaseOrder) {
    setSelectedPO(po)
    setShowDetailsDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      pending_approval: 'outline',
      approved: 'default',
      rejected: 'destructive',
      sent: 'outline',
      confirmed: 'default',
      partial_receipt: 'outline',
      completed: 'default',
      cancelled: 'destructive',
    }

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'sent':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial_receipt':
        return <Package className="h-4 w-4 text-orange-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(Number(amount))
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  // Calculate totals for form
  const watchItems = createForm.watch("items")
  const formSubtotal = watchItems?.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice - (item.discount || 0)
    const lineTax = lineTotal * ((item.taxRate || 0) / 100)
    return sum + lineTotal + lineTax
  }, 0) || 0

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Purchase Orders</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
                <DialogDescription>
                  Create a new purchase order to order supplies from vendors.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreatePO)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name} ({supplier.code})
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
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name} ({location.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="expectedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms (days)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="30"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any notes or special instructions..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-medium">Order Items</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({
                          productId: "",
                          quantity: 1,
                          uomId: "",
                          unitPrice: 0,
                          discount: 0,
                          taxRate: 0,
                          notes: "",
                        })}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-5 gap-4">
                              <FormField
                                control={createForm.control}
                                name={`items.${index}.productId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Product</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products.map((product) => (
                                          <SelectItem key={product.id} value={product.id}>
                                            {product.name} ({product.sku})
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
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Quantity</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={createForm.control}
                                name={`items.${index}.uomId`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>UOM</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="UOM" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {uoms.map((uom) => (
                                          <SelectItem key={uom.id} value={uom.id}>
                                            {uom.name} ({uom.code})
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
                                name={`items.${index}.unitPrice`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Unit Price</FormLabel>
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
                              <div className="flex items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <FormField
                                control={createForm.control}
                                name={`items.${index}.discount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Discount</FormLabel>
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
                              <FormField
                                control={createForm.control}
                                name={`items.${index}.taxRate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Tax Rate (%)</FormLabel>
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
                              <FormField
                                control={createForm.control}
                                name={`items.${index}.notes`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Notes</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Optional notes" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <div className="text-lg font-medium">
                      Total: {formatCurrency(formSubtotal)}
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createPOMutation.isPending}>
                        {createPOMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
                      </Button>
                    </DialogFooter>
                  </div>
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
                placeholder="Search POs..."
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
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders ({filteredPOs.length})</CardTitle>
          <CardDescription>
            Manage all purchase orders and track order status with suppliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading purchase orders...
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(po.status)}
                        {getStatusBadge(po.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{po.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        Created {formatDateTime(po.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{po.supplier?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {po.supplier?.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{po.location?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {po.location?.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDateTime(po.expectedDeliveryDate)}
                      </div>
                      {po.actualDeliveryDate && (
                        <div className="text-xs text-green-600">
                          Delivered {formatDateTime(po.actualDeliveryDate)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(po.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {po.createdByUser?.name || 'Unknown'}
                      </div>
                      {po.approvedByUser && (
                        <div className="text-xs text-muted-foreground">
                          Approved by {po.approvedByUser.name}
                        </div>
                      )}
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
                          <DropdownMenuItem onClick={() => viewPODetails(po)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {po.status === 'draft' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleApprovePO()}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="mr-2 h-4 w-4" />
                            Send to Supplier
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

      {/* PO Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Purchase Order Details - {selectedPO?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Complete purchase order information and management actions.
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedPO.status)}
                  <div>
                    <div className="font-medium">{getStatusBadge(selectedPO.status)}</div>
                    <div className="text-sm text-muted-foreground">
                      Created {formatDateTime(selectedPO.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    {formatCurrency(selectedPO.totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Amount
                  </div>
                </div>
              </div>

              <Separator />

              {/* Supplier and Location Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Supplier Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedPO.supplier?.name}
                    </div>
                    <div>
                      <span className="font-medium">Code:</span> {selectedPO.supplier?.code}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedPO.supplier?.email || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Phone:</span> {selectedPO.supplier?.phone || 'N/A'}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Delivery Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Location:</span> {selectedPO.location?.name}
                    </div>
                    <div>
                      <span className="font-medium">Code:</span> {selectedPO.location?.code}
                    </div>
                    <div>
                      <span className="font-medium">Expected:</span> {formatDateTime(selectedPO.expectedDeliveryDate)}
                    </div>
                    <div>
                      <span className="font-medium">Actual:</span> {formatDateTime(selectedPO.actualDeliveryDate)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Information
                </h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Subtotal:</span> {formatCurrency(selectedPO.subtotal)}
                  </div>
                  <div>
                    <span className="font-medium">Tax:</span> {formatCurrency(selectedPO.taxAmount)}
                  </div>
                  <div>
                    <span className="font-medium">Shipping:</span> {formatCurrency(selectedPO.shippingCost)}
                  </div>
                  <div>
                    <span className="font-medium">Discount:</span> {formatCurrency(selectedPO.discount)}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t">
                  <div className="text-lg font-semibold">
                    Total: {formatCurrency(selectedPO.totalAmount)}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Items
                </h4>
                {detailsLoading ? (
                  <div className="text-center py-8">Loading items...</div>
                ) : selectedPODetails?.items ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Tax</TableHead>
                          <TableHead>Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPODetails.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product?.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.product?.sku}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {item.quantity} {item.uom?.code}
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.discount)}
                            </TableCell>
                            <TableCell>
                              {item.taxRate}%
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.lineTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No items found
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedPO.notes && (
                <div>
                  <h4 className="font-medium mb-3">Notes</h4>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    {selectedPO.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {selectedPO.status === 'draft' && (
                  <>
                    <Button onClick={handleApprovePO} disabled={approvePOMutation.isPending}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {approvePOMutation.isPending ? 'Approving...' : 'Approve PO'}
                    </Button>
                  </>
                )}
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline">
                  <Send className="mr-2 h-4 w-4" />
                  Send to Supplier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}