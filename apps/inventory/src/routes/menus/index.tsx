import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Eye, Edit, Trash2, Package, Calendar, Clock, CheckCircle, XCircle, Store, DollarSign, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'

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
interface Menu {
  id: string
  name: string
  channel: 'pos' | 'online' | null
  startAt: string | null
  endAt: string | null
  isActive: boolean
  locationId: string | null
  location: {
    id: string
    name: string
    code: string
  } | null
  items: MenuItem[]
  createdAt: string
  updatedAt: string
}

interface MenuItem {
  id: string
  menuId: string
  productId: string
  variantId: string | null
  locationId: string | null
  isAvailable: boolean
  sortOrder: number
  product: {
    id: string
    name: string
    sku: string | null
  } | null
  location: {
    id: string
    name: string
  } | null
}

interface Product {
  id: string
  name: string
  sku: string | null
  description: string | null
  price: number | null
  cost: number | null
  unit: string | null
  isActive: boolean
  category: {
    id: string
    name: string
  } | null
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

async function fetchMenus(): Promise<Menu[]> {
  const response = await fetch(`${API_BASE_URL}/menus`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch menus')
  }

  const data = await response.json()
  return data.data || []
}

async function createMenu(menuData: Partial<Menu>): Promise<Menu> {
  const response = await fetch(`${API_BASE_URL}/menus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(menuData),
  })

  if (!response.ok) {
    throw new Error('Failed to create menu')
  }

  const data = await response.json()
  return data.data
}

async function updateMenu(id: string, menuData: Partial<Menu>): Promise<Menu> {
  const response = await fetch(`${API_BASE_URL}/menus/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(menuData),
  })

  if (!response.ok) {
    throw new Error('Failed to update menu')
  }

  const data = await response.json()
  return data.data
}

