import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Search, Users, UserCheck, Shield, Mail, Phone, Edit, Trash2, Eye, Key, UserX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
const usersData = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@company.com',
    phone: '+1 (555) 123-4567',
    role: 'super_admin',
    status: 'active',
    location: 'Central Kitchen - Main',
    lastLogin: '2024-11-08T10:30:00Z',
    createdAt: '2024-01-15',
    permissions: ['all'],
    avatar: 'JS',
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@company.com',
    phone: '+1 (555) 234-5678',
    role: 'manager',
    status: 'active',
    location: 'Downtown Cafe - Branch 1',
    lastLogin: '2024-11-08T09:15:00Z',
    createdAt: '2024-02-01',
    permissions: ['orders', 'inventory', 'reports'],
    avatar: 'SJ',
  },
  {
    id: '3',
    firstName: 'Mike',
    lastName: 'Wilson',
    email: 'mike.wilson@company.com',
    phone: '+1 (555) 345-6789',
    role: 'supervisor',
    status: 'active',
    location: 'Airport Kiosk - Terminal A',
    lastLogin: '2024-11-08T08:45:00Z',
    createdAt: '2024-02-15',
    permissions: ['inventory', 'reports'],
    avatar: 'MW',
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Brown',
    email: 'emily.brown@company.com',
    phone: '+1 (555) 456-7890',
    role: 'staff',
    status: 'inactive',
    location: 'Central Kitchen - Main',
    lastLogin: '2024-11-01T14:20:00Z',
    createdAt: '2024-03-01',
    permissions: ['orders'],
    avatar: 'EB',
  },
  {
    id: '5',
    firstName: 'David',
    lastName: 'Lee',
    email: 'david.lee@company.com',
    phone: '+1 (555) 567-8901',
    role: 'staff',
    status: 'active',
    location: 'Downtown Cafe - Branch 1',
    lastLogin: '2024-11-08T07:30:00Z',
    createdAt: '2024-03-15',
    permissions: ['orders', 'inventory'],
    avatar: 'DL',
  },
]

const roles = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-red-100 text-red-800' },
  { value: 'admin', label: 'Admin', color: 'bg-orange-100 text-orange-800' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-800' },
  { value: 'supervisor', label: 'Supervisor', color: 'bg-green-100 text-green-800' },
  { value: 'staff', label: 'Staff', color: 'bg-gray-100 text-gray-800' },
]

const permissions = [
  { value: 'all', label: 'All Access' },
  { value: 'orders', label: 'Orders' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'purchasing', label: 'Purchasing' },
  { value: 'production', label: 'Production' },
  { value: 'reports', label: 'Reports' },
  { value: 'admin', label: 'Admin' },
]

function UserForm({ user, onClose }: { user?: any; onClose: () => void }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || 'staff',
    status: user?.status || 'active',
    location: user?.location || '',
    permissions: user?.permissions || ['orders'],
  })

  const handleSubmit = () => {
    console.log('User data:', formData)
    onClose()
  }

  const selectedRole = roles.find(r => r.value === formData.role)
  const getRoleBadge = (role: string) => {
    const foundRole = roles.find(r => r.value === role)
    return foundRole ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${foundRole.color}`}>
        {foundRole.label}
      </span>
    ) : null
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">First Name *</label>
          <Input
            placeholder="Enter first name"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Last Name *</label>
          <Input
            placeholder="Enter last name"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email *</label>
          <Input
            type="email"
            placeholder="Enter email address"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Phone</label>
          <Input
            placeholder="Enter phone number"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Role *</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            {roles.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.status}
            onChange={(e) => setFormData({...formData, status: e.target.value})}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Location</label>
        <select
          className="w-full p-2 border rounded-md"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
        >
          <option value="">Select location</option>
          <option value="Central Kitchen - Main">Central Kitchen - Main</option>
          <option value="Downtown Cafe - Branch 1">Downtown Cafe - Branch 1</option>
          <option value="Airport Kiosk - Terminal A">Airport Kiosk - Terminal A</option>
        </select>
      </div>

      {formData.role !== 'super_admin' && formData.role !== 'admin' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Permissions</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {permissions.filter(p => p.value !== 'all').map(permission => (
              <label key={permission.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.permissions.includes(permission.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({...formData, permissions: [...formData.permissions, permission.value]})
                    } else {
                      setFormData({...formData, permissions: formData.permissions.filter(p => p !== permission.value)})
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{permission.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>
          {user ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/users/')({
  component: UsersIndex,
})

function UsersIndex() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const filteredUsers = usersData.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive',
    }
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const foundRole = roles.find(r => r.value === role)
    return foundRole ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${foundRole.color}`}>
        {foundRole.label}
      </span>
    ) : null
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <UserForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersData.filter(user => user.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersData.filter(user => ['super_admin', 'admin'].includes(user.role)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersData.filter(user => user.role === 'staff').length}
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{user.avatar || getInitials(user.firstName, user.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{user.location}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm flex items-center">
                        <Mail className="w-3 h-3 mr-1" />
                        {user.email}
                      </div>
                      <div className="text-sm flex items-center text-muted-foreground">
                        <Phone className="w-3 h-3 mr-1" />
                        {user.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(user.lastLogin)}
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
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="w-4 h-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user)
                          setIsEditOpen(true)
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <UserX className="w-4 h-4 mr-2" />
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
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
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <UserForm
            user={selectedUser}
            onClose={() => {
              setIsEditOpen(false)
              setSelectedUser(null)
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}