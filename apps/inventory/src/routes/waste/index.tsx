import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, AlertTriangle, Eye, Edit, Trash2, Package, Calendar, DollarSign, User, TrendingDown, Filter, Download, BarChart3, Info } from 'lucide-react'

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types
interface WasteRecord {
  id: string
  recordNumber: string
  locationId: string
  location: {
    id: string
    name: string
    code: string
    type: string
  }
  recordDate: string
  reportedBy: string
  approvedBy?: string
  status: 'draft' | 'submitted' | 'approved' | 'disposed'
  priority: 'low' | 'medium' | 'high'
  totalValue: number
  currency: string
  items: {
    id: string
    productId: string
    product: {
      id: string
      name: string
      code: string
      unit: string
      category: string
    }
    batchNumber?: string
    expiryDate?: string
    quantity: number
    unitCost: number
    totalValue: number
    wasteReason: string
    wasteCategory: 'expired' | 'damaged' | 'spoiled' | 'contaminated' | 'overproduced' | 'quality_issue' | 'other'
    disposalMethod: 'landfill' | 'recycling' | 'composting' | 'donation' | 'incineration' | 'other'
    notes?: string
  }[]
  summary: string
  correctiveActions?: string[]
  preventionMeasures?: string[]
  attachments: string[]
  createdAt: string
  updatedAt: string
}

interface Location {
  id: string
  name: string
  code: string
  type: string
  address: string
  status: string
}

interface Product {
  id: string
  name: string
  code: string
  description: string
  unit: string
  category: string
  currentStock: number
  unitCost: number
  location: {
    id: string
    name: string
  }
}

interface WasteAnalytics {
  totalWasteValue: number
  totalWasteQuantity: number
  wasteByCategory: Record<string, { quantity: number; value: number; percentage: number }>
  wasteByLocation: Record<string, { quantity: number; value: number; records: number }>
  topWasteProducts: Array<{ productId: string; productName: string; quantity: number; value: number }>
  monthlyTrend: Array<{ month: string; quantity: number; value: number }>
  commonReasons: Array<{ reason: string; count: number; percentage: number }>
}

// API service functions
const API_BASE_URL = 'http://localhost:3001/api/v1'

async function fetchWasteRecords(): Promise<WasteRecord[]> {
  const response = await fetch(`${API_BASE_URL}/waste`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch waste records')
  }

  const data = await response.json()
  return data.data || []
}

async function createWasteRecord(recordData: Partial<WasteRecord>): Promise<WasteRecord> {
  const response = await fetch(`${API_BASE_URL}/waste`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recordData),
  })

  if (!response.ok) {
    throw new Error('Failed to create waste record')
  }

  const data = await response.json()
  return data.data
}

