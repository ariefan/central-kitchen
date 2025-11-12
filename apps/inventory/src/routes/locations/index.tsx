import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Building, MapPin, Phone, Mail, Edit, Trash2, Eye } from 'lucide-react'

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
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

// Mock data for demonstration
const locationsData = [
  {
    id: '1',
    name: 'Central Kitchen - Main',
    code: 'CK-001',
    type: 'central-kitchen',
    address: '123 Industrial Ave, Suite 100',
    city: 'Metropolis',
    state: 'NY',
    zipCode: '10001',
    phone: '+1 (555) 123-4567',
    email: 'central@kitchen.com',
    manager: 'John Smith',
    status: 'active',
    totalProducts: 245,
    totalValue: 125000,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Downtown Cafe - Branch 1',
    code: 'DC-001',
    type: 'cafe',
    address: '456 Main Street',
    city: 'Metropolis',
    state: 'NY',
    zipCode: '10002',
    phone: '+1 (555) 234-5678',
    email: 'downtown1@cafe.com',
    manager: 'Sarah Johnson',
    status: 'active',
    totalProducts: 89,
    totalValue: 45000,
    createdAt: '2024-02-01',
  },
  {
    id: '3',
    name: 'Airport Kiosk - Terminal A',
    code: 'AK-001',
    type: 'kiosk',
    address: '789 Airport Blvd, Terminal A',
    city: 'Metropolis',
    state: 'NY',
    zipCode: '10003',
    phone: '+1 (555) 345-6789',
    email: 'airport@kiosk.com',
    manager: 'Mike Wilson',
    status: 'active',
    totalProducts: 45,
    totalValue: 22000,
    createdAt: '2024-02-15',
  },
]

function LocationForm({ location, onClose }: { location?: any; onClose: () => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Location Name *</label>
          <Input placeholder="Enter location name" defaultValue={location?.name} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Location Code *</label>
          <Input placeholder="Enter location code" defaultValue={location?.code} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Location Type *</label>
          <select className="w-full p-2 border rounded-md" defaultValue={location?.type}>
            <option value="">Select type</option>
            <option value="central-kitchen">Central Kitchen</option>
            <option value="cafe">Cafe</option>
            <option value="restaurant">Restaurant</option>
            <option value="kiosk">Kiosk</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select className="w-full p-2 border rounded-md" defaultValue={location?.status}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input placeholder="Enter address" defaultValue={location?.address} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input placeholder="City" defaultValue={location?.city} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">State</label>
          <Input placeholder="State" defaultValue={location?.state} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">ZIP Code</label>
          <Input placeholder="ZIP Code" defaultValue={location?.zipCode} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input placeholder="Phone number" defaultValue={location?.phone} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" placeholder="Email address" defaultValue={location?.email} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Manager</label>
        <Input placeholder="Location manager name" defaultValue={location?.manager} />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>
          {location ? 'Update Location' : 'Create Location'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/locations/')({
  component: LocationsIndex,
})

function LocationsIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const filteredLocations = locationsData.filter(location =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: 'default',
      inactive: 'secondary',
      maintenance: 'destructive',
    }
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'central-kitchen': 'bg-blue-100 text-blue-800',
      cafe: 'bg-green-100 text-green-800',
      restaurant: 'bg-purple-100 text-purple-800',
      kiosk: 'bg-orange-100 text-orange-800',
      warehouse: 'bg-gray-100 text-gray-800',
    }

    const labels: Record<string, string> = {
      'central-kitchen': 'Central Kitchen',
      cafe: 'Cafe',
      restaurant: 'Restaurant',
      kiosk: 'Kiosk',
      warehouse: 'Warehouse',
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Location Management</h1>
          <p className="text-muted-foreground">Manage your business locations and outlets</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Location</DialogTitle>
            </DialogHeader>
            <LocationForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locationsData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locationsData.filter(loc => loc.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locationsData.reduce((sum, loc) => sum + loc.totalProducts, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${locationsData.reduce((sum, loc) => sum + loc.totalValue, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex justify-between items-center space-x-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Locations ({filteredLocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-muted-foreground">{location.code}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(location.type)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{location.manager}</div>
                      <div className="text-sm text-muted-foreground">{location.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {location.address}
                      </div>
                      <div className="text-sm flex items-center text-muted-foreground">
                        <Phone className="w-3 h-3 mr-1" />
                        {location.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(location.status)}</TableCell>
                  <TableCell>{location.totalProducts.toLocaleString()}</TableCell>
                  <TableCell>${location.totalValue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedLocation(location)
                          setIsEditOpen(true)
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Location</SheetTitle>
          </SheetHeader>
          <LocationForm
            location={selectedLocation}
            onClose={() => {
              setIsEditOpen(false)
              setSelectedLocation(null)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}