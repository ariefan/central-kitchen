import { format } from 'date-fns'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Truck,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  Activity,
  Timer,
  Calculator
} from 'lucide-react'

// Types
interface LeadTime {
  id: string
  itemType: 'product' | 'supplier' | 'category'
  itemId: string
  itemName: string
  expectedLeadTime: number
  leadTimeUnit: 'hours' | 'days' | 'weeks'
  varianceBuffer: number
  reliabilityScore: number
  lastUpdated: string
  notes?: string
  isActive: boolean
}

interface PerformanceData {
  id: string
  date: string
  expectedTime: number
  actualTime: number
  variance: number
  variancePercent: number
  onTime: boolean
  status: 'on-time' | 'delayed' | 'early'
  notes?: string
}

interface LeadTimeDetailDrawerProps {
  leadTime: LeadTime | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Mock performance data
const generateMockPerformanceData = (leadTime: LeadTime): PerformanceData[] => {
  return [
    {
      id: '1',
      date: '2024-01-15',
      expectedTime: leadTime.expectedLeadTime,
      actualTime: leadTime.expectedLeadTime - 1,
      variance: -1,
      variancePercent: -10,
      onTime: true,
      status: 'early',
      notes: 'Delivered ahead of schedule'
    },
    {
      id: '2',
      date: '2024-01-18',
      expectedTime: leadTime.expectedLeadTime,
      actualTime: leadTime.expectedLeadTime,
      variance: 0,
      variancePercent: 0,
      onTime: true,
      status: 'on-time',
      notes: 'On schedule delivery'
    },
    {
      id: '3',
      date: '2024-01-22',
      expectedTime: leadTime.expectedLeadTime,
      actualTime: leadTime.expectedLeadTime + 2,
      variance: 2,
      variancePercent: 20,
      onTime: false,
      status: 'delayed',
      notes: 'Weather-related delays'
    },
    {
      id: '4',
      date: '2024-01-26',
      expectedTime: leadTime.expectedLeadTime,
      actualTime: leadTime.expectedLeadTime + 1,
      variance: 1,
      variancePercent: 10,
      onTime: false,
      status: 'delayed',
      notes: 'Minor processing delays'
    },
    {
      id: '5',
      date: '2024-01-30',
      expectedTime: leadTime.expectedLeadTime,
      actualTime: leadTime.expectedLeadTime - 0.5,
      variance: -0.5,
      variancePercent: -5,
      onTime: true,
      status: 'early',
      notes: 'Efficient processing'
    }
  ]
}

export default function LeadTimeDetailDrawer({
  leadTime,
  open,
  onOpenChange
}: LeadTimeDetailDrawerProps) {
  if (!leadTime) return null

  const performanceData = generateMockPerformanceData(leadTime)

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'product':
        return <Package className="h-5 w-5" />
      case 'supplier':
        return <Truck className="h-5 w-5" />
      case 'category':
        return <Users className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      'on-time': 'default',
      'early': 'secondary',
      'delayed': 'destructive'
    }
    const labels = {
      'on-time': 'On Time',
      'early': 'Early',
      'delayed': 'Delayed'
    }
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const getReliabilityColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getReliabilityBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
    if (score >= 50) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>
    return <Badge variant="destructive">Poor</Badge>
  }

  // Calculate performance metrics
  const onTimeDeliveries = performanceData.filter(p => p.onTime).length
  const averageVariance = performanceData.reduce((sum, p) => sum + p.variance, 0) / performanceData.length
  const averageVariancePercent = performanceData.reduce((sum, p) => sum + p.variancePercent, 0) / performanceData.length
  const bestPerformance = Math.min(...performanceData.map(p => p.actualTime))
  const worstPerformance = Math.max(...performanceData.map(p => p.actualTime))

  const totalLeadTime = leadTime.expectedLeadTime + leadTime.varianceBuffer

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                {getItemIcon(leadTime.itemType)}
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{leadTime.itemName}</span>
                  <Badge variant="outline" className="capitalize">
                    {leadTime.itemType}
                  </Badge>
                </DrawerTitle>
                <DrawerDescription>
                  Lead Time Configuration & Performance Analysis
                </DrawerDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getReliabilityBadge(leadTime.reliabilityScore)}
              <Button variant="outline" size="sm">
                Edit Configuration
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Configuration Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Clock className="h-5 w-5" />
                      <span>Lead Time Configuration</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Expected Time</div>
                      <div className="font-medium">
                        {leadTime.expectedLeadTime} {leadTime.leadTimeUnit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Variance Buffer</div>
                      <div className="font-medium">
                        + {leadTime.varianceBuffer} {leadTime.leadTimeUnit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Expected Time</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {totalLeadTime} {leadTime.leadTimeUnit}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <div className="mt-1">
                        <Badge variant={leadTime.isActive ? 'default' : 'secondary'}>
                          {leadTime.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BarChart3 className="h-5 w-5" />
                      <span>Performance Metrics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Reliability Score</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex-1">
                          <Progress value={leadTime.reliabilityScore} className="h-2" />
                        </div>
                        <span className={`font-medium ${getReliabilityColor(leadTime.reliabilityScore)}`}>
                          {leadTime.reliabilityScore}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">On-Time Delivery Rate</div>
                      <div className="font-medium">
                        {onTimeDeliveries}/{performanceData.length} ({Math.round((onTimeDeliveries / performanceData.length) * 100)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Average Variance</div>
                      <div className={`font-medium ${averageVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {averageVariance >= 0 ? '+' : ''}{averageVariance.toFixed(1)} {leadTime.leadTimeUnit}
                        {averageVariancePercent >= 0 ? '+' : ''}{averageVariancePercent.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Updated</div>
                      <div className="font-medium">
                        {format(new Date(leadTime.lastUpdated), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {performanceData.filter(p => p.status === 'on-time').length}
                      </div>
                      <div className="text-sm text-muted-foreground">On-Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {performanceData.filter(p => p.status === 'early').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Early</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {performanceData.filter(p => p.status === 'delayed').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Delayed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {leadTime.expectedLeadTime} {leadTime.leadTimeUnit}
                      </div>
                      <div className="text-sm text-muted-foreground">Expected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {leadTime.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuration Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{leadTime.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance History</CardTitle>
                  <CardDescription>
                    Recent delivery performance against expected lead times
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Expected</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Variance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.map((performance) => (
                        <TableRow key={performance.id}>
                          <TableCell className="font-medium">
                            {format(new Date(performance.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {performance.expectedTime} {leadTime.leadTimeUnit}
                          </TableCell>
                          <TableCell>
                            {performance.actualTime} {leadTime.leadTimeUnit}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              {performance.variance > 0 ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                              ) : performance.variance < 0 ? (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                              ) : (
                                <Timer className="h-4 w-4 text-gray-500" />
                              )}
                              <span className={performance.variance > 0 ? 'text-red-600' : performance.variance < 0 ? 'text-green-600' : 'text-gray-600'}>
                                {performance.variance > 0 ? '+' : ''}{performance.variance} ({performance.variancePercent > 0 ? '+' : ''}{performance.variancePercent}%)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(performance.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {performance.notes}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Timeline</CardTitle>
                  <CardDescription>
                    Historical performance tracking and trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData.map((performance, index) => (
                      <div key={performance.id} className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              {format(new Date(performance.date), 'MMM dd, yyyy')}
                            </p>
                            {getStatusBadge(performance.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {performance.actualTime} {leadTime.leadTimeUnit} delivery time
                            {performance.variance !== 0 && (
                              <span className={`ml-2 ${performance.variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ({performance.variance > 0 ? '+' : ''}{performance.variance} {leadTime.leadTimeUnit} variance)
                              </span>
                            )}
                          </p>
                          {performance.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {performance.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Performance Range</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Best Performance</span>
                        <span className="font-medium text-green-600">
                          {bestPerformance} {leadTime.leadTimeUnit}
                        </span>
                      </div>
                      <Progress value={(bestPerformance / leadTime.expectedLeadTime) * 100} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Expected Time</span>
                        <span className="font-medium text-blue-600">
                          {leadTime.expectedLeadTime} {leadTime.leadTimeUnit}
                        </span>
                      </div>
                      <Progress value={100} className="h-2 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Worst Performance</span>
                        <span className="font-medium text-red-600">
                          {worstPerformance} {leadTime.leadTimeUnit}
                        </span>
                      </div>
                      <Progress value={(worstPerformance / leadTime.expectedLeadTime) * 100} className="h-2 mt-1" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Key Insights</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">
                            {Math.round((onTimeDeliveries / performanceData.length) * 100)}% on-time delivery rate
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Based on {performanceData.length} recent deliveries
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        {averageVariance > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {averageVariance >= 0 ? 'Above target' : 'Below target'} average variance
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {averageVariance >= 0 ? '+' : ''}{averageVariance.toFixed(1)} {leadTime.leadTimeUnit} on average
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <Calculator className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">
                            Buffer effectiveness
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {leadTime.varianceBuffer > 0 ? `${leadTime.varianceBuffer} ${leadTime.leadTimeUnit} buffer configured` : 'No buffer configured'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}