import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, TrendingUp, Calculator, AlertTriangle } from 'lucide-react'

// Schema
const leadTimeSchema = z.object({
  itemType: z.enum(['product', 'supplier', 'category'], {
    required_error: 'Please select an item type',
  }),
  itemId: z.string().min(1, 'Please select an item'),
  itemName: z.string().min(1, 'Item name is required'),
  expectedLeadTime: z.number().min(0, 'Expected lead time must be 0 or greater'),
  leadTimeUnit: z.enum(['hours', 'days', 'weeks'], {
    required_error: 'Please select a unit',
  }),
  varianceBuffer: z.number().min(0, 'Variance buffer must be 0 or greater').default(0),
  reliabilityScore: z.number().min(0).max(100).default(80),
  lastUpdated: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

type LeadTime = z.infer<typeof leadTimeSchema>

// Mock data for demonstration
const mockProducts = [
  { id: 'PROD-001', name: 'Organic Tomatoes', category: 'Vegetables' },
  { id: 'PROD-015', name: 'Fresh Lettuce', category: 'Vegetables' },
  { id: 'PROD-032', name: 'Red Apples', category: 'Fruits' },
  { id: 'PROD-045', name: 'Baby Carrots', category: 'Vegetables' },
  { id: 'PROD-067', name: 'Chicken Breast', category: 'Meat' },
]

const mockSuppliers = [
  { id: 'SUP-001', name: 'Fresh Farms Inc.', category: 'Produce' },
  { id: 'SUP-002', name: 'Global Foods Ltd.', category: 'General' },
  { id: 'SUP-003', name: 'Local Dairy Co-op', category: 'Dairy' },
  { id: 'SUP-004', name: 'Seafood Suppliers', category: 'Seafood' },
]

const mockCategories = [
  { id: 'CAT-001', name: 'Vegetables', productCount: 89 },
  { id: 'CAT-002', name: 'Fruits', productCount: 67 },
  { id: 'CAT-003', name: 'Dairy', productCount: 45 },
  { id: 'CAT-004', name: 'Meat', productCount: 34 },
]

interface LeadTimeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<LeadTime>
  onSubmit: (data: LeadTime) => void
}

export default function LeadTimeForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: LeadTimeFormProps) {
  const [selectedItemType, setSelectedItemType] = useState<string>(
    initialData?.itemType || 'product'
  )

  const form = useForm<LeadTime>({
    resolver: zodResolver(leadTimeSchema),
    defaultValues: {
      itemType: 'product',
      itemId: '',
      itemName: '',
      expectedLeadTime: 0,
      leadTimeUnit: 'days',
      varianceBuffer: 0,
      reliabilityScore: 80,
      notes: '',
      isActive: true,
    },
    values: {
      ...initialData,
      itemType: initialData?.itemType || 'product',
      itemId: initialData?.itemId || '',
      itemName: initialData?.itemName || '',
      expectedLeadTime: initialData?.expectedLeadTime || 0,
      leadTimeUnit: initialData?.leadTimeUnit || 'days',
      varianceBuffer: initialData?.varianceBuffer || 0,
      reliabilityScore: initialData?.reliabilityScore || 80,
      notes: initialData?.notes || '',
      isActive: initialData?.isActive ?? true,
    },
  })

  const handleSubmit = (data: LeadTime) => {
    const finalData = {
      ...data,
      lastUpdated: new Date().toISOString(),
    }
    onSubmit(finalData)
    onOpenChange(false)
    form.reset()
  }

  const handleItemTypeChange = (type: string) => {
    setSelectedItemType(type)
    form.setValue('itemId', '')
    form.setValue('itemName', '')
  }

  const handleItemSelection = (itemId: string, itemName: string) => {
    form.setValue('itemId', itemId)
    form.setValue('itemName', itemName)
  }

  const getItemsForType = () => {
    switch (selectedItemType) {
      case 'product':
        return mockProducts
      case 'supplier':
        return mockSuppliers
      case 'category':
        return mockCategories
      default:
        return []
    }
  }

  const calculateTotalLeadTime = () => {
    const expected = form.watch('expectedLeadTime') || 0
    const buffer = form.watch('varianceBuffer') || 0
    const unit = form.watch('leadTimeUnit')

    const total = expected + buffer
    return {
      expected,
      buffer,
      total,
      unit
    }
  }

  const leadTimeCalculation = calculateTotalLeadTime()

  const getItemTypeLabel = (type: string) => {
    const labels = {
      product: 'Product',
      supplier: 'Supplier',
      category: 'Category'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Lead Time' : 'Add New Lead Time'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update lead time configuration and performance metrics'
              : 'Configure lead time tracking for products, suppliers, or categories'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Item Type and Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Item Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Type</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value)
                        handleItemTypeChange(value)
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select item type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                          <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the type of item to configure lead time for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item</FormLabel>
                      <Select onValueChange={(value) => {
                        const item = getItemsForType().find(item => item.id === value)
                        if (item) {
                          field.onChange(value)
                          handleItemSelection(value, item.name)
                        }
                      }} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${getItemTypeLabel(selectedItemType).toLowerCase()}`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getItemsForType().map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                              {item.category && (
                                <span className="text-muted-foreground ml-2">
                                  ({item.category})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the specific item to configure
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="itemName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Auto-populated from selection" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lead Time Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Lead Time Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expectedLeadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Lead Time</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormDescription>
                        Expected time for delivery/processing
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadTimeUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="varianceBuffer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variance Buffer</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormDescription>
                      Additional buffer time to account for delays
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reliabilityScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reliability Score (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        placeholder="80"
                        min={0}
                        max={100}
                      />
                    </FormControl>
                    <FormDescription>
                      Historical on-time delivery performance (0-100%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lead Time Calculation Preview */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Calculator className="h-4 w-4" />
                  <span>Lead Time Calculation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold text-blue-700">
                      {leadTimeCalculation.expected} {leadTimeCalculation.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Expected</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-orange-600">
                      + {leadTimeCalculation.buffer} {leadTimeCalculation.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Buffer</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">
                      = {leadTimeCalculation.total} {leadTimeCalculation.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                {leadTimeCalculation.buffer > 0 && (
                  <div className="mt-3 text-xs text-blue-700 bg-blue-100 rounded p-2">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Total time includes {leadTimeCalculation.buffer} {leadTimeCalculation.unit} buffer for delays
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Reliability Rating:</span>
                <Badge
                  variant={form.watch('reliabilityScore') >= 90 ? 'default' :
                          form.watch('reliabilityScore') >= 70 ? 'secondary' : 'destructive'}
                >
                  {form.watch('reliabilityScore') >= 90 ? 'Excellent' :
                   form.watch('reliabilityScore') >= 70 ? 'Good' :
                   form.watch('reliabilityScore') >= 50 ? 'Fair' : 'Poor'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      form.watch('reliabilityScore') >= 90 ? 'bg-green-600' :
                      form.watch('reliabilityScore') >= 70 ? 'bg-yellow-500' :
                      form.watch('reliabilityScore') >= 50 ? 'bg-orange-500' : 'bg-red-600'
                    }`}
                    style={{ width: `${form.watch('reliabilityScore')}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {form.watch('reliabilityScore')}%
                </span>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Information</h3>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Add any additional notes about lead time expectations..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Lead Time</FormLabel>
                      <FormDescription>
                        This lead time configuration is currently active
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Lead Time' : 'Create Lead Time'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}