import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Camera,
  Package,
  Search,
  Plus,
  Minus,
  Check,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calculator,
  Barcode,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import BarcodeScanner from './BarcodeScanner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Types
interface StockCountItem {
  id: string
  productId: string
  productCode: string
  productName: string
  locationCode: string
  locationName: string
  expectedQuantity: number
  countedQuantity: number
  uom: string
  category: string
  lotNumber?: string
  expiryDate?: string
  notes?: string
  countedAt?: string
  countedBy: string
  status: 'pending' | 'counted' | 'variance'
  variance?: number
  variancePercentage?: number
}

interface StockCountSession {
  id: string
  documentNumber: string
  description: string
  status: 'in-progress' | 'paused' | 'completed'
  locationName: string
  locationCode: string
  totalItems: number
  countedItems: number
  varianceItems: number
  startedAt: string
  lastActivityAt: string
  countedBy: string
  notes?: string
}

// Mock data
const mockSession: StockCountSession = {
  id: 'sc-session-1',
  documentNumber: 'SC-2024-001',
  description: 'Monthly warehouse stock count',
  status: 'in-progress',
  locationName: 'Main Warehouse',
  locationCode: 'WH-001',
  totalItems: 245,
  countedItems: 127,
  varianceItems: 8,
  startedAt: '2024-01-15T09:00:00Z',
  lastActivityAt: '2024-01-15T11:45:00Z',
  countedBy: 'John Doe',
  notes: 'Focus on perishables first',
}

const mockItems: StockCountItem[] = [
  {
    id: '1',
    productId: 'p1',
    productCode: 'PRD-001',
    productName: 'Organic Tomatoes',
    locationCode: 'WH-001-A1',
    locationName: 'Section A - Rack 1',
    expectedQuantity: 50,
    countedQuantity: 0,
    uom: 'kg',
    category: 'Produce',
    lotNumber: 'LOT-2024-001',
    expiryDate: '2024-01-25',
    countedBy: 'John Doe',
    status: 'pending',
  },
  {
    id: '2',
    productId: 'p2',
    productCode: 'PRD-002',
    productName: 'Fresh Milk',
    locationCode: 'WH-001-B2',
    locationName: 'Cooler - Section B',
    expectedQuantity: 24,
    countedQuantity: 24,
    uom: 'liters',
    category: 'Dairy',
    lotNumber: 'LOT-2024-002',
    expiryDate: '2024-01-20',
    countedAt: '2024-01-15T10:30:00Z',
    countedBy: 'John Doe',
    status: 'counted',
  },
  {
    id: '3',
    productId: 'p3',
    productCode: 'PRD-003',
    productName: 'Whole Wheat Bread',
    locationCode: 'WH-001-C1',
    locationName: 'Bakery Section',
    expectedQuantity: 30,
    countedQuantity: 28,
    uom: 'pieces',
    category: 'Bakery',
    countedBy: 'John Doe',
    status: 'variance',
    variance: -2,
    variancePercentage: -6.67,
  },
]

