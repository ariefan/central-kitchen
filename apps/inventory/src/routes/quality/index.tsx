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
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Calendar,
  Thermometer,
  Droplets,
  Package,
  User,
  FileText,
  Download,
  Upload,
  Camera,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  ChevronDown
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"

// API types
interface QualityCheck {
  id: string
  checkType: 'temperature' | 'visual' | 'weight' | 'freshness' | 'hygiene' | 'allergen' | 'label'
  status: 'pass' | 'fail' | 'pending' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  productId?: string
  batchNumber?: string
  lotNumber?: string
  locationId?: string
  productionOrderId?: string
  checkedBy?: string
  checkedAt?: string
  nextCheckDue?: string
  actualValue?: string
  expectedValue?: string
  unit?: string
  tolerance?: string
  notes?: string
  correctiveActions?: string
  attachments?: string[]
  createdAt: string
  updatedAt: string
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
  checkedByUser?: {
    id: string
    name: string
    email: string
  }
}

interface QualityStandard {
  id: string
  name: string
  description: string
  checkType: string
  productIds: string[]
  locations: string[]
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'per_batch'
  parameters: {
    expectedValue: string
    unit: string
    tolerance: string
    min?: string
    max?: string
  }
  isActive: boolean
  createdAt: string
}

interface Product {
  id: string
  name: string
  sku: string
  category?: string
}

interface Location {
  id: string
  name: string
  code: string
  type: string
}

// Mock data for development
const mockQualityChecks: QualityCheck[] = [
  {
    id: "qc-001",
    checkType: "temperature",
    status: "pass",
    priority: "high",
    productId: "prod-001",
    batchNumber: "BATCH-001",
    lotNumber: "LOT-001",
    locationId: "loc-001",
    checkedBy: "user-001",
    checkedAt: "2024-01-15T08:30:00Z",
    nextCheckDue: "2024-01-15T14:30:00Z",
    actualValue: "4.5",
    expectedValue: "4.0",
    unit: "°C",
    tolerance: "±2.0",
    notes: "Temperature within acceptable range",
    createdAt: "2024-01-15T08:30:00Z",
    updatedAt: "2024-01-15T08:30:00Z",
    product: { id: "prod-001", name: "Fresh Lettuce", sku: "VEG-001" },
    location: { id: "loc-001", name: "Cold Storage A", code: "CS-A" },
    checkedByUser: { id: "user-001", name: "John Smith", email: "john@company.com" },
  },
  {
    id: "qc-002",
    checkType: "visual",
    status: "fail",
    priority: "critical",
    productId: "prod-002",
    batchNumber: "BATCH-002",
    locationId: "loc-002",
    checkedBy: "user-002",
    checkedAt: "2024-01-15T09:15:00Z",
    nextCheckDue: "2024-01-15T10:15:00Z",
    notes: "Discoloration detected on multiple items. Product quality compromised.",
    correctiveActions: "Quarantine affected batch, notify supplier, arrange replacement",
    createdAt: "2024-01-15T09:15:00Z",
    updatedAt: "2024-01-15T09:45:00Z",
    product: { id: "prod-002", name: "Tomatoes", sku: "VEG-002" },
    location: { id: "loc-002", name: "Processing Area", code: "PROC-01" },
    checkedByUser: { id: "user-002", name: "Sarah Johnson", email: "sarah@company.com" },
  },
  {
    id: "qc-003",
    checkType: "freshness",
    status: "pending",
    priority: "medium",
    productId: "prod-003",
    lotNumber: "LOT-003",
    locationId: "loc-001",
    checkedAt: "2024-01-15T07:00:00Z",
    nextCheckDue: "2024-01-15T15:00:00Z",
    notes: "Awaiting freshness assessment from senior quality inspector",
    createdAt: "2024-01-15T07:00:00Z",
    updatedAt: "2024-01-15T07:00:00Z",
    product: { id: "prod-003", name: "Salmon Fillet", sku: "FISH-001" },
    location: { id: "loc-001", name: "Cold Storage A", code: "CS-A" },
  },
  {
    id: "qc-004",
    checkType: "hygiene",
    status: "pass",
    priority: "high",
    locationId: "loc-002",
    checkedBy: "user-001",
    checkedAt: "2024-01-15T06:00:00Z",
    nextCheckDue: "2024-01-15T18:00:00Z",
    actualValue: "0",
    expectedValue: "0",
    unit: "CFU",
    tolerance: "< 10",
    notes: "Surface swab test completed, no contamination detected",
    createdAt: "2024-01-15T06:00:00Z",
    updatedAt: "2024-01-15T06:00:00Z",
    location: { id: "loc-002", name: "Processing Area", code: "PROC-01" },
    checkedByUser: { id: "user-001", name: "John Smith", email: "john@company.com" },
  },
  {
    id: "qc-005",
    checkType: "allergen",
    status: "review",
    priority: "critical",
    productId: "prod-004",
    batchNumber: "BATCH-004",
    locationId: "loc-003",
    checkedBy: "user-003",
    checkedAt: "2024-01-15T10:30:00Z",
    nextCheckDue: "2024-01-15T11:30:00Z",
    notes: "Allergen test results inconclusive, requires retesting",
    correctiveActions: "Immediate retest required, hold production until cleared",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T11:00:00Z",
    product: { id: "prod-004", name: "Mixed Nuts", sku: "NUT-001" },
    location: { id: "loc-003", name: "Packaging Line", code: "PACK-01" },
    checkedByUser: { id: "user-003", name: "Mike Chen", email: "mike@company.com" },
  },
]

