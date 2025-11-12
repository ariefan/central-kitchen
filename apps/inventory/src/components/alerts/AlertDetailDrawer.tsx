import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import {
  Bell,
  Thermometer,
  Clock,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Pause,
  MapPin,
  Package,
  User,
  Eye,
  Edit,
  FileText
} from 'lucide-react'

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
  acknowledgedAt?: string
  resolvedAt?: string
  snoozedUntil?: string
  acknowledgedBy?: string
  resolvedBy?: string
  assignedTo?: string
  notes?: string
  actions?: string[]
}

interface AlertDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alert: Alert
}

// Alert type configurations
const alertTypeConfigs = {
  temperature: {
    label: 'Temperature',
    icon: <Thermometer className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  expiry: {
    label: 'Expiry',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  stock_out: {
    label: 'Stock Out',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  negative_stock: {
    label: 'Negative Stock',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  quality: {
    label: 'Quality',
    icon: <Bell className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  security: {
    label: 'Security',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  maintenance: {
    label: 'Maintenance',
    icon: <RotateCcw className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
}

// Status configurations
const statusConfigs = {
  active: {
    label: 'Active',
    icon: <Bell className="h-3 w-3" />,
    variant: 'destructive' as const,
  },
  acknowledged: {
    label: 'Acknowledged',
    icon: <Eye className="h-3 w-3" />,
    variant: 'default' as const,
  },
  in_progress: {
    label: 'In Progress',
    icon: <RotateCcw className="h-3 w-3" />,
    variant: 'default' as const,
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle className="h-3 w-3" />,
    variant: 'outline' as const,
  },
  snoozed: {
    label: 'Snoozed',
    icon: <Pause className="h-3 w-3" />,
    variant: 'secondary' as const,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <AlertTriangle className="h-3 w-3" />,
    variant: 'secondary' as const,
  },
}

// Helper components
const StatusBadge = ({ status }: { status: Alert['status'] }) => {
  const config = statusConfigs[status]
  return (
    <Badge variant={config.variant} className="flex items-center space-x-1">
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}

export default function AlertDetailDrawer({
  open,
  onOpenChange,
  alert,
}: AlertDetailDrawerProps) {
  const handleAcknowledge = () => {
    console.log('Acknowledging alert:', alert.id)
    // TODO: Implement acknowledge functionality
  }

  const handleStartWork = () => {
    console.log('Starting work on alert:', alert.id)
    // TODO: Implement start work functionality
  }

  const handleResolve = () => {
    console.log('Resolving alert:', alert.id)
    // TODO: Implement resolve functionality
  }

  const handleSnooze = () => {
    console.log('Snoozing alert:', alert.id)
    // TODO: Implement snooze functionality
  }

  const typeConfig = alertTypeConfigs[alert.alertType]

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${typeConfig.bgColor} ${typeConfig.color}`}>
                {typeConfig.icon}
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{alert.title}</span>
                  <StatusBadge status={alert.status} />
                </DrawerTitle>
                <DrawerDescription>
                  {alert.description}
                </DrawerDescription>
              </div>
            </div>
            <div className="flex space-x-2">
              {alert.status === 'active' && (
                <>
                  <Button variant="outline" onClick={handleAcknowledge} size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                  <Button variant="outline" onClick={handleSnooze} size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Snooze
                  </Button>
                </>
              )}
              {alert.status === 'acknowledged' && (
                <Button onClick={handleStartWork} size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              )}
              {(alert.status === 'acknowledged' || alert.status === 'in_progress') && (
                <Button variant="outline" onClick={handleResolve} size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Alert Type</CardTitle>
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                        {typeConfig.icon}
                      </div>
                      <span className="font-medium">{typeConfig.label}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Priority</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <Badge variant={
                      alert.priority === 'critical' ? 'destructive' :
                      alert.priority === 'high' ? 'destructive' :
                      alert.priority === 'medium' ? 'default' : 'secondary'
                    }>
                      {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Location</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{alert.locationName}</div>
                    <div className="text-sm text-muted-foreground">{alert.locationCode}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <StatusBadge status={alert.status} />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Alert Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Triggered At:</span>
                      <span className="font-medium">
                        {format(new Date(alert.triggeredAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    {alert.acknowledgedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Acknowledged At:</span>
                        <span className="font-medium">
                          {format(new Date(alert.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {alert.resolvedAt && (
                      <div className="flex justify-between text-sm">
                        <span>Resolved At:</span>
                        <span className="font-medium">
                          {format(new Date(alert.resolvedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    {alert.snoozedUntil && (
                      <div className="flex justify-between text-sm">
                        <span>Snoozed Until:</span>
                        <span className="font-medium">
                          {format(new Date(alert.snoozedUntil), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Assigned To:</span>
                      <span className="font-medium">
                        {alert.assignedTo || 'Unassigned'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {alert.productName ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Product:</span>
                          <span className="font-medium">{alert.productName}</span>
                        </div>
                        {alert.productCode && (
                          <div className="flex justify-between text-sm">
                            <span>Code:</span>
                            <span className="font-medium">{alert.productCode}</span>
                          </div>
                        )}
                        {alert.lotNumber && (
                          <div className="flex justify-between text-sm">
                            <span>Lot Number:</span>
                            <span className="font-medium">{alert.lotNumber}</span>
                          </div>
                        )}
                        {alert.expiryDate && (
                          <div className="flex justify-between text-sm">
                            <span>Expiry Date:</span>
                            <span className="font-medium">
                              {format(new Date(alert.expiryDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No product information available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Temperature-specific information */}
              {alert.alertType === 'temperature' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Temperature Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Current Temperature:</span>
                        <div className="text-2xl font-bold text-red-600">
                          {alert.currentTemperature}°C
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Target Temperature:</span>
                        <div className="text-2xl font-bold text-blue-600">
                          {alert.targetTemperature}°C
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Temperature deviation: {Math.abs((alert.currentTemperature || 0) - (alert.targetTemperature || 0)).toFixed(1)}°C
                    </div>
                  </CardContent>
                </Card>
              )}

              {alert.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{alert.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Timeline</CardTitle>
                  <CardDescription>
                    Chronological history of this alert
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <div className="font-medium">Alert Triggered</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(alert.triggeredAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>

                    {alert.acknowledgedAt && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="font-medium">Alert Acknowledged</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(alert.acknowledgedAt), 'MMM dd, yyyy HH:mm')} by {alert.acknowledgedBy}
                          </div>
                        </div>
                      </div>
                    )}

                    {alert.status === 'in_progress' && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="font-medium">Work in Progress</div>
                          <div className="text-sm text-muted-foreground">
                            Currently being addressed
                          </div>
                        </div>
                      </div>
                    )}

                    {alert.resolvedAt && (
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="font-medium">Alert Resolved</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(alert.resolvedAt), 'MMM dd, yyyy HH:mm')} by {alert.resolvedBy}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                  <CardDescription>
                    Suggested steps to resolve this alert
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {alert.actions && alert.actions.length > 0 ? (
                    <div className="space-y-3">
                      {alert.actions.map((action, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm">{action}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No specific actions recommended for this alert type
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="flex space-x-2">
              {alert.status === 'active' && (
                <>
                  <Button variant="outline" onClick={handleAcknowledge}>
                    <Eye className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                  <Button variant="outline" onClick={handleSnooze}>
                    <Pause className="h-4 w-4 mr-2" />
                    Snooze
                  </Button>
                </>
              )}
              {alert.status === 'acknowledged' && (
                <Button onClick={handleStartWork}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              )}
              {(alert.status === 'acknowledged' || alert.status === 'in_progress') && (
                <Button variant="outline" onClick={handleResolve}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}