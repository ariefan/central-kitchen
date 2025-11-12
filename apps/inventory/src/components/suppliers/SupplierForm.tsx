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
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

// Schema
const supplierSchema = z.object({
  code: z.string().min(1, 'Supplier code is required'),
  name: z.string().min(1, 'Supplier name is required'),
  legalName: z.string().min(1, 'Legal business name is required'),
  status: z.enum(['active', 'inactive', 'suspended', 'under_review'], {
    required_error: 'Please select a status',
  }),
  // Contact Information
  primaryContact: z.string().min(1, 'Primary contact name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(1, 'Phone number is required'),
  mobile: z.string().optional(),
  website: z.string().url('Valid URL required').optional().or(z.literal('')),

  // Address
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),

  // Business Details
  taxId: z.string().min(1, 'Tax ID is required'),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  currency: z.string().min(1, 'Currency is required'),
  leadTimeDays: z.number().min(0, 'Lead time must be 0 or greater'),
  minimumOrderValue: z.number().min(0, 'Minimum order value must be 0 or greater'),

  // Categories and Notes
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  notes: z.string().optional(),
})

type Supplier = z.infer<typeof supplierSchema>

// Common payment terms
const paymentTermsOptions = [
  { value: 'NET 15', label: 'NET 15 (15 days)' },
  { value: 'NET 30', label: 'NET 30 (30 days)' },
  { value: 'NET 45', label: 'NET 45 (45 days)' },
  { value: 'NET 60', label: 'NET 60 (60 days)' },
  { value: 'COD', label: 'COD (Cash on Delivery)' },
  { value: 'PIA', label: 'PIA (Payment in Advance)' },
  { value: '50% Advance', label: '50% Advance, 50% on Delivery' },
]

// Common currencies
const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
]

// Common categories
const commonCategories = [
  'Produce', 'Vegetables', 'Fruits', 'Dairy', 'Meat', 'Poultry',
  'Seafood', 'Grains', 'Pasta', 'Canned Goods', 'Frozen Foods',
  'Beverages', 'Snacks', 'Bakery', 'Condiments', 'Spices',
  'Cleaning Supplies', 'Packaging', 'Equipment'
]

interface SupplierFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<Supplier>
  onSubmit: (data: Supplier) => void
}

export default function SupplierForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: SupplierFormProps) {
  const [categories, setCategories] = useState<string[]>(
    initialData?.categories || []
  )
  const [newCategory, setNewCategory] = useState('')

  const form = useForm<Supplier>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: '',
      name: '',
      legalName: '',
      status: 'active',
      primaryContact: '',
      email: '',
      phone: '',
      mobile: '',
      website: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'USA',
      taxId: '',
      paymentTerms: 'NET 30',
      currency: 'IDR',
      leadTimeDays: 3,
      minimumOrderValue: 100,
      categories: [],
      notes: '',
    },
    values: {
      ...initialData,
      website: initialData?.website || '',
      line2: initialData?.line2 || '',
      mobile: initialData?.mobile || '',
      notes: initialData?.notes || '',
      country: initialData?.country || 'USA',
      paymentTerms: initialData?.paymentTerms || 'NET 30',
      currency: initialData?.currency || 'USD',
      leadTimeDays: initialData?.leadTimeDays || 3,
      minimumOrderValue: initialData?.minimumOrderValue || 100,
    },
  })

  const handleSubmit = (data: Supplier) => {
    const finalData = {
      ...data,
      categories,
    }
    onSubmit(finalData)
    onOpenChange(false)
    form.reset()
    setCategories([])
  }

  const addCategory = (category: string) => {
    if (category && !categories.includes(category)) {
      setCategories([...categories, category])
      setNewCategory('')
    }
  }

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category))
  }

  const handleAddCategory = () => {
    addCategory(newCategory.trim())
  }

  const handleQuickAddCategory = (category: string) => {
    addCategory(category)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Supplier' : 'Add New Supplier'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update supplier information and business details'
              : 'Enter supplier information to add them to the system'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SUP-001" />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this supplier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Fresh Produce Co." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Fresh Produce Company LLC" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="primaryContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Smith" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="orders@supplier.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1-555-0123" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1-555-0124" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://supplier.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="line1"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main Street" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="line2"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Suite 100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="New York" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="NY" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="10001" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="USA" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12-3456789" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentTermsOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
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
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (days)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Standard delivery lead time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minimumOrderValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Value</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum order amount in {form.watch('currency')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Product Categories</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge key={category} variant="default" className="flex items-center space-x-1">
                      <span>{category}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="ml-1 hover:bg-red-600 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Add a category"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCategory()
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddCategory} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Quick add common categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonCategories.map((category) => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => handleQuickAddCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">At least one category is required</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Additional Notes (Optional)</h3>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Any additional information about this supplier..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Supplier' : 'Create Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}