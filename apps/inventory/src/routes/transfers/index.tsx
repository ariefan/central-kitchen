import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { Filter, Eye, Plus, Search, Send, Package, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import StockTransferForm from '@/components/stock-transfer/StockTransferForm'
import TransferWorkflowDialog from '@/components/stock-transfer/TransferWorkflowDialog'
import { locationService } from '@/services/locations'
import { transferService } from '@/services/transfers'
import type { Location } from '@/types/inventory'
import type {
  CreateTransferPayload,
  ReceiveTransferPayload,
  TransferDetail,
  TransferSummary,
  TransferStatus,
} from '@/types/transfers'
import { invalidateQueries, queryKeys } from '@/lib/api'

type WorkflowAction = 'send' | 'receive' | 'post'

const statusStyles: Record<TransferStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  pending_approval: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  sent: { label: 'Sent', className: 'bg-indigo-100 text-indigo-800' },
  in_transit: { label: 'In Transit', className: 'bg-indigo-100 text-indigo-800' },
  partial_receipt: { label: 'Partial Receipt', className: 'bg-amber-100 text-amber-800' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' },
  posted: { label: 'Posted', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
}

const StatusBadge = ({ status }: { status: TransferStatus }) => {
  const meta = statusStyles[status]
  if (!meta) return null
  return (
    <Badge variant="outline" className={meta.className}>
      {meta.label}
    </Badge>
  )
}

interface DialogState {
  open: boolean
  action: WorkflowAction | null
  transfer?: TransferDetail | null
  isLoading: boolean
}

export function StockTransferComponent() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    action: null,
    transfer: null,
    isLoading: false,
  })

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: queryKeys.locations,
    queryFn: () => locationService.list(),
  })

  const {
    data: transfers = [],
    isLoading: transfersLoading,
    isError: transfersError,
  } = useQuery({
    queryKey: queryKeys.transfers(),
    queryFn: () => transferService.list(),
  })

  const createTransfer = useMutation({
    mutationFn: (payload: CreateTransferPayload) => transferService.create(payload),
    onSuccess: () => {
      toast.success('Transfer created')
      invalidateQueries.transfers()
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create transfer')
    },
  })

  const locationMap = useMemo(() => {
    return locations.reduce<Record<string, Location>>((acc, location) => {
      acc[location.id] = location
      return acc
    }, {})
  }, [locations])

  const filteredTransfers = useMemo(() => {
    if (!searchTerm) return transfers
    const term = searchTerm.toLowerCase()
    return transfers.filter((transfer) => {
      const fromLocation = locationMap[transfer.fromLocationId]
      const toLocation = locationMap[transfer.toLocationId]
      return (
        transfer.transferNumber.toLowerCase().includes(term) ||
        fromLocation?.name.toLowerCase().includes(term) ||
        toLocation?.name.toLowerCase().includes(term)
      )
    })
  }, [transfers, searchTerm, locationMap])

  const handleWorkflowAction = async (action: WorkflowAction, id: string) => {
    setDialogState({ open: true, action, transfer: null, isLoading: true })
    try {
      const detail = await transferService.getById(id)
      setDialogState({ open: true, action, transfer: detail, isLoading: false })
    } catch (error) {
      toast.error('Unable to load transfer details')
      setDialogState({ open: false, action: null, transfer: null, isLoading: false })
    }
  }

  const columns = useMemo<ColumnDef<TransferSummary>[]>(() => [
    {
      accessorKey: 'transferNumber',
      header: 'Document #',
      cell: ({ row }) => <span className="font-semibold">{row.original.transferNumber}</span>,
    },
    {
      accessorKey: 'fromLocationId',
      header: 'From',
      cell: ({ row }) => {
        const location = locationMap[row.original.fromLocationId]
        return (
          <div>
            <p className="font-medium">{location?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{location?.code ?? ''}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'toLocationId',
      header: 'To',
      cell: ({ row }) => {
        const location = locationMap[row.original.toLocationId]
        return (
          <div>
            <p className="font-medium">{location?.name ?? '—'}</p>
            <p className="text-xs text-muted-foreground">{location?.code ?? ''}</p>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'transferDate',
      header: 'Transfer Date',
      cell: ({ row }) => format(new Date(row.original.transferDate), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const transfer = row.original

        const canSend = ['draft', 'pending_approval', 'approved'].includes(transfer.status)
        const canReceive = transfer.status === 'sent'
        const canPost = transfer.status === 'completed'

        return (
          <div className="flex items-center gap-2">
            {canSend && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction('send', transfer.id)}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            )}
            {canReceive && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction('receive', transfer.id)}
              >
                <Package className="mr-2 h-4 w-4" />
                Receive
              </Button>
            )}
            {canPost && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction('post', transfer.id)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Post
              </Button>
            )}
            {!canSend && !canReceive && !canPost && (
              <span className="text-sm text-muted-foreground">No actions</span>
            )}
          </div>
        )
      },
    },
  ], [locationMap])

  const table = useReactTable({
    data: filteredTransfers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  })

  const stats = useMemo(() => {
    const draft = transfers.filter((transfer) =>
      ['draft', 'pending_approval', 'approved'].includes(transfer.status)
    ).length
    const inTransit = transfers.filter((transfer) =>
      ['sent', 'in_transit'].includes(transfer.status)
    ).length
    const completed = transfers.filter((transfer) =>
      ['completed', 'posted'].includes(transfer.status)
    ).length

    return {
      total: transfers.length,
      draft,
      inTransit,
      completed,
    }
  }, [transfers])

  const isLoading = transfersLoading || locationsLoading

  const handleWorkflowSubmit = async (payload?: ReceiveTransferPayload) => {
    const { action, transfer } = dialogState
    if (!action || !transfer) return

    try {
      if (action === 'send') {
        await transferService.send(transfer.id)
        toast.success('Transfer sent')
      } else if (action === 'receive') {
        if (!payload) {
          toast.error('No receiving data provided')
          return
        }
        await transferService.receive(transfer.id, payload)
        toast.success('Transfer received')
      } else if (action === 'post') {
        await transferService.post(transfer.id)
        toast.success('Transfer posted')
      }

      invalidateQueries.transfers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Workflow action failed')
    } finally {
      setDialogState({ open: false, action: null, transfer: null, isLoading: false })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Live data from the ERP API
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Transfer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">Awaiting send</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground">Sent but not received</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Received or posted</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfers</CardTitle>
          <CardDescription>Search and manage transfers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon" disabled>
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : transfersError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Unable to load transfers. Please ensure the ERP API is running.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No transfers match your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of {filteredTransfers.length} transfers
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <StockTransferForm
        open={showForm}
        onOpenChange={setShowForm}
        locations={locations}
        onSubmit={(payload) => createTransfer.mutateAsync(payload)}
        isSubmitting={createTransfer.isPending}
      />

      <TransferWorkflowDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState({ open: false, action: null, transfer: null, isLoading: false })
          }
        }}
        action={dialogState.action}
        transfer={dialogState.transfer}
        onAction={handleWorkflowSubmit}
        isLoading={dialogState.isLoading}
      />
    </div>
  )
}

export const Route = createFileRoute('/transfers/')({
  component: StockTransferComponent,
})
