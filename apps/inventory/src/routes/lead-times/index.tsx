import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search, Clock, TrendingUp, TrendingDown, Edit, Trash2, BarChart3, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import LeadTimeForm from '@/components/lead-times/LeadTimeForm'
import LeadTimeDetailDrawer from '@/components/lead-times/LeadTimeDetailDrawer'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// Types
interface LeadTime {
  id: string
  itemType: 'product' | 'supplier' | 'category'
  itemId: string
  itemName: string
  itemCode: string
  itemTypeCode: string // For suppliers: SUP-001, for categories: PRODUCE
  leadTimeDays: number
  variabilityDays: number
  averageDays: number
  lastUpdated: string
  performanceHistory: {
    date: string
    actualDays: number
    onTime: boolean
    orderReference: string
  }[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Mock data
const mockLeadTimes: LeadTime[] = [
  {
    id: '1',
    itemType: 'supplier',
    itemId: '1',
    itemName: 'Fresh Produce Co.',
    itemCode: 'SUP-001',
    itemTypeCode: 'SUP-001',
    leadTimeDays: 2,
    variabilityDays: 1,
    averageDays: 2.1,
    lastUpdated: '2024-01-18',
    performanceHistory: [
      { date: '2024-01-18', actualDays: 2, onTime: true, orderReference: 'GR-2024-0189' },
      { date: '2024-01-15', actualDays: 3, onTime: false, orderReference: 'GR-2024-0176' },
      { date: '2024-01-12', actualDays: 2, onTime: true, orderReference: 'GR-2024-0165' },
      { date: '2024-01-08', actualDays: 2, onTime: true, orderReference: 'GR-2024-0152' },
      { date: '2024-01-05', actualDays: 1, onTime: true, orderReference: 'GR-2024-0145' },
    ],
    isActive: true,
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: '2',
    itemType: 'supplier',
    itemId: '2',
    itemName: 'Dairy Farmers Supply',
    itemCode: 'SUP-002',
    itemTypeCode: 'SUP-002',
    leadTimeDays: 1,
    variabilityDays: 0,
    averageDays: 1.2,
    lastUpdated: '2024-01-17',
    performanceHistory: [
      { date: '2024-01-17', actualDays: 1, onTime: true, orderReference: 'GR-2024-0176' },
      { date: '2024-01-14', actualDays: 1, onTime: true, orderReference: 'GR-2024-0168' },
      { date: '2024-01-11', actualDays: 2, onTime: false, orderReference: 'GR-2024-0161' },
      { date: '2024-01-08', actualDays: 1, onTime: true, orderReference: 'GR-2024-0154' },
    ],
    isActive: true,
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-17T16:45:00Z'
  },
  {
    id: '3',
    itemType: 'supplier',
    itemId: '3',
    itemName: 'Meat & Poultry Wholesale',
    itemCode: 'SUP-003',
    itemTypeCode: 'SUP-003',
    leadTimeDays: 3,
    variabilityDays: 2,
    averageDays: 3.4,
    lastUpdated: '2024-01-10',
    performanceHistory: [
      { date: '2024-01-10', actualDays: 5, onTime: false, orderReference: 'GR-2024-0165' },
      { date: '2024-01-07', actualDays: 3, onTime: true, orderReference: 'GR-2024-0158' },
      { date: '2024-01-04', actualDays: 2, onTime: true, orderReference: 'GR-2024-0151' },
    ],
    isActive: true,
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-10T11:20:00Z'
  },
  {
    id: '4',
    itemType: 'product',
    itemId: 'PROD-001',
    itemName: 'Organic Tomatoes',
    itemCode: 'TOM-ORG-001',
    itemTypeCode: 'VEG',
    leadTimeDays: 1,
    variabilityDays: 0,
    averageDays: 1.0,
    lastUpdated: '2024-01-18',
    performanceHistory: [
      { date: '2024-01-18', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0042' },
      { date: '2024-01-16', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0038' },
      { date: '2024-01-14', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0034' },
    ],
    isActive: true,
    createdBy: 'john.doe',
    createdAt: '2023-06-10T14:30:00Z',
    updatedAt: '2024-01-18T12:15:00Z'
  },
  {
    id: '5',
    itemType: 'product',
    itemId: 'PROD-015',
    itemName: 'Fresh Lettuce',
    itemCode: 'LET-ICE-015',
    itemTypeCode: 'VEG',
    leadTimeDays: 1,
    variabilityDays: 0,
    averageDays: 0.9,
    lastUpdated: '2024-01-15',
    performanceHistory: [
      { date: '2024-01-15', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0035' },
      { date: '2024-01-13', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0031' },
      { date: '2024-01-11', actualDays: 1, onTime: true, orderReference: 'PROD-2024-0027' },
    ],
    isActive: true,
    createdBy: 'john.doe',
    createdAt: '2023-06-10T14:30:00Z',
    updatedAt: '2024-01-15T10:45:00Z'
  },
  {
    id: '6',
    itemType: 'category',
    itemId: '1',
    itemName: 'Produce',
    itemCode: 'PRODUCE',
    itemTypeCode: 'PRODUCE',
    leadTimeDays: 2,
    variabilityDays: 1,
    averageDays: 2.3,
    lastUpdated: '2024-01-16',
    performanceHistory: [
      { date: '2024-01-16', actualDays: 3, onTime: false, orderReference: 'GR-2024-0169' },
      { date: '2024-01-13', actualDays: 2, onTime: true, orderReference: 'GR-2024-0162' },
      { date: '2024-01-10', actualDays: 2, onTime: true, orderReference: 'GR-2024-0155' },
    ],
    isActive: true,
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-16T09:20:00Z'
  },
  {
    id: '7',
    itemType: 'category',
    itemId: '4',
    itemName: 'Dairy',
    itemCode: 'DAIRY',
    itemTypeCode: 'DAIRY',
    leadTimeDays: 1,
    variabilityDays: 1,
    averageDays: 1.1,
    lastUpdated: '2024-01-17',
    performanceHistory: [
      { date: '2024-01-17', actualDays: 1, onTime: true, orderReference: 'GR-2024-0176' },
      { date: '2024-01-14', actualDays: 2, onTime: false, orderReference: 'GR-2024-0168' },
      { date: '2024-01-11', actualDays: 1, onTime: true, orderReference: 'GR-2024-0161' },
    ],
    isActive: true,
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-17T14:20:00Z'
  },
  {
    id: '8',
    itemType: 'product',
    itemId: 'PROD-045',
    itemName: 'Baby Carrots',
    itemCode: 'CAR-BAB-045',
    itemTypeCode: 'VEG',
    leadTimeDays: 3,
    variabilityDays: 1,
    averageDays: 3.2,
    lastUpdated: '2024-01-12',
    performanceHistory: [
      { date: '2024-01-12', actualDays: 3, onTime: true, orderReference: 'PROD-2024-0025' },
      { date: '2024-01-09', actualDays: 4, onTime: false, orderReference: 'PROD-2024-0019' },
    ],
    isActive: false,
    createdBy: 'jane.smith',
    createdAt: '2023-08-15T11:45:00Z',
    updatedAt: '2024-01-12T08:30:00Z'
  }
]

export const Route = createFileRoute('/lead-times/')({
  component: LeadTimesComponent,
})

function LeadTimesComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLeadTime, setSelectedLeadTime] = useState<LeadTime | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingLeadTime, setEditingLeadTime] = useState<LeadTime | null>(null)

  // Mock API call
  const { data: leadTimes = [], isLoading } = useQuery({
    queryKey: ['lead-times', { searchTerm, itemTypeFilter, statusFilter }],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      let filtered = mockLeadTimes

      if (searchTerm) {
        filtered = filtered.filter(lt =>
          lt.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lt.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lt.itemTypeCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (itemTypeFilter !== 'all') {
        filtered = filtered.filter(lt => lt.itemType === itemTypeFilter)
      }

      if (statusFilter === 'active') {
        filtered = filtered.filter(lt => lt.isActive)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(lt => !lt.isActive)
      }

      return filtered
    }
  })

  const getItemTypeLabel = (itemType: string) => {
    const labels = {
      product: 'Product',
      supplier: 'Supplier',
      category: 'Category'
    }
    return labels[itemType as keyof typeof labels] || itemType
  }

  const getItemTypeBadge = (itemType: string) => {
    const colors = {
      product: 'bg-blue-100 text-blue-800',
      supplier: 'bg-green-100 text-green-800',
      category: 'bg-purple-100 text-purple-800'
    }

    return (
      <Badge variant="outline" className={colors[itemType as keyof typeof colors]}>
        {getItemTypeLabel(itemType)}
      </Badge>
    )
  }

  const getPerformanceColor = (actualDays: number, expectedDays: number, variability: number) => {
    const threshold = expectedDays + variability
    if (actualDays <= threshold) return 'text-green-600'
    if (actualDays <= threshold + variability) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceIcon = (actualDays: number, expectedDays: number, variability: number) => {
    const threshold = expectedDays + variability
    if (actualDays <= threshold) return <TrendingUp className="h-4 w-4" />
    if (actualDays <= threshold + variability) return <TrendingDown className="h-4 w-4" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const handleEdit = (leadTime: LeadTime) => {
    setEditingLeadTime(leadTime)
    setShowForm(true)
  }

  const handleDelete = (leadTime: LeadTime) => {
    if (confirm(`Are you sure you want to delete the lead time for ${leadTime.itemName}? This action cannot be undone.`)) {
      console.log('Delete lead time:', leadTime.id)
    }
  }

  const handleToggleActive = (leadTime: LeadTime) => {
    console.log('Toggle lead time active:', leadTime.id, !leadTime.isActive)
  }

  const handleFormSubmit = (data: any) => {
    console.log('Lead time data:', data)
    setShowForm(false)
    setEditingLeadTime(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const stats = {
    total: leadTimes.length,
    active: leadTimes.filter(lt => lt.isActive).length,
    suppliers: leadTimes.filter(lt => lt.itemType === 'supplier').length,
    products: leadTimes.filter(lt => lt.itemType === 'product').length,
    categories: leadTimes.filter(lt => lt.itemType === 'category').length,
    avgLeadTime: leadTimes.length > 0 ? (leadTimes.reduce((acc, lt) => acc + lt.averageDays, 0) / leadTimes.length).toFixed(1) : '0.0'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Times</h1>
          <p className="text-muted-foreground">Manage lead time tracking and performance metrics</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Lead Time</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lead Times</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Configured lead times</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text font-medium">Active</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{((stats.active / stats.total) * 100).toFixed(0)}% active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgLeadTime} days</div>
            <p className="text-xs text-muted-foreground">Average duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(() => {
                const recentPerformance = leadTimes
                  .filter(lt => lt.performanceHistory.length > 0)
                  .slice(-5)
                  .reduce((sum, lt) => {
                    const latest = lt.performanceHistory[lt.performanceHistory.length - 1]
                    return sum + (latest.onTime ? 1 : 0)
                  }, 0) / Math.min(5, leadTimes.filter(lt => lt.performanceHistory.length > 0).length)
                return Math.round((recentPerformance || 0) * 100)
              })()}%
            </div>
            <p className="text-xs text-muted-foreground">On-time rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search lead times..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="product">Products</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
            <SelectItem value="category">Categories</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead Times Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Time Records</CardTitle>
          <CardDescription>
            Lead time tracking for suppliers, products, and categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leadTimes.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No lead times found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || itemTypeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first lead time record'}
              </p>
              {!searchTerm && itemTypeFilter === 'all' && statusFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead Time
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Average</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadTimes.map((leadTime) => (
                  <TableRow
                    key={leadTime.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLeadTime(leadTime)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{leadTime.itemName}</div>
                        <div className="text-sm text-muted-foreground">{leadTime.itemCode}</div>
                        <div className="text-xs text-muted-foreground">{leadTime.itemTypeCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getItemTypeBadge(leadTime.itemType)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{leadTime.leadTimeDays} days</div>
                        <div className="text-xs text-muted-foreground">±{leadTime.variabilityDays} days</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{leadTime.averageDays.toFixed(1)} days</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 ${getPerformanceColor(
                          leadTime.performanceHistory[leadTime.performanceHistory.length - 1]?.actualDays || 0,
                          leadTime.leadTimeDays,
                          leadTime.variabilityDays
                        )}`}>
                          {getPerformanceIcon(
                            leadTime.performanceHistory[leadTime.performanceHistory.length - 1]?.actualDays || 0,
                            leadTime.leadTimeDays,
                            leadTime.variabilityDays
                          )}
                          <span className="text-sm">
                            {leadTime.performanceHistory[leadTime.performanceHistory.length - 1]?.actualDays || 0}d
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={leadTime.isActive ? 'default' : 'secondary'}>
                          {leadTime.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLeadTime(leadTime)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(leadTime)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Lead Time
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(leadTime)
                            }}
                          >
                            {leadTime.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(leadTime)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lead Time
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <LeadTimeDetailDrawer
        leadTime={selectedLeadTime}
        open={!!selectedLeadTime}
        onOpenChange={(open) => !open && setSelectedLeadTime(null)}
      />

      {/* Lead Time Form */}
      <LeadTimeForm
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingLeadTime || undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}