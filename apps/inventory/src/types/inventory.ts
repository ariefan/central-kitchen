// Product Management
export interface Product {
  id: string
  name: string
  sku: string
  description?: string
  kind: ProductKind
  baseUom: string
  baseUomName: string
  perishable: boolean
  stdCost: number
  active: boolean
  categoryId?: string
  categoryName?: string
  minStockLevel?: number
  maxStockLevel?: number
  stock: number
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  lastUpdated: string
  createdAt: string
}

export enum ProductKind {
  RAW_MATERIAL = 'raw_material',
  SEMI_FINISHED = 'semi_finished',
  FINISHED_GOOD = 'finished_good',
  PACKAGING = 'packaging',
  CONSUMABLE = 'consumable'
}

export interface Category {
  id: string
  name: string
  description?: string
  parentId?: string
  createdAt: string
}

export interface UnitOfMeasure {
  id: string
  code: string
  name: string
  baseUnit: boolean
  active: boolean
}

export interface Pack {
  id: string
  productId: string
  uomId: string
  uomCode: string
  uomName: string
  qty: number
  barcode?: string
  defaultPurchase: boolean
  defaultSell: boolean
  active: boolean
}

// Supplier Management
export interface Supplier {
  id: string
  code: string
  name: string
  email: string
  phone: string
  address: string
  contactPerson?: string
  leadTimeDays: number
  paymentTerms?: string
  active: boolean
  createdAt: string
}

export interface SupplierProduct {
  id: string
  supplierId: string
  supplierName: string
  productId: string
  productSku: string
  productName: string
  supplierSku?: string
  leadTimeDays: number
  minOrderQty: number
  unitCost: number
  defaultPackId?: string
  defaultPackName?: string
  active: boolean
}

// Inventory Management
export interface InventoryOnHand {
  productId: string
  product: Product
  locationId: string
  locationName: string
  locationType: string
  qtyBase: number
  qtyDefaultSellUom: number
  minStock?: number
  maxStock?: number
  lastMovementAt?: string
}

export interface Lot {
  id: string
  productId: string
  product: Product
  locationId: string
  locationName: string
  lotNumber: string
  expiryDate?: string
  receivedDate: string
  qtyBase: number
  costPerUnit: number
  status: LotStatus
  supplierId?: string
  supplierName?: string
}

export enum LotStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONSUMED = 'consumed',
  DAMAGED = 'damaged'
}

// Location Management
export interface Location {
  id: string
  code: string
  name: string
  type: LocationType
  parentId?: string
  active: boolean
}

export enum LocationType {
  CENTRAL_KITCHEN = 'central_kitchen',
  OUTLET = 'outlet',
  WAREHOUSE = 'warehouse'
}

// Stock Movement
export interface StockMovement {
  id: string
  productId: string
  locationId: string
  type: 'rcv' | 'iss' | 'adj' | 'xfer_out' | 'xfer_in' | 'prod_out' | 'prod_in'
  quantity: number
  reason: string
  reference?: string
  lotId?: string
  lotNumber?: string
  userId: string
  createdAt: string
}

// Statistics
export interface InventoryStats {
  totalProducts: number
  lowStockItems: number
  outOfStockItems: number
  totalValue: number
  categories: number
  suppliers: number
  activeLots: number
  expiringLots: number
}

// Filters and Queries
export interface ProductFilters {
  search?: string
  kind?: ProductKind
  categoryId?: string
  active?: boolean
  perishable?: boolean
  locationId?: string
  page?: number
  limit?: number
}

export interface InventoryFilters {
  productId?: string
  locationId?: string
  categoryId?: string
  perishable?: boolean
  lowStock?: boolean
  negative?: boolean
  page?: number
  limit?: number
}

export interface LotFilters {
  productId?: string
  locationId?: string
  expiryFrom?: string
  expiryTo?: string
  status?: LotStatus
  fefo?: boolean
  page?: number
  limit?: number
}