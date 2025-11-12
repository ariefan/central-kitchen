import { api } from '@/lib/api'
import type {
  CreateTransferPayload,
  ReceiveTransferPayload,
  TransferDetail,
  TransferFilters,
  TransferItem,
  TransferLocationSummary,
  TransferStatus,
  TransferSummary,
} from '@/types/transfers'

type TransferRecord = {
  id: string
  transferNumber: string
  fromLocationId: string
  toLocationId: string
  transferDate: string
  expectedDeliveryDate: string | null
  actualDeliveryDate: string | null
  status: TransferStatus
  requestedBy?: string | null
  sentBy?: string | null
  sentAt?: string | null
  receivedBy?: string | null
  receivedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

type LocationRecord = {
  id: string
  code: string
  name: string
}

type TransferListRow = {
  transfers: TransferRecord
  locations: LocationRecord | null
}

type TransferDetailApiResponse = TransferRecord & {
  fromLocation?: LocationRecord | null
  toLocation?: LocationRecord | null
  items?: Array<TransferItemApiRow | TransferItemRecord>
}

type TransferItemRecord = {
  id: string
  transferId: string
  productId: string
  uomId: string
  quantity: string | number
  qtyReceived?: string | number | null
  notes?: string | null
}

type TransferItemApiRow = {
  transfer_items?: TransferItemRecord
  transferItems?: TransferItemRecord
  products?: {
    id: string
    name: string
    sku: string
  } | null
  uoms?: {
    id: string
    code: string
    name: string
  } | null
}

const mapLocation = (location?: LocationRecord | null): TransferLocationSummary | undefined => {
  if (!location) return undefined
  return {
    id: location.id,
    name: location.name,
    code: location.code,
  }
}

const mapTransferSummary = (row: TransferListRow): TransferSummary => {
  const transfer = row.transfers
  const metadata = transfer.metadata ?? {}

  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    fromLocationId: transfer.fromLocationId,
    toLocationId: transfer.toLocationId,
    status: transfer.status,
    transferDate: transfer.transferDate,
    expectedDeliveryDate: transfer.expectedDeliveryDate,
    actualDeliveryDate: transfer.actualDeliveryDate,
    sentAt: transfer.sentAt,
    receivedAt: transfer.receivedAt,
    notes: transfer.notes ?? undefined,
    fromLocation: mapLocation(row.locations ?? undefined),
    lineItemCount: typeof metadata?.lineItemCount === 'number' ? (metadata.lineItemCount as number) : undefined,
    totalQuantity: typeof metadata?.totalQuantity === 'number' ? (metadata.totalQuantity as number) : undefined,
    receivedQuantity: typeof metadata?.receivedQuantity === 'number' ? (metadata.receivedQuantity as number) : undefined,
  }
}

const toNumber = (value?: string | number | null) =>
  typeof value === 'string' ? Number(value) : value ?? undefined

const mapTransferItem = (row: TransferItemApiRow | TransferItemRecord): TransferItem => {
  const base =
    'transfer_items' in row
      ? row.transfer_items
      : 'transferItems' in row
        ? row.transferItems
        : row

  if (!base) {
    throw new Error('Invalid transfer item payload from API')
  }

  return {
    id: base.id,
    productId: base.productId,
    productName: 'products' in row ? row.products?.name : undefined,
    productSku: 'products' in row ? row.products?.sku : undefined,
    uomId: base.uomId,
    uomCode: 'uoms' in row ? row.uoms?.code : undefined,
    quantity: toNumber(base.quantity) ?? 0,
    qtyReceived: toNumber(base.qtyReceived) ?? undefined,
    notes: base.notes ?? undefined,
  }
}

const mapTransferDetail = (transfer: TransferDetailApiResponse): TransferDetail => {
  const normalizedItems = (transfer.items ?? []).map(mapTransferItem)
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
  const receivedQuantity = normalizedItems.reduce((sum, item) => sum + (item.qtyReceived ?? 0), 0)

  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    fromLocationId: transfer.fromLocationId,
    toLocationId: transfer.toLocationId,
    status: transfer.status,
    transferDate: transfer.transferDate,
    expectedDeliveryDate: transfer.expectedDeliveryDate,
    actualDeliveryDate: transfer.actualDeliveryDate,
    sentAt: transfer.sentAt,
    receivedAt: transfer.receivedAt,
    notes: transfer.notes ?? undefined,
    fromLocation: mapLocation(transfer.fromLocation),
    toLocation: mapLocation(transfer.toLocation),
    lineItemCount: normalizedItems.length || undefined,
    totalQuantity: normalizedItems.length ? totalQuantity : undefined,
    receivedQuantity: normalizedItems.length ? receivedQuantity : undefined,
    items: normalizedItems,
  }
}

const encodeFilters = (filters?: TransferFilters) => {
  if (!filters) return ''
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.append(key, value)
    }
  })
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const transferService = {
  async list(filters?: TransferFilters): Promise<TransferSummary[]> {
    const query = encodeFilters(filters)
    const response = await api.get<TransferListRow[]>(`/api/v1/transfers${query}`)
    return (response.data ?? []).map(mapTransferSummary)
  },

  async getById(id: string): Promise<TransferDetail> {
    const response = await api.get<TransferDetailApiResponse>(`/api/v1/transfers/${id}`)
    return mapTransferDetail(response.data)
  },

  async create(payload: CreateTransferPayload): Promise<TransferDetail> {
    const response = await api.post<TransferDetailApiResponse>('/api/v1/transfers', payload)
    return mapTransferDetail(response.data)
  },

  async send(id: string) {
    return api.post(`/api/v1/transfers/${id}/send`, {})
  },

  async receive(id: string, payload: ReceiveTransferPayload) {
    return api.post(`/api/v1/transfers/${id}/receive`, payload)
  },

  async post(id: string) {
    return api.post(`/api/v1/transfers/${id}/post`, {})
  },
}

export type { TransferSummary, TransferDetail }
