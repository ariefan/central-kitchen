import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Plus,
  Trash2,
  Save,
  X,
  Package,
  Calculator,
  Calendar,
  Send,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import PostingConfirmationDialog from './PostingConfirmationDialog'

// Types
interface Product {
  id: string
  sku: string
  name: string
  description?: string
  baseUoM: string
  isPerishable: boolean
  standardCost: number
}

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
}

// Mock data - will be replaced with API calls
const mockSuppliers: Supplier[] = [
  { id: '1', code: 'SUP001', name: 'Fresh Produce Co', contactPerson: 'John Doe' },
  { id: '2', code: 'SUP002', name: 'Dairy Suppliers Inc', contactPerson: 'Jane Smith' },
  { id: '3', code: 'SUP003', name: 'Meat & Poultry Ltd', contactPerson: 'Bob Johnson' },
]

const mockProducts: Product[] = [
  { id: '1', sku: 'PROD001', name: 'Tomatoes', baseUoM: 'KG', isPerishable: true, standardCost: 2.50 },
  { id: '2', sku: 'PROD002', name: 'Lettuce', baseUoM: 'KG', isPerishable: true, standardCost: 1.80 },
  { id: '3', sku: 'PROD003', name: 'Chicken Breast', baseUoM: 'KG', isPerishable: true, standardCost: 8.50 },
  { id: '4', sku: 'PROD004', name: 'Rice', baseUoM: 'KG', isPerishable: false, standardCost: 1.20 },
]

// Form schemas
const lineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  unitCost: z.number().min(0, 'Unit cost must be non-negative'),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
})

const goodsReceiptSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  receiptDate: z.string().min(1, 'Receipt date is required'),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
})

type GoodsReceiptFormData = z.infer<typeof goodsReceiptSchema>
type LineItemFormData = z.infer<typeof lineItemSchema>

// Props
interface GoodsReceiptFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<GoodsReceiptFormData>
  onSubmit: (data: GoodsReceiptFormData) => void
}

