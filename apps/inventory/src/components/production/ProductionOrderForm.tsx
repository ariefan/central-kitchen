import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
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
import { format } from 'date-fns'
import { AlertTriangle, Calculator, Clock, Info } from 'lucide-react'

// Schema definitions
const recipeSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  unitOfMeasure: z.string(),
  baseYieldQuantity: z.number(),
  components: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    productCode: z.string(),
    quantity: z.number(),
    unitOfMeasure: z.string(),
    isPerishable: z.boolean(),
  })),
})

const productionOrderSchema = z.object({
  recipeId: z.string().min(1, 'Recipe is required'),
  scheduledDate: z.string().min(1, 'Scheduled date is required'),
  scheduledQuantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  notes: z.string().optional(),
  requireSupervisorApproval: z.boolean().default(false),
})

// Types
type ProductionOrder = z.infer<typeof productionOrderSchema>

// Mock data
const mockRecipes = [
  {
    id: '1',
    name: 'Fresh Tomato Sauce',
    code: 'RCP-001',
    description: 'Classic tomato basil sauce for pasta dishes',
    unitOfMeasure: 'L',
    baseYieldQuantity: 10,
    components: [
      {
        productId: '1',
        productName: 'Fresh Tomatoes',
        productCode: 'TOM001',
        quantity: 12,
        unitOfMeasure: 'kg',
        isPerishable: true,
      },
      {
        productId: '2',
        productName: 'Fresh Basil',
        productCode: 'BSL001',
        quantity: 0.5,
        unitOfMeasure: 'kg',
        isPerishable: true,
      },
      {
        productId: '3',
        productName: 'Garlic',
        productCode: 'GRC001',
        quantity: 0.2,
        unitOfMeasure: 'kg',
        isPerishable: true,
      },
      {
        productId: '4',
        productName: 'Olive Oil',
        productCode: 'OIL001',
        quantity: 1,
        unitOfMeasure: 'L',
        isPerishable: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Caesar Dressing',
    code: 'RCP-002',
    description: 'Creamy Caesar dressing with parmesan',
    unitOfMeasure: 'L',
    baseYieldQuantity: 5,
    components: [
      {
        productId: '5',
        productName: 'Eggs',
        productCode: 'EGG001',
        quantity: 12,
        unitOfMeasure: 'units',
        isPerishable: true,
      },
      {
        productId: '6',
        productName: 'Parmesan Cheese',
        productCode: 'PAR001',
        quantity: 0.5,
        unitOfMeasure: 'kg',
        isPerishable: true,
      },
      {
        productId: '4',
        productName: 'Olive Oil',
        productCode: 'OIL001',
        quantity: 2,
        unitOfMeasure: 'L',
        isPerishable: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Pesto Sauce',
    code: 'RCP-003',
    description: 'Fresh basil pesto with pine nuts',
    unitOfMeasure: 'L',
    baseYieldQuantity: 2,
    components: [
      {
        productId: '2',
        productName: 'Fresh Basil',
        productCode: 'BSL001',
        quantity: 2,
        unitOfMeasure: 'kg',
        isPerishable: true,
      },
      {
        productId: '7',
        productName: 'Pine Nuts',
        productCode: 'PNT001',
        quantity: 0.5,
        unitOfMeasure: 'kg',
        isPerishable: false,
      },
      {
        productId: '4',
        productName: 'Olive Oil',
        productCode: 'OIL001',
        quantity: 1.5,
        unitOfMeasure: 'L',
        isPerishable: false,
      },
    ],
  },
]

// Mock inventory data for availability check
const mockInventory = {
  '1': { available: 50, unit: 'kg' }, // Fresh Tomatoes
  '2': { available: 2, unit: 'kg' },  // Fresh Basil
  '3': { available: 5, unit: 'kg' },  // Garlic
  '4': { available: 20, unit: 'L' },  // Olive Oil
  '5': { available: 24, unit: 'units' }, // Eggs
  '6': { available: 2, unit: 'kg' },  // Parmesan Cheese
  '7': { available: 1, unit: 'kg' },  // Pine Nuts
}

// Utility functions
const calculateComponentRequirements = (
  recipe: typeof mockRecipes[0],
  scheduledQuantity: number
) => {
  const multiplier = scheduledQuantity / recipe.baseYieldQuantity

  return recipe.components.map(component => ({
    ...component,
    requiredQuantity: component.quantity * multiplier,
    availableQuantity: mockInventory[component.productId as keyof typeof mockInventory]?.available || 0,
    isAvailable: (component.quantity * multiplier) <= (mockInventory[component.productId as keyof typeof mockInventory]?.available || 0),
  }))
}

const hasInsufficientComponents = (
  recipe: typeof mockRecipes[0],
  scheduledQuantity: number
) => {
  const requirements = calculateComponentRequirements(recipe, scheduledQuantity)
  return requirements.some(req => !req.isAvailable)
}

// Components
const RecipeCard = ({ recipe, scheduledQuantity, onSelect }: {
  recipe: typeof mockRecipes[0]
  scheduledQuantity: number
  onSelect: (recipe: typeof mockRecipes[0]) => void
}) => {
  const requirements = calculateComponentRequirements(recipe, scheduledQuantity)
  const hasInsufficient = requirements.some(req => !req.isAvailable)
  const insufficientCount = requirements.filter(req => !req.isAvailable).length

  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => onSelect(recipe)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold">{recipe.name}</h3>
          <p className="text-sm text-gray-600">{recipe.code}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{recipe.baseYieldQuantity} {recipe.unitOfMeasure}</div>
          <div className="text-xs text-gray-500">Base yield</div>
        </div>
      </div>

      {recipe.description && (
        <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Components Required:</span>
          <span>{requirements.length} items</span>
        </div>

        {hasInsufficient && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {insufficientCount} component{insufficientCount > 1 ? 's' : ''} insufficient for {scheduledQuantity} {recipe.unitOfMeasure}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500">
          {requirements.slice(0, 3).map((req, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{req.productName}</span>
              <span className={req.isAvailable ? 'text-green-600' : 'text-red-600'}>
                {req.requiredQuantity.toFixed(2)} {req.unitOfMeasure}
              </span>
            </div>
          ))}
          {requirements.length > 3 && (
            <div className="text-gray-400">... +{requirements.length - 3} more</div>
          )}
        </div>
      </div>
    </div>
  )
}

const ComponentRequirements = ({
  recipe,
  scheduledQuantity
}: {
  recipe: typeof mockRecipes[0]
  scheduledQuantity: number
}) => {
  const requirements = calculateComponentRequirements(recipe, scheduledQuantity)

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center">
        <Calculator className="h-4 w-4 mr-2" />
        Component Requirements (for {scheduledQuantity} {recipe.unitOfMeasure})
      </h3>

      <div className="space-y-2">
        {requirements.map((component) => (
          <div key={component.productId} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{component.productName}</div>
              <div className="text-sm text-gray-500">{component.productCode}</div>
            </div>

            <div className="text-right">
              <div className="font-medium">
                {component.requiredQuantity.toFixed(2)} {component.unitOfMeasure}
              </div>
              <div className="text-sm text-gray-500">
                Available: {component.availableQuantity} {component.unitOfMeasure}
              </div>
            </div>

            <div className="ml-3">
              {component.isAvailable ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  ✓ Sufficient
                </Badge>
              ) : (
                <Badge variant="destructive">
                  ✗ Insufficient
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main component
interface ProductionOrderFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<ProductionOrder>
  onSubmit: (data: ProductionOrder) => void
}

export default function ProductionOrderForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: ProductionOrderFormProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<typeof mockRecipes[0] | null>(null)

  const form = useForm<ProductionOrder>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      recipeId: '',
      scheduledDate: format(new Date(), 'yyyy-MM-dd'),
      scheduledQuantity: 0,
      notes: '',
      requireSupervisorApproval: false,
    },
    values: initialData,
  })

  const recipeId = form.watch('recipeId')
  const scheduledQuantity = form.watch('scheduledQuantity')

  const selectedRecipeData = mockRecipes.find(r => r.id === recipeId)
  const hasInsufficientComponents = selectedRecipeData &&
    scheduledQuantity > 0 &&
    hasInsufficientComponents(selectedRecipeData, scheduledQuantity)

  const handleSubmit = (data: ProductionOrder) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
    setSelectedRecipe(null)
  }

  const handleRecipeSelect = (recipe: typeof mockRecipes[0]) => {
    setSelectedRecipe(recipe)
    form.setValue('recipeId', recipe.id)
    form.setValue('scheduledQuantity', recipe.baseYieldQuantity)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Production Order</SheetTitle>
          <SheetDescription>
            Schedule production with recipe selection and component availability checking
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Recipe Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="recipeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe</FormLabel>
                    <FormControl>
                      <div className="hidden">
                        <Input {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!selectedRecipeData ? (
                <div>
                  <h3 className="font-semibold mb-3">Select Recipe</h3>
                  <div className="grid gap-3">
                    {mockRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        scheduledQuantity={scheduledQuantity || recipe.baseYieldQuantity}
                        onSelect={handleRecipeSelect}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h3 className="font-semibold text-blue-900">{selectedRecipeData.name}</h3>
                        <p className="text-sm text-blue-700">{selectedRecipeData.code}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRecipe(null)
                          form.setValue('recipeId', '')
                          form.setValue('scheduledQuantity', 0)
                        }}
                      >
                        Change Recipe
                      </Button>
                    </div>
                    {selectedRecipeData.description && (
                      <p className="text-sm text-blue-700 mb-2">{selectedRecipeData.description}</p>
                    )}
                    <div className="text-sm text-blue-700">
                      Base yield: {selectedRecipeData.baseYieldQuantity} {selectedRecipeData.unitOfMeasure}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedRecipeData && (
              <>
                <Separator />

                {/* Production Details */}
                <div className="grid grid-cols-2 gap-4">
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
                    name="scheduledQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned Quantity</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Input
                              {...field}
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-sm text-gray-500">{selectedRecipeData.unitOfMeasure}</span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Base recipe yields {selectedRecipeData.baseYieldQuantity} {selectedRecipeData.unitOfMeasure}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Component Requirements */}
                {scheduledQuantity > 0 && (
                  <ComponentRequirements
                    recipe={selectedRecipeData}
                    scheduledQuantity={scheduledQuantity}
                  />
                )}

                {/* Supervisor Approval */}
                {hasInsufficientComponents && (
                  <div className="space-y-3">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p><strong>Insufficient Components:</strong> Some required components are not available in sufficient quantity.</p>
                          <p>You need supervisor approval to proceed with this production order.</p>
                        </div>
                      </AlertDescription>
                    </Alert>

                    <FormField
                      control={form.control}
                      name="requireSupervisorApproval"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="!mt-0">Request Supervisor Approval</FormLabel>
                            <FormDescription>
                              Check this box to request approval for production with insufficient components
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Special instructions, quality requirements, etc..."
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
                    disabled={!selectedRecipeData || scheduledQuantity <= 0 || (hasInsufficientComponents && !form.watch('requireSupervisorApproval'))}
                  >
                    Create Production Order
                  </Button>
                </SheetFooter>
              </>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}