async function updateWasteRecord(id: string, recordData: Partial<WasteRecord>): Promise<WasteRecord> {
  const response = await fetch(`${API_BASE_URL}/waste/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(recordData),
  })

  if (!response.ok) {
    throw new Error('Failed to update waste record')
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

async function fetchProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }

  const data = await response.json()
  return data.data || []
}

async function fetchWasteAnalytics(): Promise<WasteAnalytics> {
  const response = await fetch(`${API_BASE_URL}/waste/analytics`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch waste analytics')
  }

  const data = await response.json()
  return data.data
}

// Mock data for development - will be replaced with real API
const mockWasteRecords: WasteRecord[] = [
  {
    id: '1',
    recordNumber: 'WR-2024-001',
    locationId: '1',
    location: {
      id: '1',
      name: 'Central Kitchen - Main',
      code: 'CK-001',
      type: 'central-kitchen',
    },
    recordDate: '2024-11-08',
    reportedBy: 'John Smith',
    approvedBy: 'Sarah Johnson',
    status: 'approved',
    priority: 'high',
    totalValue: 1250.00,
    currency: 'IDR',
    items: [
      {
        id: '1',
        productId: '1',
        product: {
          id: '1',
          name: 'Arabica Coffee Beans',
          code: 'CF-001',
          unit: 'kg',
          category: 'Raw Materials',
        },
        batchNumber: 'BATCH-2024-11-01',
        expiryDate: '2024-11-05',
        quantity: 25,
        unitCost: 12.50,
        totalValue: 312.50,
        wasteReason: 'Expired past use-by date',
        wasteCategory: 'expired',
        disposalMethod: 'landfill',
        notes: 'Quality control failed expiration check',
      },
      {
        id: '2',
        productId: '2',
        product: {
          id: '2',
          name: 'Whole Milk',
          code: 'DY-001',
          unit: 'liters',
          category: 'Dairy',
        },
        batchNumber: 'BATCH-2024-11-06',
        expiryDate: '2024-11-07',
        quantity: 50,
        unitCost: 2.25,
        totalValue: 112.50,
        wasteReason: 'Spoiled due to temperature control failure',
        wasteCategory: 'spoiled',
        disposalMethod: 'landfill',
        notes: 'Refrigeration unit malfunction overnight',
      },
      {
        id: '3',
        productId: '3',
        product: {
          id: '3',
          name: 'Fresh Croissants',
          code: 'BK-001',
          unit: 'pieces',
          category: 'Bakery',
        },
        quantity: 120,
        unitCost: 1.50,
        totalValue: 180.00,
        wasteReason: 'Overproduction - unsold end of day',
        wasteCategory: 'overproduced',
        disposalMethod: 'donation',
        notes: 'Donated to local food bank',
      },
    ],
    summary: 'Multiple waste incidents including expired raw materials and spoiled dairy products due to equipment failure',
    correctiveActions: [
      'Repaired refrigeration unit CK-FR-001',
      'Updated expiration tracking system',
      'Implemented daily production planning review',
    ],
    preventionMeasures: [
      'Install temperature monitoring alerts',
      'Review production forecasting methods',
      'Implement just-in-time inventory for perishables',
    ],
    attachments: ['incident_report.pdf', 'temperature_logs.pdf', 'donation_receipt.pdf'],
    createdAt: '2024-11-08T09:00:00Z',
    updatedAt: '2024-11-08T14:30:00Z',
  },
  {
    id: '2',
    recordNumber: 'WR-2024-002',
    locationId: '2',
    location: {
      id: '2',
      name: 'Downtown Cafe - Branch 1',
      code: 'DC-001',
      type: 'cafe',
    },
    recordDate: '2024-11-07',
    reportedBy: 'Mike Wilson',
    approvedBy: undefined,
    status: 'submitted',
    priority: 'medium',
    totalValue: 450.00,
    currency: 'IDR',
    items: [
      {
        id: '4',
        productId: '4',
        product: {
          id: '4',
          name: 'Chocolate Chip Cookies',
          code: 'BK-002',
          unit: 'pieces',
          category: 'Bakery',
        },
        quantity: 60,
        unitCost: 1.25,
        totalValue: 75.00,
        wasteReason: 'Quality issue - burned during baking',
        wasteCategory: 'quality_issue',
        disposalMethod: 'landfill',
        notes: 'New oven calibration required',
      },
      {
        id: '5',
        productId: '5',
        product: {
          id: '5',
          name: 'Paper Cups',
          code: 'PK-001',
          unit: 'pieces',
          category: 'Packaging',
        },
        quantity: 500,
        unitCost: 0.15,
        totalValue: 75.00,
        wasteReason: 'Water damaged in storage',
        wasteCategory: 'damaged',
        disposalMethod: 'recycling',
        notes: 'Roof leak in storage area',
      },
    ],
    summary: 'Quality control failures and storage damage leading to product waste',
    correctiveActions: [
      'Oven maintenance scheduled',
      'Temporary storage relocation',
    ],
    preventionMeasures: [
      'Regular oven calibration checks',
      'Storage area maintenance schedule',
    ],
    attachments: ['quality_failure_report.pdf'],
    createdAt: '2024-11-07T16:00:00Z',
    updatedAt: '2024-11-07T16:30:00Z',
  },
]

function WasteRecordForm({ wasteRecord, onClose }: { wasteRecord?: WasteRecord; onClose: () => void }) {
  const [formData, setFormData] = useState({
    locationId: wasteRecord?.locationId || '',
    recordDate: wasteRecord?.recordDate || new Date().toISOString().split('T')[0],
    reportedBy: wasteRecord?.reportedBy || '',
    priority: wasteRecord?.priority || 'medium',
    summary: wasteRecord?.summary || '',
    correctiveActions: wasteRecord?.correctiveActions || [''],
    preventionMeasures: wasteRecord?.preventionMeasures || [''],
    items: wasteRecord?.items || [{
      productId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: 0,
      unitCost: 0,
      wasteReason: '',
      wasteCategory: 'expired' as const,
      disposalMethod: 'landfill' as const,
      notes: '',
    }],
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createWasteRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteRecords'] })
      queryClient.invalidateQueries({ queryKey: ['wasteAnalytics'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to create waste record:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; recordData: Partial<WasteRecord> }) =>
      updateWasteRecord(data.id, data.recordData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wasteRecords'] })
      queryClient.invalidateQueries({ queryKey: ['wasteAnalytics'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to update waste record:', error)
    },
  })

  // Fetch data for dropdowns
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: '',
        batchNumber: '',
        expiryDate: '',
        quantity: 0,
        unitCost: 0,
        wasteReason: '',
        wasteCategory: 'expired' as const,
        disposalMethod: 'landfill' as const,
        notes: '',
      }]
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Auto-calculate total when quantity or unit cost changes
    if (field === 'quantity' || field === 'unitCost') {
      newItems[index].totalValue = (newItems[index].quantity || 0) * (newItems[index].unitCost || 0)
    }

    // Auto-fill unit cost when product is selected
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unitCost = product.unitCost
        newItems[index].totalValue = (newItems[index].quantity || 0) * product.unitCost
      }
    }

    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.totalValue || 0), 0)
  }

  const handleCorrectiveActionChange = (index: number, value: string) => {
    const newActions = [...formData.correctiveActions]
    newActions[index] = value
    setFormData({ ...formData, correctiveActions: newActions })
  }

  const addCorrectiveAction = () => {
    setFormData({
      ...formData,
      correctiveActions: [...formData.correctiveActions, '']
    })
  }

  const removeCorrectiveAction = (index: number) => {
    const newActions = formData.correctiveActions.filter((_, i) => i !== index)
    setFormData({ ...formData, correctiveActions: newActions })
  }

  const handlePreventionMeasureChange = (index: number, value: string) => {
    const newMeasures = [...formData.preventionMeasures]
    newMeasures[index] = value
    setFormData({ ...formData, preventionMeasures: newMeasures })
  }

  const addPreventionMeasure = () => {
    setFormData({
      ...formData,
      preventionMeasures: [...formData.preventionMeasures, '']
    })
  }

  const removePreventionMeasure = (index: number) => {
    const newMeasures = formData.preventionMeasures.filter((_, i) => i !== index)
    setFormData({ ...formData, preventionMeasures: newMeasures })
  }

  const handleSubmit = () => {
    const recordData = {
      ...formData,
      totalValue: calculateTotal(),
      currency: 'IDR',
      correctiveActions: formData.correctiveActions.filter(action => action.trim() !== ''),
      preventionMeasures: formData.preventionMeasures.filter(measure => measure.trim() !== ''),
    }

    if (wasteRecord?.id) {
      updateMutation.mutate({ id: wasteRecord.id, recordData })
    } else {
      createMutation.mutate(recordData)
    }
  }

  const selectedLocation = locations.find(l => l.id === formData.locationId)

  const wasteCategories = [
    { value: 'expired', label: 'Expired' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'spoiled', label: 'Spoiled' },
    { value: 'contaminated', label: 'Contaminated' },
    { value: 'overproduced', label: 'Overproduced' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'other', label: 'Other' },
  ]

  const disposalMethods = [
    { value: 'landfill', label: 'Landfill' },
    { value: 'recycling', label: 'Recycling' },
    { value: 'composting', label: 'Composting' },
    { value: 'donation', label: 'Donation' },
    { value: 'incineration', label: 'Incineration' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Location *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.locationId}
            onChange={(e) => setFormData({...formData, locationId: e.target.value})}
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
          <label className="text-sm font-medium">Record Date *</label>
          <Input
            type="date"
            value={formData.recordDate}
            onChange={(e) => setFormData({...formData, recordDate: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.priority}
            onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reported By *</label>
        <Input
          placeholder="Enter your name"
          value={formData.reportedBy}
          onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
        />
      </div>

      {/* Location Information Display */}
      {selectedLocation && (
        <div className="bg-muted/50 p-4 rounded-md">
          <h4 className="font-medium mb-2">Location Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Type:</span> {selectedLocation.type.replace('-', ' ').charAt(0).toUpperCase() + selectedLocation.type.slice(1).replace('-', ' ')}
            </div>
            <div>
              <span className="font-medium">Address:</span> {selectedLocation.address}
            </div>
          </div>
        </div>
      )}

      {/* Waste Summary */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Waste Incident Summary *</label>
        <Textarea
          placeholder="Provide a summary of the waste incident..."
          value={formData.summary}
          onChange={(e) => setFormData({...formData, summary: e.target.value})}
          rows={2}
        />
      </div>

      {/* Waste Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Waste Items</h3>
          <Button onClick={handleAddItem} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="border rounded-md p-4 space-y-4">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="text-sm font-medium">Product *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                >
                  <option value="">Select product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Batch Number</label>
                <Input
                  placeholder="Optional"
                  value={item.batchNumber || ''}
                  onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Expiry Date</label>
                <Input
                  type="date"
                  value={item.expiryDate || ''}
                  onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  disabled={formData.items.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-2">
                <label className="text-sm font-medium">Quantity *</label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Unit Cost</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => handleItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.wasteCategory}
                  onChange={(e) => handleItemChange(index, 'wasteCategory', e.target.value)}
                >
                  {wasteCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Disposal Method *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.disposalMethod}
                  onChange={(e) => handleItemChange(index, 'disposalMethod', e.target.value)}
                >
                  {disposalMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Total Value</label>
                <Input
                  type="text"
                  value={`$${(item.totalValue || 0).toFixed(2)}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="col-span-12">
              <label className="text-sm font-medium">Waste Reason *</label>
              <Input
                placeholder="Why was this item wasted?"
                value={item.wasteReason}
                onChange={(e) => handleItemChange(index, 'wasteReason', e.target.value)}
              />
            </div>

            <div className="col-span-12">
              <label className="text-sm font-medium">Item Notes</label>
              <Textarea
                placeholder="Additional details about this waste item..."
                value={item.notes || ''}
                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Corrective Actions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Corrective Actions</h3>
          <Button onClick={addCorrectiveAction} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Action
          </Button>
        </div>

        {formData.correctiveActions.map((action, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Enter corrective action..."
              value={action}
              onChange={(e) => handleCorrectiveActionChange(index, e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCorrectiveAction(index)}
              disabled={formData.correctiveActions.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Prevention Measures */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Prevention Measures</h3>
          <Button onClick={addPreventionMeasure} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Measure
          </Button>
        </div>

        {formData.preventionMeasures.map((measure, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Enter prevention measure..."
              value={measure}
              onChange={(e) => handlePreventionMeasureChange(index, e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removePreventionMeasure(index)}
              disabled={formData.preventionMeasures.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Total Waste Value */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total Waste Value:</span>
          <span className="text-2xl font-bold text-red-600">${calculateTotal().toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
           wasteRecord ? 'Update Record' : 'Create Record'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/waste/')({
  component: WasteManagementIndex,
})

function WasteManagementIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState<WasteRecord | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Fetch data using React Query
  const { data: wasteRecords = [], isLoading, error } = useQuery({
    queryKey: ['wasteRecords'],
    queryFn: fetchWasteRecords,
  })

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['wasteAnalytics'],
    queryFn: fetchWasteAnalytics,
  })

  const filteredRecords = (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).filter(record => {
    const matchesSearch =
      record.recordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.summary.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus
    const matchesCategory = selectedCategory === 'all' ||
      record.items.some(item => item.wasteCategory === selectedCategory)

    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Draft', icon: Edit },
      submitted: { variant: 'default' as const, label: 'Submitted', icon: Clock },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      disposed: { variant: 'default' as const, label: 'Disposed', icon: Trash2 },
    }

    const config = variants[status as keyof typeof variants] || variants.draft
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  const getCategoryBadge = (category: string) => {
    const colors = {
      expired: 'bg-red-100 text-red-800',
      damaged: 'bg-orange-100 text-orange-800',
      spoiled: 'bg-purple-100 text-purple-800',
      contaminated: 'bg-red-100 text-red-800',
      overproduced: 'bg-blue-100 text-blue-800',
      quality_issue: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }

    const labels = {
      expired: 'Expired',
      damaged: 'Damaged',
      spoiled: 'Spoiled',
      contaminated: 'Contaminated',
      overproduced: 'Overproduced',
      quality_issue: 'Quality Issue',
      other: 'Other',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category as keyof typeof colors]}`}>
        {labels[category as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const stats = {
    total: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).length,
    draft: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).filter(r => r.status === 'draft').length,
    submitted: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).filter(r => r.status === 'submitted').length,
    approved: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).filter(r => r.status === 'approved').length,
    totalValue: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).reduce((sum, r) => sum + r.totalValue, 0),
    totalItems: (wasteRecords.length > 0 ? wasteRecords : mockWasteRecords).reduce((sum, r) => sum + r.items.length, 0),
  }

  const wasteCategories = [
    { value: 'all', label: 'All Categories' },
    { value: 'expired', label: 'Expired' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'spoiled', label: 'Spoiled' },
    { value: 'contaminated', label: 'Contaminated' },
    { value: 'overproduced', label: 'Overproduced' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'other', label: 'Other' },
  ]

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading waste records</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message || 'Failed to fetch waste records from the server'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Waste Management</h1>
          <p className="text-muted-foreground">Track and analyze food waste and disposal operations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Record Waste
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Waste Incident</DialogTitle>
              </DialogHeader>
              <WasteRecordForm onClose={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Waste Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800">Total Waste Value</h4>
                  <p className="text-2xl font-bold text-red-900">${analytics.totalWasteValue.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-800">Total Waste Quantity</h4>
                  <p className="text-2xl font-bold text-orange-900">{analytics.totalWasteQuantity.toLocaleString()}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800">Top Category</h4>
                  <p className="text-lg font-bold text-yellow-900 capitalize">
                    {Object.keys(analytics.wasteByCategory)[0]?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800">Records This Month</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {analytics.monthlyTrend?.slice(-1)[0]?.quantity || 0}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Analytics data not available
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Waste Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">${stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Wasted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search waste records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="disposed">Disposed</option>
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {wasteCategories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Waste Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Waste Records ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record #</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Waste Value</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.recordNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.location.name}</div>
                        <div className="text-sm text-muted-foreground">{record.location.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(record.recordDate)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>{getPriorityBadge(record.priority)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {[...new Set(record.items.map(item => item.wasteCategory))].slice(0, 2).map((category, idx) => (
                          <span key={idx} className="text-xs px-1 py-0.5 bg-muted rounded">
                            {getCategoryBadge(category)}
                          </span>
                        ))}
                        {[...new Set(record.items.map(item => item.wasteCategory))].length > 2 && (
                          <span className="text-xs px-1 py-0.5 bg-muted rounded">
                            +{[...new Set(record.items.map(item => item.wasteCategory))].length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{record.items.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <TrendingDown className="w-4 h-4 mr-1 text-red-600" />
                        <span className="font-medium text-red-600">${record.totalValue.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {record.reportedBy}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedRecord(record)
                            setIsViewOpen(true)
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedRecord(record)
                            setIsEditOpen(true)
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approve Record
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Mark as Disposed
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            View Analysis
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

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full max-w-6xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Waste Record</SheetTitle>
          </SheetHeader>
          <WasteRecordForm
            wasteRecord={selectedRecord}
            onClose={() => {
              setIsEditOpen(false)
              setSelectedRecord(null)
            }}
          />
        </SheetContent>
      </Sheet>

      {/* View Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Waste Record Details</SheetTitle>
          </SheetHeader>
          {selectedRecord && (
            <div className="space-y-6 mt-6">
              {/* Record Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedRecord.recordNumber}</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedRecord.status)}</div>
                    <div><span className="font-medium">Priority:</span> {getPriorityBadge(selectedRecord.priority)}</div>
                    <div><span className="font-medium">Created:</span> {formatDate(selectedRecord.createdAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Record Date:</span> {formatDate(selectedRecord.recordDate)}</div>
                    <div><span className="font-medium">Reported By:</span> {selectedRecord.reportedBy}</div>
                    {selectedRecord.approvedBy && (
                      <div><span className="font-medium">Approved By:</span> {selectedRecord.approvedBy}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Location Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedRecord.location.name}
                  </div>
                  <div>
                    <span className="font-medium">Code:</span> {selectedRecord.location.code}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedRecord.location.type.replace('-', ' ').charAt(0).toUpperCase() + selectedRecord.location.type.slice(1).replace('-', ' ')}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-medium mb-2">Incident Summary</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedRecord.summary}</p>
              </div>

              {/* Waste Items */}
              <div>
                <h4 className="font-medium mb-2">Waste Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Disposal</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecord.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-sm text-muted-foreground">{item.product.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.batchNumber || '-'}
                              {item.expiryDate && (
                                <div className="text-muted-foreground">Exp: {formatDate(item.expiryDate)}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.quantity} {item.product.unit}
                          </TableCell>
                          <TableCell>{getCategoryBadge(item.wasteCategory)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.wasteReason}>
                            {item.wasteReason}
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.disposalMethod.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-right">${item.totalValue.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Item Notes */}
              {selectedRecord.items.some(item => item.notes) && (
                <div>
                  <h4 className="font-medium mb-2">Item Notes</h4>
                  <div className="space-y-2">
                    {selectedRecord.items.filter(item => item.notes).map((item, index) => (
                      <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                        <strong>{item.product.name}:</strong> {item.notes}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total Waste Value:</span>
                  <span className="text-2xl font-bold text-red-600">${selectedRecord.totalValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Corrective Actions */}
              {selectedRecord.correctiveActions && selectedRecord.correctiveActions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Corrective Actions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {selectedRecord.correctiveActions.map((action, index) => (
                      <li key={index} className="bg-green-50 p-2 rounded">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prevention Measures */}
              {selectedRecord.preventionMeasures && selectedRecord.preventionMeasures.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Prevention Measures</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {selectedRecord.preventionMeasures.map((measure, index) => (
                      <li key={index} className="bg-blue-50 p-2 rounded">{measure}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attachments */}
              {selectedRecord.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attachments</h4>
                  <div className="space-y-1">
                    {selectedRecord.attachments.map((attachment, index) => (
                      <div key={index} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                        📎 {attachment}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}