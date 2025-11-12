import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Edit,
  Eye,
  Settings,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  Package,
  DollarSign,
  AlertTriangle
} from 'lucide-react'

interface ReportField {
  id: string
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'currency'
  category: string
  description?: string
}

interface ReportFilter {
  id: string
  field: string
  operator: string
  value: any
  label: string
}

interface Report {
  id: string
  name: string
  description: string
  type: 'inventory' | 'financial' | 'operational' | 'compliance'
  fields: string[]
  filters: ReportFilter[]
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  format: 'pdf' | 'excel' | 'csv'
  schedule?: string
  isTemplate?: boolean
  createdAt: string
  createdBy: string
}

interface ReportBuilderProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialReport?: Partial<Report>
  onSave?: (report: Report) => void
  onGenerate?: (report: Partial<Report>) => void
  availableFields: ReportField[]
}

const reportTemplates = [
  {
    name: 'Inventory Valuation Report',
    description: 'Total value of inventory by category and location',
    type: 'financial' as const,
    fields: ['productName', 'category', 'quantity', 'unitCost', 'totalValue', 'location'],
    icon: <DollarSign className="h-4 w-4" />
  },
  {
    name: 'Low Stock Alert',
    description: 'Products below minimum stock levels',
    type: 'operational' as const,
    fields: ['productName', 'currentStock', 'minLevel', 'reorderPoint', 'supplier'],
    icon: <AlertTriangle className="h-4 w-4" />
  },
  {
    name: 'Supplier Performance',
    description: 'On-time delivery and quality metrics by supplier',
    type: 'operational' as const,
    fields: ['supplierName', 'onTimeDelivery', 'qualityScore', 'totalOrders', 'avgLeadTime'],
    icon: <Users className="h-4 w-4" />
  },
  {
    name: 'Stock Movement Report',
    description: 'All stock transactions within a date range',
    type: 'operational' as const,
    fields: ['date', 'product', 'transactionType', 'quantity', 'reference', 'user'],
    icon: <Package className="h-4 w-4" />
  },
  {
    name: 'Expiring Inventory',
    description: 'Products approaching expiration dates',
    type: 'compliance' as const,
    fields: ['productName', 'lotNumber', 'expirationDate', 'quantity', 'location', 'daysToExpiry'],
    icon: <Clock className="h-4 w-4" />
  }
]

