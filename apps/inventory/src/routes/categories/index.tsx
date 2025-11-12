import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search, FolderTree, Edit, Trash2, Package, TrendingUp, Eye, EyeOff } from 'lucide-react'
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
import CategoryForm from '@/components/categories/CategoryForm'
import CategoryDetailDrawer from '@/components/categories/CategoryDetailDrawer'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// Types
interface Category {
  id: string
  code: string
  name: string
  description: string
  parentCategoryId?: string
  parentCategoryName?: string
  level: number
  isActive: boolean
  productCount: number
  lastUsed?: string
  attributes: CategoryAttribute[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface CategoryAttribute {
  id: string
  name: string
  type: 'text' | 'number' | 'boolean' | 'date' | 'select'
  required: boolean
  options?: string[]
}

// Mock data
const mockCategories: Category[] = [
  {
    id: '1',
    code: 'PRODUCE',
    name: 'Produce',
    description: 'Fresh fruits and vegetables',
    level: 1,
    isActive: true,
    productCount: 156,
    lastUsed: '2024-01-18',
    attributes: [
      { id: '1', name: 'Origin', type: 'text', required: false },
      { id: '2', name: 'Organic', type: 'boolean', required: false },
      { id: '3', name: 'Season', type: 'select', required: false, options: ['Spring', 'Summer', 'Fall', 'Winter'] }
    ],
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-18T14:30:00Z'
  },
  {
    id: '2',
    code: 'VEG',
    name: 'Vegetables',
    description: 'Fresh vegetables',
    parentCategoryId: '1',
    parentCategoryName: 'Produce',
    level: 2,
    isActive: true,
    productCount: 89,
    lastUsed: '2024-01-18',
    attributes: [
      { id: '3', name: 'Storage Temp', type: 'number', required: true },
      { id: '4', name: 'Pre-cut', type: 'boolean', required: false }
    ],
    createdBy: 'john.doe',
    createdAt: '2022-04-10T14:30:00Z',
    updatedAt: '2024-01-15T11:20:00Z'
  },
  {
    id: '3',
    code: 'FRUIT',
    name: 'Fruits',
    description: 'Fresh fruits',
    parentCategoryId: '1',
    parentCategoryName: 'Produce',
    level: 2,
    isActive: true,
    productCount: 67,
    lastUsed: '2024-01-16',
    attributes: [
      { id: '5', name: 'Sweetness', type: 'select', required: false, options: ['Low', 'Medium', 'High'] }
    ],
    createdBy: 'john.doe',
    createdAt: '2022-04-10T14:30:00Z',
    updatedAt: '2024-01-16T09:45:00Z'
  },
  {
    id: '4',
    code: 'DAIRY',
    name: 'Dairy',
    description: 'Milk, cheese, and other dairy products',
    level: 1,
    isActive: true,
    productCount: 45,
    lastUsed: '2024-01-17',
    attributes: [
      { id: '6', name: 'Pasteurized', type: 'boolean', required: true },
      { id: '7', name: 'Fat Content', type: 'number', required: false }
    ],
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-17T16:45:00Z'
  },
  {
    id: '5',
    code: 'MEAT',
    name: 'Meat',
    description: 'Fresh and frozen meat products',
    level: 1,
    isActive: true,
    productCount: 78,
    lastUsed: '2024-01-15',
    attributes: [
      { id: '8', name: 'Storage Temp', type: 'number', required: true },
      { id: '9', name: 'Cut Type', type: 'select', required: false, options: ['Whole', 'Portioned', 'Ground'] }
    ],
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z'
  },
  {
    id: '6',
    code: 'POULTRY',
    name: 'Poultry',
    description: 'Chicken, turkey, and other poultry',
    parentCategoryId: '5',
    parentCategoryName: 'Meat',
    level: 2,
    isActive: true,
    productCount: 34,
    lastUsed: '2024-01-14',
    attributes: [],
    createdBy: 'jane.smith',
    createdAt: '2022-05-20T10:15:00Z',
    updatedAt: '2024-01-14T12:20:00Z'
  },
  {
    id: '7',
    code: 'DRY_GOODS',
    name: 'Dry Goods',
    description: 'Grains, pasta, and other dry ingredients',
    level: 1,
    isActive: false,
    productCount: 112,
    lastUsed: '2023-12-28',
    attributes: [
      { id: '10', name: 'Shelf Life', type: 'number', required: true }
    ],
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2023-12-28T09:30:00Z'
  },
  {
    id: '8',
    code: 'FROZEN',
    name: 'Frozen Foods',
    description: 'Frozen products and ingredients',
    level: 1,
    isActive: true,
    productCount: 56,
    lastUsed: '2024-01-18',
    attributes: [
      { id: '11', name: 'Storage Temp', type: 'number', required: true }
    ],
    createdBy: 'system',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2024-01-18T10:15:00Z'
  }
]

export const Route = createFileRoute('/categories/')({
  component: CategoriesComponent,
})

function CategoriesComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Mock API call
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', { searchTerm, levelFilter, statusFilter }],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      let filtered = mockCategories

      if (searchTerm) {
        filtered = filtered.filter(category =>
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (levelFilter !== 'all') {
        filtered = filtered.filter(category => category.level.toString() === levelFilter)
      }

      if (statusFilter === 'active') {
        filtered = filtered.filter(category => category.isActive)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(category => !category.isActive)
      } else if (statusFilter === 'parent') {
        filtered = filtered.filter(category => category.level === 1)
      } else if (statusFilter === 'child') {
        filtered = filtered.filter(category => category.level > 1)
      }

      return filtered
    }
  })

