import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useProducts } from './useProducts'
import { useLots } from './useLots'
import { useInventoryOnHand } from './useInventory'
import type { Product, Lot, InventoryOnHand } from '@/types/inventory'

interface SearchResult {
  id: string
  type: 'product' | 'lot' | 'inventory'
  title: string
  subtitle: string
  url: string
  metadata?: Record<string, any>
}

export function useGlobalSearch(query: string) {
  const navigate = useNavigate()

  // Data hooks
  const { data: productsData } = useProducts()
  const { data: lotsData } = useLots()
  const { data: inventoryData } = useInventoryOnHand()

  const products = productsData?.data || []
  const lots = lotsData?.data || []
  const inventory = inventoryData?.data || []

  const results = useMemo(() => {
    if (!query.trim()) return []

    const searchTerm = query.toLowerCase()
    const filteredResults: SearchResult[] = []

    // Search products
    products.forEach((product: Product) => {
      if (
        product.name.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      ) {
        filteredResults.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: `SKU: ${product.sku}`,
          url: `/products`,
          metadata: { product },
        })
      }
    })

    // Search lots
    lots.forEach((lot: Lot) => {
      if (
        lot.lotNumber.toLowerCase().includes(searchTerm) ||
        lot.product.name.toLowerCase().includes(searchTerm) ||
        lot.product.sku.toLowerCase().includes(searchTerm)
      ) {
        filteredResults.push({
          id: lot.id,
          type: 'lot',
          title: lot.lotNumber,
          subtitle: `${lot.product.name} - ${lot.locationName}`,
          url: `/inventory/lots`,
          metadata: { lot },
        })
      }
    })

    // Search inventory
    inventory.forEach((item: InventoryOnHand) => {
      if (
        item.productName.toLowerCase().includes(searchTerm) ||
        item.productSku.toLowerCase().includes(searchTerm)
      ) {
        filteredResults.push({
          id: `${item.productId}-${item.locationId}`,
          type: 'inventory',
          title: item.productName,
          subtitle: `${item.locationName} - Stock: ${item.qty.toLocaleString()}`,
          url: `/inventory/onhand`,
          metadata: { inventory: item },
        })
      }
    })

    return filteredResults.slice(0, 10) // Limit results
  }, [query, products, lots, inventory])

  const navigateToResult = useCallback((result: SearchResult) => {
    navigate({ to: result.url })
  }, [navigate])

  return {
    results,
    navigateToResult,
    hasResults: results.length > 0,
    isLoading: false, // Since all hooks handle their own loading states
  }
}