import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, ShoppingCart, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Package, CreditCard, Store, User, Calendar, ChefHat, Truck, Receipt, FileText, TrendingUp } from 'lucide-react'

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
interface Order {
  id: string
  orderNumber: string
  locationId: string
  location?: {
    id: string
    name: string
    code: string
  }
  customerId?: string
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  deviceId?: string
  channel: 'pos' | 'online' | 'wholesale'
  type: 'dine_in' | 'take_away' | 'delivery'
  status: 'open' | 'posted' | 'paid' | 'voided' | 'refunded'
  kitchenStatus: 'open' | 'preparing' | 'ready' | 'served' | 'cancelled'
  tableNo?: string
  customerName?: string
  subtotal: string
  taxAmount: string
  discountAmount: string
  serviceChargeAmount: string
  tipsAmount: string
  voucherAmount: string
  totalAmount: string
  paidAmount?: string
  balanceAmount?: string
  items: OrderItem[]
  payments: Payment[]
  createdAt: string
  updatedAt: string
}

interface OrderItem {
  id: string
  orderId: string
  productId: string
  variantId?: string
  lotId?: string
  uomId?: string
  quantity: string
  unitPrice: string
  taxAmount: string
  discountAmount: string
  lineTotal: string
  prepStatus: 'queued' | 'preparing' | 'ready' | 'served' | 'cancelled'
  station?: string
  notes?: string
  product?: {
    id: string
    name: string
    sku?: string
    description?: string
  }
}

interface Payment {
  id: string
  orderId: string
  tender: 'cash' | 'card' | 'mobile' | 'gift_card' | 'store_credit' | 'other'
  amount: string
  reference?: string
  change: string
  paidAt: string
  createdBy?: string
}

interface Product {
  id: string
  name: string
  sku?: string
  description?: string
  price?: number
  cost?: number
  unit?: string
  isActive: boolean
  category?: {
    id: string
    name: string
  }
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

async function fetchOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch orders')
  }

  const data = await response.json()
  return data.data || []
}

async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  })

  if (!response.ok) {
    throw new Error('Failed to create order')
  }

  const data = await response.json()
  return data.data
}

async function updateOrder(id: string, orderData: Partial<Order>): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  })

  if (!response.ok) {
    throw new Error('Failed to update order')
  }

  const data = await response.json()
  return data.data
}

async function postOrder(id: string): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to post order')
  }

  const data = await response.json()
  return data.data
}

async function voidOrder(id: string, reason: string): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/void`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  })

  if (!response.ok) {
    throw new Error('Failed to void order')
  }

  const data = await response.json()
  return data.data
}

async function updateKitchenStatus(id: string, kitchenStatus: string, notes?: string): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${id}/kitchen-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kitchenStatus, notes }),
  })

  if (!response.ok) {
    throw new Error('Failed to update kitchen status')
  }

  const data = await response.json()
  return data.data
}

async function addPayment(orderId: string, paymentData: Partial<Payment>): Promise<Payment> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  })

  if (!response.ok) {
    throw new Error('Failed to add payment')
  }

  const data = await response.json()
  return data.data
}

async function fetchOrderPayments(orderId: string): Promise<Payment[]> {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payments`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch order payments')
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
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-202411001',
    locationId: '1',
    location: {
      id: '1',
      name: 'Downtown Cafe',
      code: 'DT-001',
    },
    channel: 'pos',
    type: 'dine_in',
    status: 'posted',
    kitchenStatus: 'ready',
    tableNo: 'T5',
    customerName: 'John Smith',
    subtotal: '45.50',
    taxAmount: '5.01',
    discountAmount: '0.00',
    serviceChargeAmount: '0.00',
    tipsAmount: '8.00',
    voucherAmount: '0.00',
    totalAmount: '58.51',
    paidAmount: '58.51',
    balanceAmount: '0.00',
    items: [],
    payments: [
      {
        id: '1',
        orderId: '1',
        tender: 'card',
        amount: '58.51',
        reference: '****1234',
        change: '0.00',
        paidAt: new Date().toISOString(),
      }
    ],
    createdAt: '2024-11-08T10:30:00Z',
    updatedAt: '2024-11-08T10:45:00Z',
  },
  {
    id: '2',
    orderNumber: 'ORD-202411002',
    locationId: '1',
    location: {
      id: '1',
      name: 'Downtown Cafe',
      code: 'DT-001',
    },
    channel: 'online',
    type: 'delivery',
    status: 'open',
    kitchenStatus: 'preparing',
    customerName: 'Jane Doe',
    subtotal: '28.75',
    taxAmount: '3.16',
    discountAmount: '0.00',
    serviceChargeAmount: '2.50',
    tipsAmount: '0.00',
    voucherAmount: '0.00',
    totalAmount: '34.41',
    paidAmount: '0.00',
    balanceAmount: '34.41',
    items: [],
    payments: [],
    createdAt: '2024-11-08T11:15:00Z',
    updatedAt: '2024-11-08T11:20:00Z',
  },
]

