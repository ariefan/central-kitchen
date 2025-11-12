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
import { Badge } from '@/components/ui/badge'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  MapPin,
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  FileText
} from 'lucide-react'

// Schema definitions
const stockCountSchema = z.object({
  countType: z.enum(['full', 'partial', 'cycle', 'spot'], {
    required_error: 'Please select a count type',
  }),
  description: z.string().min(1, 'Description is required'),
  locationId: z.string().min(1, 'Location is required'),
  categoryIds: z.array(z.string()).optional(),
  includeZeroQuantity: z.boolean().default(true),
  includePerishablesOnly: z.boolean().default(false),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  assignedUserId: z.string().optional(),
  requiresSupervisorApproval: z.boolean().default(false),
  notes: z.string().optional(),
})

// Types
type StockCount = z.infer<typeof stockCountSchema>
type WizardStep = 'type' | 'scope' | 'schedule' | 'review'

// Mock data
const mockLocations = [
  { id: '1', name: 'Main Warehouse', code: 'WH-001' },
  { id: '2', name: 'Kitchen Storage', code: 'KT-001' },
  { id: '3', name: 'Cooler Storage', code: 'CS-001' },
  { id: '4', name: 'Freezer Storage', code: 'FS-001' },
  { id: '5', name: 'Production Floor', code: 'PF-001' },
]

const mockCategories = [
  { id: '1', name: 'Produce', code: 'PROD' },
  { id: '2', name: 'Dairy', code: 'DAIRY' },
  { id: '3', name: 'Meat', code: 'MEAT' },
  { id: '4', name: 'Dry Goods', code: 'DRY' },
  { id: '5', name: 'Frozen', code: 'FROZ' },
  { id: '6', name: 'Beverages', code: 'BEV' },
]

const mockUsers = [
  { id: '1', name: 'John Doe', role: 'Inventory Clerk' },
  { id: '2', name: 'Jane Smith', role: 'Supervisor' },
  { id: '3', name: 'Bob Johnson', role: 'Inventory Manager' },
]

// Count type descriptions
const countTypeDescriptions = {
  full: {
    title: 'Full Count',
    description: 'Complete inventory count of all items in selected location',
    icon: <Package className="h-8 w-8" />,
    features: ['All items included', 'Most comprehensive', 'Higher accuracy', 'Longer duration'],
  },
  partial: {
    title: 'Partial Count',
    description: 'Count specific categories or areas within a location',
    icon: <MapPin className="h-8 w-8" />,
    features: ['Selected categories', 'Flexible scope', 'Faster execution', 'Targeted approach'],
  },
  cycle: {
    title: 'Cycle Count',
    description: 'Regular ongoing counts to maintain inventory accuracy',
    icon: <Calculator className="h-8 w-8" />,
    features: ['Regular frequency', 'Small batches', 'Less disruptive', 'Continuous improvement'],
  },
  spot: {
    title: 'Spot Check',
    description: 'Quick verification of specific items or random sampling',
    icon: <FileText className="h-8 w-8" />,
    features: ['Quick execution', 'Random sampling', 'Verification focus', 'Minimal disruption'],
  },
}

// Step components
interface StepIndicatorProps {
  currentStep: WizardStep
  completed: Set<WizardStep>
}

