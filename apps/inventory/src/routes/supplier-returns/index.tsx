import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, Package, Calendar, DollarSign, User, AlertTriangle, CheckCircle, Clock, XCircle, FileText, Download } from 'lucide-react'

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
interface SupplierReturn {
  id: string
  returnNumber: string
  supplierId: string
  supplier: {
    id: string
    name: string
    email: string
    phone: string
  }
  originalPurchaseOrderId: string
  originalPurchaseOrder: {
    id: string
    poNumber: string
    orderDate: string
  }
  returnDate: string
  expectedCreditDate: string
  actualCreditDate?: string
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'credited' | 'rejected'
  priority: 'low' | 'medium' | 'high'
  totalAmount: number
  currency: string
  items: {
    id: string
    productId: string
    product: {
      id: string
      name: string
      code: string
      unit: string
    }
    originalQuantity: number
    returnQuantity: number
    unitPrice: number
    totalAmount: number
    reason: string
    condition: 'defective' | 'expired' | 'wrong_item' | 'excess' | 'damaged' | 'other'
    notes?: string
  }[]
  createdBy: string
  approvedBy?: string
  receivedBy?: string
  returnReason: string
  notes?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  status: string
}

interface Product {
  id: string
  name: string
  code: string
  description: string
  unit: string
  currentStock: number
  supplier: {
    id: string
    name: string
  }
}

interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: {
    id: string
    name: string
  }
  orderDate: string
  status: string
  totalAmount: number
  items: {
    id: string
    productId: string
    product: {
      id: string
      name: string
      code: string
      unit: string
    }
    quantity: number
    unitPrice: number
    totalAmount: number
  }[]
}

// API service functions
const API_BASE_URL = 'http://localhost:3001/api/v1'

async function fetchSupplierReturns(): Promise<SupplierReturn[]> {
  const response = await fetch(`${API_BASE_URL}/returns`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch supplier returns')
  }

  const data = await response.json()
  return data.data || []
}

async function createSupplierReturn(returnData: Partial<SupplierReturn>): Promise<SupplierReturn> {
  const response = await fetch(`${API_BASE_URL}/returns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(returnData),
  })

  if (!response.ok) {
    throw new Error('Failed to create supplier return')
  }

  const data = await response.json()
  return data.data
}

async function updateSupplierReturn(id: string, returnData: Partial<SupplierReturn>): Promise<SupplierReturn> {
  const response = await fetch(`${API_BASE_URL}/returns/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(returnData),
  })

  if (!response.ok) {
    throw new Error('Failed to update supplier return')
  }

  const data = await response.json()
  return data.data
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch suppliers')
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

async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch purchase orders')
  }

  const data = await response.json()
  return data.data || []
}

// Mock data for development - will be replaced with real API
const mockSupplierReturns: SupplierReturn[] = [
  {
    id: '1',
    returnNumber: 'SR-2024-001',
    supplierId: '1',
    supplier: {
      id: '1',
      name: 'Premium Coffee Roasters',
      email: 'orders@premiumcoffee.com',
      phone: '+1 (555) 123-4567',
    },
    originalPurchaseOrderId: 'PO-2024-001',
    originalPurchaseOrder: {
      id: '1',
      poNumber: 'PO-2024-001',
      orderDate: '2024-11-01',
    },
    returnDate: '2024-11-08',
    expectedCreditDate: '2024-11-15',
    actualCreditDate: undefined,
    status: 'submitted',
    priority: 'high',
    totalAmount: 1250.00,
    currency: 'USD',
    items: [
      {
        id: '1',
        productId: '1',
        product: {
          id: '1',
          name: 'Arabica Coffee Beans',
          code: 'CF-001',
          unit: 'kg',
        },
        originalQuantity: 500,
        returnQuantity: 50,
        unitPrice: 12.50,
        totalAmount: 625.00,
        reason: 'Quality issues - inconsistent roast',
        condition: 'defective',
        notes: 'Multiple customer complaints about taste inconsistency',
      },
      {
        id: '2',
        productId: '2',
        product: {
          id: '2',
          name: 'Robusta Coffee Beans',
          code: 'CF-002',
          unit: 'kg',
        },
        originalQuantity: 300,
        returnQuantity: 25,
        unitPrice: 8.75,
        totalAmount: 218.75,
        reason: 'Damaged packaging',
        condition: 'damaged',
        notes: 'Bags torn during shipping',
      },
    ],
    createdBy: 'John Smith',
    approvedBy: undefined,
    receivedBy: undefined,
    returnReason: 'Quality control failure - multiple defects found',
    notes: 'Urgent return required - affecting production',
    attachments: ['quality_report.pdf', 'customer_complaints.pdf'],
    createdAt: '2024-11-08T10:00:00Z',
    updatedAt: '2024-11-08T10:30:00Z',
  },
]

