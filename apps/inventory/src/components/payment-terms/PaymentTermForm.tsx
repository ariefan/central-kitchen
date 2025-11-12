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
import { Separator } from '@/components/ui/separator'

// Base schema
const basePaymentTermSchema = z.object({
  code: z.string().min(1, 'Payment term code is required'),
  name: z.string().min(1, 'Payment term name is required'),
  description: z.string().min(1, 'Description is required'),
  termType: z.enum(['net_days', 'day_of_month', 'day_following_month', 'advance', 'custom'], {
    required_error: 'Please select a payment term type',
  }),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
})

// Net Days schema
const netDaysSchema = basePaymentTermSchema.extend({
  termType: z.literal('net_days'),
  netDays: z.number().min(0, 'Net days must be 0 or greater').max(365, 'Net days cannot exceed 365'),
})

// Day of Month schema
const dayOfMonthSchema = basePaymentTermSchema.extend({
  termType: z.literal('day_of_month'),
  dayOfMonth: z.number().min(1, 'Day must be between 1 and 31').max(31, 'Day must be between 1 and 31'),
})

// Day Following Month schema
const dayFollowingMonthSchema = basePaymentTermSchema.extend({
  termType: z.literal('day_following_month'),
  dayOfMonth: z.number().min(1, 'Day must be between 1 and 31').max(31, 'Day must be between 1 and 31').optional(),
  cutoffDay: z.number().min(0, 'Cutoff day must be 0 or greater').max(31, 'Cutoff day cannot exceed 31').optional(),
})

// Advance Payment schema
const advanceSchema = basePaymentTermSchema.extend({
  termType: z.literal('advance'),
  advancePercentage: z.number().min(1, 'Advance percentage must be at least 1%').max(100, 'Advance percentage cannot exceed 100%'),
  advanceDays: z.number().min(0, 'Advance days must be 0 or greater').max(365, 'Advance days cannot exceed 365'),
})

// Custom schema
const customSchema = basePaymentTermSchema.extend({
  termType: z.literal('custom'),
  customFormula: z.string().min(1, 'Custom formula is required'),
})

// Union schema
const paymentTermSchema = z.discriminatedUnion('termType', [
  netDaysSchema,
  dayOfMonthSchema,
  dayFollowingMonthSchema,
  advanceSchema,
  customSchema,
])

type PaymentTerm = z.infer<typeof paymentTermSchema>

// Common term templates
const termTemplates = [
  {
    name: 'NET 15 Days',
    code: 'NET-15',
    termType: 'net_days' as const,
    description: 'Payment due 15 days after invoice date',
    netDays: 15
  },
  {
    name: 'NET 30 Days',
    code: 'NET-30',
    termType: 'net_days' as const,
    description: 'Payment due 30 days after invoice date',
    netDays: 30
  },
  {
    name: 'NET 60 Days',
    code: 'NET-60',
    termType: 'net_days' as const,
    description: 'Payment due 60 days after invoice date',
    netDays: 60
  },
  {
    name: '2% 10, NET 30',
    code: '2-10-NET-30',
    termType: 'custom' as const,
    description: '2% discount if paid within 10 days, NET 30 otherwise',
    customFormula: '2% discount if paid <= 10 days, else NET 30'
  },
  {
    name: 'Payment in Advance',
    code: 'PIA',
    termType: 'advance' as const,
    description: 'Full payment required before delivery',
    advancePercentage: 100,
    advanceDays: 0
  }
]

interface PaymentTermFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<PaymentTerm>
  onSubmit: (data: PaymentTerm) => void
}

export default function PaymentTermForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: PaymentTermFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  const form = useForm<PaymentTerm>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      termType: 'net_days',
      isActive: true,
      isDefault: false,
      netDays: 30,
      dayOfMonth: undefined,
      cutoffDay: undefined,
      advancePercentage: 50,
      advanceDays: 0,
      customFormula: '',
    },
    values: initialData || undefined,
  })

  const termType = form.watch('termType')
  const isDefault = form.watch('isDefault')

  const handleSubmit = (data: PaymentTerm) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
    setSelectedTemplate('')
  }

  const applyTemplate = (templateId: string) => {
    const template = termTemplates.find(t => t.code === templateId)
    if (template) {
      form.reset({
        ...template,
        isActive: true,
        isDefault: false,
      })
      setSelectedTemplate(templateId)
    }
  }

  const clearTemplate = () => {
    form.reset({
      code: '',
      name: '',
      description: '',
      termType: 'net_days',
      isActive: true,
      isDefault: false,
      netDays: 30,
      dayOfMonth: undefined,
      cutoffDay: undefined,
      advancePercentage: 50,
      advanceDays: 0,
      customFormula: '',
    })
    setSelectedTemplate('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Payment Term' : 'Add New Payment Term'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update payment term configuration'
              : 'Configure a new payment term for your business'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Quick Templates */}
            {!initialData && (
              <div className="space-y-3">
                <FormLabel>Quick Templates</FormLabel>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedTemplate ? 'outline' : 'default'}
                    size="sm"
                    onClick={clearTemplate}
                  >
                    Custom
                  </Button>
                  {termTemplates.map((template) => (
                    <Button
                      key={template.code}
                      type="button"
                      variant={selectedTemplate === template.code ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyTemplate(template.code)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Term Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="NET-30" />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this payment term
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="termType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="net_days">Net Days</SelectItem>
                          <SelectItem value="day_of_month">Day of Month</SelectItem>
                          <SelectItem value="day_following_month">Following Month</SelectItem>
                          <SelectItem value="advance">Advance Payment</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Term Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="NET 30 Days" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Payment due 30 days after invoice date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Term Type Specific Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Payment Settings</h3>

              {termType === 'net_days' && (
                <FormField
                  control={form.control}
                  name="netDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Days</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="365"
                          step="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of days after invoice date when payment is due
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {termType === 'day_of_month' && (
                <FormField
                  control={form.control}
                  name="dayOfMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Month</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          max="31"
                          step="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Payment is due on this day of the current month
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {termType === 'day_following_month' && (
                <>
                  <FormField
                    control={form.control}
                    name="dayOfMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Following Month (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="31"
                            step="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Payment is due on this day of the following month (e.g., 15th of next month)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cutoffDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cutoff Day (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="31"
                            step="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Invoices up to this day are due in following month, 0 for end of month
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {termType === 'advance' && (
                <>
                  <FormField
                    control={form.control}
                    name="advancePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Percentage</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                        </FormControl>
                        <FormDescription>
                          Percentage of total amount required as advance payment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="advanceDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Required Within (Days)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="365"
                            step="1"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Number of days from order date when advance payment is required
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {termType === 'custom' && (
                <FormField
                  control={form.control}
                  name="customFormula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Payment Formula</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="2% discount if paid <= 10 days, else NET 30" />
                      </FormControl>
                      <FormDescription>
                        Describe the custom payment terms and conditions in detail
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Status Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status Settings</h3>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          This payment term is available for use in transactions
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

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Default Payment Term</FormLabel>
                        <FormDescription>
                          This will be used as the default payment term for new suppliers
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

              {isDefault && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Setting this as the default term will make it automatically selected for new suppliers and customers.
                    Only one payment term can be set as default.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Payment Term' : 'Create Payment Term'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}