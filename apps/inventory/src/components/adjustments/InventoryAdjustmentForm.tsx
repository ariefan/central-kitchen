import { useState, useEffect } from 'react'
import { useForm, useFieldArray, type Resolver, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  TrendingUp,
  TrendingDown,
  Package,
  Calculator,
  FileText
} from 'lucide-react'

// Schema definitions
const adjustmentLineSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  productCode: z.string(),
  locationId: z.string().min(1, 'Location is required'),
  locationName: z.string(),
  systemQuantity: z.number(),
  adjustmentQuantity: z
    .number()
    .min(-999999, 'Invalid quantity')
    .max(999999, 'Invalid quantity'),
  unitCost: z.number().min(0, 'Unit cost must be positive'),
  adjustmentValue: z.number(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  reasonDetail: z.string().optional(),
})

const adjustmentTypeOptions = ['positive', 'negative'] as const
const reasonCodeOptions = [
  'damage',
  'expiry',
  'theft',
  'found',
  'count_variance',
  'return',
  'other',
] as const

const inventoryAdjustmentSchema = z.object({
  adjustmentType: z.enum(adjustmentTypeOptions, {
    message: 'Please select adjustment type',
  }),
  reasonCode: z.enum(reasonCodeOptions, {
    message: 'Please select a reason',
  }),
  reasonDescription: z.string().min(1, 'Reason description is required'),
  referenceDocument: z.string().optional(),
  adjustmentDate: z.string().min(1, 'Adjustment date is required'),
  locationId: z.string().min(1, 'Location is required'),
  requiresSupervisorApproval: z.boolean().default(false),
  notes: z.string().optional(),
  lines: z.array(adjustmentLineSchema).min(1, 'At least one line item is required'),
})

// Types
type InventoryAdjustment = z.infer<typeof inventoryAdjustmentSchema>
type AdjustmentLine = z.infer<typeof adjustmentLineSchema>

// Mock data
const mockLocations = [
  { id: '1', name: 'Main Warehouse', code: 'WH-001' },
  { id: '2', name: 'Kitchen Storage', code: 'KT-001' },
  { id: '3', name: 'Cooler Storage', code: 'CS-001' },
  { id: '4', name: 'Freezer Storage', code: 'FS-001' },
  { id: '5', name: 'Production Floor', code: 'PF-001' },
]

const mockProducts = [
  { id: '1', name: 'Fresh Tomatoes', code: 'TOM001', unitCost: 2.50, isPerishable: true },
  { id: '2', name: 'Whole Milk', code: 'MLK001', unitCost: 3.20, isPerishable: true },
  { id: '3', name: 'All-Purpose Flour', code: 'FLR001', unitCost: 1.80, isPerishable: false },
  { id: '4', name: 'Chicken Breast', code: 'CHK001', unitCost: 8.50, isPerishable: true },
  { id: '5', name: 'Olive Oil', code: 'OIL001', unitCost: 12.75, isPerishable: false },
]

const mockInventory = {
  '1': { locationId: '1', quantity: 50, unitCost: 2.50 }, // Fresh Tomatoes - Main Warehouse
  '2': { locationId: '3', quantity: 100, unitCost: 3.20 }, // Whole Milk - Cooler Storage
  '3': { locationId: '1', quantity: 75, unitCost: 1.80 }, // Flour - Main Warehouse
  '4': { locationId: '4', quantity: 25, unitCost: 8.50 }, // Chicken - Freezer Storage
  '5': { locationId: '1', quantity: 30, unitCost: 12.75 }, // Olive Oil - Main Warehouse
}

