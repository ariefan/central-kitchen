import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Loader2,
  Package,
  Send,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ReceiveTransferPayload, TransferDetail, TransferStatus } from '@/types/transfers'

type WorkflowAction = 'send' | 'receive' | 'post'

const getStatusBadgeClass = (status: TransferStatus) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    case 'pending_approval':
    case 'approved':
      return 'bg-blue-100 text-blue-800'
    case 'sent':
    case 'in_transit':
      return 'bg-indigo-100 text-indigo-800'
    case 'partial_receipt':
      return 'bg-amber-100 text-amber-800'
    case 'completed':
    case 'posted':
      return 'bg-emerald-100 text-emerald-800'
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const receiveSchema = z.object({
  items: z.array(z.object({
    transferItemId: z.string(),
    receivedQuantity: z.number().min(0, 'Quantity must be zero or greater'),
    notes: z.string().optional(),
  })),
  discrepancyReason: z.string().optional(),
})

type ReceiveFormValues = z.infer<typeof receiveSchema>

const ReceiveForm = ({
  transfer,
  onConfirm,
  onCancel,
}: {
  transfer: TransferDetail
  onConfirm: (payload: ReceiveTransferPayload) => void
  onCancel: () => void
}) => {
  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      items: transfer.items.map((item) => ({
        transferItemId: item.id,
        receivedQuantity: item.qtyReceived ?? item.quantity,
        notes: item.notes ?? '',
      })),
      discrepancyReason: '',
    },
  })

  const watchedItems = form.watch('items')
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false)

  useEffect(() => {
    const diff = watchedItems.some((item, index) => {
      const source = transfer.items[index]
      return item.receivedQuantity !== source.quantity
    })
    setHasDiscrepancies(diff)
  }, [watchedItems, transfer.items])

  const handleSubmit = (values: ReceiveFormValues) => {
    const payload: ReceiveTransferPayload = {
      items: values.items.map((item) => ({
        transferItemId: item.transferItemId,
        qtyReceived: item.receivedQuantity,
        notes: item.notes,
      })),
    }
    onConfirm(payload)
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-semibold">{transfer.transferNumber}</p>
          <p className="text-muted-foreground">
            {transfer.fromLocation?.name ?? '—'} → {transfer.toLocation?.name ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
            </span>
            <Badge variant="outline" className={getStatusBadgeClass(transfer.status)}>
              {transfer.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold">Receive Quantities</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfer.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{item.productName ?? 'Unknown item'}</div>
                    <div className="text-xs text-muted-foreground">{item.productSku ?? item.productId}</div>
                  </TableCell>
                  <TableCell>{item.quantity} {item.uomCode ?? ''}</TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.receivedQuantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={field.value ?? ''}
                                onChange={(event) => field.onChange(Number(event.target.value))}
                                className="w-28"
                              />
                              <span className="text-xs text-muted-foreground">{item.uomCode ?? ''}</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`items.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} placeholder="Optional" className="text-xs" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {hasDiscrepancies && (
          <FormField
            control={form.control}
            name="discrepancyReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discrepancy Reason</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Explain why received quantities differ from expected."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Package className="mr-2 h-4 w-4" />
            Receive Transfer
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

const SendConfirmation = ({
  transfer,
  onConfirm,
  onCancel,
}: {
  transfer: TransferDetail
  onConfirm: () => void
  onCancel: () => void
}) => {
  const [acknowledged, setAcknowledged] = useState(false)
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{transfer.transferNumber}</p>
            <p className="text-xs text-muted-foreground">
              {transfer.fromLocation?.name ?? '—'} → {transfer.toLocation?.name ?? '—'}
            </p>
          </div>
          <Badge variant="outline" className={getStatusBadgeClass(transfer.status)}>
            {transfer.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>
            Planned: {transfer.items.length} item{transfer.items.length === 1 ? '' : 's'}
          </span>
          <span>
            Transfer Date: {format(new Date(transfer.transferDate), 'MMM dd, yyyy')}
          </span>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Line Items</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfer.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="text-sm font-medium">{item.productName ?? 'Unknown item'}</div>
                  <div className="text-xs text-muted-foreground">{item.productSku ?? item.productId}</div>
                </TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.uomCode ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox
          id="send-ack"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div className="text-sm">
          <label htmlFor="send-ack" className="font-medium">
            I confirm the goods are ready to be sent.
          </label>
          <p className="text-xs text-muted-foreground">
            This will reserve stock at the origin location.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!acknowledged}>
          <Send className="mr-2 h-4 w-4" />
          Send Transfer
        </Button>
      </DialogFooter>
    </div>
  )
}

const PostConfirmation = ({
  transfer,
  onConfirm,
  onCancel,
}: {
  transfer: TransferDetail
  onConfirm: () => void
  onCancel: () => void
}) => {
  const [acknowledged, setAcknowledged] = useState(false)
  const totalExpected = transfer.items.reduce((acc, item) => acc + item.quantity, 0)
  const totalReceived = transfer.items.reduce((acc, item) => acc + (item.qtyReceived ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-semibold">{transfer.transferNumber}</p>
        <p className="text-xs text-muted-foreground">
          Ready to post and update stock levels.
        </p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Expected Quantity</p>
            <p className="text-lg font-semibold">{totalExpected}</p>
          </div>
          <div className="rounded-lg bg-background p-3">
            <p className="text-xs text-muted-foreground">Received Quantity</p>
            <p className="text-lg font-semibold">{totalReceived}</p>
          </div>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Posting will finalize the transfer and adjust inventory at both locations. This action cannot be undone.
        </AlertDescription>
      </Alert>

      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox
          id="post-ack"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div className="text-sm">
          <label htmlFor="post-ack" className="font-medium">
            I confirm all quantities are correct.
          </label>
          <p className="text-xs text-muted-foreground">
            Inventory balances will be updated immediately.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!acknowledged}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Post Transfer
        </Button>
      </DialogFooter>
    </div>
  )
}

interface TransferWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: WorkflowAction | null
  transfer?: TransferDetail | null
  onAction: (payload?: ReceiveTransferPayload) => void
  isLoading?: boolean
}

export default function TransferWorkflowDialog({
  open,
  onOpenChange,
  action,
  transfer,
  onAction,
  isLoading = false,
}: TransferWorkflowDialogProps) {
  if (!action) {
    return null
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleConfirm = (payload?: ReceiveTransferPayload) => {
    onAction(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            {action === 'send' && <Send className="h-5 w-5" />}
            {action === 'receive' && <Package className="h-5 w-5" />}
            {action === 'post' && <CheckCircle className="h-5 w-5" />}
            {action} transfer
          </DialogTitle>
          <DialogDescription>
            {action === 'send' && 'Confirm the goods are ready and mark this transfer as sent.'}
            {action === 'receive' && 'Capture quantities received at the destination location.'}
            {action === 'post' && 'Finalize the transfer and update on-hand balances.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !transfer ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {action === 'send' && (
              <SendConfirmation
                transfer={transfer}
                onConfirm={() => handleConfirm()}
                onCancel={handleClose}
              />
            )}
            {action === 'receive' && (
              <ReceiveForm
                transfer={transfer}
                onConfirm={(payload) => handleConfirm(payload)}
                onCancel={handleClose}
              />
            )}
            {action === 'post' && (
              <PostConfirmation
                transfer={transfer}
                onConfirm={() => handleConfirm()}
                onCancel={handleClose}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
