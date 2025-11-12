import { format } from 'date-fns'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Calculator,
  ArrowUpDown,
  Settings,
  Edit,
  TrendingUp,
  Info,
  CheckCircle,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react'

// Types
interface UoMConversion {
  id: string
  fromUoM: string
  fromUoMName: string
  toUoM: string
  toUoMName: string
  conversionFactor: number
  operation: 'multiply' | 'divide'
  category: 'weight' | 'volume' | 'length' | 'area' | 'count' | 'temperature' | 'time' | 'custom'
  description: string
  isActive: boolean
  isSystem: boolean
  usageCount: number
  lastUsed?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Mock usage data
const mockUsageData = [
  {
    id: '1',
    transactionType: 'Goods Receipt',
    documentNumber: 'GR-2024-0189',
    date: '2024-01-18',
    inputValue: 50,
    inputUoM: 'KG',
    outputValue: 110.231,
    outputUoM: 'LB',
    variance: 0
  },
  {
    id: '2',
    transactionType: 'Stock Transfer',
    documentNumber: 'XFER-2024-0042',
    date: '2024-01-15',
    inputValue: 25,
    inputUoM: 'L',
    outputValue: 6.604,
    outputUoM: 'GAL',
    variance: 0
  },
  {
    id: '3',
    transactionType: 'Production Order',
    documentNumber: 'PROD-2024-0031',
    date: '2024-01-12',
    inputValue: 100,
    inputUoM: 'PCS',
    outputValue: 4.167,
    outputUoM: 'BOX',
    variance: 0
  }
]

// Mock product associations
const mockProductAssociations = [
  {
    id: '1',
    productCode: 'PROD-001',
    productName: 'Organic Tomatoes',
    baseUoM: 'KG',
    alternateUoM: 'LB',
    isActive: true
  },
  {
    id: '2',
    productCode: 'PROD-015',
    productName: 'Fresh Lettuce',
    baseUoM: 'PCS',
    alternateUoM: 'BOX',
    isActive: true
  },
  {
    id: '3',
    productCode: 'PROD-032',
    productName: 'Olive Oil',
    baseUoM: 'L',
    alternateUoM: 'GAL',
    isActive: false
  }
]

interface UoMConversionDetailDrawerProps {
  conversion: UoMConversion | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UoMConversionDetailDrawer({
  conversion,
  open,
  onOpenChange
}: UoMConversionDetailDrawerProps) {
  if (!conversion) return null

  const getCategoryLabel = (category: string) => {
    const labels = {
      weight: 'Weight',
      volume: 'Volume',
      length: 'Length',
      area: 'Area',
      count: 'Count',
      temperature: 'Temperature',
      time: 'Time',
      custom: 'Custom'
    }
    return labels[category as keyof typeof labels] || category
  }

  const getCategoryBadge = (category: string) => {
    const colors = {
      weight: 'bg-blue-100 text-blue-800',
      volume: 'bg-green-100 text-green-800',
      length: 'bg-purple-100 text-purple-800',
      area: 'bg-orange-100 text-orange-800',
      count: 'bg-pink-100 text-pink-800',
      temperature: 'bg-red-100 text-red-800',
      time: 'bg-indigo-100 text-indigo-800',
      custom: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant="outline" className={colors[category as keyof typeof colors]}>
        {getCategoryLabel(category)}
      </Badge>
    )
  }

  const performConversion = (value: number) => {
    let result: number

    if (conversion.operation === 'multiply') {
      result = value * conversion.conversionFactor
    } else {
      result = value / conversion.conversionFactor
    }

    return result
  }

  const testExamples = [1, 10, 100, 1000]

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DrawerTitle className="flex items-center space-x-2">
                  <span>{conversion.fromUoM} → {conversion.toUoM}</span>
                  {conversion.isSystem && (
                    <Badge variant="outline" className="text-xs">SYSTEM</Badge>
                  )}
                </DrawerTitle>
                <DrawerDescription>
                  {conversion.fromUoMName} to {conversion.toUoMName}
                </DrawerDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={conversion.isSystem}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Conversion
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Info className="h-5 w-5" />
                      <span>Conversion Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 font-mono text-lg">
                        <span className="font-medium">{conversion.fromUoM}</span>
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{conversion.toUoM}</span>
                      </div>
                      {conversion.isSystem && (
                        <Badge variant="outline" className="text-xs">SYSTEM</Badge>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">From Unit</div>
                      <div className="font-medium">{conversion.fromUoMName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">To Unit</div>
                      <div className="font-medium">{conversion.toUoMName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Category</div>
                      <div className="mt-1">{getCategoryBadge(conversion.category)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Description</div>
                      <div className="text-sm">{conversion.description}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Calculator className="h-5 w-5" />
                      <span>Conversion Formula</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="font-mono text-2xl mb-2">
                        {conversion.operation === 'multiply' ? '×' : '÷'} {conversion.conversionFactor.toFixed(6)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conversion.operation === 'multiply' ? 'Multiply by' : 'Divide by'} the factor
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Quick Test:</div>
                      {testExamples.map((value) => {
                        const result = performConversion(value)
                        return (
                          <div key={value} className="font-mono text-sm flex justify-between">
                            <span>{value} {conversion.fromUoM}</span>
                            <span>=</span>
                            <span>{result.toFixed(4)} {conversion.toUoM}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Usage Statistics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{conversion.usageCount}</div>
                      <div className="text-sm text-muted-foreground">Total Uses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{mockProductAssociations.length}</div>
                      <div className="text-sm text-muted-foreground">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {conversion.lastUsed
                          ? format(new Date(conversion.lastUsed), 'MMM dd')
                          : 'Never'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">Last Used</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${conversion.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {conversion.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-sm text-muted-foreground">Status</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculator" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Calculator</CardTitle>
                  <CardDescription>
                    Test conversions with different values
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Value in {conversion.fromUoM}</label>
                        <input
                          type="number"
                          className="w-full mt-1 px-3 py-2 border rounded-md font-mono"
                          placeholder="Enter value"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0
                            const result = performConversion(value)
                            const resultInput = document.getElementById('result-value') as HTMLInputElement
                            if (resultInput) {
                              resultInput.value = result.toFixed(6)
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Result in {conversion.toUoM}</label>
                        <input
                          id="result-value"
                          type="text"
                          className="w-full mt-1 px-3 py-2 border rounded-md font-mono bg-muted"
                          placeholder="Result"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <strong>Formula:</strong> Result = Value {conversion.operation === 'multiply' ? '×' : '÷'} {conversion.conversionFactor.toFixed(6)}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Common Values:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[1, 5, 10, 25, 50, 100, 500, 1000].map((value) => {
                          const result = performConversion(value)
                          return (
                            <Button
                              key={value}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const input = document.querySelector('input[type="number"]') as HTMLInputElement
                                const resultInput = document.getElementById('result-value') as HTMLInputElement
                                if (input) input.value = value.toString()
                                if (resultInput) resultInput.value = result.toFixed(6)
                              }}
                            >
                              {value} {conversion.fromUoM}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4">
              {/* Recent Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Usage</CardTitle>
                  <CardDescription>
                    Recent transactions using this conversion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Input</TableHead>
                        <TableHead>Output</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockUsageData.map((usage) => (
                        <TableRow key={usage.id}>
                          <TableCell className="font-medium">{usage.transactionType}</TableCell>
                          <TableCell>{usage.documentNumber}</TableCell>
                          <TableCell className="font-mono">
                            {usage.inputValue} {usage.inputUoM}
                          </TableCell>
                          <TableCell className="font-mono">
                            {usage.outputValue.toFixed(3)} {usage.outputUoM}
                          </TableCell>
                          <TableCell>{format(new Date(usage.date), 'MMM dd, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Product Associations */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Associations</CardTitle>
                  <CardDescription>
                    Products that use this conversion
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Base UoM</TableHead>
                        <TableHead>Alternate UoM</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockProductAssociations.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.productCode}</TableCell>
                          <TableCell>{product.productName}</TableCell>
                          <TableCell className="font-mono">{product.baseUoM}</TableCell>
                          <TableCell className="font-mono">{product.alternateUoM}</TableCell>
                          <TableCell>
                            <Badge variant={product.isActive ? 'default' : 'secondary'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Configuration Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium">Created By</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {conversion.createdBy === 'system' ? 'System' : conversion.createdBy}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Created Date</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(conversion.createdAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Last Updated</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(conversion.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Type</div>
                      <div className="text-sm text-muted-foreground">
                        {conversion.isSystem ? 'System Conversion' : 'Custom Conversion'}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status:</span>
                      <div className="flex items-center space-x-2">
                        {conversion.isActive ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {conversion.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Operation:</span>
                      <span className="text-sm font-mono">
                        {conversion.operation === 'multiply' ? 'Multiply (×)' : 'Divide (÷)'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Factor:</span>
                      <span className="text-sm font-mono">{conversion.conversionFactor.toFixed(8)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Usage Count:</span>
                      <span className="text-sm font-medium">{conversion.usageCount} times</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Last Used:</span>
                      <span className="text-sm">
                        {conversion.lastUsed
                          ? format(new Date(conversion.lastUsed), 'MMM dd, yyyy')
                          : 'Never used'
                        }
                      </span>
                    </div>
                  </div>

                  {conversion.isSystem && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          This is a system conversion and cannot be edited or deleted. It's provided by default for common unit conversions.
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}