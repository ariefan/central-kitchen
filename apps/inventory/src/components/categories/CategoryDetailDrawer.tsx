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
import {
  FolderTree,
  Package,
  Edit,
  Settings,
  Calendar,
  User,
  CheckCircle,
  AlertTriangle,
  Info,
  Hash,
  Type,
  ToggleLeft
} from 'lucide-react'

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

// Mock products in this category
const mockProducts = [
  {
    id: '1',
    code: 'PROD-001',
    name: 'Organic Tomatoes',
    description: 'Fresh organic tomatoes',
    sku: 'TOM-ORG-001',
    status: 'active',
    lastUpdated: '2024-01-18'
  },
  {
    id: '2',
    code: 'PROD-015',
    name: 'Fresh Lettuce',
    description: 'Crisp iceberg lettuce',
    sku: 'LET-ICE-015',
    status: 'active',
    lastUpdated: '2024-01-16'
  },
  {
    id: '3',
    code: 'PROD-032',
    name: 'Red Apples',
    description: 'Sweet red apples',
    sku: 'APP-RED-032',
    status: 'active',
    lastUpdated: '2024-01-15'
  },
  {
    id: '4',
    code: 'PROD-045',
    name: 'Baby Carrots',
    description: 'Pre-washed baby carrots',
    sku: 'CAR-BAB-045',
    status: 'inactive',
    lastUpdated: '2023-12-28'
  }
]

// Mock child categories
const mockChildCategories = [
  {
    id: '2',
    code: 'VEG',
    name: 'Vegetables',
    productCount: 89,
    isActive: true
  },
  {
    id: '3',
    code: 'FRUIT',
    name: 'Fruits',
    productCount: 67,
    isActive: true
  }
]

interface CategoryDetailDrawerProps {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CategoryDetailDrawer({
  category,
  open,
  onOpenChange
}: CategoryDetailDrawerProps) {
  if (!category) return null

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

  const getAttributeTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <Type className="h-4 w-4" />
      case 'number':
        return <Hash className="h-4 w-4" />
      case 'boolean':
        return <ToggleLeft className="h-4 w-4" />
      case 'date':
        return <Calendar className="h-4 w-4" />
      case 'select':
        return <Settings className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getAttributeTypeLabel = (type: string) => {
    const labels = {
      text: 'Text',
      number: 'Number',
      boolean: 'Yes/No',
      date: 'Date',
      select: 'Select'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderTree className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{category.name}</span>
                  {getLevelBadge(category.level)}
                </DrawerTitle>
                <DrawerDescription>
                  {category.code} • {category.isActive ? 'Active' : 'Inactive'}
                </DrawerDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Category
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Info className="h-5 w-5" />
                      <span>Category Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Code</div>
                      <div className="font-medium">{category.code}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-medium">{category.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Description</div>
                      <div className="text-sm">{category.description}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Hierarchy Level</div>
                      <div className="mt-1">{getLevelBadge(category.level)}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <FolderTree className="h-5 w-5" />
                      <span>Parent Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {category.parentCategoryName ? (
                      <>
                        <div>
                          <div className="text-sm text-muted-foreground">Parent Category</div>
                          <div className="font-medium">{category.parentCategoryName}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Parent ID</div>
                          <div className="text-sm font-mono">{category.parentCategoryId}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-muted-foreground">
                        This is a root category (no parent)
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Usage Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Usage Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{category.productCount}</div>
                      <div className="text-sm text-muted-foreground">Total Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{category.attributes.length}</div>
                      <div className="text-sm text-muted-foreground">Custom Attributes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{mockChildCategories.length}</div>
                      <div className="text-sm text-muted-foreground">Child Categories</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {category.lastUsed
                          ? format(new Date(category.lastUsed), 'MMM dd')
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Last Used</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Child Categories */}
              {mockChildCategories.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Child Categories</CardTitle>
                    <CardDescription>
                      Subcategories under this category
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mockChildCategories.map((child) => (
                        <div key={child.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{child.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {child.code} • {child.productCount} products
                            </div>
                          </div>
                          <Badge variant={child.isActive ? 'default' : 'secondary'}>
                            {child.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="attributes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Attributes</CardTitle>
                  <CardDescription>
                    Additional attributes for products in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {category.attributes.length === 0 ? (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Custom Attributes</h3>
                      <p className="text-muted-foreground">
                        This category doesn't have any custom attributes defined
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {category.attributes.map((attribute) => (
                        <div key={attribute.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded">
                              {getAttributeTypeIcon(attribute.type)}
                            </div>
                            <div>
                              <div className="font-medium">{attribute.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Type: {getAttributeTypeLabel(attribute.type)}
                              </div>
                              {attribute.options && attribute.options.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Options: {attribute.options.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {attribute.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {getAttributeTypeLabel(attribute.type)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Products in Category</CardTitle>
                  <CardDescription>
                    Products assigned to this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell className="text-sm">{product.description}</TableCell>
                          <TableCell>
                            <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                              {product.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(product.lastUpdated), 'MMM dd, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Created By</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {category.createdBy === 'system' ? 'System' : category.createdBy}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Created Date</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(category.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Last Updated</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(category.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Category ID</div>
                      <div className="text-sm font-mono">{category.id}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <div className="flex items-center space-x-2">
                        {category.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {category.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Hierarchy Level:</span>
                      <span className="text-sm font-medium">Level {category.level}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Product Count:</span>
                      <span className="text-sm font-medium">{category.productCount} products</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Custom Attributes:</span>
                      <span className="text-sm font-medium">{category.attributes.length} attributes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}