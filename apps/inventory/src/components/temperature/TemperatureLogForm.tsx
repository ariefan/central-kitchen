import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Thermometer,
  Droplets,
  MapPin,
  User,
  Clock,
  Save,
  X,
} from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Types
interface TemperatureLogFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
  initialData?: any
}

const temperatureSchema = z.object({
  locationCode: z.string().min(1, 'Location is required'),
  locationName: z.string().min(1, 'Location name is required'),
  temperature: z
    .number()
    .min(-50, 'Temperature must be at least -50°C')
    .max(100, 'Temperature must be no more than 100°C'),
  unit: z.enum(['celsius', 'fahrenheit']),
  humidity: z
    .number()
    .min(0, 'Humidity must be at least 0%')
    .max(100, 'Humidity must be no more than 100%')
    .optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  recordedAt: z.string().min(1, 'Recorded time is required'),
  recordedBy: z.string().min(1, 'Recorded by is required'),
})

type TemperatureFormData = z.infer<typeof temperatureSchema>

// Mock locations for dropdown
const mockLocations = [
  { code: 'MC-001', name: 'Main Cooler', minTemp: 2, maxTemp: 8 },
  { code: 'FS-A001', name: 'Freezer Section A', minTemp: -25, maxTemp: -15 },
  { code: 'FS-B001', name: 'Freezer Section B', minTemp: -25, maxTemp: -15 },
  { code: 'DS-001', name: 'Dry Storage', minTemp: 18, maxTemp: 26 },
  { code: 'PA-001', name: 'Prep Area', minTemp: 20, maxTemp: 25 },
  { code: 'RW-001', name: 'Receiving Warehouse', minTemp: 15, maxTemp: 30 },
]

export default function TemperatureLogForm({
  open,
  onOpenChange,
  onSubmit,
  initialData
}: TemperatureLogFormProps) {
  const [selectedLocation, setSelectedLocation] = useState(mockLocations[0])

  const form = useForm<TemperatureFormData>({
    resolver: zodResolver(temperatureSchema),
    defaultValues: {
      locationCode: initialData?.locationCode || '',
      locationName: initialData?.locationName || '',
      temperature: initialData?.temperature || undefined,
      unit: initialData?.unit || 'celsius',
      humidity: initialData?.humidity || undefined,
      notes: initialData?.notes || '',
      recordedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      recordedBy: initialData?.recordedBy || '',
    },
  })

  const watchedLocation = form.watch('locationCode')
  const watchedTemperature = form.watch('temperature')
  const watchedUnit = form.watch('unit')

  // Update location when code changes
  useEffect(() => {
    const location = mockLocations.find(loc => loc.code === watchedLocation)
    if (location) {
      setSelectedLocation(location)
      form.setValue('locationName', location.name)
    }
  }, [watchedLocation, form])

  // Initialize with initial data if provided
  useEffect(() => {
    if (initialData) {
      form.reset({
        locationCode: initialData.locationCode,
        locationName: initialData.locationName,
        temperature: initialData.temperature,
        unit: initialData.unit || 'celsius',
        humidity: initialData.humidity,
        notes: initialData.notes || '',
        recordedAt: initialData.recordedAt || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        recordedBy: initialData.recordedBy || '',
      })
    }
  }, [initialData, form])

  const handleSubmit = (data: TemperatureFormData) => {
    onSubmit(data)
    form.reset()
  }

  const getTemperatureStatus = () => {
    if (!watchedTemperature || !selectedLocation) return 'normal'

    const temp = watchedTemperature
    const min = selectedLocation.minTemp
    const max = selectedLocation.maxTemp

    if (temp < min || temp > max) {
      return 'critical'
    } else if (temp <= min + 2 || temp >= max - 2) {
      return 'warning'
    }
    return 'normal'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const temperatureStatus = getTemperatureStatus()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Thermometer className="h-5 w-5" />
            <span>Log Temperature Reading</span>
          </DialogTitle>
          <DialogDescription>
            Record a new temperature reading for a storage location
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Location Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Code</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockLocations.map((location) => (
                              <SelectItem key={location.code} value={location.code}>
                                {location.code} - {location.name}
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
                    name="recordedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recorded By</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Name</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedLocation && (
                  <div className="text-sm bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-900">Temperature Range:</div>
                    <div className="text-blue-700">
                      {selectedLocation.minTemp}°C to {selectedLocation.maxTemp}°C
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Temperature Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Thermometer className="h-4 w-4" />
                  <span>Temperature Reading</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Enter temperature"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="celsius">Celsius (°C)</SelectItem>
                            <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Temperature Status */}
                {watchedTemperature && (
                  <div className={`p-3 rounded-lg border ${getStatusColor(temperatureStatus)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {watchedTemperature}°{watchedUnit === 'celsius' ? 'C' : 'F'}
                      </span>
                      <span className="text-sm">
                        {temperatureStatus === 'critical' ? '⚠️ Out of Range' :
                         temperatureStatus === 'warning' ? '⚠️ Near Limit' :
                         '✅ Normal'}
                      </span>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                    name="humidity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <Droplets className="h-4 w-4" />
                          <span>Humidity (Optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="Enter humidity percentage"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Relative humidity percentage (0-100%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                />
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Additional Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="recordedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recorded At</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                        />
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
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any notes about this reading..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Additional observations or comments (max 500 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Save Reading
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}