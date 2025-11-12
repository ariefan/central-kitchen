import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/inventory/')({ component: Inventory })

function Inventory() {
  const mockProducts = [
    {
      id: 1,
      name: 'Wireless Mouse',
      sku: 'WM-001',
      category: 'Electronics',
      stock: 50,
      price: 29.99,
      status: 'in-stock' as const,
      lastUpdated: '2024-01-15'
    },
    {
      id: 2,
      name: 'USB Cable',
      sku: 'UC-002',
      category: 'Accessories',
      stock: 5,
      price: 9.99,
      status: 'low-stock' as const,
      lastUpdated: '2024-01-14'
    },
    {
      id: 3,
      name: 'Mechanical Keyboard',
      sku: 'MK-003',
      category: 'Electronics',
      stock: 0,
      price: 89.99,
      status: 'out-of-stock' as const,
      lastUpdated: '2024-01-13'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <Badge variant="default" className="bg-green-500">In Stock</Badge>
      case 'low-stock':
        return <Badge variant="secondary" className="bg-yellow-500">Low Stock</Badge>
      case 'out-of-stock':
        return <Badge variant="destructive">Out of Stock</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Inventory</h1>
            <p className="text-muted-foreground">Manage your products and stock levels</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <CardDescription>{mockProducts.length} products in inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Product</th>
                    <th className="text-left p-4">SKU</th>
                    <th className="text-left p-4">Category</th>
                    <th className="text-left p-4">Stock</th>
                    <th className="text-left p-4">Price</th>
                    <th className="text-left p-4">Status</th>
                    <th className="text-left p-4">Last Updated</th>
                    <th className="text-left p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProducts.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-medium">{product.name}</td>
                      <td className="p-4 text-muted-foreground">{product.sku}</td>
                      <td className="p-4">{product.category}</td>
                      <td className="p-4">
                        <span className={product.stock <= 5 ? 'text-red-600 font-semibold' : ''}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-4">${product.price.toFixed(2)}</td>
                      <td className="p-4">{getStatusBadge(product.status)}</td>
                      <td className="p-4 text-muted-foreground">{product.lastUpdated}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}