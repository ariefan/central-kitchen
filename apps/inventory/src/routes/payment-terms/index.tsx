import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search, CreditCard, Calendar, Clock, Star, Settings, FileText, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import PaymentTermForm from '@/components/payment-terms/PaymentTermForm'
import PaymentTermDetailDrawer from '@/components/payment-terms/PaymentTermDetailDrawer'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

// Types
interface PaymentTerm {
  id: string
  code: string
  name: string
  description: string
  termType: 'net_days' | 'day_of_month' | 'day_following_month' | 'advance' | 'custom'
  settings: {
    netDays?: number
    dayOfMonth?: number
    cutoffDay?: number
    advancePercentage?: number
    advanceDays?: number
    customFormula?: string
  }
  isActive: boolean
  isDefault: boolean
  usageCount: number
  lastUsed?: string
  createdAt: string
  updatedAt: string
}

// Mock data
const mockPaymentTerms: PaymentTerm[] = [
  {
    id: '1',
    code: 'NET-15',
    name: 'NET 15 Days',
    description: 'Payment due 15 days after invoice date',
    termType: 'net_days',
    settings: {
      netDays: 15
    },
    isActive: true,
    isDefault: false,
    usageCount: 42,
    lastUsed: '2024-01-18',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2022-03-15T09:00:00Z'
  },
  {
    id: '2',
    code: 'NET-30',
    name: 'NET 30 Days',
    description: 'Payment due 30 days after invoice date',
    termType: 'net_days',
    settings: {
      netDays: 30
    },
    isActive: true,
    isDefault: true,
    usageCount: 156,
    lastUsed: '2024-01-20',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2022-03-15T09:00:00Z'
  },
  {
    id: '3',
    code: '2-10-NET-30',
    name: '2% 10, NET 30',
    description: '2% discount if paid within 10 days, NET 30 otherwise',
    termType: 'custom',
    settings: {
      customFormula: '2% discount if paid <= 10 days, else NET 30'
    },
    isActive: true,
    isDefault: false,
    usageCount: 28,
    lastUsed: '2024-01-15',
    createdAt: '2022-04-10T14:30:00Z',
    updatedAt: '2022-04-10T14:30:00Z'
  },
  {
    id: '4',
    code: 'EOM',
    name: 'End of Month',
    description: 'Payment due by end of the month following invoice',
    termType: 'day_following_month',
    settings: {
      cutoffDay: 0
    },
    isActive: true,
    isDefault: false,
    usageCount: 15,
    lastUsed: '2024-01-10',
    createdAt: '2022-05-20T10:15:00Z',
    updatedAt: '2022-05-20T10:15:00Z'
  },
  {
    id: '5',
    code: '15TH',
    name: '15th of Following Month',
    description: 'Payment due on the 15th day of the month following invoice',
    termType: 'day_following_month',
    settings: {
      dayOfMonth: 15
    },
    isActive: true,
    isDefault: false,
    usageCount: 8,
    lastUsed: '2023-12-28',
    createdAt: '2022-06-15T11:45:00Z',
    updatedAt: '2022-06-15T11:45:00Z'
  },
  {
    id: '6',
    code: 'PIA',
    name: 'Payment in Advance',
    description: 'Full payment required before delivery',
    termType: 'advance',
    settings: {
      advancePercentage: 100,
      advanceDays: 0
    },
    isActive: true,
    isDefault: false,
    usageCount: 12,
    lastUsed: '2024-01-12',
    createdAt: '2022-07-01T08:30:00Z',
    updatedAt: '2022-07-01T08:30:00Z'
  },
  {
    id: '7',
    code: '50-ADV',
    name: '50% Advance',
    description: '50% payment in advance, 50% on delivery',
    termType: 'advance',
    settings: {
      advancePercentage: 50,
      advanceDays: 0
    },
    isActive: false,
    isDefault: false,
    usageCount: 3,
    lastUsed: '2023-08-15',
    createdAt: '2022-08-10T13:20:00Z',
    updatedAt: '2023-08-15T09:45:00Z'
  }
]

export const Route = createFileRoute('/payment-terms/')({
  component: PaymentTermsComponent,
})

