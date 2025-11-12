import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  DollarSign,
  Calculator,
  CreditCard,
  Smartphone,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Store,
  Eye,
  Edit,
  Trash2,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  PiggyBank
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
interface POSShift {
  id: string
  tenantId: string
  locationId: string
  deviceId?: string
  openedBy: string
  openedAt: string
  closedBy?: string
  closedAt?: string
  floatAmount: string
  expectedCash?: string
  actualCash?: string
  variance?: string
  location: {
    id: string
    name: string
  }
}

interface DrawerMovement {
  id: string
  shiftId: string
  kind: 'cash_in' | 'cash_out' | 'paid_out' | 'drop'
  amount: string
  reason: string
  createdBy: string
  createdAt: string
}

interface Location {
  id: string
  name: string
  code: string
  type: string
  isActive: boolean
}

// API service functions
const API_BASE_URL = 'http://localhost:3001/api/v1'

async function fetchPOSShifts(params?: { locationId?: string; status?: string }): Promise<POSShift[]> {
  const queryParams = new URLSearchParams()
  if (params?.locationId) queryParams.append('locationId', params.locationId)
  if (params?.status) queryParams.append('status', params.status)

  const response = await fetch(`${API_BASE_URL}/pos/shifts?${queryParams}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch POS shifts')
  }

  const data = await response.json()
  return data.data || []
}

async function fetchPOSShift(id: string): Promise<POSShift> {
  const response = await fetch(`${API_BASE_URL}/pos/shifts/${id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch POS shift')
  }

  const data = await response.json()
  return data.data
}

async function openShift(shiftData: Partial<POSShift>): Promise<POSShift> {
  const response = await fetch(`${API_BASE_URL}/pos/shifts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(shiftData),
  })

  if (!response.ok) {
    throw new Error('Failed to open shift')
  }

  const data = await response.json()
  return data.data
}

async function closeShift(id: string, closeData: { actualCash: string; notes?: string }): Promise<POSShift> {
  const response = await fetch(`${API_BASE_URL}/pos/shifts/${id}/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(closeData),
  })

  if (!response.ok) {
    throw new Error('Failed to close shift')
  }

  const data = await response.json()
  return data.data
}

async function fetchDrawerMovements(shiftId: string): Promise<DrawerMovement[]> {
  const response = await fetch(`${API_BASE_URL}/pos/shifts/${shiftId}/movements`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch drawer movements')
  }

  const data = await response.json()
  return data.data || []
}