function SupplierReturnForm({ supplierReturn, onClose }: { supplierReturn?: SupplierReturn; onClose: () => void }) {
  const [formData, setFormData] = useState({
    supplierId: supplierReturn?.supplierId || '',
    originalPurchaseOrderId: supplierReturn?.originalPurchaseOrderId || '',
    returnDate: supplierReturn?.returnDate || new Date().toISOString().split('T')[0],
    expectedCreditDate: supplierReturn?.expectedCreditDate || '',
    priority: supplierReturn?.priority || 'medium',
    returnReason: supplierReturn?.returnReason || '',
    notes: supplierReturn?.notes || '',
    items: supplierReturn?.items || [{
      productId: '',
      originalQuantity: 0,
      returnQuantity: 0,
      unitPrice: 0,
      reason: '',
      condition: 'defective' as const,
      notes: '',
    }],
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createSupplierReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierReturns'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to create supplier return:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; returnData: Partial<SupplierReturn> }) =>
      updateSupplierReturn(data.id, data.returnData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierReturns'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to update supplier return:', error)
    },
  })

  // Fetch data for dropdowns
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: fetchPurchaseOrders,
  })

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        productId: '',
        originalQuantity: 0,
        returnQuantity: 0,
        unitPrice: 0,
        reason: '',
        condition: 'defective' as const,
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

    // Auto-calculate total when return quantity or unit price changes
    if (field === 'returnQuantity' || field === 'unitPrice') {
      newItems[index].totalAmount = (newItems[index].returnQuantity || 0) * (newItems[index].unitPrice || 0)
    }

    setFormData({ ...formData, items: newItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
  }

  const handleSubmit = () => {
    const returnData = {
      ...formData,
      totalAmount: calculateTotal(),
      currency: 'USD',
    }

    if (supplierReturn?.id) {
      updateMutation.mutate({ id: supplierReturn.id, returnData })
    } else {
      createMutation.mutate(returnData)
    }
  }

  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId)
  const selectedPO = purchaseOrders.find(po => po.id === formData.originalPurchaseOrderId)

  const returnConditions = [
    { value: 'defective', label: 'Defective' },
    { value: 'expired', label: 'Expired' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'excess', label: 'Excess' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Supplier *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.supplierId}
            onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
          >
            <option value="">Select supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Original Purchase Order</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.originalPurchaseOrderId}
            onChange={(e) => setFormData({...formData, originalPurchaseOrderId: e.target.value})}
          >
            <option value="">Select purchase order</option>
            {purchaseOrders
              .filter(po => !formData.supplierId || po.supplier.id === formData.supplierId)
              .map(po => (
              <option key={po.id} value={po.id}>{po.poNumber} - {po.supplier.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Return Date *</label>
          <Input
            type="date"
            value={formData.returnDate}
            onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Expected Credit Date *</label>
          <Input
            type="date"
            value={formData.expectedCreditDate}
            onChange={(e) => setFormData({...formData, expectedCreditDate: e.target.value})}
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

      {/* Supplier and PO Information Display */}
      {selectedSupplier && (
        <div className="bg-muted/50 p-4 rounded-md">
          <h4 className="font-medium mb-2">Supplier Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span> {selectedSupplier.email}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {selectedSupplier.phone}
            </div>
          </div>
        </div>
      )}

      {selectedPO && (
        <div className="bg-muted/50 p-4 rounded-md">
          <h4 className="font-medium mb-2">Purchase Order Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">PO Number:</span> {selectedPO.poNumber}
            </div>
            <div>
              <span className="font-medium">Order Date:</span> {new Date(selectedPO.orderDate).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Total Amount:</span> ${selectedPO.totalAmount.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Return Reason */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Return Reason *</label>
        <Textarea
          placeholder="Enter the main reason for this return..."
          value={formData.returnReason}
          onChange={(e) => setFormData({...formData, returnReason: e.target.value})}
          rows={2}
        />
      </div>

      {/* Return Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Return Items</h3>
          <Button onClick={handleAddItem} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="border rounded-md p-4 space-y-4">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="text-sm font-medium">Product</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.productId}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value)
                    handleItemChange(index, 'productId', e.target.value)
                    if (product && selectedPO) {
                      const poItem = selectedPO.items.find(poItem => poItem.productId === e.target.value)
                      if (poItem) {
                        handleItemChange(index, 'originalQuantity', poItem.quantity)
                        handleItemChange(index, 'unitPrice', poItem.unitPrice)
                      }
                    }
                  }}
                >
                  <option value="">Select product</option>
                  {products
                    .filter(product => !selectedPO || selectedPO.items.some(poItem => poItem.productId === product.id))
                    .map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Original Qty</label>
                <Input
                  type="number"
                  value={item.originalQuantity}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Return Qty *</label>
                <Input
                  type="number"
                  min="1"
                  max={item.originalQuantity}
                  value={item.returnQuantity}
                  onChange={(e) => handleItemChange(index, 'returnQuantity', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Unit Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
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
              <div className="col-span-3">
                <label className="text-sm font-medium">Condition *</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.condition}
                  onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                >
                  {returnConditions.map(condition => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-7">
                <label className="text-sm font-medium">Reason *</label>
                <Input
                  placeholder="Why is this item being returned?"
                  value={item.reason}
                  onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Total</label>
                <Input
                  type="text"
                  value={`$${(item.totalAmount || 0).toFixed(2)}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="col-span-12">
              <label className="text-sm font-medium">Item Notes</label>
              <Input
                placeholder="Additional notes about this item..."
                value={item.notes || ''}
                onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Return Notes</label>
        <Textarea
          placeholder="Additional notes about this return request..."
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
        />
      </div>

      {/* Total Amount */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium">Total Return Amount:</span>
          <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
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
           supplierReturn ? 'Update Return' : 'Create Return'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/supplier-returns/')({
  component: SupplierReturnsIndex,
})

function SupplierReturnsIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedReturn, setSelectedReturn] = useState<SupplierReturn | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)

  // Fetch data using React Query
  const { data: supplierReturns = [], isLoading, error } = useQuery({
    queryKey: ['supplierReturns'],
    queryFn: fetchSupplierReturns,
  })

  const filteredReturns = (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).filter(returnItem => {
    const matchesSearch =
      returnItem.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.createdBy.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatus === 'all' || returnItem.status === selectedStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { variant: 'secondary' as const, label: 'Draft', icon: FileText },
      submitted: { variant: 'default' as const, label: 'Submitted', icon: Clock },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      received: { variant: 'default' as const, label: 'Received', icon: Package },
      credited: { variant: 'default' as const, label: 'Credited', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
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

  const getConditionBadge = (condition: string) => {
    const colors = {
      defective: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      wrong_item: 'bg-purple-100 text-purple-800',
      excess: 'bg-blue-100 text-blue-800',
      damaged: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }

    const labels = {
      defective: 'Defective',
      expired: 'Expired',
      wrong_item: 'Wrong Item',
      excess: 'Excess',
      damaged: 'Damaged',
      other: 'Other',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[condition as keyof typeof colors]}`}>
        {labels[condition as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const stats = {
    total: (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).length,
    draft: (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).filter(r => r.status === 'draft').length,
    submitted: (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).filter(r => r.status === 'submitted').length,
    approved: (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).filter(r => r.status === 'approved').length,
    totalValue: (supplierReturns.length > 0 ? supplierReturns : mockSupplierReturns).reduce((sum, r) => sum + r.totalAmount, 0),
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading supplier returns</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message || 'Failed to fetch supplier returns from the server'}
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
          <h1 className="text-2xl font-bold">Supplier Returns</h1>
          <p className="text-muted-foreground">Manage product returns to suppliers and credit requests</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Return Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Supplier Return</DialogTitle>
            </DialogHeader>
            <SupplierReturnForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search returns..."
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
            <option value="received">Received</option>
            <option value="credited">Credited</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Supplier Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Returns ({filteredReturns.length})</CardTitle>
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
                  <TableHead>Return Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Original PO</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((returnItem) => (
                  <TableRow key={returnItem.id}>
                    <TableCell className="font-medium">{returnItem.returnNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{returnItem.supplier.name}</div>
                        <div className="text-sm text-muted-foreground">{returnItem.supplier.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        {returnItem.originalPurchaseOrder.poNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(returnItem.returnDate)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(returnItem.status)}</TableCell>
                    <TableCell>{getPriorityBadge(returnItem.priority)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {returnItem.items.slice(0, 2).map((item, idx) => (
                          <span key={idx} className="text-xs px-1 py-0.5 bg-muted rounded">
                            {getConditionBadge(item.condition)}
                          </span>
                        ))}
                        {returnItem.items.length > 2 && (
                          <span className="text-xs px-1 py-0.5 bg-muted rounded">
                            +{returnItem.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="font-medium">${returnItem.totalAmount.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        {returnItem.createdBy}
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
                            setSelectedReturn(returnItem)
                            setIsViewOpen(true)
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedReturn(returnItem)
                            setIsEditOpen(true)
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Send className="w-4 h-4 mr-2" />
                            Submit to Supplier
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject Return
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
            <SheetTitle>Edit Supplier Return</SheetTitle>
          </SheetHeader>
          <SupplierReturnForm
            supplierReturn={selectedReturn}
            onClose={() => {
              setIsEditOpen(false)
              setSelectedReturn(null)
            }}
          />
        </SheetContent>
      </Sheet>

      {/* View Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Supplier Return Details</SheetTitle>
          </SheetHeader>
          {selectedReturn && (
            <div className="space-y-6 mt-6">
              {/* Return Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedReturn.returnNumber}</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedReturn.status)}</div>
                    <div><span className="font-medium">Priority:</span> {getPriorityBadge(selectedReturn.priority)}</div>
                    <div><span className="font-medium">Created:</span> {formatDate(selectedReturn.createdAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Return Date:</span> {formatDate(selectedReturn.returnDate)}</div>
                    <div><span className="font-medium">Expected Credit:</span> {formatDate(selectedReturn.expectedCreditDate)}</div>
                    {selectedReturn.actualCreditDate && (
                      <div><span className="font-medium">Actual Credit:</span> {formatDate(selectedReturn.actualCreditDate)}</div>
                    )}
                    <div><span className="font-medium">Created By:</span> {selectedReturn.createdBy}</div>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Supplier Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedReturn.supplier.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedReturn.supplier.email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {selectedReturn.supplier.phone}
                  </div>
                  <div>
                    <span className="font-medium">Original PO:</span> {selectedReturn.originalPurchaseOrder.poNumber}
                  </div>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <h4 className="font-medium mb-2">Return Reason</h4>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedReturn.returnReason}</p>
              </div>

              {/* Return Items */}
              <div>
                <h4 className="font-medium mb-2">Return Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Original Qty</TableHead>
                        <TableHead>Return Qty</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product.name}</div>
                              <div className="text-sm text-muted-foreground">{item.product.code}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.originalQuantity} {item.product.unit}</TableCell>
                          <TableCell>{item.returnQuantity} {item.product.unit}</TableCell>
                          <TableCell>{getConditionBadge(item.condition)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={item.reason}>
                            {item.reason}
                          </TableCell>
                          <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">${item.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Item Notes */}
              {selectedReturn.items.some(item => item.notes) && (
                <div>
                  <h4 className="font-medium mb-2">Item Notes</h4>
                  <div className="space-y-2">
                    {selectedReturn.items.filter(item => item.notes).map((item, index) => (
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
                  <span className="text-lg font-medium">Total Return Amount:</span>
                  <span className="text-2xl font-bold">${selectedReturn.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedReturn.notes && (
                <div>
                  <h4 className="font-medium mb-2">Additional Notes</h4>
                  <p className="text-sm">{selectedReturn.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedReturn.attachments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Attachments</h4>
                  <div className="space-y-1">
                    {selectedReturn.attachments.map((attachment, index) => (
                      <div key={index} className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                        📎 {attachment}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Workflow */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Approval Workflow</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {selectedReturn.createdBy && (
                    <div>
                      <span className="font-medium">Created By:</span> {selectedReturn.createdBy}
                    </div>
                  )}
                  {selectedReturn.approvedBy && (
                    <div>
                      <span className="font-medium">Approved By:</span> {selectedReturn.approvedBy}
                    </div>
                  )}
                  {selectedReturn.receivedBy && (
                    <div>
                      <span className="font-medium">Received By:</span> {selectedReturn.receivedBy}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}