const mockProducts: Product[] = [
  { id: "prod-001", name: "Fresh Lettuce", sku: "VEG-001", category: "Vegetables" },
  { id: "prod-002", name: "Tomatoes", sku: "VEG-002", category: "Vegetables" },
  { id: "prod-003", name: "Salmon Fillet", sku: "FISH-001", category: "Seafood" },
  { id: "prod-004", name: "Mixed Nuts", sku: "NUT-001", category: "Nuts" },
  { id: "prod-005", name: "Chicken Breast", sku: "MEAT-001", category: "Meat" },
]

const mockLocations: Location[] = [
  { id: "loc-001", name: "Cold Storage A", code: "CS-A", type: "storage" },
  { id: "loc-002", name: "Processing Area", code: "PROC-01", type: "production" },
  { id: "loc-003", name: "Packaging Line", code: "PACK-01", type: "production" },
  { id: "loc-004", name: "Receiving Area", code: "REC-01", type: "receiving" },
]

// API functions (using mock data for now)
async function fetchQualityChecks(filters?: {
  checkType?: string
  status?: string
  priority?: string
  productId?: string
  locationId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<QualityCheck[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500))

  let filtered = [...mockQualityChecks]

  if (filters?.checkType && filters.checkType !== 'all') {
    filtered = filtered.filter(qc => qc.checkType === filters.checkType)
  }
  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter(qc => qc.status === filters.status)
  }
  if (filters?.priority && filters.priority !== 'all') {
    filtered = filtered.filter(qc => qc.priority === filters.priority)
  }
  if (filters?.productId && filters.productId !== 'all') {
    filtered = filtered.filter(qc => qc.productId === filters.productId)
  }
  if (filters?.locationId && filters.locationId !== 'all') {
    filtered = filtered.filter(qc => qc.locationId === filters.locationId)
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function fetchProducts(): Promise<Product[]> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockProducts
}

async function fetchLocations(): Promise<Location[]> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return mockLocations
}

