"use client"

import * as React from "react"
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Plus, Search, Edit, Trash2, Eye, Copy, Tag, Calendar, DollarSign, ChevronDown, MoreHorizontal, X } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"

// API types
interface PriceBook {
  id: string
  tenantId: string
  name: string
  channel?: string
  startAt?: string
  endAt?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface PriceBookItem {
  id: string
  priceBookId: string
  productId: string
  variantId?: string
  locationId?: string
  price: string
  product?: {
    id: string
    name: string
    sku: string
  }
  location?: {
    id: string
    name: string
    code: string
  }
}

interface Product {
  id: string
  name: string
  sku: string
  baseUomId: string
}

interface Location {
  id: string
  name: string
  code: string
  type: string
}

// Mock data for development
const mockPriceBooks: PriceBook[] = [
  {
    id: "pb-001",
    tenantId: "tenant-001",
    name: "Standard Restaurant Pricing",
    channel: "pos",
    startAt: "2024-01-01T00:00:00Z",
    endAt: "2024-12-31T23:59:59Z",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "pb-002",
    tenantId: "tenant-001",
    name: "Online Delivery Pricing",
    channel: "online",
    startAt: "2024-01-01T00:00:00Z",
    endAt: "2024-12-31T23:59:59Z",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "pb-003",
    tenantId: "tenant-001",
    name: "Wholesale Pricing",
    channel: "wholesale",
    startAt: "2024-01-01T00:00:00Z",
    endAt: "2024-12-31T23:59:59Z",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

const mockProducts: Product[] = [
  { id: "prod-001", name: "Classic Burger", sku: "BUR-001", baseUomId: "uom-001" },
  { id: "prod-002", name: "Caesar Salad", sku: "SAL-001", baseUomId: "uom-001" },
  { id: "prod-003", name: "French Fries", sku: "FRY-001", baseUomId: "uom-001" },
  { id: "prod-004", name: "Coca Cola", sku: "DRK-001", baseUomId: "uom-001" },
]

const mockLocations: Location[] = [
  { id: "loc-001", name: "Main Restaurant", code: "REST-001", type: "outlet" },
  { id: "loc-002", name: "Central Kitchen", code: "CK-001", type: "central_kitchen" },
  { id: "loc-003", name: "Downtown Branch", code: "REST-002", type: "outlet" },
]

// API functions
async function fetchPriceBooks(): Promise<PriceBook[]> {
  try {
    const response = await fetch('/api/v1/pricebooks')
    if (!response.ok) {
      throw new Error('Failed to fetch price books')
    }
    const data = await response.json()
    return data.data || mockPriceBooks
  } catch (error) {
    console.log('Using mock data for price books')
    return mockPriceBooks
  }
}

async function fetchPriceBookItems(priceBookId: string): Promise<PriceBookItem[]> {
  try {
    const response = await fetch(`/api/v1/pricebooks/${priceBookId}/items`)
    if (!response.ok) {
      throw new Error('Failed to fetch price book items')
    }
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.log('Using mock data for price book items')
    return [
      {
        id: "pbi-001",
        priceBookId,
        productId: "prod-001",
        price: "12.99",
        product: { id: "prod-001", name: "Classic Burger", sku: "BUR-001" },
      },
      {
        id: "pbi-002",
        priceBookId,
        productId: "prod-002",
        price: "8.99",
        product: { id: "prod-002", name: "Caesar Salad", sku: "SAL-001" },
      },
    ]
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

// Form schemas
const priceBookFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  channel: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  isActive: z.boolean().default(true),
})

const priceBookItemFormSchema = z.object({
  productId: z.string().uuid("Product is required"),
  locationId: z.string().uuid().optional(),
  price: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Price must be a positive number" }
  ),
})

type PriceBookFormValues = z.infer<typeof priceBookFormSchema>
type PriceBookItemFormValues = z.infer<typeof priceBookItemFormSchema>

export const Route = createFileRoute('/pricebooks/')({
  component: PriceBooksIndex,
})

function PriceBooksIndex() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<string>("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showItemsDialog, setShowItemsDialog] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [selectedPriceBook, setSelectedPriceBook] = useState<PriceBook | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: priceBooks = [], isLoading } = useQuery({
    queryKey: ['priceBooks'],
    queryFn: fetchPriceBooks,
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

  const { data: priceBookItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['priceBookItems', selectedPriceBook?.id],
    queryFn: () => selectedPriceBook ? fetchPriceBookItems(selectedPriceBook.id) : [],
    enabled: !!selectedPriceBook && showItemsDialog,
    retry: false,
  })

  // Forms
  const priceBookForm = useForm<PriceBookFormValues>({
    resolver: zodResolver(priceBookFormSchema),
    defaultValues: {
      name: "",
      channel: "",
      startAt: "",
      endAt: "",
      isActive: true,
    },
  })

  const itemForm = useForm<PriceBookItemFormValues>({
    resolver: zodResolver(priceBookItemFormSchema),
    defaultValues: {
      productId: "",
      locationId: "",
      price: "",
    },
  })

  // Mutations
  const createPriceBookMutation = useMutation({
    mutationFn: async (data: PriceBookFormValues) => {
      const response = await fetch('/api/v1/pricebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create price book')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceBooks'] })
      setShowCreateDialog(false)
      priceBookForm.reset()
      toast({
        title: "Success",
        description: "Price book created successfully",
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

  const addItemMutation = useMutation({
    mutationFn: async (data: PriceBookItemFormValues & { priceBookId: string }) => {
      const response = await fetch(`/api/v1/pricebooks/${data.priceBookId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: data.productId,
          locationId: data.locationId,
          price: data.price,
        }),
      })
      if (!response.ok) throw new Error('Failed to add item')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priceBookItems', selectedPriceBook?.id] })
      setShowAddItemDialog(false)
      itemForm.reset()
      toast({
        title: "Success",
        description: "Item added to price book successfully",
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
  const filteredPriceBooks = priceBooks.filter((pb) => {
    const matchesSearch = pb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pb.channel?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesChannel = selectedChannel === "all" || pb.channel === selectedChannel
    return matchesSearch && matchesChannel
  })

  const channels = Array.from(new Set(priceBooks.map(pb => pb.channel).filter(Boolean)))

  function handleCreatePriceBook(values: PriceBookFormValues) {
    createPriceBookMutation.mutate(values)
  }

  function handleAddItem(values: PriceBookItemFormValues) {
    if (!selectedPriceBook) return
    addItemMutation.mutate({ ...values, priceBookId: selectedPriceBook.id })
  }

  function viewPriceBookItems(priceBook: PriceBook) {
    setSelectedPriceBook(priceBook)
    setShowItemsDialog(true)
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount))
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No end date'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Price Books</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Price Book
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Price Book</DialogTitle>
                <DialogDescription>
                  Create a new price book for your products. You can add specific pricing rules after creation.
                </DialogDescription>
              </DialogHeader>
              <Form {...priceBookForm}>
                <form onSubmit={priceBookForm.handleSubmit(handleCreatePriceBook)} className="space-y-4">
                  <FormField
                    control={priceBookForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter price book name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={priceBookForm.control}
                    name="channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No channel</SelectItem>
                            <SelectItem value="pos">POS</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="wholesale">Wholesale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={priceBookForm.control}
                      name="startAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={priceBookForm.control}
                      name="endAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={priceBookForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Active</FormLabel>
                          <FormDescription>
                            Price book will be used for pricing calculations
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createPriceBookMutation.isPending}>
                      {createPriceBookMutation.isPending ? 'Creating...' : 'Create Price Book'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search price books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="wholesale">Wholesale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Price Books ({filteredPriceBooks.length})</CardTitle>
          <CardDescription>
            Manage your product pricing strategies across different channels and time periods.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading price books...
                  </TableCell>
                </TableRow>
              ) : filteredPriceBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No price books found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPriceBooks.map((priceBook) => (
                  <TableRow key={priceBook.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{priceBook.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Created {new Date(priceBook.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {priceBook.channel ? (
                        <Badge variant="outline" className="capitalize">
                          {priceBook.channel}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">All channels</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={priceBook.isActive ? "default" : "secondary"}>
                        {priceBook.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(priceBook.startAt)}</div>
                        <div className="text-muted-foreground">
                          to {formatDate(priceBook.endAt)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewPriceBookItems(priceBook)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Items
                      </Button>
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
                          <DropdownMenuItem onClick={() => viewPriceBookItems(priceBook)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Items
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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

      {/* Price Book Items Dialog */}
      <Dialog open={showItemsDialog} onOpenChange={setShowItemsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Price Book Items - {selectedPriceBook?.name}
            </DialogTitle>
            <DialogDescription>
              Manage product prices for this price book. Add new items or update existing prices.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {priceBookItems.length} items in this price book
            </div>
            <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Item to Price Book</DialogTitle>
                  <DialogDescription>
                    Add a product with specific pricing to this price book.
                  </DialogDescription>
                </DialogHeader>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(handleAddItem)} className="space-y-4">
                    <FormField
                      control={itemForm.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
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
                      control={itemForm.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="All locations" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">All locations</SelectItem>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addItemMutation.isPending}>
                        {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading items...
                    </TableCell>
                  </TableRow>
                ) : priceBookItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No items in this price book
                    </TableCell>
                  </TableRow>
                ) : (
                  priceBookItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.product?.sku || 'No SKU'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.location ? (
                          <div>
                            <div className="font-medium">{item.location.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.location.code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">All locations</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Price
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}