// Main component
export default function GoodsReceiptForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: GoodsReceiptFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('')

  const form = useForm<GoodsReceiptFormData>({
    resolver: zodResolver(goodsReceiptSchema),
    defaultValues: {
      supplierId: '',
      receiptDate: format(new Date(), 'yyyy-MM-dd'),
      invoiceNumber: '',
      notes: '',
      lineItems: [
        {
          productId: '',
          quantity: 0,
          unitCost: 0,
          lotNumber: '',
          expiryDate: '',
          notes: '',
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  })

  // Load initial data
  useEffect(() => {
    if (initialData) {
      form.reset(initialData)
    }
  }, [initialData, form])

  // State for posting confirmation
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [isPosting, setIsPosting] = useState(false)

  // Calculate totals
  const lineItems = form.watch('lineItems')
  const totalAmount = lineItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unitCost)
  }, 0)

  const handleSubmit = (data: GoodsReceiptFormData) => {
    onSubmit(data)
    form.reset()
    onOpenChange(false)
  }

  const handleSaveAsDraft = () => {
    const data = form.getValues()
    onSubmit({ ...data, status: 'draft' })
    form.reset()
    onOpenChange(false)
  }

  const handlePostDirectly = () => {
    const data = form.getValues()
    onSubmit({ ...data, status: 'posted' })
    form.reset()
    onOpenChange(false)
  }

  const handlePostWithConfirmation = async () => {
    const data = form.getValues()
    const summaryData = {
      documentNumber: `GR-${format(new Date(), 'yyyy')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      supplierName: mockSuppliers.find(s => s.id === data.supplierId)?.name || 'Unknown',
      supplierCode: mockSuppliers.find(s => s.id === data.supplierId)?.code || '',
      receiptDate: data.receiptDate,
      invoiceNumber: data.invoiceNumber,
      totalAmount,
      lineItemCount: lineItems.length,
      createdBy: 'Current User', // Will be replaced with actual user
      notes: data.notes,
      lineItems: lineItems.map(item => ({
        ...item,
        productName: mockProducts.find(p => p.id === item.productId)?.name || 'Unknown Product'
      }))
    }

    setShowPostDialog(true)
  }

  const handleConfirmPost = async () => {
    setIsPosting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const data = form.getValues()
      onSubmit({ ...data, status: 'posted' })

      setShowPostDialog(false)
      form.reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error posting goods receipt:', error)
    } finally {
      setIsPosting(false)
    }
  }

  const addLineItem = () => {
    append({
      productId: '',
      quantity: 0,
      unitCost: 0,
      lotNumber: '',
      expiryDate: '',
      notes: '',
    })
  }

  const onProductChange = (productId: string, index: number) => {
    const product = mockProducts.find(p => p.id === productId)
    if (product) {
      form.setValue(`lineItems.${index}.unitCost`, product.standardCost)
      form.setValue(`lineItems.${index}.quantity`, 1)

      // Auto-generate lot number for perishables
      if (product.isPerishable) {
        const lotNumber = `LOT${format(new Date(), 'yyyyMMddHHmm')}`
        form.setValue(`lineItems.${index}.lotNumber`, lotNumber)

        // Default expiry for perishables (7 days)
        const expiryDate = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
        form.setValue(`lineItems.${index}.expiryDate`, expiryDate)
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>New Goods Receipt</SheetTitle>
          <SheetDescription>
            Create a new goods receipt to record inventory received from suppliers.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Receipt Information
                </CardTitle>
                <CardDescription>
                  Basic information about the goods receipt
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockSuppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                <div>
                                  <div className="font-medium">{supplier.name}</div>
                                  <div className="text-sm text-muted-foreground">{supplier.code}</div>
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
                    name="receiptDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receipt Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter invoice number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Line Items</CardTitle>
                    <CardDescription>
                      Add products received in this shipment
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.productId`}
                        render={({ field }) => (
                          <FormItem className="col-span-4">
                            <FormLabel className="text-sm">Product</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value)
                                onProductChange(value, index)
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mockProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div>
                                      <div className="font-medium">{product.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {product.sku} • {product.baseUoM}
                                        {product.isPerishable && (
                                          <Badge variant="secondary" className="ml-2">
                                            Perishable
                                          </Badge>
                                        )}
                                      </div>
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
                        name={`lineItems.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-sm">Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.unitCost`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-sm">Unit Cost</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
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
                        control={form.control}
                        name={`lineItems.${index}.lotNumber`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-sm">Lot #</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.expiryDate`}
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel className="text-sm">Expiry</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No line items added yet</p>
                    <p className="text-sm">Click "Add Item" to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            {lineItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lineItems.map((item, index) => {
                      const product = mockProducts.find(p => p.id === item.productId)
                      const lineTotal = item.quantity * item.unitCost
                      return (
                        <div key={index} className="flex justify-between text-sm">
                          <span>
                            {product?.name || 'Unknown Product'} ({item.quantity} × ${item.unitCost.toFixed(2)})
                          </span>
                          <span>${lineTotal.toFixed(2)}</span>
                        </div>
                      )
                    })}
                    <Separator />
                    <div className="flex justify-between font-medium text-lg">
                      <span>Total Amount</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Footer Actions */}
            <SheetFooter>
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <div className="flex gap-2 flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveAsDraft}
                    disabled={fields.length === 0}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={handlePostWithConfirmation}
                    disabled={fields.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post Receipt
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>

      {/* Posting Confirmation Dialog */}
      <PostingConfirmationDialog
        open={showPostDialog}
        onOpenChange={setShowPostDialog}
        goodsReceipt={{
          documentNumber: `GR-${format(new Date(), 'yyyy')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          supplierName: mockSuppliers.find(s => s.id === form.watch('supplierId'))?.name || 'Unknown',
          supplierCode: mockSuppliers.find(s => s.id === form.watch('supplierId'))?.code || '',
          receiptDate: form.watch('receiptDate'),
          invoiceNumber: form.watch('invoiceNumber'),
          totalAmount,
          lineItemCount: lineItems.length,
          createdBy: 'Current User', // Will be replaced with actual user
          notes: form.watch('notes'),
          lineItems: lineItems.map(item => ({
            ...item,
            productName: mockProducts.find(p => p.id === item.productId)?.name || 'Unknown Product'
          }))
        }}
        onConfirm={handleConfirmPost}
        isLoading={isPosting}
      />
    </Sheet>
  )
}