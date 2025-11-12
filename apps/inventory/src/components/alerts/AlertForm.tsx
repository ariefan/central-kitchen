import { useEffect } from 'react'
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form'
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
const alertTypes = [
  'temperature',
  'expiry',
  'stock_out',
  'negative_stock',
  'quality',
  'security',
  'maintenance',
] as const

const priorityLevels = ['critical', 'high', 'medium', 'low'] as const

// Schema
const alertSchema = z.object({
  alertType: z.enum(alertTypes, {
    message: 'Please select an alert type',
  }),
  priority: z.enum(priorityLevels, {
    message: 'Please select a priority level',
  }),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  locationId: z.string().min(1, 'Location is required'),
  productId: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
})

type Alert = z.infer<typeof alertSchema>

// Mock data
const mockLocations = [
  { id: '1', name: 'Main Warehouse', code: 'WH-001' },
  { id: '2', name: 'Kitchen Storage', code: 'KT-001' },
  { id: '3', name: 'Cooler Storage', code: 'CS-001' },
  { id: '4', name: 'Freezer Storage', code: 'FS-001' },
  { id: '5', name: 'Production Floor', code: 'PF-001' },
]

const mockUsers = [
  { id: '1', name: 'Maintenance Team', role: 'Team' },
  { id: '2', name: 'Quality Control', role: 'Team' },
  { id: '3', name: 'Security', role: 'Team' },
  { id: '4', name: 'Facilities', role: 'Team' },
]

interface AlertFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<Alert>
  onSubmit: (data: Alert) => void
}

export default function AlertForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: AlertFormProps) {
  const form = useForm<Alert>({
    resolver: zodResolver(alertSchema) as Resolver<Alert>,
    defaultValues: {
      alertType: undefined,
      priority: 'medium',
      title: '',
      description: '',
      locationId: '',
      productId: '',
      assignedTo: '',
      notes: '',
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

  const handleSubmit: SubmitHandler<Alert> = (data) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Alert</DialogTitle>
          <DialogDescription>
            Create a manual alert for monitoring and tracking purposes
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alertType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="temperature">Temperature</SelectItem>
                        <SelectItem value="expiry">Expiry</SelectItem>
                        <SelectItem value="stock_out">Stock Out</SelectItem>
                        <SelectItem value="negative_stock">Negative Stock</SelectItem>
                        <SelectItem value="quality">Quality</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brief alert title" />
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
                    <Textarea {...field} rows={3} placeholder="Detailed description of the alert" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team or person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Any additional information or context" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Alert
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