// Mobile-optimized counting interface component
export default function MobileCountInterface({
  sessionId,
  onExit,
  onPause,
}: {
  sessionId: string
  onExit: () => void
  onPause: () => void
}) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [currentQuantity, setCurrentQuantity] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Query for session data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['stock-count-session', sessionId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500))
      return mockSession
    },
  })

  // Query for items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['stock-count-items', sessionId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 800))
      return mockItems
    },
  })

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity, notes }: { itemId: string; quantity: number; notes?: string }) => {
      await new Promise(resolve => setTimeout(resolve, 300))
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-count-items', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['stock-count-session', sessionId] })
    },
  })

  // Complete count mutation
  const completeCountMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { success: true }
    },
    onSuccess: () => {
      navigate({ to: '/stock-count' })
    },
  })

  const currentItem = items[currentItemIndex]
  const progress = session ? (session.countedItems / session.totalItems) * 100 : 0
  const completedItems = items.filter(item => item.status === 'counted' || item.status === 'variance').length

  // Auto-focus input when item changes
  useEffect(() => {
    if (currentItem && inputRef.current && !showSearch && !showDetails) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [currentItemIndex, currentItem, showSearch, showDetails])

  // Initialize current quantity when item changes
  useEffect(() => {
    if (currentItem && currentItem.countedQuantity > 0) {
      setCurrentQuantity(currentItem.countedQuantity.toString())
    } else {
      setCurrentQuantity('')
    }
    setNotes(currentItem?.notes || '')
  }, [currentItem])

  const handleQuantitySubmit = () => {
    const quantity = parseFloat(currentQuantity)
    if (!isNaN(quantity) && quantity >= 0 && currentItem) {
      updateQuantityMutation.mutate({
        itemId: currentItem.id,
        quantity,
        notes,
      })

      // Move to next item or show completion
      if (currentItemIndex < items.length - 1) {
        setCurrentItemIndex(prev => prev + 1)
      } else {
        // Show completion dialog
        setShowDetails(true)
      }
    }
  }

  const handleQuickQuantity = (value: number) => {
    if (currentItem) {
      const newQuantity = currentItem.countedQuantity + value
      if (newQuantity >= 0) {
        setCurrentQuantity(newQuantity.toString())
      }
    }
  }

  const handleSearchItem = (query: string) => {
    const index = items.findIndex(item =>
      item.productCode.toLowerCase().includes(query.toLowerCase()) ||
      item.productName.toLowerCase().includes(query.toLowerCase())
    )
    if (index !== -1) {
      setCurrentItemIndex(index)
      setShowSearch(false)
      setSearchQuery('')
    }
  }

  const handleBarcodeScan = (scannedValue: string) => {
    // Look for item by barcode or product code
    let index = -1

    // First try exact barcode match (mock data would need barcode field)
    index = items.findIndex(item =>
      item.productCode === scannedValue ||
      item.productName.toLowerCase().includes(scannedValue.toLowerCase())
    )

    if (index !== -1) {
      setCurrentItemIndex(index)
      // Auto-focus on quantity input after successful scan
      setTimeout(() => {
        inputRef.current?.focus()
      }, 500)
    } else {
      // Item not found, could show alert or add to notes
      console.log('Scanned item not found:', scannedValue)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleQuantitySubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleQuickQuantity(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleQuickQuantity(-1)
    }
  }

  const getItemStatus = (item: StockCountItem) => {
    if (item.status === 'counted') return 'complete'
    if (item.status === 'variance') return 'variance'
    return item.id === currentItem?.id ? 'active' : 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500'
      case 'variance':
        return 'bg-yellow-500'
      case 'active':
        return 'bg-blue-500'
      default:
        return 'bg-gray-300'
    }
  }

  if (sessionLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (!session || !items.length) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Session not found</h1>
          <Button onClick={onExit}>Exit Counting</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPause}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ChevronLeft className="h-4 w-4" />
              Pause
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{session.documentNumber}</h1>
              <p className="text-sm opacity-90">{session.locationName}</p>
            </div>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBarcodeScanner(true)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Barcode className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{completedItems} of {session.totalItems} items</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold">{completedItems}</div>
            <div className="text-xs opacity-90">Counted</div>
          </div>
          <div>
            <div className="text-lg font-bold">{session.varianceItems}</div>
            <div className="text-xs opacity-90">Variances</div>
          </div>
          <div>
            <div className="text-lg font-bold">{items.length - completedItems}</div>
            <div className="text-xs opacity-90">Remaining</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {currentItem && (
        <div className="p-4 space-y-4">
          {/* Item Progress Bar */}
          <div className="flex space-x-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors',
                  getStatusColor(getItemStatus(item))
                )}
              />
            ))}
          </div>

          {/* Product Card */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-lg">{currentItem.productName}</CardTitle>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{currentItem.productCode}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{currentItem.category}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  className="ml-2"
                >
                  <Package className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Location Info */}
              <div className="flex items-center space-x-2 text-sm bg-muted p-3 rounded-lg">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{currentItem.locationName}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="font-medium">{currentItem.locationCode}</span>
              </div>

              {/* Expected Quantity */}
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Expected Quantity</div>
                <div className="text-2xl font-bold">
                  {currentItem.expectedQuantity} {currentItem.uom}
                </div>
              </div>

              {/* Count Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Counted Quantity</label>
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="number"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter quantity"
                    className="text-center text-2xl font-bold h-16 pr-20"
                    min="0"
                    step="0.01"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKeypad(true)}
                      className="h-8 w-8 p-0"
                    >
                      <Calculator className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Adjust Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleQuickQuantity(-1)}
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    -1
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleQuickQuantity(1)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    +1
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuantity(currentItem.expectedQuantity.toString())}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this count..."
                  className="text-sm"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {currentItemIndex > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentItemIndex(prev => prev - 1)}
                    className="flex-1"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleQuantitySubmit}
                  disabled={!currentQuantity || updateQuantityMutation.isPending}
                  className="flex-1"
                  size="lg"
                >
                  {updateQuantityMutation.isPending ? (
                    <>Saving...</>
                  ) : (
                    <>
                      {currentItemIndex === items.length - 1 ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Count
                        </>
                      ) : (
                        <>
                          Next Item
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lot/Expiry Info (if available) */}
          {(currentItem.lotNumber || currentItem.expiryDate) && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {currentItem.lotNumber && (
                    <div>
                      <div className="text-muted-foreground">Lot Number</div>
                      <div className="font-medium">{currentItem.lotNumber}</div>
                    </div>
                  )}
                  {currentItem.expiryDate && (
                    <div>
                      <div className="text-muted-foreground">Expiry Date</div>
                      <div className="font-medium">
                        {format(new Date(currentItem.expiryDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Search Dialog */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Item</DialogTitle>
            <DialogDescription>
              Search by product code or name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter product code or name..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  handleSearchItem(searchQuery)
                }
              }}
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {items
                .filter(item =>
                  item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.productName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .slice(0, 10)
                .map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-3"
                    onClick={() => {
                      const index = items.findIndex(i => i.id === item.id)
                      setCurrentItemIndex(index)
                      setShowSearch(false)
                      setSearchQuery('')
                    }}
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-sm text-muted-foreground">{item.productCode}</div>
                    </div>
                  </Button>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Details Drawer */}
      <Drawer open={showDetails} onOpenChange={setShowDetails}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{currentItem?.productName}</DrawerTitle>
            <DrawerDescription>Product details and count information</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            {currentItem && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Product Code</div>
                    <div className="font-medium">{currentItem.productCode}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Category</div>
                    <div className="font-medium">{currentItem.category}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Location</div>
                    <div className="font-medium">{currentItem.locationCode}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">UoM</div>
                    <div className="font-medium">{currentItem.uom}</div>
                  </div>
                </div>

                {currentItem.variance && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-yellow-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Variance Detected</span>
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                      {currentItem.variance > 0 ? '+' : ''}{currentItem.variance} {currentItem.uom} ({currentItem.variancePercentage}%)
                    </div>
                  </div>
                )}

                {/* Completion Summary */}
                {currentItemIndex === items.length - 1 && completedItems === items.length - 1 && (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-800 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Count Complete!</span>
                      </div>
                      <div className="text-sm text-green-700 space-y-1">
                        <div>All {items.length} items have been counted</div>
                        <div>{session.varianceItems} items with variances</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => completeCountMutation.mutate()}
                      disabled={completeCountMutation.isPending}
                      className="w-full"
                      size="lg"
                    >
                      {completeCountMutation.isPending ? (
                        <>Completing...</>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Complete Stock Count
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onScan={handleBarcodeScan}
        title="Product Scanner"
        description="Scan product barcodes to quickly locate items for counting"
      />
    </div>
  )
}