export default function ReportBuilder({
  open,
  onOpenChange,
  initialReport,
  onSave,
  onGenerate,
  availableFields
}: ReportBuilderProps) {
  const [activeTab, setActiveTab] = useState('template')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof reportTemplates[0] | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>(initialReport?.fields || [])
  const [filters, setFilters] = useState<ReportFilter[]>(initialReport?.filters || [])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      type: 'operational',
      format: 'pdf',
      groupBy: '',
      sortBy: '',
      sortOrder: 'desc' as 'asc' | 'desc',
      schedule: '',
      isTemplate: false
    },
    values: {
      name: initialReport?.name || '',
      description: initialReport?.description || '',
      type: initialReport?.type || 'operational',
      format: initialReport?.format || 'pdf',
      groupBy: initialReport?.groupBy || '',
      sortBy: initialReport?.sortBy || '',
      sortOrder: initialReport?.sortOrder || 'desc',
      schedule: initialReport?.schedule || '',
      isTemplate: initialReport?.isTemplate || false
    }
  })

  const handleTemplateSelect = (template: typeof reportTemplates[0]) => {
    setSelectedTemplate(template)
    setSelectedFields(template.fields)
    form.setValue('name', template.name)
    form.setValue('description', template.description)
    form.setValue('type', template.type)
  }

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: '',
      label: ''
    }
    setFilters([...filters, newFilter])
  }

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setFilters(filters.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    ))
  }

  const removeFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId))
  }

  const handleSave = () => {
    const reportData: Report = {
      id: initialReport?.id || Date.now().toString(),
      name: form.getValues('name'),
      description: form.getValues('description'),
      type: form.getValues('type') as any,
      fields: selectedFields,
      filters,
      groupBy: form.getValues('groupBy') || undefined,
      sortBy: form.getValues('sortBy') || undefined,
      sortOrder: form.getValues('sortOrder') as 'asc' | 'desc',
      format: form.getValues('format') as 'pdf' | 'excel' | 'csv',
      schedule: form.getValues('schedule') || undefined,
      isTemplate: form.getValues('isTemplate'),
      createdAt: initialReport?.createdAt || new Date().toISOString(),
      createdBy: 'current-user' // In real app, get from auth context
    }

    onSave?.(reportData)
    onOpenChange(false)
  }

  const handleGenerate = () => {
    const reportData = {
      name: form.getValues('name'),
      description: form.getValues('description'),
      type: form.getValues('type'),
      fields: selectedFields,
      filters,
      groupBy: form.getValues('groupBy'),
      sortBy: form.getValues('sortBy'),
      sortOrder: form.getValues('sortOrder'),
      format: form.getValues('format')
    }

    onGenerate?.(reportData)
  }

  const getFieldsByCategory = () => {
    const categorized: Record<string, ReportField[]> = {}
    availableFields.forEach(field => {
      if (!categorized[field.category]) {
        categorized[field.category] = []
      }
      categorized[field.category].push(field)
    })
    return categorized
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'financial':
        return <DollarSign className="h-4 w-4" />
      case 'operational':
        return <Package className="h-4 w-4" />
      case 'compliance':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial':
        return 'text-green-600 bg-green-100'
      case 'operational':
        return 'text-blue-600 bg-blue-100'
      case 'compliance':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Report Builder</span>
          </DialogTitle>
          <DialogDescription>
            Create custom reports with selected fields, filters, and formatting
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="filters">Filters</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Template Selection */}
          <TabsContent value="template" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportTemplates.map((template, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate?.name === template.name
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {template.icon}
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      {selectedTemplate?.name === template.name && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{template.fields.length} fields</span>
                      <Badge
                        variant="outline"
                        className={`capitalize ${getReportTypeColor(template.type)}`}
                      >
                        {template.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Custom Report Template */}
              <Card
                className={`cursor-pointer transition-colors ${
                  !selectedTemplate
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTemplate(null)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <CardTitle className="text-lg">Custom Report</CardTitle>
                  </div>
                  <CardDescription>
                    Create a report from scratch with custom fields and filters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    Build your own report
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Field Selection */}
          <TabsContent value="fields" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Select Fields</h3>
                <p className="text-sm text-muted-foreground">
                  Choose the data fields to include in your report
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {selectedFields.length} fields selected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFields([])}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(getFieldsByCategory()).map(([category, fields]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 rounded border hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{field.name}</div>
                          {field.description && (
                            <div className="text-sm text-muted-foreground">
                              {field.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="capitalize">
                            {field.type}
                          </Badge>
                          <input
                            type="checkbox"
                            checked={selectedFields.includes(field.id)}
                            onChange={() => toggleField(field.id)}
                            className="rounded border-gray-300"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Filters */}
          <TabsContent value="filters" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Report Filters</h3>
                <p className="text-sm text-muted-foreground">
                  Add filters to narrow down your report data
                </p>
              </div>
              <Button onClick={addFilter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </div>

            {filters.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Filters Added</h3>
                  <p className="text-muted-foreground text-center">
                    Add filters to narrow down the data included in your report
                  </p>
                  <Button onClick={addFilter} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Filter
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filters.map((filter) => (
                  <Card key={filter.id}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => {
                              const field = availableFields.find(f => f.id === value)
                              updateFilter(filter.id, {
                                field: value,
                                label: field?.name || value
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="notEquals">Not equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greaterThan">Greater than</SelectItem>
                              <SelectItem value="lessThan">Less than</SelectItem>
                              <SelectItem value="between">Between</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-4">
                          <Input
                            placeholder="Filter value"
                            value={filter.value}
                            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          />
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilter(filter.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Report Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Report Name</label>
                    <Input
                      placeholder="Enter report name"
                      {...form.register('name')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Enter report description"
                      rows={3}
                      {...form.register('description')}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Report Type</label>
                    <Select
                      value={form.watch('type')}
                      onValueChange={(value) => form.setValue('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="financial">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4" />
                            <span>Financial</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="operational">
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4" />
                            <span>Operational</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="compliance">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Compliance</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Output Format</label>
                    <Select
                      value={form.watch('format')}
                      onValueChange={(value) => form.setValue('format', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Display Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Group By</label>
                    <Select
                      value={form.watch('groupBy')}
                      onValueChange={(value) => form.setValue('groupBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No grouping" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No grouping</SelectItem>
                        {selectedFields.map((fieldId) => {
                          const field = availableFields.find(f => f.id === fieldId)
                          return field ? (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name}
                            </SelectItem>
                          ) : null
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Sort By</label>
                      <Select
                        value={form.watch('sortBy')}
                        onValueChange={(value) => form.setValue('sortBy', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Default</SelectItem>
                          {selectedFields.map((fieldId) => {
                            const field = availableFields.find(f => f.id === fieldId)
                            return field ? (
                              <SelectItem key={field.id} value={field.id}>
                                {field.name}
                              </SelectItem>
                            ) : null
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Sort Order</label>
                      <Select
                        value={form.watch('sortOrder')}
                        onValueChange={(value) => form.setValue('sortOrder', value as 'asc' | 'desc')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Save as Template</label>
                      <p className="text-xs text-muted-foreground">
                        Save this report configuration for future use
                      </p>
                    </div>
                    <Switch
                      checked={form.watch('isTemplate')}
                      onCheckedChange={(checked) => form.setValue('isTemplate', checked)}
                    />
                  </div>

                  {form.watch('isTemplate') && (
                    <div>
                      <label className="text-sm font-medium">Schedule (Optional)</label>
                      <Select
                        value={form.watch('schedule')}
                        onValueChange={(value) => form.setValue('schedule', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No schedule</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Report Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Report Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getReportTypeIcon(form.watch('type'))}
                      <span className="font-medium">{form.watch('name') || 'Untitled Report'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {selectedFields.length} fields
                      </Badge>
                      {filters.length > 0 && (
                        <Badge variant="outline">
                          {filters.length} filters
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {form.watch('format').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {form.watch('description') && (
                    <p className="text-sm text-muted-foreground">
                      {form.watch('description')}
                    </p>
                  )}

                  <div>
                    <p className="text-sm font-medium mb-2">Fields to include:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFields.map((fieldId) => {
                        const field = availableFields.find(f => f.id === fieldId)
                        return field ? (
                          <Badge key={field.id} variant="secondary" className="text-xs">
                            {field.name}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleGenerate}>
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
          {form.watch('isTemplate') && onSave && (
            <Button onClick={handleSave}>
              <FileText className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}