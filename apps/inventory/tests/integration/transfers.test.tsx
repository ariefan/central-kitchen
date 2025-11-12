import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { StockTransferComponent } from '@/routes/transfers/index'

// Mock ResizeObserver for components relying on it
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as any

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Transfers Page Integration', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let queryClient: QueryClient

  const locationsResponse = {
    success: true,
    data: [
      { id: 'loc-1', name: 'Central Kitchen', code: 'CK-01', type: 'central_kitchen' },
      { id: 'loc-2', name: 'Outlet Alpha', code: 'OUT-01', type: 'outlet' },
    ],
    message: 'Locations retrieved successfully',
  }

  const transfersResponse = {
    success: true,
    data: [
      {
        transfers: {
          id: 'xfer-1',
          transferNumber: 'XFER-001',
          fromLocationId: 'loc-1',
          toLocationId: 'loc-2',
          status: 'draft',
          transferDate: new Date('2024-01-10').toISOString(),
          expectedDeliveryDate: new Date('2024-01-12').toISOString(),
          actualDeliveryDate: null,
          sentAt: null,
          receivedAt: null,
          notes: null,
          metadata: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        locations: {
          id: 'loc-1',
          name: 'Central Kitchen',
          code: 'CK-01',
        },
      },
    ],
    message: 'Transfers retrieved successfully',
  }

  const transferDetailResponse = {
    success: true,
    data: {
      id: 'xfer-1',
      transferNumber: 'XFER-001',
      fromLocationId: 'loc-1',
      toLocationId: 'loc-2',
      status: 'draft',
      transferDate: new Date('2024-01-10').toISOString(),
      expectedDeliveryDate: new Date('2024-01-12').toISOString(),
      actualDeliveryDate: null,
      sentAt: null,
      receivedAt: null,
      notes: null,
      items: [
        {
          transfer_items: {
            id: 'item-1',
            transferId: 'xfer-1',
            productId: 'prod-1',
            uomId: 'EA',
            quantity: '10',
            qtyReceived: null,
            notes: null,
          },
          products: {
            id: 'prod-1',
            name: 'Arabica Beans',
            sku: 'BEAN-001',
          },
          uoms: {
            id: 'EA',
            code: 'EA',
            name: 'Each',
          },
        },
      ],
    },
    message: 'Transfer retrieved successfully',
  }

  const productsResponse = {
    success: true,
    data: {
      items: [
        {
          id: 'prod-1',
          name: 'Arabica Beans',
          sku: 'BEAN-001',
          baseUomId: 'EA',
          baseUomName: 'Each',
          isPerishable: false,
        },
      ],
      total: 1,
      limit: 200,
      offset: 0,
    },
    message: 'Products retrieved successfully',
  }

  beforeEach(() => {
    fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString()
      if (url.endsWith('/api/v1/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(locationsResponse),
        })
      }
      if (url.includes('/api/v1/products')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(productsResponse),
        })
      }
      if (url.match(/\/api\/v1\/transfers\/.*\/send/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {}, message: 'Sent' }),
        })
      }
      if (url.match(/\/api\/v1\/transfers\/.*\/receive/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {}, message: 'Received' }),
        })
      }
      if (url.match(/\/api\/v1\/transfers\/.*\/post/)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {}, message: 'Posted' }),
        })
      }
      if (url.includes('/api/v1/transfers/') && init?.method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(transferDetailResponse),
        })
      }
      if (url.endsWith('/api/v1/transfers') && (!init || init.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(transfersResponse),
        })
      }
      if (url.endsWith('/api/v1/transfers') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(transferDetailResponse),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    })

    global.fetch = fetchMock as unknown as typeof fetch

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  const renderWithProviders = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <StockTransferComponent />
      </QueryClientProvider>
    )

  it('renders transfers fetched from the API', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('XFER-001')).toBeInTheDocument()
    })

    expect(screen.getByText('Central Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Outlet Alpha')).toBeInTheDocument()
  })

  it('creates a transfer using the form', async () => {
    renderWithProviders()

    await waitFor(() => {
      expect(screen.getByText('XFER-001')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New Transfer'))

    // Select from location
    fireEvent.click(screen.getAllByRole('combobox')[0])
    fireEvent.click(screen.getByText('Central Kitchen'))

    // Select to location
    fireEvent.click(screen.getAllByRole('combobox')[1])
    fireEvent.click(screen.getByText('Outlet Alpha'))

    // Add product
    const searchInput = screen.getByPlaceholderText('Search products...')
    fireEvent.change(searchInput, { target: { value: 'Arabica' } })
    await waitFor(() => {
      expect(screen.getByText('Arabica Beans')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Arabica Beans'))

    // Update quantity
    const quantityInput = screen.getAllByRole('spinbutton')[0]
    fireEvent.clear(quantityInput)
    fireEvent.change(quantityInput, { target: { value: '5' } })

    // Submit
    fireEvent.click(screen.getByText('Create Transfer'))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/transfers'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })
})
