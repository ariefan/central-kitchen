export type TransferStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'in_transit'
  | 'partial_receipt'
  | 'completed'
  | 'posted'
  | 'cancelled'

export interface TransferLocationSummary {
  id: string
  name: string
  code: string
}

export interface TransferSummary {
  id: string
  transferNumber: string
  fromLocationId: string
  toLocationId: string
  status: TransferStatus
  transferDate: string
  expectedDeliveryDate?: string | null
  actualDeliveryDate?: string | null
  sentAt?: string | null
  receivedAt?: string | null
  notes?: string | null
  fromLocation?: TransferLocationSummary
  toLocation?: TransferLocationSummary
  lineItemCount?: number
  totalQuantity?: number
  receivedQuantity?: number
}

export interface TransferItem {
  id: string
  productId: string
  productName?: string
  productSku?: string
  uomId: string
  uomCode?: string
  quantity: number
  qtyReceived?: number
  notes?: string | null
}

export interface TransferDetail extends TransferSummary {
  items: TransferItem[]
}

export interface TransferFilters {
  status?: string
  fromLocationId?: string
  toLocationId?: string
  dateFrom?: string
  dateTo?: string
}

export interface CreateTransferPayload {
  fromLocationId: string
  toLocationId: string
  expectedDeliveryDate?: string
  notes?: string
  items: Array<{
    productId: string
    uomId: string
    quantity: number
    notes?: string
  }>
}

export interface ReceiveTransferPayload {
  items: Array<{
    transferItemId: string
    qtyReceived: number
    notes?: string
  }>
}
