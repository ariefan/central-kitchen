"use client"

import * as React from "react"
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray, Control } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { Search, Plus, Filter, Edit, Eye, Trash2, CheckCircle, XCircle, Clock, ArrowRight, FileText, Package } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

// Types
interface Requisition {
  id: string
  reqNumber: string
  fromLocationId: string
  toLocationId: string
  status: 'draft' | 'approved' | 'rejected' | 'issued' | 'completed'
  requestedDate: string
  requiredDate?: string
  notes?: string
  fromLocation?: {
    id: string
    name: string
    code: string
  }
  toLocation?: {
    id: string
    name: string
    code: string
  }
  items?: RequisitionItem[]
}

interface RequisitionItem {
  id: string
  productId: string
  uomId: string
  qtyRequested: number
  qtyIssued?: number
  notes?: string
  product?: {
    id: string
    name: string
    code: string
  }
  uom?: {
    id: string
    name: string
    code: string
  }
}

interface Location {
  id: string
  name: string
  code: string
}

interface Product {
  id: string
  name: string
  code: string
}

interface UOM {
  id: string
  name: string
  code: string
}

// API functions
const fetchRequisitions = async (filters?: {
  status?: string
  fromLocationId?: string
  toLocationId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<Requisition[]> => {
  try {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.fromLocationId) params.append('fromLocationId', filters.fromLocationId)
    if (filters?.toLocationId) params.append('toLocationId', filters.toLocationId)
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters?.dateTo) params.append('dateTo', filters.dateTo)

    const response = await fetch(`/api/v1/requisitions?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch requisitions')

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return getMockRequisitions()
  }
}

const fetchRequisition = async (id: string): Promise<Requisition | null> => {
  try {
    const response = await fetch(`/api/v1/requisitions/${id}`)
    if (!response.ok) throw new Error('Failed to fetch requisition')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return getMockRequisitions().find(r => r.id === id) || null
  }
}

const createRequisition = async (data: any): Promise<Requisition> => {
  try {
    const response = await fetch('/api/v1/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create requisition')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return {
      id: 'mock-' + Math.random().toString(36).substr(2, 9),
      reqNumber: `REQ-${new Date().getFullYear()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ...data,
      status: 'draft',
      requestedDate: new Date().toISOString(),
    }
  }
}

const updateRequisition = async (id: string, data: any): Promise<Requisition> => {
  try {
    const response = await fetch(`/api/v1/requisitions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update requisition')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return { id, ...data, updatedAt: new Date().toISOString() } as Requisition
  }
}

const approveRequisition = async (id: string): Promise<Requisition> => {
  try {
    const response = await fetch(`/api/v1/requisitions/${id}/approve`, {
      method: 'POST',
    })
    if (!response.ok) throw new Error('Failed to approve requisition')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return { id, status: 'approved', approvedAt: new Date().toISOString() } as Requisition
  }
}

const rejectRequisition = async (id: string, reason: string): Promise<Requisition> => {
  try {
    const response = await fetch(`/api/v1/requisitions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!response.ok) throw new Error('Failed to reject requisition')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return { id, status: 'rejected', notes: `Rejected: ${reason}` } as Requisition
  }
}

// Mock data for development
const getMockRequisitions = (): Requisition[] => [
  {
    id: 'req-1',
    reqNumber: 'REQ-2024001',
    fromLocationId: 'loc-1',
    toLocationId: 'loc-2',
    status: 'draft',
    requestedDate: '2024-01-15T10:00:00Z',
    requiredDate: '2024-01-20T00:00:00Z',
    notes: 'Urgent stock needed for weekend preparation',
    fromLocation: { id: 'loc-1', name: 'Main Kitchen', code: 'MK001' },
    toLocation: { id: 'loc-2', name: 'Downtown Cafe', code: 'DC001' },
    items: [
      {
        id: 'req-item-1',
        productId: 'prod-1',
        uomId: 'uom-1',
        qtyRequested: 50,
        qtyIssued: 0,
        notes: 'Fresh coffee beans needed',
        product: { id: 'prod-1', name: 'Coffee Beans Arabica', code: 'CB001' },
        uom: { id: 'uom-1', name: 'Kilograms', code: 'KG' },
      },
      {
        id: 'req-item-2',
        productId: 'prod-2',
        uomId: 'uom-2',
        qtyRequested: 20,
        qtyIssued: 0,
        product: { id: 'prod-2', name: 'Croissant Dough', code: 'CD001' },
        uom: { id: 'uom-2', name: 'Pieces', code: 'PCS' },
      },
    ],
  },
  {
    id: 'req-2',
    reqNumber: 'REQ-2024002',
    fromLocationId: 'loc-1',
    toLocationId: 'loc-3',
    status: 'approved',
    requestedDate: '2024-01-14T09:00:00Z',
    requiredDate: '2024-01-18T00:00:00Z',
    approvedAt: '2024-01-14T11:30:00Z',
    fromLocation: { id: 'loc-1', name: 'Main Kitchen', code: 'MK001' },
    toLocation: { id: 'loc-3', name: 'Airport Branch', code: 'AP001' },
    items: [
      {
        id: 'req-item-3',
        productId: 'prod-3',
        uomId: 'uom-1',
        qtyRequested: 30,
        qtyIssued: 25,
        notes: 'Premium quality for airport location',
        product: { id: 'prod-3', name: 'Organic Milk', code: 'OM001' },
        uom: { id: 'uom-1', name: 'Liters', code: 'L' },
      },
    ],
  },
  {
    id: 'req-3',
    reqNumber: 'REQ-2024003',
    fromLocationId: 'loc-2',
    toLocationId: 'loc-1',
    status: 'rejected',
    requestedDate: '2024-01-13T14:00:00Z',
    notes: 'Rejected: Insufficient stock available',
    fromLocation: { id: 'loc-2', name: 'Downtown Cafe', code: 'DC001' },
    toLocation: { id: 'loc-1', name: 'Main Kitchen', code: 'MK001' },
    items: [
      {
        id: 'req-item-4',
        productId: 'prod-4',
        uomId: 'uom-3',
        qtyRequested: 100,
        qtyIssued: 0,
        product: { id: 'prod-4', name: 'Sugar Packets', code: 'SP001' },
        uom: { id: 'uom-3', name: 'Boxes', code: 'BOX' },
      },
    ],
  },
]

const getMockLocations = (): Location[] => [
  { id: 'loc-1', name: 'Main Kitchen', code: 'MK001' },
  { id: 'loc-2', name: 'Downtown Cafe', code: 'DC001' },
  { id: 'loc-3', name: 'Airport Branch', code: 'AP001' },
]

const getMockProducts = (): Product[] => [
  { id: 'prod-1', name: 'Coffee Beans Arabica', code: 'CB001' },
  { id: 'prod-2', name: 'Croissant Dough', code: 'CD001' },
  { id: 'prod-3', name: 'Organic Milk', code: 'OM001' },
  { id: 'prod-4', name: 'Sugar Packets', code: 'SP001' },
  { id: 'prod-5', name: 'Chocolate Syrup', code: 'CS001' },
]

const getMockUOMs = (): UOM[] => [
  { id: 'uom-1', name: 'Kilograms', code: 'KG' },
  { id: 'uom-2', name: 'Pieces', code: 'PCS' },
  { id: 'uom-3', name: 'Boxes', code: 'BOX' },
  { id: 'uom-4', name: 'Liters', code: 'L' },
]

// Form schemas
const requisitionItemSchema = z.object({
  productId: z.string().uuid("Product is required"),
  uomId: z.string().uuid("UOM is required"),
  qtyRequested: z.number().positive("Quantity must be positive"),
  notes: z.string().optional(),
})

const requisitionCreateSchema = z.object({
  fromLocationId: z.string().uuid("From location is required"),
  toLocationId: z.string().uuid("To location is required"),
  requiredDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  items: z.array(requisitionItemSchema).min(1, "At least one item is required"),
})

// Requisition Item Component
function RequisitionItemRow({
  item,
  control,
  index,
  onRemove,
  products,
  uoms,
}: {
  item: any
  control: Control<any>
  index: number
  onRemove: () => void
  products: Product[]
  uoms: UOM[]
}) {
  return (
    <div className="grid grid-cols-12 gap-4 items-start">
      <FormField
        control={control}
        name={`items.${index}.productId`}
        render={({ field }) => (
          <FormItem className="col-span-5">
            <FormLabel>Product</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`items.${index}.uomId`}
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>UOM</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="UOM" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`items.${index}.qtyRequested`}
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...field}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`items.${index}.notes`}
        render={({ field }) => (
          <FormItem className="col-span-2">
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Input placeholder="Optional notes" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="col-span-1 flex items-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          className="h-10 w-10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Main Component
export default function RequisitionsPage() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingRequisition, setEditingRequisition] = React.useState<Requisition | null>(null)
  const [viewingRequisition, setViewingRequisition] = React.useState<Requisition | null>(null)
  const [filters, setFilters] = React.useState({
    status: '',
    fromLocationId: '',
    toLocationId: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  const queryClient = useQueryClient()

  // Queries
  const { data: requisitions = [], isLoading, error } = useQuery({
    queryKey: ['requisitions', filters],
    queryFn: () => fetchRequisitions(filters),
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/locations')
        if (!response.ok) throw new Error('Failed to fetch locations')
        const result = await response.json()
        return result.data || []
      } catch {
        return getMockLocations()
      }
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/products')
        if (!response.ok) throw new Error('Failed to fetch products')
        const result = await response.json()
        return result.data || []
      } catch {
        return getMockProducts()
      }
    },
  })

  const { data: uoms = [] } = useQuery({
    queryKey: ['uoms'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/uoms')
        if (!response.ok) throw new Error('Failed to fetch UOMs')
        const result = await response.json()
        return result.data || []
      } catch {
        return getMockUOMs()
      }
    },
  })

  // Forms
  const createForm = useForm<z.infer<typeof requisitionCreateSchema>>({
    resolver: zodResolver(requisitionCreateSchema),
    defaultValues: {
      fromLocationId: "",
      toLocationId: "",
      requiredDate: "",
      notes: "",
      items: [{ productId: "", uomId: "", qtyRequested: 1, notes: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "items",
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: () => {
      toast.success("Requisition created successfully")
      setIsCreateOpen(false)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    },
    onError: (error) => {
      toast.error(`Failed to create requisition: ${error.message}`)
    },
  })

  const approveMutation = useMutation({
    mutationFn: approveRequisition,
    onSuccess: () => {
      toast.success("Requisition approved successfully")
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    },
    onError: (error) => {
      toast.error(`Failed to approve requisition: ${error.message}`)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectRequisition(id, reason),
    onSuccess: () => {
      toast.success("Requisition rejected successfully")
      queryClient.invalidateQueries({ queryKey: ['requisitions'] })
    },
    onError: (error) => {
      toast.error(`Failed to reject requisition: ${error.message}`)
    },
  })

  // Form submissions
  const onCreateSubmit = (values: z.infer<typeof requisitionCreateSchema>) => {
    createMutation.mutate(values)
  }

  const onApprove = (id: string) => {
    approveMutation.mutate(id)
  }

  const onReject = (id: string, reason: string) => {
    rejectMutation.mutate({ id, reason })
  }

  // Filter functions
  const filteredRequisitions = requisitions.filter((req) => {
    if (filters.search && !req.reqNumber.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    return true
  })

  // Status helpers
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'approved':
        return 'default'
      case 'rejected':
        return 'destructive'
      case 'issued':
        return 'default'
      case 'completed':
        return 'default'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-3 w-3" />
      case 'approved':
        return <CheckCircle className="h-3 w-3" />
      case 'rejected':
        return <XCircle className="h-3 w-3" />
      case 'issued':
        return <Package className="h-3 w-3" />
      case 'completed':
        return <CheckCircle className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Error loading requisitions</h2>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Requisitions Management</h1>
          <p className="text-muted-foreground">
            Manage inter-location stock requisitions and transfers
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Requisition</DialogTitle>
              <DialogDescription>
                Request stock transfer between locations
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="fromLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source location" />
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

                  <FormField
                    control={createForm.control}
                    name="toLocationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Location</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination location" />
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

                <FormField
                  control={createForm.control}
                  name="requiredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Required Date (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requirements or notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Requisition Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "", uomId: "", qtyRequested: 1, notes: "" })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <RequisitionItemRow
                        key={field.id}
                        item={field}
                        control={createForm.control}
                        index={index}
                        onRemove={() => remove(index)}
                        products={products}
                        uoms={uoms}
                      />
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Requisition"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
          <div className="grid grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requisitions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.fromLocationId} onValueChange={(value) => setFilters(prev => ({ ...prev, fromLocationId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="From Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.toLocationId} onValueChange={(value) => setFilters(prev => ({ ...prev, toLocationId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="To Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setFilters({
                status: '',
                fromLocationId: '',
                toLocationId: '',
                dateFrom: '',
                dateTo: '',
                search: '',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Requisitions List */}
      <Card>
        <CardHeader>
          <CardTitle>Requisitions ({filteredRequisitions.length})</CardTitle>
          <CardDescription>
            Manage inter-location stock requisitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading requisitions...</div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No requisitions found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status || filters.fromLocationId || filters.toLocationId
                  ? "Try adjusting your filters"
                  : "Create your first requisition to get started"}
              </p>
              {!filters.search && !filters.status && !filters.fromLocationId && !filters.toLocationId && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Requisition
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisition #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Required Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequisitions.map((requisition) => (
                  <TableRow key={requisition.id}>
                    <TableCell className="font-medium">
                      {requisition.reqNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{requisition.fromLocation?.name}</div>
                        <div className="text-sm text-muted-foreground">{requisition.fromLocation?.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{requisition.toLocation?.name}</div>
                        <div className="text-sm text-muted-foreground">{requisition.toLocation?.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(requisition.status)} className="flex items-center gap-1 w-fit">
                        {getStatusIcon(requisition.status)}
                        {requisition.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {requisition.requestedDate ? format(new Date(requisition.requestedDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {requisition.requiredDate ? format(new Date(requisition.requiredDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {requisition.items?.length || 0} items
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingRequisition(requisition)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {requisition.status === 'draft' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApprove(requisition.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <RejectRequisitionDialog
                              onReject={(reason) => onReject(requisition.id, reason)}
                              disabled={rejectMutation.isPending}
                            />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Requisition Dialog */}
      <Dialog open={!!viewingRequisition} onOpenChange={() => setViewingRequisition(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Requisition Details</DialogTitle>
            <DialogDescription>
              Full requisition information and items
            </DialogDescription>
          </DialogHeader>
          {viewingRequisition && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">From Location</h3>
                  <p>{viewingRequisition.fromLocation?.name}</p>
                  <p className="text-sm text-muted-foreground">{viewingRequisition.fromLocation?.code}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">To Location</h3>
                  <p>{viewingRequisition.toLocation?.name}</p>
                  <p className="text-sm text-muted-foreground">{viewingRequisition.toLocation?.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Status</h3>
                  <Badge variant={getStatusVariant(viewingRequisition.status)} className="flex items-center gap-1 w-fit">
                    {getStatusIcon(viewingRequisition.status)}
                    {viewingRequisition.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Requested Date</h3>
                  <p>{viewingRequisition.requestedDate ? format(new Date(viewingRequisition.requestedDate), 'PPP') : '-'}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Required Date</h3>
                  <p>{viewingRequisition.requiredDate ? format(new Date(viewingRequisition.requiredDate), 'PPP') : '-'}</p>
                </div>
              </div>

              {viewingRequisition.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded">{viewingRequisition.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-4">Requisition Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Quantity Requested</TableHead>
                      <TableHead>Quantity Issued</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRequisition.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.product?.name}</div>
                            <div className="text-sm text-muted-foreground">{item.product?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.uom?.name}</TableCell>
                        <TableCell>{item.qtyRequested}</TableCell>
                        <TableCell>{item.qtyIssued || 0}</TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Reject Requisition Dialog Component
function RejectRequisitionDialog({ onReject, disabled }: { onReject: (reason: string) => void; disabled: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')

  const handleReject = () => {
    if (reason.trim()) {
      onReject(reason.trim())
      setIsOpen(false)
      setReason('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <XCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Requisition</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this requisition
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Reason for rejection</label>
            <Textarea
              placeholder="Enter reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || disabled}
          >
            Reject Requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}