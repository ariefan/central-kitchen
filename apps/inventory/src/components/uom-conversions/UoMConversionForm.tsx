import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpDown, Calculator, AlertTriangle } from 'lucide-react'

// Schema
const operationOptions = ['multiply', 'divide'] as const
const categoryOptions = [
  'weight',
  'volume',
  'length',
  'area',
  'count',
  'temperature',
  'time',
  'custom',
] as const

const uomConversionSchema = z.object({
  fromUoM: z.string().min(1, 'From UoM is required'),
  fromUoMName: z.string().min(1, 'From UoM name is required'),
  toUoM: z.string().min(1, 'To UoM is required'),
  toUoMName: z.string().min(1, 'To UoM name is required'),
  conversionFactor: z.number().min(0.000001, 'Conversion factor must be greater than 0'),
  operation: z.enum(operationOptions, {
    message: 'Please select an operation',
  }),
  category: z.enum(categoryOptions, {
    message: 'Please select a category',
  }),
  description: z.string().min(1, 'Description is required'),
})

type UoMConversion = z.infer<typeof uomConversionSchema>

// Common UoM suggestions
const commonUoMs = {
  weight: [
    { code: 'KG', name: 'Kilogram' },
    { code: 'G', name: 'Gram' },
    { code: 'LB', name: 'Pound' },
    { code: 'OZ', name: 'Ounce' },
    { code: 'T', name: 'Ton' },
    { code: 'MG', name: 'Milligram' }
  ],
  volume: [
    { code: 'L', name: 'Liter' },
    { code: 'ML', name: 'Milliliter' },
    { code: 'GAL', name: 'Gallon (US)' },
    { code: 'QT', name: 'Quart' },
    { code: 'PT', name: 'Pint' },
    { code: 'FL OZ', name: 'Fluid Ounce' }
  ],
  length: [
    { code: 'M', name: 'Meter' },
    { code: 'CM', name: 'Centimeter' },
    { code: 'MM', name: 'Millimeter' },
    { code: 'FT', name: 'Foot' },
    { code: 'IN', name: 'Inch' },
    { code: 'KM', name: 'Kilometer' }
  ],
  area: [
    { code: 'M²', name: 'Square Meter' },
    { code: 'CM²', name: 'Square Centimeter' },
    { code: 'FT²', name: 'Square Foot' },
    { code: 'IN²', name: 'Square Inch' },
    { code: 'HA', name: 'Hectare' },
    { code: 'ACRE', name: 'Acre' }
  ],
  count: [
    { code: 'PCS', name: 'Pieces' },
    { code: 'BOX', name: 'Box' },
    { code: 'CASE', name: 'Case' },
    { code: 'PALLET', name: 'Pallet' },
    { code: 'DOZ', name: 'Dozen' },
    { code: 'SET', name: 'Set' }
  ],
  temperature: [
    { code: 'C', name: 'Celsius' },
    { code: 'F', name: 'Fahrenheit' },
    { code: 'K', name: 'Kelvin' }
  ],
  time: [
    { code: 'SEC', name: 'Second' },
    { code: 'MIN', name: 'Minute' },
    { code: 'HR', name: 'Hour' },
    { code: 'DAY', name: 'Day' },
    { code: 'WEEK', name: 'Week' },
    { code: 'MONTH', name: 'Month' }
  ],
  custom: [
    { code: 'UNIT', name: 'Unit' },
    { code: 'PKG', name: 'Package' },
    { code: 'BAG', name: 'Bag' },
    { code: 'BOTTLE', name: 'Bottle' },
    { code: 'JAR', name: 'Jar' }
  ]
}

interface UoMConversionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<UoMConversion>
  onSubmit: (data: UoMConversion) => void
}

