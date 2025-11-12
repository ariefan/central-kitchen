import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
import * as z from 'zod'
import {
  PlayCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Scale,
  Clock,
  Calculator,
  Package,
} from 'lucide-react'

// Types
interface ProductionOrder {
  id: string
  documentNumber: string
  recipeName: string
  recipeCode: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'posted' | 'cancelled'
  scheduledDate: string
  scheduledQuantity: number
  actualQuantity?: number
  unitOfMeasure: string
  completionPercentage: number
  createdBy: string
  createdAt: string
  startedAt?: string
  completedAt?: string
  postedAt?: string
  notes?: string
  components?: Array<{
    productId: string
    productName: string
    productCode: string
    plannedQuantity: number
    actualQuantity?: number
    unitOfMeasure: string
    isPerishable: boolean
  }>
  finishedGoods?: Array<{
    lotNumber: string
    quantity: number
    expiryDate: string
    unitOfMeasure: string
  }>
}

type WorkflowAction = 'start' | 'complete' | 'post' | 'cancel'

// Schema for complete workflow
const completeSchema = z.object({
  actualQuantity: z.number().min(0.01, 'Actual quantity must be greater than 0'),
  notes: z.string().optional(),
  finishedGoods: z.array(z.object({
    lotNumber: z.string().min(1, 'Lot number is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    expiryDate: z.string().min(1, 'Expiry date is required'),
    unitOfMeasure: z.string(),
  })).min(1, 'At least one finished goods lot is required'),
})

// Schema for post workflow
const postSchema = z.object({
  acknowledged: z.boolean().default(false),
  notes: z.string().optional(),
})

type CompleteFormData = z.infer<typeof completeSchema>
type PostFormData = z.infer<typeof postSchema>

// Mock data for demo
const mockProductionOrder: ProductionOrder = {
  id: '1',
  documentNumber: 'PO-2024-001',
  recipeName: 'Fresh Tomato Sauce',
  recipeCode: 'RCP-001',
  status: 'in-progress',
  scheduledDate: '2024-01-16',
  scheduledQuantity: 50,
  actualQuantity: 0,
  unitOfMeasure: 'L',
  completionPercentage: 30,
  createdBy: 'John Doe',
  createdAt: '2024-01-16T08:00:00Z',
  startedAt: '2024-01-16T09:00:00Z',
  components: [
    {
      productId: '1',
      productName: 'Fresh Tomatoes',
      productCode: 'TOM001',
      plannedQuantity: 60,
      unitOfMeasure: 'kg',
      isPerishable: true,
    },
    {
      productId: '2',
      productName: 'Fresh Basil',
      productCode: 'BSL001',
      plannedQuantity: 2.5,
      unitOfMeasure: 'kg',
      isPerishable: true,
    },
    {
      productId: '3',
      productName: 'Garlic',
      productCode: 'GRC001',
      plannedQuantity: 1,
      unitOfMeasure: 'kg',
      isPerishable: true,
    },
    {
      productId: '4',
      productName: 'Olive Oil',
      productCode: 'OIL001',
      plannedQuantity: 5,
      unitOfMeasure: 'L',
      isPerishable: false,
    },
  ],
}

// Utility functions
const getActionTitle = (action: WorkflowAction, order: ProductionOrder) => {
  switch (action) {
    case 'start':
      return 'Start Production'
    case 'complete':
      return 'Complete Production'
    case 'post':
      return 'Post Production'
    case 'cancel':
      return 'Cancel Production Order'
    default:
      return 'Production Action'
  }
}

const getActionDescription = (action: WorkflowAction, order: ProductionOrder) => {
  switch (action) {
    case 'start':
      return 'Start this production order. Components will be reserved from inventory.'
    case 'complete':
      return 'Complete this production order by recording actual quantities and finished goods details.'
    case 'post':
      return 'Post this production order to finalize inventory movements. This will update stock levels.'
    case 'cancel':
      return 'Cancel this production order and release any reserved components.'
    default:
      return ''
  }
}

const getActionIcon = (action: WorkflowAction) => {
  switch (action) {
    case 'start':
      return <PlayCircle className="h-5 w-5" />
    case 'complete':
      return <CheckCircle className="h-5 w-5" />
    case 'post':
      return <CheckCircle className="h-5 w-5" />
    case 'cancel':
      return <AlertTriangle className="h-5 w-5" />
    default:
      return <FileText className="h-5 w-5" />
  }
}

// Components
const StartConfirmation = ({ order, onConfirm, onCancel }: {
  order: ProductionOrder
  onConfirm: () => void
  onCancel: () => void
}) => {
  const [acknowledged, setAcknowledged] = useState(false)

  return (
    <div className="space-y-6">
      {/* Production Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Production Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{order.documentNumber}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>{format(new Date(order.scheduledDate), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span>{order.recipeName}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Scale className="h-4 w-4 text-gray-500" />
            <span>{order.scheduledQuantity} {order.unitOfMeasure}</span>
          </div>
        </div>
      </div>

      {/* Component Requirements */}
      <div>
        <h3 className="font-semibold mb-3">Component Requirements</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component</TableHead>
              <TableHead>Planned Quantity</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.components?.map((component) => (
              <TableRow key={component.productId}>
                <TableCell>
                  <div>
                    <div className="font-medium">{component.productName}</div>
                    <div className="text-sm text-gray-500">{component.productCode}</div>
                  </div>
                </TableCell>
                <TableCell>{component.plannedQuantity} {component.unitOfMeasure}</TableCell>
                <TableCell>
                  {/* Mock available quantity - would come from API */}
                  {Math.floor(component.plannedQuantity * 1.2)} {component.unitOfMeasure}
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✓ Sufficient
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Once started, this production order will reserve components from inventory.
          Make sure all materials and equipment are ready before proceeding.
        </AlertDescription>
      </Alert>

      {/* Acknowledgment */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="start-acknowledged"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div>
          <label htmlFor="start-acknowledged" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            I confirm that all components are available and production area is ready
          </label>
          <p className="text-sm text-gray-500 mt-1">
            Starting production will reserve components and cannot be easily reversed.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!acknowledged}>
          <PlayCircle className="h-4 w-4 mr-2" />
          Start Production
        </Button>
      </DialogFooter>
    </div>
  )
}

const CompleteProduction = ({ order, onConfirm, onCancel }: {
  order: ProductionOrder
  onConfirm: (data: CompleteFormData) => void
  onCancel: () => void
}) => {
  const form = useForm<CompleteFormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      actualQuantity: order.scheduledQuantity,
      notes: '',
      finishedGoods: [{
        lotNumber: '',
        quantity: order.scheduledQuantity,
        expiryDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // Default 7 days from now
        unitOfMeasure: order.unitOfMeasure,
      }],
    },
  })

  const { control, watch } = form
  const actualQuantity = watch('actualQuantity')
  const finishedGoods = watch('finishedGoods')

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'finishedGoods',
  })

  const addFinishedGoodsLot = () => {
    append({
      lotNumber: '',
      quantity: 0,
      expiryDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      unitOfMeasure: order.unitOfMeasure,
    })
  }

  const totalFinishedQuantity = finishedGoods.reduce((sum, item) => sum + item.quantity, 0)
  const hasQuantityVariance = Math.abs(actualQuantity - order.scheduledQuantity) > 0.01

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Production Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">{order.documentNumber}</h3>
          <div className="text-sm text-gray-600">
            {order.recipeName} - {order.scheduledQuantity} {order.unitOfMeasure} planned
          </div>
        </div>

        {/* Actual Production */}
        <FormField
          control={control}
          name="actualQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actual Production Quantity</FormLabel>
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Input
                    {...field}
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-sm text-gray-500">{order.unitOfMeasure}</span>
                </div>
              </FormControl>
              <FormDescription>
                Planned: {order.scheduledQuantity} {order.unitOfMeasure}
                {hasQuantityVariance && (
                  <span className="text-orange-600 ml-2">
                    Variance: {(actualQuantity - order.scheduledQuantity).toFixed(1)} {order.unitOfMeasure}
                  </span>
                )}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Finished Goods */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Finished Goods</h3>
            <Button type="button" variant="outline" size="sm" onClick={addFinishedGoodsLot}>
              Add Lot
            </Button>
          </div>

          <div className="text-sm text-gray-600 mb-3">
            Enter details for finished goods lots. Total quantity should match actual production.
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Lot {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={control}
                    name={`finishedGoods.${index}.lotNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter lot number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`finishedGoods.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-1">
                            <Input
                              {...field}
                              type="number"
                              step="0.1"
                              placeholder="0.0"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-sm text-gray-500">{order.unitOfMeasure}</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`finishedGoods.${index}.expiryDate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Quantity Check */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Finished Goods:</span>
              <span className={`font-bold ${Math.abs(totalFinishedQuantity - actualQuantity) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                {totalFinishedQuantity.toFixed(1)} {order.unitOfMeasure}
              </span>
            </div>
            {Math.abs(totalFinishedQuantity - actualQuantity) > 0.01 && (
              <p className="text-sm text-red-600 mt-1">
                Total must match actual production quantity ({actualQuantity.toFixed(1)} {order.unitOfMeasure})
              </p>
            )}
          </div>
        </div>

        {/* Production Notes */}
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Production Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any notes about the production process, quality issues, etc..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onConfirm)}
            disabled={Math.abs(totalFinishedQuantity - actualQuantity) > 0.01}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Production
          </Button>
        </DialogFooter>
      </div>
    </Form>
  )
}

const PostConfirmation = ({ order, onConfirm, onCancel }: {
  order: ProductionOrder
  onConfirm: (data: PostFormData) => void
  onCancel: () => void
}) => {
  const form = useForm<PostFormData>({
    defaultValues: {
      acknowledged: false,
      notes: '',
    },
  })

  const [acknowledged, setAcknowledged] = useState(false)

  const handleSubmit = () => {
    onConfirm({ acknowledged: true, notes: form.getValues('notes') })
  }

  return (
    <div className="space-y-6">
      {/* Final Review */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Production Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Document:</span> {order.documentNumber}
          </div>
          <div>
            <span className="font-medium">Recipe:</span> {order.recipeName}
          </div>
          <div>
            <span className="font-medium">Planned:</span> {order.scheduledQuantity} {order.unitOfMeasure}
          </div>
          <div>
            <span className="font-medium">Actual:</span> {order.actualQuantity} {order.unitOfMeasure}
          </div>
        </div>
      </div>

      {/* Finished Goods Summary */}
      <div>
        <h3 className="font-semibold mb-3">Finished Goods to Post</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lot Number</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Expiry Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.finishedGoods?.map((goods, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{goods.lotNumber}</TableCell>
                <TableCell>{goods.quantity} {goods.unitOfMeasure}</TableCell>
                <TableCell>{format(new Date(goods.expiryDate), 'MMM dd, yyyy')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Posting this production order will:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>Add finished goods to inventory</li>
            <li>Consume used components from inventory</li>
            <li>Create audit trail for production activity</li>
          </ul>
          This action cannot be undone.
        </AlertDescription>
      </Alert>

      {/* Acknowledgment */}
      <div className="flex items-start space-x-2">
        <Checkbox
          id="post-acknowledged"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div>
          <label htmlFor="post-acknowledged" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            I confirm that all production details are correct and this should be posted
          </label>
          <p className="text-sm text-gray-500 mt-1">
            This will permanently update inventory levels and create audit records.
          </p>
        </div>
      </div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Posting Notes (Optional)</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder="Any additional notes for this posting..."
                rows={2}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!acknowledged}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Post Production
        </Button>
      </DialogFooter>
    </div>
  )
}

// Main component
interface ProductionWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ProductionOrder
  action: WorkflowAction
  onAction: (data?: any) => void
}

export default function ProductionWorkflowDialog({
  open,
  onOpenChange,
  order,
  action,
  onAction
}: ProductionWorkflowDialogProps) {
  const handleConfirm = (data?: any) => {
    onAction(data)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getActionIcon(action)}
            <span>{getActionTitle(action, order)}</span>
          </DialogTitle>
          <DialogDescription>
            {getActionDescription(action, order)}
          </DialogDescription>
        </DialogHeader>

        {action === 'start' && (
          <StartConfirmation
            order={order}
            onConfirm={() => handleConfirm()}
            onCancel={handleCancel}
          />
        )}

        {action === 'complete' && (
          <CompleteProduction
            order={order}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {action === 'post' && (
          <PostConfirmation
            order={order}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}

        {action === 'cancel' && (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Are you sure you want to cancel this production order? This will release any reserved components
                and cannot be undone.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                No, Keep Order
              </Button>
              <Button variant="destructive" onClick={() => handleConfirm()}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Yes, Cancel Order
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}