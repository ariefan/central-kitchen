import { useMemo, useState } from 'react'
import { useForm, useFieldArray, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import * as z from 'zod'
import { format } from 'date-fns'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { productService, type ProductSummary } from '@/services/products'
import type { Location } from '@/types/inventory'
import type { CreateTransferPayload } from '@/types/transfers'

const lineItemSchema = z.object({
  id: z.string(),
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  productSku: z.string(),
  uomId: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  notes: z.string().optional(),
})

const stockTransferSchema = z.object({
  fromLocationId: z.string().min(1, 'From location is required'),
  toLocationId: z.string().min(1, 'To location is required'),
  expectedDeliveryDate: z.string().min(1, 'Transfer date is required'),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one item is required'),
})

type LineItem = z.infer<typeof lineItemSchema>
type StockTransferFormValues = z.infer<typeof stockTransferSchema>

interface ProductSearchProps {
  products: ProductSummary[]
  isLoading: boolean
  onSelect: (product: ProductSummary) => void
}

const ProductSearch = ({ products, isLoading, onSelect }: ProductSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 10)
    const term = searchTerm.toLowerCase()
    return products.filter((product) =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term)
    ).slice(0, 20)
  }, [products, searchTerm])

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          disabled={isLoading}
          className="flex-1"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && searchTerm && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-background shadow-lg">
          {filteredProducts.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No products found
            </div>
          )}
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onSelect(product)
                setSearchTerm('')
                setIsOpen(false)
              }}
            >
              <div>
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.sku}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{product.baseUomName ?? product.baseUomId}</Badge>
                {product.isPerishable && (
                  <Badge variant="secondary">Perishable</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface LineItemRowProps {
  item: LineItem
  index: number
  control: Control<StockTransferFormValues>
  remove: (index: number) => void
}

const LineItemRow = ({ item, index, control, remove }: LineItemRowProps) => (
  <div className="space-y-4 rounded-lg border border-gray-200 p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium">{item.productName}</p>
        <p className="text-xs text-muted-foreground">{item.productSku}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => remove(index)}
        aria-label="Remove line item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name={`lineItems.${index}.quantity`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                value={field.value ?? ''}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <FormLabel>Unit</FormLabel>
        <div className="rounded-md border bg-muted px-3 py-2 text-sm">
          {item.uomId}
        </div>
      </div>
    </div>

    <FormField
      control={control}
      name={`lineItems.${index}.notes`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              placeholder="Optional notes"
              rows={2}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </div>
)

interface StockTransferFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  locations: Location[]
  onSubmit: (data: CreateTransferPayload) => Promise<void> | void
  isSubmitting?: boolean
}

export default function StockTransferForm({
  open,
  onOpenChange,
  locations,
  onSubmit,
  isSubmitting = false,
}: StockTransferFormProps) {
  const form = useForm<StockTransferFormValues>({
    mode: 'onChange',
    resolver: zodResolver(stockTransferSchema),
    defaultValues: {
      fromLocationId: '',
      toLocationId: '',
      expectedDeliveryDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      lineItems: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lineItems',
  })

  const fromLocationId = form.watch('fromLocationId')
  const toLocationId = form.watch('toLocationId')
  const isSameLocation = Boolean(
    fromLocationId && toLocationId && fromLocationId === toLocationId
  )

  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['products', 'transfer-form'],
    queryFn: () => productService.list(),
  })

  const handleProductSelect = (product: ProductSummary) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}`

    append({
      id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      uomId: product.baseUomId,
      quantity: 1,
      notes: '',
    })
  }

  const handleSubmit = async (values: StockTransferFormValues) => {
    const payload: CreateTransferPayload = {
      fromLocationId: values.fromLocationId,
      toLocationId: values.toLocationId,
      expectedDeliveryDate: new Date(values.expectedDeliveryDate).toISOString(),
      notes: values.notes,
      items: values.lineItems.map((item) => ({
        productId: item.productId,
        uomId: item.uomId,
        quantity: item.quantity,
        notes: item.notes,
      })),
    }

    await onSubmit(payload)
    form.reset({
      fromLocationId: '',
      toLocationId: '',
      expectedDeliveryDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      lineItems: [],
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Stock Transfer</DialogTitle>
          <DialogDescription>
            Transfer inventory between locations using the ERP API
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fromLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            <div>
                              <p className="font-medium">{location.name}</p>
                              <p className="text-xs text-muted-foreground">{location.code}</p>
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
                name="toLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations
                          .filter((location) => location.id !== fromLocationId)
                          .map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              <div>
                                <p className="font-medium">{location.name}</p>
                                <p className="text-xs text-muted-foreground">{location.code}</p>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {isSameLocation && (
                      <p className="text-sm text-destructive">
                        Locations must be different
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      <Input placeholder="Optional transfer notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Line Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Select products to include in this transfer.
                  </p>
                </div>
                <Badge variant="secondary">
                  {fields.length} item{fields.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <ProductSearch
                products={products}
                isLoading={isProductsLoading}
                onSelect={handleProductSelect}
              />

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <LineItemRow
                    key={field.id}
                    index={index}
                    item={field as LineItem}
                    control={form.control}
                    remove={remove}
                  />
                ))}
              </div>

              {fields.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center text-sm text-muted-foreground">
                  No products added yet. Search for a product above to get started.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !form.formState.isValid ||
                  fields.length === 0 ||
                  isSameLocation
                }
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Transfer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