export default function UoMConversionForm({
  open,
  onOpenChange,
  initialData,
  onSubmit
}: UoMConversionFormProps) {
  const form = useForm<UoMConversion>({
    resolver: zodResolver(uomConversionSchema),
    defaultValues: {
      fromUoM: '',
      fromUoMName: '',
      toUoM: '',
      toUoMName: '',
      conversionFactor: 1,
      operation: 'multiply',
      category: 'weight',
      description: '',
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

  const fromUoM = form.watch('fromUoM')
  const toUoM = form.watch('toUoM')
  const category = form.watch('category')
  const conversionFactor = form.watch('conversionFactor')
  const operation = form.watch('operation')
  const fromUoMName = form.watch('fromUoMName')
  const toUoMName = form.watch('toUoMName')

  const calculateExample = () => {
    const exampleValue = 10
    let result: number

    if (operation === 'multiply') {
      result = exampleValue * conversionFactor
    } else {
      result = exampleValue / conversionFactor
    }

    return {
      input: `${exampleValue} ${fromUoM}`,
      operation: operation === 'multiply' ? '×' : '÷',
      factor: conversionFactor,
      result: `${result.toFixed(4)} ${toUoM}`
    }
  }

  const example = calculateExample()

  const handleSubmit: SubmitHandler<UoMConversion> = (data) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  const selectUoM = (type: 'from' | 'to', uom: { code: string; name: string }) => {
    if (type === 'from') {
      form.setValue('fromUoM', uom.code)
      form.setValue('fromUoMName', uom.name)
    } else {
      form.setValue('toUoM', uom.code)
      form.setValue('toUoMName', uom.name)
    }
  }

  const autoGenerateDescription = () => {
    const desc = `Convert ${fromUoMName || fromUoM} to ${toUoMName || toUoM} using ${operation === 'multiply' ? 'multiplication' : 'division'} factor of ${conversionFactor}`
    form.setValue('description', desc)
  }

  const createReverseConversion = () => {
    const reverseFactor = operation === 'multiply' ? 1 / conversionFactor : conversionFactor
    const reverseOperation = operation === 'multiply' ? 'divide' : 'multiply'

    form.setValue('fromUoM', toUoM)
    form.setValue('fromUoMName', toUoMName)
    form.setValue('toUoM', fromUoM)
    form.setValue('toUoMName', fromUoMName)
    form.setValue('conversionFactor', reverseFactor)
    form.setValue('operation', reverseOperation)
    form.setValue('description', `Convert ${toUoMName} to ${fromUoMName}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit UoM Conversion' : 'Add New UoM Conversion'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update unit of measure conversion rule'
              : 'Create a new conversion rule for units of measure'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Category Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Category</h3>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversion Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weight">Weight</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="length">Length</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="temperature">Temperature</SelectItem>
                        <SelectItem value="time">Time</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the category for this conversion rule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* UoM Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Units of Measure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fromUoM"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From UoM</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., KG" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fromUoMName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From UoM Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Kilogram" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Quick Select (From)</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {commonUoMs[category as keyof typeof commonUoMs]?.map((uom) => (
                        <Badge
                          key={uom.code}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => selectUoM('from', uom)}
                        >
                          {uom.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="toUoM"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To UoM</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., LB" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toUoMName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To UoM Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Pound" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Quick Select (To)</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {commonUoMs[category as keyof typeof commonUoMs]?.map((uom) => (
                        <Badge
                          key={uom.code}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => selectUoM('to', uom)}
                        >
                          {uom.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={createReverseConversion}
                className="w-full"
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Create Reverse Conversion
              </Button>
            </div>

            {/* Conversion Formula */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Conversion Formula</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="operation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operation</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select operation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="multiply">Multiply (×)</SelectItem>
                          <SelectItem value="divide">Divide (÷)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How the conversion factor should be applied
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conversionFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversion Factor</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0.000001"
                          step="0.000001"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        The factor used for conversion
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Live Preview */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <span>Conversion Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-lg text-center">
                    {example.input} {example.operation} {example.factor.toFixed(6)} = {example.result}
                  </div>
                  <div className="text-xs text-center text-muted-foreground mt-2">
                    Example calculation with 10 {fromUoM || 'units'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Description</h3>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversion Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Describe this conversion..." />
                    </FormControl>
                    <FormDescription>
                      Clear description of what this conversion does
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={autoGenerateDescription}
                className="w-full"
              >
                Auto-generate Description
              </Button>
            </div>

            {/* Information */}
            {category === 'temperature' && (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Temperature Conversions</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Temperature conversions often require complex formulas (e.g., Celsius to Fahrenheit: × 9/5 + 32).
                        For simple temperature conversions, use the appropriate factor. For complex formulas, consider using the Custom category.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Conversion' : 'Create Conversion'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