function PaymentTermsComponent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState<PaymentTerm | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<PaymentTerm | null>(null)

  // Mock API call
  const { data: paymentTerms = [], isLoading } = useQuery({
    queryKey: ['payment-terms', { searchTerm, statusFilter }],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      let filtered = mockPaymentTerms

      if (searchTerm) {
        filtered = filtered.filter(term =>
          term.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          term.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      if (statusFilter === 'active') {
        filtered = filtered.filter(term => term.isActive)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(term => !term.isActive)
      } else if (statusFilter === 'default') {
        filtered = filtered.filter(term => term.isDefault)
      }

      return filtered
    }
  })

  const getTermTypeLabel = (termType: string) => {
    const labels = {
      net_days: 'Net Days',
      day_of_month: 'Day of Month',
      day_following_month: 'Following Month',
      advance: 'Advance Payment',
      custom: 'Custom'
    }
    return labels[termType as keyof typeof labels] || termType
  }

  const getTermTypeBadge = (termType: string) => {
    const variants = {
      net_days: 'default',
      day_of_month: 'secondary',
      day_following_month: 'outline',
      advance: 'destructive',
      custom: 'outline'
    }
    const colors = {
      net_days: 'bg-blue-100 text-blue-800',
      day_of_month: 'bg-green-100 text-green-800',
      day_following_month: 'bg-purple-100 text-purple-800',
      advance: 'bg-orange-100 text-orange-800',
      custom: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge variant={variants[termType as keyof typeof variants] || 'outline'} className={colors[termType as keyof typeof colors]}>
        {getTermTypeLabel(termType)}
      </Badge>
    )
  }

  const handleEdit = (paymentTerm: PaymentTerm) => {
    setEditingPaymentTerm(paymentTerm)
    setShowForm(true)
  }

  const handleDelete = (paymentTerm: PaymentTerm) => {
    if (confirm(`Are you sure you want to delete "${paymentTerm.name}"? This action cannot be undone.`)) {
      console.log('Delete payment term:', paymentTerm.id)
    }
  }

  const handleToggleActive = (paymentTerm: PaymentTerm) => {
    console.log('Toggle payment term active:', paymentTerm.id, !paymentTerm.isActive)
  }

  const handleSetDefault = (paymentTerm: PaymentTerm) => {
    console.log('Set payment term as default:', paymentTerm.id)
  }

  const handleFormSubmit = (data: any) => {
    console.log('Payment term data:', data)
    setShowForm(false)
    setEditingPaymentTerm(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const stats = {
    total: paymentTerms.length,
    active: paymentTerms.filter(t => t.isActive).length,
    default: paymentTerms.filter(t => t.isDefault).length,
    mostUsed: paymentTerms.length > 0 ? Math.max(...paymentTerms.map(t => t.usageCount)) : 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment Terms</h1>
          <p className="text-muted-foreground">Configure payment terms and conditions</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Payment Term</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Configured terms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{((stats.active / stats.total) * 100).toFixed(0)}% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.default}</div>
            <p className="text-xs text-muted-foreground">Default terms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostUsed}</div>
            <p className="text-xs text-muted-foreground">Times used</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payment terms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="default">Default Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms List</CardTitle>
          <CardDescription>
            Manage payment terms and conditions for suppliers and customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentTerms.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No payment terms found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first payment term'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment Term
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Term</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTerms.map((paymentTerm) => (
                  <TableRow
                    key={paymentTerm.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedPaymentTerm(paymentTerm)}
                  >
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div>
                          <div className="font-medium">{paymentTerm.name}</div>
                          <div className="text-sm text-muted-foreground">{paymentTerm.code}</div>
                        </div>
                        {paymentTerm.isDefault && (
                          <Badge variant="outline" className="text-xs">DEFAULT</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTermTypeBadge(paymentTerm.termType)}</TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <div className="text-sm">{paymentTerm.description}</div>
                        {paymentTerm.termType === 'net_days' && (
                          <div className="text-xs text-muted-foreground">
                            {paymentTerm.settings.netDays} days after invoice
                          </div>
                        )}
                        {paymentTerm.termType === 'advance' && (
                          <div className="text-xs text-muted-foreground">
                            {paymentTerm.settings.advancePercentage}% advance payment
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{paymentTerm.usageCount} uses</div>
                        {paymentTerm.lastUsed && (
                          <div className="text-xs text-muted-foreground">
                            Last: {format(new Date(paymentTerm.lastUsed), 'MMM dd')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={paymentTerm.isActive}
                          onCheckedChange={() => handleToggleActive(paymentTerm)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm">{paymentTerm.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedPaymentTerm(paymentTerm)
                            }}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(paymentTerm)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Term
                          </DropdownMenuItem>
                          {!paymentTerm.isDefault && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSetDefault(paymentTerm)
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {paymentTerm.usageCount === 0 && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(paymentTerm)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Term
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <PaymentTermDetailDrawer
        paymentTerm={selectedPaymentTerm}
        open={!!selectedPaymentTerm}
        onOpenChange={(open) => !open && setSelectedPaymentTerm(null)}
      />

      {/* Payment Term Form */}
      <PaymentTermForm
        open={showForm}
        onOpenChange={setShowForm}
        initialData={editingPaymentTerm || undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}