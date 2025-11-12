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
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { Thermometer, TrendingDown, AlertTriangle } from 'lucide-react'

// Schema
const temperatureLogSchema = z.object({
  temperature: z.number().min(-50).max(100, 'Temperature must be between -50°C and 100°C'),
  humidity: z.number().min(0).max(100, 'Humidity must be between 0% and 100%').optional(),
  notes: z.string().optional(),
  correctiveAction: z.string().optional(),
})

type TemperatureLog = z.infer<typeof temperatureLogSchema>

// Types
interface Alert {
  id: string
  alertType: 'temperature' | 'expiry' | 'stock_out' | 'negative_stock' | 'quality' | 'security' | 'maintenance'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  status: 'active' | 'acknowledged' | 'in_progress' | 'resolved' | 'snoozed' | 'cancelled'
  locationName: string
  locationCode: string
  productName?: string
  productCode?: string
  lotNumber?: string
  currentTemperature?: number
  targetTemperature?: number
  expiryDate?: string
  triggeredAt: string
}

interface TemperatureLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alert: Alert
  onSubmit: (data: TemperatureLog) => void
}

// Mock historical temperature readings
const mockTemperatureHistory = [
  { time: '2024-01-18T06:00:00Z', temperature: 4.2 },
  { time: '2024-01-18T08:00:00Z', temperature: 4.5 },
  { time: '2024-01-18T10:00:00Z', temperature: 6.8 },
  { time: '2024-01-18T12:00:00Z', temperature: 7.2 },
  { time: '2024-01-18T14:00:00Z', temperature: 8.5 },
  { time: '2024-01-18T16:00:00Z', temperature: 8.1 },
]

export default function TemperatureLogDialog({
  open,
  onOpenChange,
  alert,
  onSubmit
}: TemperatureLogDialogProps) {
  const form = useForm<TemperatureLog>({
    resolver: zodResolver(temperatureLogSchema),
    defaultValues: {
      temperature: alert.currentTemperature || 0,
      humidity: undefined,
      notes: '',
      correctiveAction: '',
    },
  })

  const handleSubmit = (data: TemperatureLog) => {
    onSubmit(data)
    onOpenChange(false)
    form.reset()
  }

  const getTemperatureStatus = (current: number, target: number) => {
    const diff = Math.abs(current - target)
    if (diff > 2) return { status: 'critical', color: 'text-red-600', icon: <AlertTriangle className="h-4 w-4" /> }
    if (diff > 1) return { status: 'warning', color: 'text-yellow-600', icon: <AlertTriangle className="h-4 w-4" /> }
    return { status: 'normal', color: 'text-green-600', icon: <TrendingDown className="h-4 w-4" /> }
  }

  const currentTemp = form.watch('temperature')
  const targetTemp = alert.targetTemperature || 4.0
  const tempStatus = getTemperatureStatus(currentTemp, targetTemp)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Thermometer className="h-5 w-5" />
            <span>Log Temperature Reading</span>
          </DialogTitle>
          <DialogDescription>
            Record temperature reading for {alert.locationName} - {alert.locationCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Alert Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Alert Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Location:</span>
                <span className="text-sm">{alert.locationName} ({alert.locationCode})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Target Temperature:</span>
                <span className="text-sm font-medium">{targetTemp}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Alert Status:</span>
                <div className="flex items-center space-x-1">
                  {tempStatus.icon}
                  <span className={`text-sm ${tempStatus.color}`}>{tempStatus.status.toUpperCase()}</span>
                </div>
              </div>
              {alert.productName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Product:</span>
                  <span className="text-sm">{alert.productName}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Temperature Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Temperature Trend</CardTitle>
              <CardDescription>
                Last 24 hours of temperature readings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockTemperatureHistory.map((reading, index) => {
                  const isLast = index === mockTemperatureHistory.length - 1
                  const status = getTemperatureStatus(reading.temperature, targetTemp)

                  return (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        {status.icon}
                        <span className="text-sm font-medium">
                          {format(new Date(reading.time), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{reading.temperature}°C</span>
                        <span className={`text-xs ${status.color}`}>
                          {Math.abs(reading.temperature - targetTemp).toFixed(1)}°C variance
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Temperature Logging Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperature (°C)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          className="text-lg font-semibold"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the current temperature reading
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="humidity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Humidity (%) (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          placeholder="0.0"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Relative humidity percentage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Temperature Status Indicator */}
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Temperature Status:</span>
                    <div className="flex items-center space-x-1">
                      {tempStatus.icon}
                      <span className={`font-medium ${tempStatus.color}`}>
                        {tempStatus.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Variance from target:</div>
                    <div className={`font-semibold ${tempStatus.color}`}>
                      {Math.abs(currentTemp - targetTemp).toFixed(1)}°C
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observation Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Any observations about current conditions, equipment status, etc..."
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe any visible conditions or observations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="correctiveAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corrective Action Taken (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe any immediate corrective actions taken..."
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Document any immediate actions to address temperature issues
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Log Temperature Reading
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}