const StepIndicator = ({ currentStep, completed }: StepIndicatorProps) => {
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'type', label: 'Count Type', icon: <Package className="h-4 w-4" /> },
    { key: 'scope', label: 'Scope', icon: <MapPin className="h-4 w-4" /> },
    { key: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" /> },
    { key: 'review', label: 'Review', icon: <CheckCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep
        const isCompleted = completed.has(step.key)

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2
                ${isActive
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : isCompleted
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
                }
              `}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                step.icon
              )}
            </div>
            <div className="ml-3">
              <div
                className={`
                  text-sm font-medium
                  ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                `}
              >
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  w-16 h-0.5 mx-4
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface CountTypeSelectionProps {
  onSelect: (type: string) => void
  selectedType?: string
}

const CountTypeSelection = ({ onSelect, selectedType }: CountTypeSelectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(countTypeDescriptions).map(([type, config]) => (
        <Card
          key={type}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedType === type ? 'ring-2 ring-blue-500 bg-blue-50' : ''
          }`}
          onClick={() => onSelect(type)}
        >
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className={selectedType === type ? 'text-blue-600' : 'text-gray-600'}>
                {config.icon}
              </div>
              <span>{config.title}</span>
            </CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {config.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Main component
interface StockCountWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<StockCount>
  onSubmit: (data: StockCount) => void
}

export default function StockCountWizard({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: StockCountWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  const form = useForm<StockCount>({
    resolver: zodResolver(stockCountSchema),
    defaultValues: {
      countType: undefined,
      description: '',
      locationId: '',
      categoryIds: [],
      includeZeroQuantity: true,
      includePerishablesOnly: false,
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      assignedUserId: '',
      requiresSupervisorApproval: false,
      notes: '',
    },
    values: initialData,
  })

  const countType = form.watch('countType')
  const locationId = form.watch('locationId')
  const categoryIds = form.watch('categoryIds')
  const includePerishablesOnly = form.watch('includePerishablesOnly')

  const handleNext = async () => {
    let fieldsToValidate: string[] = []

    switch (currentStep) {
      case 'type':
        fieldsToValidate = ['countType', 'description']
        break
      case 'scope':
        fieldsToValidate = ['locationId']
        break
      case 'schedule':
        fieldsToValidate = ['scheduledDate']
        break
    }

    const isValid = await form.trigger(fieldsToValidate as any)
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      const steps: WizardStep[] = ['type', 'scope', 'schedule', 'review']
      const currentIndex = steps.indexOf(currentStep)
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const steps: WizardStep[] = ['type', 'scope', 'schedule', 'review']
    const currentIndex = steps.indexOf(currentStep)
    setCurrentStep(steps[currentIndex - 1])
  }

  const handleSubmit = (data: StockCount) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
    setCurrentStep('type')
    setCompletedSteps(new Set())
  }

  const getEstimatedItemCount = () => {
    if (!locationId) return 0

    // Mock calculation - in real app this would query the database
    const baseCount = 150
    const categoryMultiplier = categoryIds.length > 0 ? categoryIds.length / 3 : 1
    const perishableMultiplier = includePerishablesOnly ? 0.3 : 1

    return Math.round(baseCount * categoryMultiplier * perishableMultiplier)
  }

  const getEstimatedDuration = () => {
    const itemCount = getEstimatedItemCount()
    if (itemCount < 50) return '30-60 minutes'
    if (itemCount < 150) return '2-3 hours'
    if (itemCount < 300) return '4-6 hours'
    return '6-8 hours'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Count Wizard</DialogTitle>
          <DialogDescription>
            Create a new stock count with guided step-by-step configuration
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <StepIndicator currentStep={currentStep} completed={completedSteps} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Step 1: Count Type Selection */}
              {currentStep === 'type' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Select Count Type</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Choose the type of stock count that best fits your needs
                    </p>
                  </div>

                  <CountTypeSelection
                    onSelect={(type) => form.setValue('countType', type as any)}
                    selectedType={countType}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe the purpose and scope of this stock count..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Scope Selection */}
              {currentStep === 'scope' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Define Count Scope</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Select the location and categories to include in this count
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
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

                      {(countType === 'partial' || countType === 'spot') && (
                        <FormField
                          control={form.control}
                          name="categoryIds"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categories (Optional)</FormLabel>
                              <div className="space-y-2">
                                {mockCategories.map((category) => (
                                  <FormItem
                                    key={category.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(category.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValues = field.value || []
                                          if (checked) {
                                            field.onChange([...currentValues, category.id])
                                          } else {
                                            field.onChange(
                                              currentValues.filter((value) => value !== category.id)
                                            )
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {category.name} ({category.code})
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="font-semibold mb-3">Include Options</h4>

                        <FormField
                          control={form.control}
                          name="includeZeroQuantity"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div>
                                <FormLabel className="!mt-0">Include Zero Quantity Items</FormLabel>
                                <FormDescription>
                                  Count items with zero quantity
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="includePerishablesOnly"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div>
                                <FormLabel className="!mt-0">Perishables Only</FormLabel>
                                <FormDescription>
                                  Count only items with expiry dates
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Estimated Count Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Estimated Items:</span>
                            <span className="font-medium">{getEstimatedItemCount()} items</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Estimated Duration:</span>
                            <span className="font-medium">{getEstimatedDuration()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Count Type:</span>
                            <Badge variant="outline">
                              {countType ? countType.charAt(0).toUpperCase() + countType.slice(1) : 'Not selected'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Schedule */}
              {currentStep === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Schedule Count</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Set the date and assign personnel for this stock count
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scheduled Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assignedUserId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assigned To (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mockUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name} - {user.role}
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
                                Count results require supervisor review and approval
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Any special instructions or considerations for this count..."
                                rows={6}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Review Stock Count Details</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please review all information before creating the stock count
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          Count Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Type:</span>
                          <Badge variant="outline">
                            {countType?.charAt(0).toUpperCase() + countType?.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Description:</span>
                          <span className="text-right max-w-xs">{form.watch('description')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Estimated Items:</span>
                          <span className="font-medium">{getEstimatedItemCount()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Duration:</span>
                          <span className="font-medium">{getEstimatedDuration()}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Location & Scope
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Location:</span>
                          <span className="font-medium">
                            {mockLocations.find(l => l.id === locationId)?.name}
                          </span>
                        </div>
                        {categoryIds && categoryIds.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Categories:</span>
                            <div className="flex flex-wrap gap-1">
                              {categoryIds.map(catId => {
                                const cat = mockCategories.find(c => c.id === catId)
                                return cat ? <Badge key={catId} variant="secondary" className="text-xs">{cat.name}</Badge> : null
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span>Include Zero Qty:</span>
                          <Badge variant={form.watch('includeZeroQuantity') ? 'default' : 'secondary'}>
                            {form.watch('includeZeroQuantity') ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        {includePerishablesOnly && (
                          <div className="flex justify-between text-sm">
                            <span>Perishables Only:</span>
                            <Badge variant="default">Yes</Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule & Assignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Scheduled Date:</span>
                          <span className="font-medium">
                            {format(new Date(form.watch('scheduledDate')), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Assigned To:</span>
                          <span className="font-medium">
                            {mockUsers.find(u => u.id === form.watch('assignedUserId'))?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Supervisor Approval:</span>
                          <Badge variant={form.watch('requiresSupervisorApproval') ? 'default' : 'secondary'}>
                            {form.watch('requiresSupervisorApproval') ? 'Required' : 'Not Required'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {form.watch('notes') && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Additional Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">{form.watch('notes')}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {getEstimatedItemCount() > 300 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This is a large count with {getEstimatedItemCount()} items. Consider breaking it down
                        into smaller partial counts or scheduling over multiple days.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <Separator />

              <DialogFooter>
                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>

                  <div className="flex space-x-2">
                    {currentStep !== 'type' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrevious}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                    )}

                    {currentStep !== 'review' ? (
                      <Button type="button" onClick={handleNext}>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button type="submit">
                        Create Stock Count
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}