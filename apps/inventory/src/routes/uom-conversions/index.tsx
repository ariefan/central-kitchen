"use client"

import * as React from "react"
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { Search, Plus, Filter, Edit, Eye, Trash2, Calculator, ArrowRightLeft, TrendingUp, Hash } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

// Types
interface UOMConversion {
  id: string
  fromUomId: string
  toUomId: string
  factor: string
  createdAt: string
  updatedAt?: string
  fromUom?: {
    id: string
    name: string
    code: string
    symbol?: string
    kind?: string
  }
  toUom?: {
    id: string
    name: string
    code: string
    symbol?: string
    kind?: string
  }
}

interface UOM {
  id: string
  name: string
  code: string
  symbol?: string
  kind?: string
}

interface ConversionResult {
  fromUom: UOM
  toUom: UOM
  originalQuantity: number
  convertedQuantity: number
  conversionFactor: number
  path?: UOMConversion[]
}

// API functions
const fetchUOMConversions = async (filters?: {
  fromUomId?: string
  toUomId?: string
}): Promise<UOMConversion[]> => {
  try {
    const params = new URLSearchParams()
    if (filters?.fromUomId) params.append('fromUomId', filters.fromUomId)
    if (filters?.toUomId) params.append('toUomId', filters.toUomId)

    const response = await fetch(`/api/v1/uom-conversions?${params.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch UOM conversions')

    const result = await response.json()
    return result.data || []
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return getMockUOMConversions()
  }
}

const fetchUOMConversion = async (id: string): Promise<UOMConversion | null> => {
  try {
    const response = await fetch(`/api/v1/uom-conversions/${id}`)
    if (!response.ok) throw new Error('Failed to fetch UOM conversion')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return getMockUOMConversions().find(c => c.id === id) || null
  }
}

const createUOMConversion = async (data: any): Promise<UOMConversion> => {
  try {
    const response = await fetch('/api/v1/uom-conversions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create UOM conversion')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return {
      id: 'mock-' + Math.random().toString(36).substr(2, 9),
      ...data,
      factor: data.factor.toString(),
      createdAt: new Date().toISOString(),
    }
  }
}

const updateUOMConversion = async (id: string, data: any): Promise<UOMConversion> => {
  try {
    const response = await fetch(`/api/v1/uom-conversions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update UOM conversion')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return { id, ...data, updatedAt: new Date().toISOString() } as UOMConversion
  }
}

const deleteUOMConversion = async (id: string): Promise<UOMConversion> => {
  try {
    const response = await fetch(`/api/v1/uom-conversions/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete UOM conversion')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock data for development
    return { id, deleted: true } as UOMConversion
  }
}

const calculateConversion = async (fromUomId: string, toUomId: string, quantity: number): Promise<ConversionResult> => {
  try {
    const response = await fetch('/api/v1/uom-conversions/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUomId, toUomId, quantity }),
    })
    if (!response.ok) throw new Error('Failed to calculate conversion')

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('API Error:', error)
    // Return mock calculation for development
    const fromUom = getMockUOMs().find(u => u.id === fromUomId)
    const toUom = getMockUOMs().find(u => u.id === toUomId)

    if (!fromUom || !toUom) {
      throw new Error('UOM not found')
    }

    // Mock conversion logic
    let factor = 1
    if (fromUom.code === 'KG' && toUom.code === 'G') factor = 1000
    else if (fromUom.code === 'G' && toUom.code === 'KG') factor = 0.001
    else if (fromUom.code === 'L' && toUom.code === 'ML') factor = 1000
    else if (fromUom.code === 'ML' && toUom.code === 'L') factor = 0.001

    return {
      fromUom,
      toUom,
      originalQuantity: quantity,
      convertedQuantity: quantity * factor,
      conversionFactor: factor,
    }
  }
}

// Mock data for development
const getMockUOMs = (): UOM[] => [
  { id: 'uom-1', name: 'Pieces', code: 'PCS', symbol: 'pc', kind: 'count' },
  { id: 'uom-2', name: 'Kilogram', code: 'KG', symbol: 'kg', kind: 'weight' },
  { id: 'uom-3', name: 'Liter', code: 'L', symbol: 'L', kind: 'volume' },
  { id: 'uom-4', name: 'Milliliter', code: 'ML', symbol: 'ml', kind: 'volume' },
  { id: 'uom-5', name: 'Gram', code: 'G', symbol: 'g', kind: 'weight' },
  { id: 'uom-6', name: 'Box', code: 'BOX', symbol: 'box', kind: 'packaging' },
  { id: 'uom-7', name: 'Case', code: 'CASE', symbol: 'case', kind: 'packaging' },
  { id: 'uom-8', name: 'Dozen', code: 'DOZ', symbol: 'doz', kind: 'count' },
]

const getMockUOMConversions = (): UOMConversion[] => [
  {
    id: 'conv-1',
    fromUomId: 'uom-2',
    toUomId: 'uom-5',
    factor: '1000',
    createdAt: '2024-01-15T10:00:00Z',
    fromUom: { id: 'uom-2', name: 'Kilogram', code: 'KG', symbol: 'kg', kind: 'weight' },
    toUom: { id: 'uom-5', name: 'Gram', code: 'G', symbol: 'g', kind: 'weight' },
  },
  {
    id: 'conv-2',
    fromUomId: 'uom-3',
    toUomId: 'uom-4',
    factor: '1000',
    createdAt: '2024-01-15T10:00:00Z',
    fromUom: { id: 'uom-3', name: 'Liter', code: 'L', symbol: 'L', kind: 'volume' },
    toUom: { id: 'uom-4', name: 'Milliliter', code: 'ML', symbol: 'ml', kind: 'volume' },
  },
  {
    id: 'conv-3',
    fromUomId: 'uom-1',
    toUomId: 'uom-8',
    factor: '0.08333',
    createdAt: '2024-01-15T10:00:00Z',
    fromUom: { id: 'uom-1', name: 'Pieces', code: 'PCS', symbol: 'pc', kind: 'count' },
    toUom: { id: 'uom-8', name: 'Dozen', code: 'DOZ', symbol: 'doz', kind: 'count' },
  },
  {
    id: 'conv-4',
    fromUomId: 'uom-6',
    toUomId: 'uom-1',
    factor: '24',
    createdAt: '2024-01-15T10:00:00Z',
    fromUom: { id: 'uom-6', name: 'Box', code: 'BOX', symbol: 'box', kind: 'packaging' },
    toUom: { id: 'uom-1', name: 'Pieces', code: 'PCS', symbol: 'pc', kind: 'count' },
  },
]

// Form schemas
const uomConversionCreateSchema = z.object({
  fromUomId: z.string().uuid("From UOM is required"),
  toUomId: z.string().uuid("To UOM is required"),
  factor: z.number().positive("Conversion factor must be positive"),
})

const conversionCalculatorSchema = z.object({
  fromUomId: z.string().uuid("From UOM is required"),
  toUomId: z.string().uuid("To UOM is required"),
  quantity: z.number().positive("Quantity must be positive"),
})

// Main Component
export default function UOMConversionsPage() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [editingConversion, setEditingConversion] = React.useState<UOMConversion | null>(null)
  const [viewingConversion, setViewingConversion] = React.useState<UOMConversion | null>(null)
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false)
  const [filters, setFilters] = React.useState({
    fromUomId: '',
    toUomId: '',
    search: '',
  })

  const queryClient = useQueryClient()

  // Queries
  const { data: conversions = [], isLoading, error } = useQuery({
    queryKey: ['uom-conversions', filters],
    queryFn: () => fetchUOMConversions(filters),
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
  const createForm = useForm<z.infer<typeof uomConversionCreateSchema>>({
    resolver: zodResolver(uomConversionCreateSchema),
    defaultValues: {
      fromUomId: "",
      toUomId: "",
      factor: 1,
    },
  })

  const calculatorForm = useForm<z.infer<typeof conversionCalculatorSchema>>({
    resolver: zodResolver(conversionCalculatorSchema),
    defaultValues: {
      fromUomId: "",
      toUomId: "",
      quantity: 1,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUOMConversion,
    onSuccess: () => {
      toast.success("UOM conversion created successfully")
      setIsCreateOpen(false)
      createForm.reset()
      queryClient.invalidateQueries({ queryKey: ['uom-conversions'] })
    },
    onError: (error) => {
      toast.error(`Failed to create UOM conversion: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateUOMConversion(id, data),
    onSuccess: () => {
      toast.success("UOM conversion updated successfully")
      setEditingConversion(null)
      queryClient.invalidateQueries({ queryKey: ['uom-conversions'] })
    },
    onError: (error) => {
      toast.error(`Failed to update UOM conversion: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUOMConversion,
    onSuccess: () => {
      toast.success("UOM conversion deleted successfully")
      queryClient.invalidateQueries({ queryKey: ['uom-conversions'] })
    },
    onError: (error) => {
      toast.error(`Failed to delete UOM conversion: ${error.message}`)
    },
  })

  const calculateMutation = useMutation({
    mutationFn: ({ fromUomId, toUomId, quantity }: { fromUomId: string; toUomId: string; quantity: number }) =>
      calculateConversion(fromUomId, toUomId, quantity),
    onSuccess: () => {
      toast.success("Conversion calculated successfully")
    },
    onError: (error) => {
      toast.error(`Failed to calculate conversion: ${error.message}`)
    },
  })

  // Form submissions
  const onCreateSubmit = (values: z.infer<typeof uomConversionCreateSchema>) => {
    createMutation.mutate(values)
  }

  const onUpdateSubmit = (values: z.infer<typeof uomConversionCreateSchema>) => {
    if (!editingConversion) return
    updateMutation.mutate({ id: editingConversion.id, data: values })
  }

  const onCalculateSubmit = (values: z.infer<typeof conversionCalculatorSchema>) => {
    calculateMutation.mutate(values)
  }

  const onDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this UOM conversion?')) {
      deleteMutation.mutate(id)
    }
  }

  // Filter functions
  const filteredConversions = conversions.filter((conversion) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const fromName = conversion.fromUom?.name.toLowerCase() || ''
      const toName = conversion.toUom?.name.toLowerCase() || ''
      const fromCode = conversion.fromUom?.code.toLowerCase() || ''
      const toCode = conversion.toUom?.code.toLowerCase() || ''

      if (!fromName.includes(searchLower) && !toName.includes(searchLower) &&
          !fromCode.includes(searchLower) && !toCode.includes(searchLower)) {
        return false
      }
    }

    if (filters.fromUomId && conversion.fromUomId !== filters.fromUomId) {
      return false
    }

    if (filters.toUomId && conversion.toUomId !== filters.toUomId) {
      return false
    }

    return true
  })

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800">Error loading UOM conversions</h2>
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
          <h1 className="text-3xl font-bold">UOM Conversions</h1>
          <p className="text-muted-foreground">
            Manage unit of measure conversions and calculation factors
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calculator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conversion Calculator</DialogTitle>
                <DialogDescription>
                  Calculate conversions between different units of measure
                </DialogDescription>
              </DialogHeader>
              <Form {...calculatorForm}>
                <form onSubmit={calculatorForm.handleSubmit(onCalculateSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={calculatorForm.control}
                      name="fromUomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From UOM</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select UOM" />
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
                      control={calculatorForm.control}
                      name="toUomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To UOM</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select UOM" />
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
                  </div>

                  <FormField
                    control={calculatorForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="1.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {calculateMutation.data && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <div className="text-2xl font-bold">
                            {calculateMutation.data.originalQuantity} {calculateMutation.data.fromUom.symbol || calculateMutation.data.fromUom.code}
                          </div>
                          <ArrowRightLeft className="mx-auto h-6 w-6 text-muted-foreground" />
                          <div className="text-2xl font-bold text-primary">
                            {calculateMutation.data.convertedQuantity.toFixed(4)} {calculateMutation.data.toUom.symbol || calculateMutation.data.toUom.code}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Conversion factor: {calculateMutation.data.conversionFactor}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCalculatorOpen(false)}>
                      Close
                    </Button>
                    <Button type="submit" disabled={calculateMutation.isPending}>
                      {calculateMutation.isPending ? "Calculating..." : "Calculate"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Conversion
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create UOM Conversion</DialogTitle>
                <DialogDescription>
                  Define a conversion factor between two units of measure
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="fromUomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From UOM</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select UOM" />
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
                      name="toUomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To UOM</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select UOM" />
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
                  </div>

                  <FormField
                    control={createForm.control}
                    name="factor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conversion Factor</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.000001"
                            min="0"
                            placeholder="1.0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Multiply the quantity by this factor to convert from "From UOM" to "To UOM"
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Conversion"}
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
          <div className="grid grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversions..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-8"
              />
            </div>
            <Select value={filters.fromUomId} onValueChange={(value) => setFilters(prev => ({ ...prev, fromUomId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="From UOM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All From UOMs</SelectItem>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.toUomId} onValueChange={(value) => setFilters(prev => ({ ...prev, toUomId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="To UOM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All To UOMs</SelectItem>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setFilters({
                fromUomId: '',
                toUomId: '',
                search: '',
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversions List */}
      <Card>
        <CardHeader>
          <CardTitle>UOM Conversions ({filteredConversions.length})</CardTitle>
          <CardDescription>
            Manage conversion factors between different units of measure
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading UOM conversions...</div>
          ) : filteredConversions.length === 0 ? (
            <div className="text-center py-8">
              <Hash className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No UOM conversions found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.fromUomId || filters.toUomId
                  ? "Try adjusting your filters"
                  : "Create your first UOM conversion to get started"}
              </p>
              {!filters.search && !filters.fromUomId && !filters.toUomId && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Conversion
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From UOM</TableHead>
                  <TableHead>To UOM</TableHead>
                  <TableHead>Conversion Factor</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversions.map((conversion) => (
                  <TableRow key={conversion.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{conversion.fromUom?.code}</Badge>
                        <div>
                          <div className="font-medium">{conversion.fromUom?.name}</div>
                          <div className="text-sm text-muted-foreground">{conversion.fromUom?.symbol}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{conversion.toUom?.code}</Badge>
                        <div>
                          <div className="font-medium">{conversion.toUom?.name}</div>
                          <div className="text-sm text-muted-foreground">{conversion.toUom?.symbol}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{parseFloat(conversion.factor).toFixed(6)}</span>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {conversion.createdAt ? format(new Date(conversion.createdAt), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingConversion(conversion)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConversion(conversion)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(conversion.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Conversion Dialog */}
      <Dialog open={!!viewingConversion} onOpenChange={() => setViewingConversion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>UOM Conversion Details</DialogTitle>
            <DialogDescription>
              Full conversion information
            </DialogDescription>
          </DialogHeader>
          {viewingConversion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">From UOM</h3>
                  <div className="space-y-1">
                    <p className="font-medium">{viewingConversion.fromUom?.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {viewingConversion.fromUom?.code}</p>
                    <p className="text-sm text-muted-foreground">Symbol: {viewingConversion.fromUom?.symbol || '-'}</p>
                    <p className="text-sm text-muted-foreground">Type: {viewingConversion.fromUom?.kind || '-'}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">To UOM</h3>
                  <div className="space-y-1">
                    <p className="font-medium">{viewingConversion.toUom?.name}</p>
                    <p className="text-sm text-muted-foreground">Code: {viewingConversion.toUom?.code}</p>
                    <p className="text-sm text-muted-foreground">Symbol: {viewingConversion.toUom?.symbol || '-'}</p>
                    <p className="text-sm text-muted-foreground">Type: {viewingConversion.toUom?.kind || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Conversion Factor</h3>
                  <p className="font-mono text-lg">{parseFloat(viewingConversion.factor).toFixed(6)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Created Date</h3>
                  <p>{viewingConversion.createdAt ? format(new Date(viewingConversion.createdAt), 'PPP') : '-'}</p>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Example Conversion</h3>
                <div className="flex items-center gap-4 justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold">1 {viewingConversion.fromUom?.symbol || viewingConversion.fromUom?.code}</p>
                  </div>
                  <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{parseFloat(viewingConversion.factor).toFixed(4)} {viewingConversion.toUom?.symbol || viewingConversion.toUom?.code}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Conversion Dialog */}
      <Dialog open={!!editingConversion} onOpenChange={() => setEditingConversion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit UOM Conversion</DialogTitle>
            <DialogDescription>
              Update the conversion factor
            </DialogDescription>
          </DialogHeader>
          {editingConversion && (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onUpdateSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">From UOM</label>
                    <p className="text-sm bg-muted p-2 rounded mt-1">
                      {editingConversion.fromUom?.name} ({editingConversion.fromUom?.code})
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">To UOM</label>
                    <p className="text-sm bg-muted p-2 rounded mt-1">
                      {editingConversion.toUom?.name} ({editingConversion.toUom?.code})
                    </p>
                  </div>
                </div>

                <FormField
                  control={createForm.control}
                  name="factor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Factor</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.000001"
                          min="0"
                          placeholder="1.0"
                          {...field}
                          defaultValue={parseFloat(editingConversion.factor)}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Multiply the quantity by this factor to convert from "From UOM" to "To UOM"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingConversion(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Conversion"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}