  const getLevelBadge = (level: number) => {
    const colors = {
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-green-100 text-green-800',
      3: 'bg-purple-100 text-purple-800',
      4: 'bg-orange-100 text-orange-800'
    }

    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Level {level}
      </Badge>
    )
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleDelete = (category: Category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"? This will also affect ${category.productCount} products. This action cannot be undone.`)) {
      console.log('Delete category:', category.id)
    }
  }

  const handleToggleActive = (category: Category) => {
    console.log('Toggle category active:', category.id, !category.isActive)
  }

  const handleFormSubmit = (data: any) => {
    console.log('Category data:', data)
    setShowForm(false)
    setEditingCategory(null)
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
    total: categories.length,
    active: categories.filter(c => c.isActive).length,
    parent: categories.filter(c => c.level === 1).length,
    child: categories.filter(c => c.level > 1).length,
    totalProducts: categories.reduce((acc, c) => acc + c.productCount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories and hierarchies</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Product categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{((stats.active / stats.total) * 100).toFixed(0)}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parent Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.parent}</div>
            <p className="text-xs text-muted-foreground">Top-level categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Products categorized</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="1">Level 1</SelectItem>
            <SelectItem value="2">Level 2</SelectItem>
            <SelectItem value="3">Level 3</SelectItem>
            <SelectItem value="4">Level 4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="parent">Parent Only</SelectItem>
            <SelectItem value="child">Child Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Categories List</CardTitle>
          <CardDescription>
            Manage product categories with hierarchical organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || levelFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first category'}
              </p>
              {!searchTerm && levelFilter === 'all' && statusFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium">{category.name}</div>
                          <div className="text-sm text-muted-foreground">{category.code}</div>
                        </div>
                        {getLevelBadge(category.level)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.parentCategoryName ? (
                        <div>
                          <div className="font-medium text-sm">{category.parentCategoryName}</div>
                          <div className="text-xs text-muted-foreground">
                            Code: {categories.find(c => c.id === category.parentCategoryId)?.code}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Root Category</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{category.attributes.length} attributes</div>
                        {category.attributes.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {category.attributes.slice(0, 2).map((attr) => (
                              <Badge key={attr.id} variant="outline" className="text-xs">
                                {attr.name}
                              </Badge>
                            ))}
                            {category.attributes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{category.attributes.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{category.productCount} products</div>
                        {category.lastUsed && (
                          <div className="text-xs text-muted-foreground">
                            Last: {format(new Date(category.lastUsed), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className={`flex items-center space-x-1 ${category.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {category.isActive ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                          <span className="text-sm font-medium">
                            {category.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
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
                            <Package className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCategory(category)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(category)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Category
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(category)
                            }}
                          >
                            {category.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(category)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Category
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
      <CategoryDetailDrawer
        category={selectedCategory}
        open={!!selectedCategory}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
      />

      {/* Category Form */}
      <CategoryForm
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingCategory || undefined}
        categories={categories}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}