// Form schemas
const qualityCheckFormSchema = z.object({
  checkType: z.enum(['temperature', 'visual', 'weight', 'freshness', 'hygiene', 'allergen', 'label']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  productId: z.string().uuid().optional(),
  batchNumber: z.string().max(50).optional(),
  lotNumber: z.string().max(50).optional(),
  locationId: z.string().uuid().optional(),
  productionOrderId: z.string().uuid().optional(),
  actualValue: z.string().optional(),
  expectedValue: z.string().optional(),
  unit: z.string().max(20).optional(),
  tolerance: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  correctiveActions: z.string().max(1000).optional(),
})

const qualityCheckUpdateSchema = z.object({
  status: z.enum(['pass', 'fail', 'pending', 'review']).optional(),
  actualValue: z.string().optional(),
  notes: z.string().max(1000).optional(),
  correctiveActions: z.string().max(1000).optional(),
})

type QualityCheckFormValues = z.infer<typeof qualityCheckFormSchema>
type QualityCheckUpdateValues = z.infer<typeof qualityCheckUpdateSchema>

export const Route = createFileRoute('/quality/')({
  component: QualityIndex,
})

function QualityIndex() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCheckType, setSelectedCheckType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedPriority, setSelectedPriority] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedCheck, setSelectedCheck] = useState<QualityCheck | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Queries
  const { data: qualityChecks = [], isLoading, refetch } = useQuery({
    queryKey: ['qualityChecks', { checkType: selectedCheckType, status: selectedStatus, priority: selectedPriority, productId: selectedProduct, locationId: selectedLocation, dateFrom, dateTo }],
    queryFn: () => fetchQualityChecks({
      checkType: selectedCheckType !== "all" ? selectedCheckType : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      priority: selectedPriority !== "all" ? selectedPriority : undefined,
      productId: selectedProduct !== "all" ? selectedProduct : undefined,
      locationId: selectedLocation !== "all" ? selectedLocation : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
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

  // Forms
  const createForm = useForm<QualityCheckFormValues>({
    resolver: zodResolver(qualityCheckFormSchema),
    defaultValues: {
      checkType: 'temperature',
      priority: 'medium',
      productId: "",
      batchNumber: "",
      lotNumber: "",
      locationId: "",
      productionOrderId: "",
      actualValue: "",
      expectedValue: "",
      unit: "",
      tolerance: "",
      notes: "",
      correctiveActions: "",
    },
  })

  const updateForm = useForm<QualityCheckUpdateValues>({
    resolver: zodResolver(qualityCheckUpdateSchema),
    defaultValues: {
      status: undefined,
      actualValue: "",
      notes: "",
      correctiveActions: "",
    },
  })

  // Mock mutations (would connect to real API)
  const createCheckMutation = useMutation({
    mutationFn: async (data: QualityCheckFormValues) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      const newCheck: QualityCheck = {
        id: `qc-${Date.now()}`,
        ...data,
        status: 'pending',
        checkedBy: 'current-user',
        checkedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: products.find(p => p.id === data.productId),
        location: locations.find(l => l.id === data.locationId),
      }
      return newCheck
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityChecks'] })
      setShowCreateDialog(false)
      createForm.reset()
      toast({
        title: "Success",
        description: "Quality check created successfully",
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

  const updateCheckMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: QualityCheckUpdateValues }) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { id, ...data, updatedAt: new Date().toISOString() }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualityChecks'] })
      setShowDetailsDialog(false)
      updateForm.reset()
      toast({
        title: "Success",
        description: "Quality check updated successfully",
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
  const filteredChecks = qualityChecks.filter((check) => {
    const matchesSearch =
      check.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.lotNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const checkTypes = [
    { value: 'all', label: 'All Types', icon: Package },
    { value: 'temperature', label: 'Temperature', icon: Thermometer },
    { value: 'visual', label: 'Visual', icon: Eye },
    { value: 'weight', label: 'Weight', icon: Package },
    { value: 'freshness', label: 'Freshness', icon: Droplets },
    { value: 'hygiene', label: 'Hygiene', icon: Droplets },
    { value: 'allergen', label: 'Allergen', icon: AlertTriangle },
    { value: 'label', label: 'Label', icon: FileText },
  ]

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pass', label: 'Pass' },
    { value: 'fail', label: 'Fail' },
    { value: 'pending', label: 'Pending' },
    { value: 'review', label: 'Review' },
  ]

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]

  function handleCreateCheck(values: QualityCheckFormValues) {
    createCheckMutation.mutate(values)
  }

  function handleUpdateCheck(values: QualityCheckUpdateValues) {
    if (!selectedCheck) return
    updateCheckMutation.mutate({ id: selectedCheck.id, data: values })
  }

  function viewCheckDetails(check: QualityCheck) {
    setSelectedCheck(check)
    updateForm.reset({
      status: check.status,
      actualValue: check.actualValue || "",
      notes: check.notes || "",
      correctiveActions: check.correctiveActions || "",
    })
    setShowDetailsDialog(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pass: 'default',
      fail: 'destructive',
      pending: 'secondary',
      review: 'outline',
    }

    return (
      <Badge variant={variants[status] || 'secondary'} className="capitalize">
        {status}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }

    return (
      <Badge className={colors[priority] || colors.medium}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'review':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getCheckTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      temperature: <Thermometer className="h-4 w-4" />,
      visual: <Eye className="h-4 w-4" />,
      weight: <Package className="h-4 w-4" />,
      freshness: <Droplets className="h-4 w-4" />,
      hygiene: <Droplets className="h-4 w-4" />,
      allergen: <AlertTriangle className="h-4 w-4" />,
      label: <FileText className="h-4 w-4" />,
    }
    return iconMap[type] || <Package className="h-4 w-4" />
  }

  // Calculate statistics
  const totalChecks = filteredChecks.length
  const passedChecks = filteredChecks.filter(c => c.status === 'pass').length
  const failedChecks = filteredChecks.filter(c => c.status === 'fail').length
  const pendingChecks = filteredChecks.filter(c => c.status === 'pending').length
  const criticalIssues = filteredChecks.filter(c => c.priority === 'critical' && c.status === 'fail').length

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quality Control</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Quality Check
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Quality Check</DialogTitle>
                <DialogDescription>
                  Perform a new quality check on products, equipment, or processes.
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateCheck)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="checkType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {checkTypes.filter(t => t.value !== 'all').map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {priorityOptions.filter(p => p.value !== 'all').map((priority) => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  {priority.label}
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
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No product</SelectItem>
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
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
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
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="batchNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Number</FormLabel>
                          <FormControl>
                            <Input placeholder="BATCH-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="lotNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lot Number</FormLabel>
                          <FormControl>
                            <Input placeholder="LOT-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="°C, kg, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="expectedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Value</FormLabel>
                          <FormControl>
                            <Input placeholder="4.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="actualValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Value</FormLabel>
                          <FormControl>
                            <Input placeholder="4.5" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="tolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolerance</FormLabel>
                          <FormControl>
                            <Input placeholder="±2.0" {...field} />
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
                            placeholder="Describe observations and findings..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="correctiveActions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Corrective Actions (if needed)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe any corrective actions taken or required..."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createCheckMutation.isPending}>
                      {createCheckMutation.isPending ? 'Creating...' : 'Create Quality Check'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChecks}</div>
            <p className="text-xs text-muted-foreground">
              All quality checks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedChecks}</div>
            <p className="text-xs text-muted-foreground">
              {totalChecks > 0 ? `${Math.round((passedChecks / totalChecks) * 100)}%` : '0%'} success rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedChecks}</div>
            <p className="text-xs text-muted-foreground">
              {totalChecks > 0 ? `${Math.round((failedChecks / totalChecks) * 100)}%` : '0%'} failure rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingChecks}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search checks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCheckType} onValueChange={setSelectedCheckType}>
              <SelectTrigger>
                <SelectValue placeholder="Check Type" />
              </SelectTrigger>
              <SelectContent>
                {checkTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
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

      {/* Quality Checks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Checks ({filteredChecks.length})</CardTitle>
          <CardDescription>
            Monitor and manage all quality control checks across your operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Values</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Checked By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading quality checks...
                  </TableCell>
                </TableRow>
              ) : filteredChecks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No quality checks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredChecks.map((check) => (
                  <TableRow key={check.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(check.status)}
                        {getStatusBadge(check.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCheckTypeIcon(check.checkType)}
                        <span className="capitalize">{check.checkType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(check.priority)}
                    </TableCell>
                    <TableCell>
                      {check.product ? (
                        <div>
                          <div className="font-medium">{check.product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {check.batchNumber && `Batch: ${check.batchNumber}`}
                            {check.lotNumber && check.batchNumber && " • "}
                            {check.lotNumber && `Lot: ${check.lotNumber}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No product</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{check.location?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {check.location?.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      {check.actualValue && check.expectedValue ? (
                        <div>
                          <div className="font-medium">
                            {check.actualValue} / {check.expectedValue} {check.unit}
                          </div>
                          {check.tolerance && (
                            <div className="text-sm text-muted-foreground">
                              Tolerance: {check.tolerance}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {check.checkedAt ? formatDateTime(check.checkedAt) : 'Not checked'}
                      </div>
                      {check.nextCheckDue && (
                        <div className="text-xs text-muted-foreground">
                          Due: {formatDateTime(check.nextCheckDue)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {check.checkedByUser ? (
                        <div>
                          <div className="font-medium">{check.checkedByUser.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {check.checkedByUser.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not assigned</span>
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
                          <DropdownMenuItem onClick={() => viewCheckDetails(check)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Camera className="mr-2 h-4 w-4" />
                            Add Photo
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            Add Document
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

      {/* Quality Check Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              Quality Check Details - {selectedCheck?.checkType}
            </DialogTitle>
            <DialogDescription>
              Complete quality check information and management options.
            </DialogDescription>
          </DialogHeader>

          {selectedCheck && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedCheck.status)}
                  <div>
                    <div className="font-medium">{getStatusBadge(selectedCheck.status)}</div>
                    <div className="text-sm text-muted-foreground">
                      {getPriorityBadge(selectedCheck.priority)} • {selectedCheck.checkType}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    Last checked: {selectedCheck.checkedAt ? formatDateTime(selectedCheck.checkedAt) : 'Not checked'}
                  </div>
                  {selectedCheck.nextCheckDue && (
                    <div className="text-sm text-muted-foreground">
                      Next due: {formatDateTime(selectedCheck.nextCheckDue)}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Product and Location Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Product Information
                  </h4>
                  {selectedCheck.product ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedCheck.product.name}
                      </div>
                      <div>
                        <span className="font-medium">SKU:</span> {selectedCheck.product.sku}
                      </div>
                      {selectedCheck.batchNumber && (
                        <div>
                          <span className="font-medium">Batch:</span> {selectedCheck.batchNumber}
                        </div>
                      )}
                      {selectedCheck.lotNumber && (
                        <div>
                          <span className="font-medium">Lot:</span> {selectedCheck.lotNumber}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No product associated</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Location Information
                  </h4>
                  {selectedCheck.location ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedCheck.location.name}
                      </div>
                      <div>
                        <span className="font-medium">Code:</span> {selectedCheck.location.code}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedCheck.location.type}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No location specified</p>
                  )}
                </div>
              </div>

              {/* Check Results */}
              {(selectedCheck.actualValue || selectedCheck.expectedValue) && (
                <div>
                  <h4 className="font-medium mb-3">Check Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Expected:</span> {selectedCheck.expectedValue} {selectedCheck.unit}
                    </div>
                    <div>
                      <span className="font-medium">Actual:</span> {selectedCheck.actualValue} {selectedCheck.unit}
                    </div>
                    {selectedCheck.tolerance && (
                      <div>
                        <span className="font-medium">Tolerance:</span> {selectedCheck.tolerance}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes and Observations */}
              {selectedCheck.notes && (
                <div>
                  <h4 className="font-medium mb-3">Notes & Observations</h4>
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    {selectedCheck.notes}
                  </div>
                </div>
              )}

              {/* Corrective Actions */}
              {selectedCheck.correctiveActions && (
                <div>
                  <h4 className="font-medium mb-3">Corrective Actions</h4>
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
                    {selectedCheck.correctiveActions}
                  </div>
                </div>
              )}

              {/* Update Form */}
              <div>
                <h4 className="font-medium mb-3">Update Quality Check</h4>
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(handleUpdateCheck)} className="space-y-4">
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
                              <SelectItem value="pass">Pass</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="review">Review</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="actualValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Value</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter actual measured value" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add observations or findings..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={updateForm.control}
                      name="correctiveActions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corrective Actions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe corrective actions taken or required..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={updateCheckMutation.isPending}>
                        {updateCheckMutation.isPending ? 'Updating...' : 'Update Quality Check'}
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