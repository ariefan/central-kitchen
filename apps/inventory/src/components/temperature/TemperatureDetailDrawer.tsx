import { useState } from 'react'
import {
  Thermometer,
  MapPin,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Droplets,
  FileText,
  History,
  Bell,
} from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Types
interface TemperatureDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reading: any
}

// Mock historical data
const mockHistoricalData = [
  {
    id: '1',
    temperature: 4.2,
    humidity: 64,
    status: 'normal',
    recordedAt: '2024-01-15T09:30:00Z',
    recordedBy: 'Sarah Chen',
  },
  {
    id: '2',
    temperature: 4.5,
    humidity: 65,
    status: 'normal',
    recordedAt: '2024-01-15T10:30:00Z',
    recordedBy: 'Sarah Chen',
  },
  {
    id: '3',
    temperature: 4.8,
    humidity: 66,
    status: 'normal',
    recordedAt: '2024-01-15T11:30:00Z',
    recordedBy: 'Mike Johnson',
  },
  {
    id: '4',
    temperature: 5.1,
    humidity: 67,
    status: 'warning',
    recordedAt: '2024-01-15T12:30:00Z',
    recordedBy: 'Mike Johnson',
  },
  {
    id: '5',
    temperature: 4.9,
    humidity: 65,
    status: 'normal',
    recordedAt: '2024-01-15T13:30:00Z',
    recordedBy: 'Alex Rivera',
  },
]

// Mock alert history
const mockAlertHistory = [
  {
    id: '1',
    type: 'warning',
    message: 'Temperature approaching upper limit',
    temperature: 7.8,
    threshold: 8.0,
    createdAt: '2024-01-14T15:45:00Z',
    resolvedAt: '2024-01-14T16:30:00Z',
    resolvedBy: 'Sarah Chen',
  },
  {
    id: '2',
    type: 'critical',
    message: 'Temperature exceeded safe range',
    temperature: 9.2,
    threshold: 8.0,
    createdAt: '2024-01-13T22:15:00Z',
    resolvedAt: '2024-01-14T06:00:00Z',
    resolvedBy: 'Mike Johnson',
  },
]

export default function TemperatureDetailDrawer({
  open,
  onOpenChange,
  reading
}: TemperatureDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'alerts'>('overview')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-blue-500" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  const getTemperaturePercentage = () => {
    const range = reading.maxThreshold - reading.minThreshold
    const value = reading.temperature - reading.minThreshold
    return Math.max(0, Math.min(100, (value / range) * 100))
  }

  const temperaturePercentage = getTemperaturePercentage()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center space-x-2">
            <Thermometer className="h-5 w-5" />
            <span>{reading.locationName}</span>
          </DrawerTitle>
          <DrawerDescription>
            Temperature monitoring details and history
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  reading.status === 'critical' ? 'text-red-600' :
                  reading.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {reading.temperature}°{reading.unit === 'celsius' ? 'C' : 'F'}
                </div>
                <div className="text-sm text-muted-foreground">Current</div>
                <div className="flex items-center justify-center mt-2">
                  {getTrendIcon(reading.trend)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold mb-1">
                  {reading.minThreshold}° - {reading.maxThreshold}°
                </div>
                <div className="text-sm text-muted-foreground">Safe Range</div>
                <div className="mt-2">
                  <Badge className={getStatusColor(reading.status)}>
                    {getStatusIcon(reading.status)}
                    <span className="ml-1 capitalize">{reading.status}</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Temperature Gauge */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Temperature Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{reading.minThreshold}°C</span>
                  <span>Safe Range</span>
                  <span>{reading.maxThreshold}°C</span>
                </div>
                <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-1/3 right-1/3 bg-green-500" />
                  <div
                    className={`absolute top-0 h-full w-1 transition-all duration-300 ${
                      reading.status === 'critical' ? 'bg-red-500' :
                      reading.status === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ left: `${temperaturePercentage}%` }}
                  />
                </div>
              </div>

              {reading.humidity && (
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Humidity: {reading.humidity}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Location Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Location Code</div>
                        <div className="font-medium">{reading.locationCode}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sensor ID</div>
                        <div className="font-medium">{reading.sensorId || 'Manual'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Last Reading</div>
                        <div className="font-medium">
                          {format(new Date(reading.recordedAt), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Recorded By</div>
                        <div className="font-medium">{reading.recordedBy}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {reading.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Notes</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{reading.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {reading.alertCount > 0 && (
                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription>
                      This location has {reading.alertCount} temperature alerts in the last 24 hours.
                      Check the Alerts tab for details.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <History className="h-4 w-4" />
                      <span>Recent Readings</span>
                    </CardTitle>
                    <CardDescription>
                      Last 24 hours of temperature readings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockHistoricalData.map((reading) => (
                        <div key={reading.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-semibold">
                              {reading.temperature}°C
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {format(new Date(reading.recordedAt), 'MMM dd, HH:mm')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {reading.recordedBy}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {reading.humidity && (
                              <div className="text-sm text-muted-foreground">
                                💧 {reading.humidity}%
                              </div>
                            )}
                            <Badge className={getStatusColor(reading.status)}>
                              {getStatusIcon(reading.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Alerts Tab */}
              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Alert History</span>
                    </CardTitle>
                    <CardDescription>
                      Recent temperature alerts and their resolution status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mockAlertHistory.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                        <p>No alerts in the last 30 days</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {mockAlertHistory.map((alert) => (
                          <div key={alert.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <AlertTriangle className={`h-4 w-4 ${
                                    alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'
                                  }`} />
                                  <span className="font-medium">{alert.message}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Temperature: {alert.temperature}°C (threshold: {alert.threshold}°C)
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Alert: {format(new Date(alert.createdAt), 'MMM dd, HH:mm')}
                                  {alert.resolvedAt && (
                                    <>
                                      <Separator orientation="vertical" className="mx-2 inline h-3" />
                                      Resolved: {format(new Date(alert.resolvedAt), 'MMM dd, HH:mm')}
                                    </>
                                  )}
                                </div>
                              </div>
                              <Badge
                                className={alert.resolvedAt
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {alert.resolvedAt ? 'Resolved' : 'Active'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}