function OrderForm({ order, onClose }: { order?: Order; onClose: () => void }) {
  const [formData, setFormData] = useState({
    channel: order?.channel || 'pos',
    type: order?.type || 'take_away',
    locationId: order?.locationId || '',
    customerName: order?.customerName || '',
    tableNo: order?.tableNo || '',
    items: order?.items?.length ? order.items : [{
      productId: '',
      quantity: 1,
      unitPrice: 0,
    }],
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to create order:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; orderData: Partial<Order> }) =>
      updateOrder(data.id, data.orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to update order:', error)
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
        quantity: 1,
        unitPrice: 0,
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

    // Auto-update unit price when product changes
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unitPrice = product.price || 0
      }
    }

    setFormData({ ...formData, items: newItems })
  }

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      return sum + (item.quantity * (item.unitPrice || 0))
    }, 0)

    const taxAmount = subtotal * 0.11 // 11% tax
    const totalAmount = subtotal + taxAmount

    return { subtotal, taxAmount, totalAmount }
  }

  const handleSubmit = () => {
    const { subtotal, taxAmount, totalAmount } = calculateTotals()

    const orderData = {
      ...formData,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: '0.00',
      serviceChargeAmount: '0.00',
      tipsAmount: '0.00',
      voucherAmount: '0.00',
      totalAmount: totalAmount.toFixed(2),
    }

    if (order?.id) {
      updateMutation.mutate({ id: order.id, orderData })
    } else {
      createMutation.mutate(orderData)
    }
  }

  const orderChannels = [
    { value: 'pos', label: 'Point of Sale' },
    { value: 'online', label: 'Online' },
    { value: 'wholesale', label: 'Wholesale' },
  ]

  const orderTypes = [
    { value: 'dine_in', label: 'Dine In' },
    { value: 'take_away', label: 'Take Away' },
    { value: 'delivery', label: 'Delivery' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Channel *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.channel}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
            disabled={!!order?.id && order.status !== 'open'}
          >
            {orderChannels.map(channel => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Order Type *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            disabled={!!order?.id && order.status !== 'open'}
          >
            {orderTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Location *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            disabled={!!order?.id && order.status !== 'open'}
          >
            <option value="">Select location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Customer Name</label>
          <Input
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Enter customer name"
            disabled={!!order?.id && order.status !== 'open'}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Table Number</label>
          <Input
            value={formData.tableNo}
            onChange={(e) => setFormData({ ...formData, tableNo: e.target.value })}
            placeholder="e.g., T5, B12"
            disabled={!!order?.id && order.status !== 'open'}
          />
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Order Items</h3>
          <Button
            onClick={handleAddItem}
            variant="outline"
            size="sm"
            disabled={!!order?.id && order.status !== 'open'}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {formData.items.map((item, index) => (
          <div key={index} className="border rounded-md p-4 space-y-4">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <label className="text-sm font-medium">Product</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.productId}
                  onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                  disabled={!!order?.id && order.status !== 'open'}
                >
                  <option value="">Select product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.sku && `(${product.sku})`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                  disabled={!!order?.id && order.status !== 'open'}
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium">Unit Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  disabled={!!order?.id && order.status !== 'open'}
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  disabled={formData.items.length === 1 || (!!order?.id && order.status !== 'open')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="text-right text-sm font-medium">
              Line Total: ${(item.quantity * (item.unitPrice || 0)).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="border-t pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${calculateTotals().subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (11%):</span>
            <span>${calculateTotals().taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${calculateTotals().totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={
            createMutation.isPending ||
            updateMutation.isPending ||
            !formData.locationId ||
            formData.items.some(item => !item.productId) ||
            (!!order?.id && order.status !== 'open')
          }
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
           order ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </div>
  )
}

function PaymentForm({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [formData, setFormData] = useState({
    tender: 'cash' as const,
    amount: 0,
    reference: '',
    change: 0,
  })

  const queryClient = useQueryClient()
  const addPaymentMutation = useMutation({
    mutationFn: (paymentData: Partial<Payment>) => addPayment(orderId, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orderPayments', orderId] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to add payment:', error)
    },
  })

  const handleSubmit = () => {
    addPaymentMutation.mutate(formData)
  }

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'gift_card', label: 'Gift Card' },
    { value: 'store_credit', label: 'Store Credit' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Method *</label>
        <select
          className="w-full p-2 border rounded-md"
          value={formData.tender}
          onChange={(e) => setFormData({ ...formData, tender: e.target.value as any })}
        >
          {paymentMethods.map(method => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Amount *</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Reference</label>
        <Input
          value={formData.reference}
          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
          placeholder="Card last 4 digits, check number, etc."
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Change</label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={formData.change}
          onChange={(e) => setFormData({ ...formData, change: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={addPaymentMutation.isPending || formData.amount <= 0}
        >
          {addPaymentMutation.isPending ? 'Processing...' : 'Add Payment'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/orders/')({
  component: OrdersIndex,
})

function OrdersIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedKitchenStatus, setSelectedKitchenStatus] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  // Fetch data using React Query
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  })

  const filteredOrders = (orders.length > 0 ? orders : mockOrders).filter(order => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.location?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesChannel = selectedChannel === 'all' || order.channel === selectedChannel
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus
    const matchesKitchenStatus = selectedKitchenStatus === 'all' || order.kitchenStatus === selectedKitchenStatus

    return matchesSearch && matchesChannel && matchesStatus && matchesKitchenStatus
  })

  const getChannelBadge = (channel: string) => {
    const variants = {
      pos: { variant: 'default' as const, label: 'POS' },
      online: { variant: 'secondary' as const, label: 'Online' },
      wholesale: { variant: 'outline' as const, label: 'Wholesale' },
    }

    const config = variants[channel as keyof typeof variants] || variants.pos
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: { variant: 'secondary' as const, label: 'Open', icon: Clock },
      posted: { variant: 'default' as const, label: 'Posted', icon: FileText },
      paid: { variant: 'default' as const, label: 'Paid', icon: CheckCircle },
      voided: { variant: 'destructive' as const, label: 'Voided', icon: XCircle },
      refunded: { variant: 'outline' as const, label: 'Refunded', icon: RefreshCw },
    }

    const config = variants[status as keyof typeof variants] || variants.open
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const getKitchenStatusBadge = (kitchenStatus: string) => {
    const variants = {
      open: { variant: 'secondary' as const, label: 'Open', icon: Clock },
      preparing: { variant: 'default' as const, label: 'Preparing', icon: ChefHat },
      ready: { variant: 'default' as const, label: 'Ready', icon: CheckCircle },
      served: { variant: 'outline' as const, label: 'Served', icon: Package },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
    }

    const config = variants[kitchenStatus as keyof typeof variants] || variants.open
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const stats = {
    total: (orders.length > 0 ? orders : mockOrders).length,
    open: (orders.length > 0 ? orders : mockOrders).filter(o => o.status === 'open').length,
    posted: (orders.length > 0 ? orders : mockOrders).filter(o => o.status === 'posted').length,
    paid: (orders.length > 0 ? orders : mockOrders).filter(o => o.status === 'paid').length,
    totalRevenue: (orders.length > 0 ? orders : mockOrders)
      .filter(o => o.status === 'paid')
      .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0),
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading orders</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message || 'Failed to fetch orders from the server'}
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
          <h1 className="text-2xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground">Process and manage customer orders across all channels</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <OrderForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Posted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.posted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            className="p-2 border rounded-md"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
          >
            <option value="all">All Channels</option>
            <option value="pos">POS</option>
            <option value="online">Online</option>
            <option value="wholesale">Wholesale</option>
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="posted">Posted</option>
            <option value="paid">Paid</option>
            <option value="voided">Voided</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedKitchenStatus}
            onChange={(e) => setSelectedKitchenStatus(e.target.value)}
          >
            <option value="all">All Kitchen Status</option>
            <option value="open">Open</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
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
                  <TableHead>Order Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kitchen</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Receipt className="w-4 h-4 mr-2" />
                        {order.orderNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName || 'Guest'}</div>
                        {order.tableNo && (
                          <div className="text-sm text-muted-foreground">Table {order.tableNo}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Store className="w-4 h-4 mr-2" />
                        {order.location?.name || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell>{getChannelBadge(order.channel)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {order.type === 'dine_in' && <User className="w-4 h-4 mr-2" />}
                        {order.type === 'take_away' && <Package className="w-4 h-4 mr-2" />}
                        {order.type === 'delivery' && <Truck className="w-4 h-4 mr-2" />}
                        {order.type.charAt(0).toUpperCase() + order.type.slice(1).replace('_', ' ')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getKitchenStatusBadge(order.kitchenStatus)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="font-medium">${parseFloat(order.totalAmount).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
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
                            setSelectedOrder(order)
                            setIsViewOpen(true)
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {order.status === 'open' && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order)
                              setIsEditOpen(true)
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Order
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {order.status === 'open' && (
                            <DropdownMenuItem onClick={() => {
                              if (confirm('Post this order? This will generate an order number and process inventory movements.')) {
                                postOrder(order.id).then(() => {
                                  // Refresh orders
                                })
                              }
                            }}>
                              <FileText className="w-4 h-4 mr-2" />
                              Post Order
                            </DropdownMenuItem>
                          )}
                          {['posted', 'paid'].includes(order.status) && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedOrder(order)
                              setIsPaymentOpen(true)
                            }}>
                              <Payment className="w-4 h-4 mr-2" />
                              Add Payment
                            </DropdownMenuItem>
                          )}
                          {['open', 'posted'].includes(order.status) && (
                            <DropdownMenuItem
                              onClick={() => {
                                const reason = prompt('Reason for voiding this order?')
                                if (reason) {
                                  voidOrder(order.id, reason).then(() => {
                                    // Refresh orders
                                  })
                                }
                              }}
                              className="text-red-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Void Order
                            </DropdownMenuItem>
                          )}
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
        <SheetContent className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Order</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <OrderForm
              order={selectedOrder}
              onClose={() => {
                setIsEditOpen(false)
                setSelectedOrder(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* View Sheet */}
      <Sheet open={isViewOpen} onOpenChange={setIsViewOpen}>
        <SheetContent className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Order Details</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-6 mt-6">
              {/* Order Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedOrder.orderNumber}</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedOrder.status)}</div>
                    <div><span className="font-medium">Kitchen Status:</span> {getKitchenStatusBadge(selectedOrder.kitchenStatus)}</div>
                    <div><span className="font-medium">Created:</span> {formatDate(selectedOrder.createdAt)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Channel:</span> {getChannelBadge(selectedOrder.channel)}</div>
                    <div><span className="font-medium">Type:</span> {selectedOrder.type.replace('_', ' ')}</div>
                    {selectedOrder.tableNo && (
                      <div><span className="font-medium">Table:</span> {selectedOrder.tableNo}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-muted/50 p-4 rounded-md">
                <h4 className="font-medium mb-2">Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedOrder.customerName || 'Guest'}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {selectedOrder.location?.name || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Line Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                              {item.product?.sku && (
                                <div className="text-sm text-muted-foreground">{item.product.sku}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            ${parseFloat(item.lineTotal).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.prepStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payments */}
              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Payments</h4>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Method</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Paid At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <Badge variant="outline">
                                {payment.tender}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              ${parseFloat(payment.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>{payment.reference || '-'}</TableCell>
                            <TableCell>${parseFloat(payment.change).toFixed(2)}</TableCell>
                            <TableCell>{formatDate(payment.paidAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>${parseFloat(selectedOrder.taxAmount).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedOrder.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span>-${parseFloat(selectedOrder.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.serviceChargeAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Service Charge:</span>
                      <span>${parseFloat(selectedOrder.serviceChargeAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.tipsAmount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tips:</span>
                      <span>${parseFloat(selectedOrder.tipsAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${parseFloat(selectedOrder.totalAmount).toFixed(2)}</span>
                  </div>
                  {selectedOrder.paidAmount && (
                    <div className="flex justify-between text-sm">
                      <span>Paid:</span>
                      <span>${parseFloat(selectedOrder.paidAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.balanceAmount && (
                    <div className="flex justify-between text-sm font-medium">
                      <span>Balance:</span>
                      <span>${parseFloat(selectedOrder.balanceAmount).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <PaymentForm
              orderId={selectedOrder.id}
              onClose={() => {
                setIsPaymentOpen(false)
                setSelectedOrder(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}