async function deleteMenu(id: string): Promise<Menu> {
  const response = await fetch(`${API_BASE_URL}/menus/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to delete menu')
  }

  const data = await response.json()
  return data.data
}

async function fetchMenuItems(menuId: string): Promise<MenuItem[]> {
  const response = await fetch(`${API_BASE_URL}/menus/${menuId}/items`, {
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch menu items')
  }

  const data = await response.json()
  return data.data || []
}

async function addMenuItem(menuId: string, itemData: Partial<MenuItem>): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menus/${menuId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  })

  if (!response.ok) {
    throw new Error('Failed to add menu item')
  }

  const data = await response.json()
  return data.data
}

async function updateMenuItem(menuId: string, itemId: string, itemData: Partial<MenuItem>): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menus/${menuId}/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(itemData),
  })

  if (!response.ok) {
    throw new Error('Failed to update menu item')
  }

  const data = await response.json()
  return data.data
}

async function removeMenuItem(menuId: string, itemId: string): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menus/${menuId}/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to remove menu item')
  }

  const data = await response.json()
  return data.data
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
const mockMenus: Menu[] = [
  {
    id: '1',
    name: 'Breakfast Menu',
    channel: 'pos',
    startAt: '2024-01-01T06:00:00Z',
    endAt: '2024-12-31T11:00:00Z',
    isActive: true,
    locationId: '1',
    location: {
      id: '1',
      name: 'Downtown Cafe',
      code: 'DT-001',
    },
    items: [],
    createdAt: '2024-11-08T10:00:00Z',
    updatedAt: '2024-11-08T10:30:00Z',
  },
  {
    id: '2',
    name: 'Lunch Specials',
    channel: 'pos',
    startAt: '2024-01-01T11:00:00Z',
    endAt: '2024-12-31T15:00:00Z',
    isActive: true,
    locationId: '1',
    location: {
      id: '1',
      name: 'Downtown Cafe',
      code: 'DT-001',
    },
    items: [],
    createdAt: '2024-11-08T09:00:00Z',
    updatedAt: '2024-11-08T09:30:00Z',
  },
]

function MenuForm({ menu, onClose }: { menu?: Menu; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: menu?.name || '',
    channel: menu?.channel || null,
    startAt: menu?.startAt ? new Date(menu.startAt).toISOString().slice(0, 16) : '',
    endAt: menu?.endAt ? new Date(menu.endAt).toISOString().slice(0, 16) : '',
    isActive: menu?.isActive ?? true,
    locationId: menu?.locationId || '',
  })

  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to create menu:', error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; menuData: Partial<Menu> }) =>
      updateMenu(data.id, data.menuData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      onClose()
    },
    onError: (error) => {
      console.error('Failed to update menu:', error)
    },
  })

  // Fetch data for dropdowns
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })

  const handleSubmit = () => {
    const menuData = {
      ...formData,
      startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
      endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
    }

    if (menu?.id) {
      updateMutation.mutate({ id: menu.id, menuData })
    } else {
      createMutation.mutate(menuData)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Menu Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter menu name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Channel</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.channel || ''}
            onChange={(e) => setFormData({ ...formData, channel: e.target.value || null })}
          >
            <option value="">All Channels</option>
            <option value="pos">POS</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Date/Time</label>
          <Input
            type="datetime-local"
            value={formData.startAt}
            onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">End Date/Time</label>
          <Input
            type="datetime-local"
            value={formData.endAt}
            onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <select
          className="w-full p-2 border rounded-md"
          value={formData.locationId || ''}
          onChange={(e) => setFormData({ ...formData, locationId: e.target.value || null })}
        >
          <option value="">All Locations</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name} ({location.code})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Menu is Active
        </label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending || !formData.name.trim()}
        >
          {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
           menu ? 'Update Menu' : 'Create Menu'}
        </Button>
      </div>
    </div>
  )
}

function MenuItemsManager({ menu, onClose }: { menu: Menu; onClose: () => void }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const queryClient = useQueryClient()

  // Fetch menu items
  useEffect(() => {
    fetchMenuItems(menu.id)
      .then(data => {
        setItems(data)
        setIsLoading(false)
      })
      .catch(error => {
        console.error('Failed to fetch menu items:', error)
        setIsLoading(false)
      })
  }, [menu.id])

  // Fetch products and locations for dropdowns
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })

  const addItemMutation = useMutation({
    mutationFn: (itemData: Partial<MenuItem>) => addMenuItem(menu.id, itemData),
    onSuccess: (newItem) => {
      setItems([...items, newItem])
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: (data: { itemId: string; itemData: Partial<MenuItem> }) =>
      updateMenuItem(menu.id, data.itemId, data.itemData),
    onSuccess: (updatedItem) => {
      setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item))
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeMenuItem(menu.id, itemId),
    onSuccess: () => {
      setItems(items.filter(item => item.id !== item))
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })

  const handleAddItem = () => {
    const newItem = {
      productId: '',
      isAvailable: true,
      sortOrder: items.length,
    }

    // Find first available product
    if (products.length > 0) {
      const usedProductIds = items.map(item => item.productId).filter(Boolean)
      const availableProduct = products.find(p => !usedProductIds.includes(p.id))
      if (availableProduct) {
        newItem.productId = availableProduct.id
      }
    }

    addItemMutation.mutate(newItem)
  }

  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    updateItemMutation.mutate({
      itemId,
      itemData: { [field]: value }
    })
  }

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId)
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex >= 0 && targetIndex < items.length) {
      // Swap items
      ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]

      // Update sort orders
      newItems.forEach((item, idx) => {
        updateItemMutation.mutate({
          itemId: item.id,
          itemData: { sortOrder: idx }
        })
      })

      setItems(newItems)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Menu Items for {menu.name}</h3>
        <Button onClick={handleAddItem} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No items added to this menu yet</p>
          <Button onClick={handleAddItem} variant="outline" className="mt-4">
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item.id} className="border rounded-md p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                  >
                    ↓
                  </Button>
                  <span className="text-sm font-medium">#{index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="text-sm font-medium">Product</label>
                  <select
                    className="w-full p-2 border rounded-md mt-1"
                    value={item.productId || ''}
                    onChange={(e) => handleUpdateItem(item.id, 'productId', e.target.value || null)}
                  >
                    <option value="">Select product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.sku && `(${product.sku})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-sm font-medium">Location</label>
                  <select
                    className="w-full p-2 border rounded-md mt-1"
                    value={item.locationId || ''}
                    onChange={(e) => handleUpdateItem(item.id, 'locationId', e.target.value || null)}
                  >
                    <option value="">All Locations</option>
                    {locations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 flex items-center space-x-2 pt-6">
                  <Button
                    variant={item.isAvailable ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateItem(item.id, 'isAvailable', !item.isAvailable)}
                    className="flex items-center space-x-1"
                  >
                    {item.isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    <span>{item.isAvailable ? 'Available' : 'Unavailable'}</span>
                  </Button>
                </div>
              </div>

              {item.product && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  <strong>Selected:</strong> {item.product.name}
                  {item.product.sku && <span> ({item.product.sku})</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/menus/')({
  component: MenusIndex,
})

function MenusIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChannel, setSelectedChannel] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isItemsOpen, setIsItemsOpen] = useState(false)

  // Fetch data using React Query
  const { data: menus = [], isLoading, error } = useQuery({
    queryKey: ['menus'],
    queryFn: fetchMenus,
  })

  const filteredMenus = (menus.length > 0 ? menus : mockMenus).filter(menu => {
    const matchesSearch =
      menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (menu.location?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesChannel = selectedChannel === 'all' || menu.channel === selectedChannel
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'active' && menu.isActive) ||
      (selectedStatus === 'inactive' && !menu.isActive)

    return matchesSearch && matchesChannel && matchesStatus
  })

  const getChannelBadge = (channel: string | null) => {
    const variants = {
      pos: { variant: 'default' as const, label: 'POS' },
      online: { variant: 'secondary' as const, label: 'Online' },
    }

    const config = channel ? variants[channel as keyof typeof variants] : { variant: 'outline' as const, label: 'All' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'} className="flex items-center gap-1">
        {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No limit'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isMenuCurrentlyActive = (menu: Menu) => {
    if (!menu.isActive) return false
    const now = new Date()
    const startAt = menu.startAt ? new Date(menu.startAt) : null
    const endAt = menu.endAt ? new Date(menu.endAt) : null

    if (startAt && now < startAt) return false
    if (endAt && now > endAt) return false
    return true
  }

  const stats = {
    total: (menus.length > 0 ? menus : mockMenus).length,
    active: (menus.length > 0 ? menus : mockMenus).filter(m => m.isActive).length,
    currentlyActive: (menus.length > 0 ? menus : mockMenus).filter(m => isMenuCurrentlyActive(m)).length,
    pos: (menus.length > 0 ? menus : mockMenus).filter(m => m.channel === 'pos').length,
    online: (menus.length > 0 ? menus : mockMenus).filter(m => m.channel === 'online').length,
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading menus</h3>
          <p className="text-red-600 text-sm mt-1">
            {error.message || 'Failed to fetch menus from the server'}
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
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Create and manage menus for different channels and locations</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Menu</DialogTitle>
            </DialogHeader>
            <MenuForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Menus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.currentlyActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">POS Menus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online Menus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.online}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search menus..."
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
          </select>
          <select
            className="p-2 border rounded-md"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Menus Table */}
      <Card>
        <CardHeader>
          <CardTitle>Menus ({filteredMenus.length})</CardTitle>
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
                  <TableHead>Menu Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Current Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMenus.map((menu) => (
                  <TableRow key={menu.id}>
                    <TableCell className="font-medium">{menu.name}</TableCell>
                    <TableCell>{getChannelBadge(menu.channel)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Store className="w-4 h-4 mr-2" />
                        {menu.location?.name || 'All Locations'}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(menu.isActive)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>From: {formatDate(menu.startAt)}</div>
                        <div>To: {formatDate(menu.endAt)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isMenuCurrentlyActive(menu) ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active Now
                        </Badge>
                      ) : menu.isActive ? (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(menu.createdAt).toLocaleDateString()}
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
                            setSelectedMenu(menu)
                            setIsEditOpen(true)
                          }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Menu
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedMenu(menu)
                            setIsItemsOpen(true)
                          }}>
                            <Package className="w-4 h-4 mr-2" />
                            Manage Items
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this menu?')) {
                                // Handle delete
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Menu
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
        <SheetContent className="w-full max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Menu</SheetTitle>
          </SheetHeader>
          {selectedMenu && (
            <MenuForm
              menu={selectedMenu}
              onClose={() => {
                setIsEditOpen(false)
                setSelectedMenu(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Items Manager Sheet */}
      <Sheet open={isItemsOpen} onOpenChange={setIsItemsOpen}>
        <SheetContent className="w-full max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Manage Menu Items</SheetTitle>
          </SheetHeader>
          {selectedMenu && (
            <MenuItemsManager
              menu={selectedMenu}
              onClose={() => {
                setIsItemsOpen(false)
                setSelectedMenu(null)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}