// Reason configurations
const reasonConfigs = {
  damage: {
    label: 'Damage',
    description: 'Items damaged during handling, storage, or transit',
    defaultType: 'negative',
    requiresApproval: true,
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  expiry: {
    label: 'Expiry',
    description: 'Perishable items that have expired or are near expiry',
    defaultType: 'negative',
    requiresApproval: true,
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  theft: {
    label: 'Theft',
    description: 'Items lost due to theft or unauthorized removal',
    defaultType: 'negative',
    requiresApproval: true,
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  found: {
    label: 'Found',
    description: 'Items discovered during physical count or investigation',
    defaultType: 'positive',
    requiresApproval: false,
    icon: <Plus className="h-4 w-4" />,
  },
  count_variance: {
    label: 'Count Variance',
    description: 'Differences discovered during stock count processes',
    defaultType: 'both',
    requiresApproval: true,
    icon: <Calculator className="h-4 w-4" />,
  },
  return: {
    label: 'Return',
    description: 'Items returned from customers or production',
    defaultType: 'positive',
    requiresApproval: false,
    icon: <TrendingUp className="h-4 w-4" />,
  },
  other: {
    label: 'Other',
    description: 'Other reasons not covered by specific categories',
    defaultType: 'both',
    requiresApproval: true,
    icon: <FileText className="h-4 w-4" />,
  },
}

// Product search component
const ProductSearch = ({ onSelect, selectedLocationId }: {
  onSelect: (product: typeof mockProducts[0]) => void
  selectedLocationId: string
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-8"
        />
      </div>

      {isOpen && searchTerm && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredProducts.map((product) => {
            const inventory = mockInventory[product.id as keyof typeof mockInventory]
            const isAvailable = inventory && inventory.locationId === selectedLocationId

            return (
              <div
                key={product.id}
                className={`p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                  !isAvailable ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  if (isAvailable) {
                    onSelect(product)
                    setSearchTerm('')
                    setIsOpen(false)
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${product.unitCost.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      {isAvailable ? `Available: ${inventory.quantity}` : 'Not in selected location'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Line item component
const AdjustmentLineItem = ({
  line,
  index,
  onRemove,
  onUpdate,
  adjustmentType,
}: {
  line: AdjustmentLine
  index: number
  onRemove: (index: number) => void
  onUpdate: (index: number, field: string, value: any) => void
  adjustmentType: 'positive' | 'negative'
}) => {
  const handleQuantityChange = (quantity: number) => {
    const adjustmentValue = quantity * line.unitCost
    onUpdate(index, 'adjustmentQuantity', quantity)
    onUpdate(index, 'adjustmentValue', adjustmentValue)
  }

  const handleCostChange = (cost: number) => {
    const adjustmentValue = line.adjustmentQuantity * cost
    onUpdate(index, 'unitCost', cost)
    onUpdate(index, 'adjustmentValue', adjustmentValue)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Line Item {index + 1}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Product</label>
            <div className="mt-1 p-2 border rounded-md bg-gray-50">
              <div className="font-medium">{line.productName}</div>
              <div className="text-sm text-gray-500">{line.productCode}</div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Location</label>
            <div className="mt-1 p-2 border rounded-md bg-gray-50">
              <div className="font-medium">{line.locationName}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">System Quantity</label>
            <div className="mt-1 p-2 border rounded-md bg-gray-50">
              {line.systemQuantity}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              {adjustmentType === 'positive' ? 'Quantity Found' : 'Quantity Lost'}
            </label>
            <Input
              type="number"
              value={line.adjustmentQuantity || ''}
              onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={adjustmentType === 'positive' ? 'border-green-200' : 'border-red-200'}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Unit Cost (Override)</label>
            <Input
              type="number"
              step="0.01"
              value={line.unitCost || ''}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Standard: ${mockProducts.find(p => p.id === line.productId)?.unitCost.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <span className="text-sm font-medium">Adjustment Value:</span>
          <span className={`text-lg font-bold ${
            adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
          }`}>
            {adjustmentType === 'positive' ? '+' : '-'}${Math.abs(line.adjustmentValue).toFixed(2)}
          </span>
        </div>

        {(line.lotNumber || line.expiryDate) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Lot Number:</span> {line.lotNumber || '-'}
            </div>
            <div>
              <span className="font-medium">Expiry Date:</span> {line.expiryDate || '-'}
            </div>
          </div>
        )}

        <Textarea
          placeholder="Reason details for this item (optional)..."
          value={line.reasonDetail || ''}
          onChange={(e) => onUpdate(index, 'reasonDetail', e.target.value)}
          rows={2}
          className="text-sm"
        />
      </CardContent>
    </Card>
  )
}

// Main component
interface InventoryAdjustmentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<InventoryAdjustment>
  onSubmit: (data: InventoryAdjustment) => void
}

export default function InventoryAdjustmentForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: InventoryAdjustmentFormProps) {
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [showProductSearch, setShowProductSearch] = useState(false)

  const form = useForm<InventoryAdjustment>({
    resolver: zodResolver(inventoryAdjustmentSchema) as Resolver<InventoryAdjustment>,
    defaultValues: {
      adjustmentType: undefined,
      reasonCode: undefined,
      reasonDescription: '',
      referenceDocument: '',
      adjustmentDate: format(new Date(), 'yyyy-MM-dd'),
      locationId: '',
      requiresSupervisorApproval: false,
      notes: '',
      lines: [],
    },
  })

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      form.reset({
        ...form.getValues(),
        ...initialData,
      })
    }
  }, [initialData, form])

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  const adjustmentType = form.watch('adjustmentType')
  const reasonCode = form.watch('reasonCode')
  const lines = form.watch('lines')

  // Auto-update reason description when reason code changes
  useEffect(() => {
    if (reasonCode && reasonConfigs[reasonCode as keyof typeof reasonConfigs]) {
      const config = reasonConfigs[reasonCode as keyof typeof reasonConfigs]
      if (!form.getValues('reasonDescription')) {
        form.setValue('reasonDescription', config.description)
      }

      // Auto-set adjustment type if reason has a default
      if (config.defaultType !== 'both' && !adjustmentType) {
        form.setValue('adjustmentType', config.defaultType as 'positive' | 'negative')
      }

      // Auto-set supervisor approval requirement
      form.setValue('requiresSupervisorApproval', config.requiresApproval)
    }
  }, [reasonCode, adjustmentType, form])

  const handleProductSelect = (product: typeof mockProducts[0]) => {
    const inventory = mockInventory[product.id as keyof typeof mockInventory]
    const location = mockLocations.find(l => l.id === selectedLocationId)

    if (!inventory || !location) return

    const newLine: AdjustmentLine = {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      locationId: selectedLocationId,
      locationName: location.name,
      systemQuantity: inventory.quantity,
      adjustmentQuantity: 0,
      unitCost: product.unitCost,
      adjustmentValue: 0,
      lotNumber: product.isPerishable ? `LOT-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined,
      expiryDate: product.isPerishable ? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') : undefined,
    }

    append(newLine)
    setShowProductSearch(false)
  }

  const handleSubmit: SubmitHandler<InventoryAdjustment> = (data) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  const totalValue = lines.reduce((sum, line) => sum + line.adjustmentValue, 0)
  const hasNegativeStock = lines.some(line => {
    const newQuantity = line.systemQuantity + line.adjustmentQuantity
    return newQuantity < 0
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Inventory Adjustment</SheetTitle>
          <SheetDescription>
            Record inventory adjustments for damage, expiry, theft, or found items
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="adjustmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjustment Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="positive">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span>Positive (Increase)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="negative">
                            <div className="flex items-center space-x-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span>Negative (Decrease)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason Code</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(reasonConfigs).map(([code, config]) => (
                            <SelectItem key={code} value={code}>
                              <div className="flex items-center space-x-2">
                                {config.icon}
                                <span>{config.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adjustmentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjustment Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adjustment Location</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        setSelectedLocationId(value)
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockLocations.map((location) => (
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
                  control={form.control}
                  name="referenceDocument"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Document (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Incident report number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiresSupervisorApproval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="!mt-0">Require Supervisor Approval</FormLabel>
                        <FormDescription>
                          This adjustment will need supervisor review before posting
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="reasonDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <Separator />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Adjustment Line Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  disabled={!selectedLocationId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {selectedLocationId && showProductSearch && (
                <Card>
                  <CardContent className="pt-6">
                    <ProductSearch
                      onSelect={handleProductSelect}
                      selectedLocationId={selectedLocationId}
                    />
                  </CardContent>
                </Card>
              )}

              {fields.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Line Items</h3>
                      <p className="text-muted-foreground">
                        Add products to include in this inventory adjustment
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <AdjustmentLineItem
                      key={field.id}
                      line={lines[index]}
                      index={index}
                      onRemove={remove}
                      onUpdate={(idx, fieldName, value) => {
                        const currentLine = lines[idx]
                        update(idx, {
                          ...currentLine,
                          [fieldName]: value,
                        })
                      }}
                      adjustmentType={adjustmentType!}
                    />
                  ))}
                </div>
              )}

              {fields.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Adjustment Value:</span>
                      <span className={`text-2xl font-bold ${
                        adjustmentType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adjustmentType === 'positive' ? '+' : '-'}${Math.abs(totalValue).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Warnings */}
            {hasNegativeStock && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Some adjustments will result in negative inventory levels.
                  Supervisor approval is required for negative stock adjustments.
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional information about this adjustment..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={fields.length === 0}
              >
                Create Adjustment
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
