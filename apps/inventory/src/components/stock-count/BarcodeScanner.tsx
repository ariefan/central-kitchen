import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Camera,
  CameraOff,
  RotateCcw,
  Barcode,
  Package,
  Check,
  X,
  AlertCircle,
  Loader2,
  Image,
  Type,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

// Types
interface BarcodeScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScan: (data: string) => void
  title?: string
  description?: string
}

interface ScanResult {
  value: string
  format: string
  timestamp: Date
  type: 'barcode' | 'qr' | 'unknown'
}

interface ProductInfo {
  id: string
  code: string
  name: string
  category: string
  uom: string
  location?: string
  expectedQuantity?: number
}

// Mock product database
const mockProductDatabase: Record<string, ProductInfo> = {
  '1234567890123': {
    id: 'p1',
    code: 'PRD-001',
    name: 'Organic Tomatoes',
    category: 'Produce',
    uom: 'kg',
    location: 'WH-001-A1',
    expectedQuantity: 50,
  },
  '9876543210987': {
    id: 'p2',
    code: 'PRD-002',
    name: 'Fresh Milk',
    category: 'Dairy',
    uom: 'liters',
    location: 'WH-001-B2',
    expectedQuantity: 24,
  },
  '4567890123456': {
    id: 'p3',
    code: 'PRD-003',
    name: 'Whole Wheat Bread',
    category: 'Bakery',
    uom: 'pieces',
    location: 'WH-001-C1',
    expectedQuantity: 30,
  },
}

export default function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
  title = 'Barcode Scanner',
  description = 'Scan product barcodes or QR codes to quickly identify items'
}: BarcodeScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'history'>('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([])
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null)
  const [identifiedProduct, setIdentifiedProduct] = useState<ProductInfo | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Simulated camera functions (in real app, would use barcode scanning library)
  const startCamera = async () => {
    try {
      setCameraError(null)
      setIsScanning(true)

      // Simulate camera initialization
      await new Promise(resolve => setTimeout(resolve, 1000))

      // In a real app, would access actual camera:
      // const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      // if (videoRef.current) {
      //   videoRef.current.srcObject = stream
      //   streamRef.current = stream
      // }

    } catch (error) {
      setCameraError('Unable to access camera. Please check permissions.')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    setIsScanning(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Simulate barcode detection
  const simulateBarcodeScan = useCallback(() => {
    const barcodes = Object.keys(mockProductDatabase)
    const randomBarcode = barcodes[Math.floor(Math.random() * barcodes.length)]

    handleScanResult(randomBarcode, 'CODE_128', 'barcode')
  }, [])

  // Handle scan result
  const handleScanResult = useCallback((value: string, format: string, type: 'barcode' | 'qr' | 'unknown') => {
    setIsProcessing(true)

    const result: ScanResult = {
      value,
      format,
      timestamp: new Date(),
      type,
    }

    setLastScanResult(result)
    setScanHistory(prev => [result, ...prev.slice(0, 9)]) // Keep last 10 scans

    // Look up product in database
    const product = mockProductDatabase[value]
    setIdentifiedProduct(product || null)

    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false)
      onScan(value)

      // Auto-close on successful scan if product found
      if (product) {
        setTimeout(() => {
          onOpenChange(false)
        }, 1500)
      }
    }, 1000)
  }, [onScan, onOpenChange])

  // Handle manual input
  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      // Determine if it's likely a barcode (numbers) or product code (alphanumeric)
      const type = /^\d+$/.test(manualInput) ? 'barcode' : 'unknown'
      const format = type === 'barcode' ? 'CODE_128' : 'UNKNOWN'

      handleScanResult(manualInput.trim(), format, type)
      setManualInput('')
    }
  }

  // Handle history item click
  const handleHistoryItemClick = (scan: ScanResult) => {
    setManualInput(scan.value)
    setActiveTab('manual')
  }

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Start camera when tab changes to camera
  useEffect(() => {
    if (activeTab === 'camera' && open) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [activeTab, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Barcode className="h-5 w-5" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="camera" className="flex items-center space-x-1">
              <Camera className="h-4 w-4" />
              <span>Camera</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center space-x-1">
              <Type className="h-4 w-4" />
              <span>Manual</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-1">
              <Image className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Camera Tab */}
            <TabsContent value="camera" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  {cameraError ? (
                    <div className="text-center space-y-3">
                      <CameraOff className="h-12 w-12 mx-auto text-muted-foreground" />
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{cameraError}</AlertDescription>
                      </Alert>
                      <Button onClick={startCamera} variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  ) : !isScanning ? (
                    <div className="text-center space-y-3">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Camera access required for barcode scanning
                      </p>
                      <Button onClick={startCamera}>
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Simulated camera view */}
                      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '1' }}>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-white text-center space-y-2">
                            <Loader2 className="h-8 w-8 mx-auto animate-spin" />
                            <p className="text-sm">Camera scanning...</p>
                            <p className="text-xs opacity-75">Point camera at barcode</p>
                          </div>
                        </div>

                        {/* Scanning overlay */}
                        <div className="absolute inset-0 border-4 border-white/20">
                          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 transform -translate-y-1/2 animate-pulse" />
                        </div>
                      </div>

                      {/* Demo button for simulation */}
                      <div className="flex space-x-2">
                        <Button onClick={simulateBarcodeScan} className="flex-1">
                          Simulate Scan
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          <CameraOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Manual Input Tab */}
            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manual Entry</CardTitle>
                  <CardDescription>
                    Enter barcode or product code manually
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Enter barcode or product code..."
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                      className="flex-1"
                    />
                    <Button onClick={handleManualSubmit} disabled={!manualInput.trim()}>
                      Scan
                    </Button>
                  </div>

                  {/* Quick access buttons */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(mockProductDatabase).slice(0, 4).map(([barcode, product]) => (
                      <Button
                        key={barcode}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setManualInput(barcode)
                          handleManualSubmit()
                        }}
                        className="text-left justify-start h-auto p-2"
                      >
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-muted-foreground">{product.code}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Scan History</CardTitle>
                  <CardDescription>
                    Recent barcode scans and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scanHistory.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Image className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No scan history yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {scanHistory.map((scan, index) => {
                        const product = mockProductDatabase[scan.value]
                        return (
                          <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-between h-auto p-3"
                            onClick={() => handleHistoryItemClick(scan)}
                          >
                            <div className="text-left">
                              <div className="font-mono text-sm">{scan.value}</div>
                              {product && (
                                <div className="text-xs text-muted-foreground">
                                  {product.name}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <Badge variant={product ? "default" : "secondary"} className="text-xs">
                                {product ? 'Found' : 'Unknown'}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {scan.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        {/* Scan Result Display */}
        {lastScanResult && (
          <div className={cn(
            "p-4 rounded-lg border-2 transition-all",
            identifiedProduct
              ? "border-green-200 bg-green-50"
              : "border-yellow-200 bg-yellow-50"
          )}>
            <div className="flex items-start space-x-3">
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : identifiedProduct ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}

              <div className="flex-1">
                <div className="font-mono text-sm font-medium">
                  {lastScanResult.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {lastScanResult.format} • {lastScanResult.type}
                </div>

                {identifiedProduct ? (
                  <div className="mt-2 p-2 bg-white rounded border border-green-200">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{identifiedProduct.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {identifiedProduct.code} • {identifiedProduct.category} • {identifiedProduct.uom}
                    </div>
                    {identifiedProduct.location && (
                      <div className="text-xs text-green-700 mt-1">
                        Location: {identifiedProduct.location}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-yellow-700">
                    Product not found in database
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}