async function addDrawerMovement(shiftId: string, movementData: Partial<DrawerMovement>): Promise<DrawerMovement> {
  const response = await fetch(`${API_BASE_URL}/pos/shifts/${shiftId}/movements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(movementData),
  })

  if (!response.ok) {
    throw new Error('Failed to add drawer movement')
  }

  const data = await response.json()
  return data.data
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch(`${API_BASE_URL}/locations`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch locations')
  }

  const data = await response.json()
  return data.data || []
}

// Mock data for development
const mockLocations: Location[] = [
  {
    id: '1',
    name: 'Downtown Cafe',
    code: 'DT-001',
    type: 'cafe',
    isActive: true,
  },
  {
    id: '2',
    name: 'Airport Kiosk',
    code: 'AP-001',
    type: 'kiosk',
    isActive: true,
  },
  {
    id: '3',
    name: 'Central Kitchen',
    code: 'CK-001',
    type: 'warehouse',
    isActive: true,
  },
]

const mockPOSShifts: POSShift[] = [
  {
    id: '1',
    tenantId: 'tenant-1',
    locationId: '1',
    deviceId: 'POS-001',
    openedBy: 'user-1',
    openedAt: '2024-11-08T08:00:00Z',
    floatAmount: '200.00',
    expectedCash: '1250.50',
    actualCash: '1248.00',
    variance: '-2.50',
    location: {
      id: '1',
      name: 'Downtown Cafe',
    },
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    locationId: '2',
    deviceId: 'POS-002',
    openedBy: 'user-2',
    openedAt: '2024-11-08T09:30:00Z',
    closedBy: 'user-2',
    closedAt: '2024-11-08T17:30:00Z',
    floatAmount: '150.00',
    expectedCash: '890.25',
    actualCash: '890.25',
    variance: '0.00',
    location: {
      id: '2',
      name: 'Airport Kiosk',
    },
  },
]

const mockDrawerMovements: DrawerMovement[] = [
  {
    id: '1',
    shiftId: '1',
    kind: 'cash_in',
    amount: '50.00',
    reason: 'Additional float from safe',
    createdBy: 'user-1',
    createdAt: '2024-11-08T10:15:00Z',
  },
  {
    id: '2',
    shiftId: '1',
    kind: 'paid_out',
    amount: '25.00',
    reason: 'Office supplies purchase',
    createdBy: 'user-1',
    createdAt: '2024-11-08T14:30:00Z',
  },
]

function ShiftForm({ shift, onClose }: { shift?: POSShift; onClose: () => void }) {
  const [formData, setFormData] = useState({
    locationId: shift?.locationId || '',
    deviceId: shift?.deviceId || '',
    floatAmount: shift?.floatAmount || '200.00',
  })

  const queryClient = useQueryClient()
  const openMutation = useMutation({
    mutationFn: openShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posShifts'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to open shift:', error)
    },
  })

  // Fetch data for dropdowns with fallback to mock data
  const { data: locations = mockLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const result = await fetchLocations()
        return result.length > 0 ? result : mockLocations
      } catch (error) {
        console.log('API unavailable, using mock data')
        return mockLocations
      }
    },
    retry: false,
  })

  const handleSubmit = () => {
    if (!formData.locationId) return

    openMutation.mutate(formData)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Location *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            disabled={!!shift?.closedAt}
          >
            <option value="">Select location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Device ID</label>
          <Input
            value={formData.deviceId}
            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
            placeholder="e.g., POS-001"
            disabled={!!shift?.closedAt}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Starting Float Amount *</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formData.floatAmount}
          onChange={(e) => setFormData({ ...formData, floatAmount: e.target.value })}
          placeholder="200.00"
          disabled={!!shift?.closedAt}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={openMutation.isPending || !formData.locationId}
        >
          {openMutation.isPending ? 'Opening...' : 'Open Shift'}
        </Button>
      </div>
    </div>
  )
}

function CloseShiftForm({ shift, onClose }: { shift: POSShift; onClose: () => void }) {
  const [formData, setFormData] = useState({
    actualCash: '',
    notes: '',
  })

  const queryClient = useQueryClient()
  const closeMutation = useMutation({
    mutationFn: (data: { actualCash: string; notes?: string }) =>
      closeShift(shift.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posShifts'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to close shift:', error)
    },
  })

  const handleSubmit = () => {
    if (!formData.actualCash) return

    closeMutation.mutate(formData)
  }

  const expectedVariance = formData.actualCash
    ? (parseFloat(formData.actualCash) - parseFloat(shift.expectedCash || '0')).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Starting Float:</span>
          <span className="font-medium">${parseFloat(shift.floatAmount).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Expected Cash:</span>
          <span className="font-medium">${parseFloat(shift.expectedCash || '0').toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Actual Cash Count *</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formData.actualCash}
          onChange={(e) => setFormData({ ...formData, actualCash: e.target.value })}
          placeholder="0.00"
        />
      </div>

      {formData.actualCash && (
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Variance:</span>
            <span className={`font-bold ${parseFloat(expectedVariance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${expectedVariance}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Notes</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any notes about the shift closing..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={closeMutation.isPending || !formData.actualCash}
        >
          {closeMutation.isPending ? 'Closing...' : 'Close Shift'}
        </Button>
      </div>
    </div>
  )
}

function DrawerMovementForm({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const [formData, setFormData] = useState({
    kind: 'cash_in' as const,
    amount: '',
    reason: '',
  })

  const queryClient = useQueryClient()
  const addMovementMutation = useMutation({
    mutationFn: (movementData: Partial<DrawerMovement>) =>
      addDrawerMovement(shiftId, movementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawerMovements', shiftId] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to add drawer movement:', error)
    },
  })

  const handleSubmit = () => {
    if (!formData.amount || !formData.reason) return

    addMovementMutation.mutate(formData)
  }

  const movementTypes = [
    { value: 'cash_in', label: 'Cash In', icon: ArrowDownRight, color: 'text-green-600' },
    { value: 'cash_out', label: 'Cash Out', icon: ArrowUpRight, color: 'text-red-600' },
    { value: 'paid_out', label: 'Paid Out', icon: Wallet, color: 'text-orange-600' },
    { value: 'drop', label: 'Safe Drop', icon: PiggyBank, color: 'text-blue-600' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Movement Type *</label>
        <div className="grid grid-cols-2 gap-2">
          {movementTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, kind: type.value as any })}
                className={`p-3 border rounded-md flex flex-col items-center space-y-1 transition-colors ${
                  formData.kind === type.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${type.color}`} />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Amount *</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reason *</label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Enter reason for this movement..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={addMovementMutation.isPending || !formData.amount || !formData.reason}
        >
          {addMovementMutation.isPending ? 'Adding...' : 'Add Movement'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/pos/')({
  component: POSIndex,
})

function POSIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedShift, setSelectedShift] = useState<POSShift | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCloseOpen, setIsCloseOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isMovementOpen, setIsMovementOpen] = useState(false)

  // Fetch data using React Query with fallback to mock data
  const { data: shifts = mockPOSShifts, isLoading, error } = useQuery({
    queryKey: ['posShifts', { locationId: selectedLocation !== 'all' ? selectedLocation : undefined, status: selectedStatus }],
    queryFn: async () => {
      try {
        const result = await fetchPOSShifts({
          locationId: selectedLocation !== 'all' ? selectedLocation : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
        })
        return result.length > 0 ? result : mockPOSShifts
      } catch (error) {
        console.log('API unavailable, using mock data')
        return mockPOSShifts
      }
    },
    retry: false,
  })

  const { data: locations = mockLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const result = await fetchLocations()
        return result.length > 0 ? result : mockLocations
      } catch (error) {
        console.log('API unavailable, using mock data')
        return mockLocations
      }
    },
    retry: false,
  })

  const { data: movements = mockDrawerMovements } = useQuery({
    queryKey: ['drawerMovements', selectedShift?.id],
    queryFn: async () => {
      if (!selectedShift?.id) return []
      try {
        const result = await fetchDrawerMovements(selectedShift.id)
        return result.length > 0 ? result : mockDrawerMovements
      } catch (error) {
        console.log('API unavailable, using mock data')
        return mockDrawerMovements
      }
    },
    enabled: !!selectedShift?.id,
    retry: false,
  })

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch =
      shift.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shift.deviceId || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLocation = selectedLocation === 'all' || shift.locationId === selectedLocation
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'open' && !shift.closedAt) ||
      (selectedStatus === 'closed' && shift.closedAt)

    return matchesSearch && matchesLocation && matchesStatus
  })

  const getStatusBadge = (shift: POSShift) => {
    if (shift.closedAt) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Closed
        </Badge>
      )
    } else {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Open
        </Badge>
      )
    }
  }

  const getVarianceBadge = (variance?: string) => {
    if (!variance) return null

    const varianceValue = parseFloat(variance)
    if (varianceValue === 0) {
      return <span className="text-green-600 font-medium">$0.00</span>
    } else if (varianceValue > 0) {
      return <span className="text-blue-600 font-medium">+${varianceValue.toFixed(2)}</span>
    } else {
      return <span className="text-red-600 font-medium">-${Math.abs(varianceValue).toFixed(2)}</span>
    }
  }

  const getMovementBadge = (kind: string) => {
    const variants = {
      cash_in: { variant: 'default' as const, label: 'Cash In', color: 'text-green-600' },
      cash_out: { variant: 'destructive' as const, label: 'Cash Out', color: 'text-red-600' },
      paid_out: { variant: 'secondary' as const, label: 'Paid Out', color: 'text-orange-600' },
      drop: { variant: 'outline' as const, label: 'Safe Drop', color: 'text-blue-600' },
    }

    const config = variants[kind as keyof typeof variants] || variants.cash_in
    return <Badge variant={config.variant} className={config.color}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = {
    total: shifts.length,
    open: shifts.filter(s => !s.closedAt).length,
    closed: shifts.filter(s => s.closedAt).length,
    totalVariance: shifts
      .filter(s => s.variance)
      .reduce((sum, s) => sum + parseFloat(s.variance || '0'), 0),
  }

  // Note: Errors are handled gracefully with fallback to mock data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">POS Operations</h1>
          <p className="text-muted-foreground">Manage POS shifts, cash drawers, and transactions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Open Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Open New POS Shift</DialogTitle>
            </DialogHeader>
            <ShiftForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalVariance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${Math.abs(stats.totalVariance).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search shifts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-md"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>POS Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Float</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                        <Calculator className="w-8 h-8" />
                        <span>No POS shifts found</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{shift.location.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{shift.deviceId || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(shift)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(shift.openedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {shift.closedAt ? formatDate(shift.closedAt) : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${parseFloat(shift.floatAmount).toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${parseFloat(shift.expectedCash || '0').toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${parseFloat(shift.actualCash || '0').toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        {getVarianceBadge(shift.variance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedShift(shift)
                              setIsViewOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!shift.closedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedShift(shift)
                                setIsCloseOpen(true)
                              }}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {!shift.closedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedShift(shift)
                                setIsMovementOpen(true)
                              }}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Shift Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shift Details</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-medium">{selectedShift.location.name}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Device</div>
                    <div className="font-medium">{selectedShift.deviceId || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div>{getStatusBadge(selectedShift)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Duration</div>
                    <div className="font-medium">
                      {selectedShift.closedAt
                        ? `${Math.round((new Date(selectedShift.closedAt).getTime() - new Date(selectedShift.openedAt).getTime()) / (1000 * 60 * 60))}h`
                        : 'Open'
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Starting Float</div>
                    <div className="text-lg font-bold">${parseFloat(selectedShift.floatAmount).toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Expected Cash</div>
                    <div className="text-lg font-bold">${parseFloat(selectedShift.expectedCash || '0').toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Actual Cash</div>
                    <div className="text-lg font-bold">${parseFloat(selectedShift.actualCash || '0').toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Variance</div>
                    <div className="text-lg font-bold">
                      {getVarianceBadge(selectedShift.variance)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Drawer Movements</CardTitle>
                </CardHeader>
                <CardContent>
                  {movements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No drawer movements recorded
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(movements.length > 0 ? movements : mockDrawerMovements).map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>{getMovementBadge(movement.kind)}</TableCell>
                            <TableCell>
                              <span className="font-medium">${parseFloat(movement.amount).toFixed(2)}</span>
                            </TableCell>
                            <TableCell>{movement.reason}</TableCell>
                            <TableCell>{formatDate(movement.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <CloseShiftForm
              shift={selectedShift}
              onClose={() => setIsCloseOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Drawer Movement</DialogTitle>
          </DialogHeader>
          {selectedShift && (
            <DrawerMovementForm
              shiftId={selectedShift.id}
              onClose={() => setIsMovementOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}