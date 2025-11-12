import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import ProductsTable from '@/components/products/ProductsTable'
import ProductForm from '@/components/products/ProductForm'
import ProductDetail from '@/components/products/ProductDetail'

import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/inventory'

export const Route = createFileRoute('/products')({
  component: Products,
})

function Products() {
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const { data: productsData, isLoading, error } = useProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const products = productsData?.items || []

  const handleCreate = () => {
    setSelectedProduct(null)
    setFormMode('create')
    setShowForm(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setFormMode('edit')
    setShowForm(true)
  }

  const handleView = (product: Product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const handleDelete = (product: Product) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProduct.mutate(product.id, {
        onSuccess: () => {
          toast.success('Product deleted successfully')
        },
        onError: (error) => {
          toast.error('Failed to delete product')
        },
      })
    }
  }

  const handleFormSubmit = (data: any) => {
    if (formMode === 'create') {
      createProduct.mutate(data, {
        onSuccess: () => {
          toast.success('Product created successfully')
          setShowForm(false)
        },
        onError: (error) => {
          toast.error('Failed to create product')
        },
      })
    } else {
      updateProduct.mutate(
        { id: selectedProduct!.id, data },
        {
          onSuccess: () => {
            toast.success('Product updated successfully')
            setShowForm(false)
          },
          onError: (error) => {
            toast.error('Failed to update product')
          },
        }
      )
    }
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setSelectedProduct(null)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage product master data
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Failed to load products. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage product master data ({products.length} items)
          </p>
        </div>
        <Button onClick={handleCreate}>
          New Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Products List</CardTitle>
          <CardDescription>
            View, edit, and manage your product catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first product.
              </p>
              <Button onClick={handleCreate}>Create Product</Button>
            </div>
          ) : (
            <ProductsTable
              data={products}
              loading={isLoading}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && handleFormCancel()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create New Product' : 'Edit Product'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={selectedProduct}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={createProduct.isPending || updateProduct.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Product Detail Drawer */}
      <ProductDetail
        product={selectedProduct}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={handleEdit}
      />
    </div>
  )
}