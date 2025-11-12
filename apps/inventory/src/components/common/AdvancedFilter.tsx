import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Filter,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar as CalendarIcon,
  Hash,
  Tag,
  User,
  Package,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

export interface FilterCondition {
  id: string
  field: string
  operator: string
  value: any
  label?: string
}

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'multi-select'
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  icon?: React.ReactNode
}

interface AdvancedFilterProps {
  fields: FilterField[]
  filters: FilterCondition[]
  onFiltersChange: (filters: FilterCondition[]) => void
  onApply: (filters: FilterCondition[]) => void
  onClear: () => void
  className?: string
  children?: React.ReactNode
}

const defaultOperators = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'notContains', label: 'Does not contain' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Not equals' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'greaterThanOrEqual', label: 'Greater than or equal' },
    { value: 'lessThanOrEqual', label: 'Less than or equal' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: 'equals', label: 'Equals' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'lastDays', label: 'Last X days' },
    { value: 'nextDays', label: 'Next X days' }
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Not equals' },
    { value: 'in', label: 'In' },
    { value: 'notIn', label: 'Not in' }
  ],
  boolean: [
    { value: 'equals', label: 'Equals' }
  ],
  'multi-select': [
    { value: 'includes', label: 'Includes' },
    { value: 'excludes', label: 'Excludes' }
  ]
}

export default function AdvancedFilter({
  fields,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  className = '',
  children
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const addFilter = () => {
    const firstField = fields[0]
    if (!firstField) return

    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      field: firstField.key,
      operator: defaultOperators[firstField.type][0]?.value || 'equals',
      value: firstField.type === 'boolean' ? false : '',
      label: firstField.label
    }

    onFiltersChange([...filters, newFilter])
  }

  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId)
    onFiltersChange(updatedFilters)
  }

  const updateFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    const updatedFilters = filters.map(f =>
      f.id === filterId ? { ...f, ...updates } : f
    )
    onFiltersChange(updatedFilters)
  }

  const getFieldDefinition = (fieldKey: string) => {
    return fields.find(f => f.key === fieldKey)
  }

  const getOperatorsForType = (type: string) => {
    return defaultOperators[type as keyof typeof defaultOperators] || defaultOperators.text
  }

  const renderFilterValue = (filter: FilterCondition) => {
    const fieldDef = getFieldDefinition(filter.field)
    if (!fieldDef) return null

    switch (fieldDef.type) {
      case 'select':
        return (
          <Select
            value={filter.value}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={fieldDef.placeholder || 'Select value'} />
            </SelectTrigger>
            <SelectContent>
              {fieldDef.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multi-select':
        return (
          <div className="space-y-2">
            {fieldDef.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`${filter.id}-${option.value}`}
                  checked={Array.isArray(filter.value) ? filter.value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(filter.value) ? filter.value : []
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: string) => v !== option.value)
                    updateFilter(filter.id, { value: newValues })
                  }}
                  className="rounded border-gray-300"
                />
                <label htmlFor={`${filter.id}-${option.value}`} className="text-sm">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        )

      case 'boolean':
        return (
          <Switch
            checked={filter.value}
            onCheckedChange={(checked) => updateFilter(filter.id, { value: checked })}
          />
        )

      case 'number':
        if (filter.operator === 'between') {
          return (
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="Min"
                value={filter.value?.min || ''}
                onChange={(e) => updateFilter(filter.id, {
                  value: { ...filter.value, min: parseFloat(e.target.value) || 0 }
                })}
                className="w-24"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={filter.value?.max || ''}
                onChange={(e) => updateFilter(filter.id, {
                  value: { ...filter.value, max: parseFloat(e.target.value) || 0 }
                })}
                className="w-24"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            placeholder={fieldDef.placeholder}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, {
              value: parseFloat(e.target.value) || 0
            })}
          />
        )

      case 'date':
        if (filter.operator === 'between') {
          return (
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.value?.start ? format(new Date(filter.value.start), 'PPP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filter.value?.start ? new Date(filter.value.start) : undefined}
                    onSelect={(date) => updateFilter(filter.id, {
                      value: { ...filter.value, start: date?.toISOString() }
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filter.value?.end ? format(new Date(filter.value.end), 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filter.value?.end ? new Date(filter.value.end) : undefined}
                    onSelect={(date) => updateFilter(filter.id, {
                      value: { ...filter.value, end: date?.toISOString() }
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )
        } else if (filter.operator === 'lastDays' || filter.operator === 'nextDays') {
          return (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filter.operator === 'lastDays' ? 'Last' : 'Next'}
              </span>
              <Input
                type="number"
                placeholder="Days"
                value={filter.value?.days || 7}
                onChange={(e) => updateFilter(filter.id, {
                  value: { days: parseInt(e.target.value) || 7 }
                })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )
        }
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filter.value ? format(new Date(filter.value), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filter.value ? new Date(filter.value) : undefined}
                onSelect={(date) => updateFilter(filter.id, {
                  value: date?.toISOString()
                })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      default:
        return (
          <Input
            placeholder={fieldDef.placeholder}
            value={filter.value || ''}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          />
        )
    }
  }

  const getFilterSummary = () => {
    if (filters.length === 0) return null

    const activeFilters = filters.filter(f => {
      const fieldDef = getFieldDefinition(f.field)
      if (!fieldDef) return false

      if (fieldDef.type === 'boolean') {
        return f.value === true || f.value === false
      }

      if (fieldDef.type === 'number') {
        if (f.operator === 'between') {
          return f.value?.min !== undefined || f.value?.max !== undefined
        }
        return f.value !== '' && f.value !== undefined && f.value !== null
      }

      if (fieldDef.type === 'date') {
        if (f.operator === 'between') {
          return f.value?.start || f.value?.end
        }
        return f.value
      }

      return f.value !== '' && f.value !== undefined && f.value !== null
    })

    if (activeFilters.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Filters:</span>
        {activeFilters.map((filter) => (
          <Badge key={filter.id} variant="secondary" className="flex items-center space-x-1">
            <span>{filter.label}</span>
            <span className="text-muted-foreground">{
              getOperatorsForType(getFieldDefinition(filter.field)?.type || 'text')
                .find(op => op.value === filter.operator)?.label
            }</span>
            <button
              onClick={() => removeFilter(filter.id)}
              className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Filter Summary */}
      {getFilterSummary()}

      {/* Filter Button and Content */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {children || (
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Advanced Filters</span>
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.length}
                </Badge>
              )}
            </Button>
          )}
        </PopoverTrigger>

        <PopoverContent className="w-[500px] p-4" align="start">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <h3 className="font-semibold">Advanced Filters</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={onClear}>
                  Clear All
                </Button>
                <Button size="sm" onClick={() => onApply(filters)}>
                  Apply Filters
                </Button>
              </div>
            </div>

            <Separator />

            {/* Filters List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {filters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No filters applied. Add a filter to get started.
                </div>
              ) : (
                filters.map((filter) => {
                  const fieldDef = getFieldDefinition(filter.field)
                  const operators = getOperatorsForType(fieldDef?.type || 'text')

                  return (
                    <div key={filter.id} className="border rounded-lg p-3 space-y-3">
                      {/* Filter Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {fieldDef?.icon || <Filter className="h-4 w-4" />}
                          <span className="font-medium">{fieldDef?.label}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(filter.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Filter Controls */}
                      <div className="grid grid-cols-12 gap-2 items-center">
                        {/* Field Selection */}
                        <div className="col-span-3">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => {
                              const newField = fields.find(f => f.key === value)
                              updateFilter(filter.id, {
                                field: value,
                                label: newField?.label,
                                operator: defaultOperators[newField?.type || 'text'][0]?.value || 'equals',
                                value: newField?.type === 'boolean' ? false : ''
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fields.map((field) => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Operator Selection */}
                        <div className="col-span-3">
                          <Select
                            value={filter.operator}
                            onValueChange={(value) => {
                              updateFilter(filter.id, {
                                operator: value,
                                value: value === 'between' ? { min: '', max: '' } :
                                       value === 'lastDays' || value === 'nextDays' ? { days: 7 } :
                                       fieldDef?.type === 'boolean' ? false : ''
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((operator) => (
                                <SelectItem key={operator.value} value={operator.value}>
                                  {operator.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Value Input */}
                        <div className="col-span-5">
                          {renderFilterValue(filter)}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFilter(filter.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <Separator />

            {/* Add Filter Button */}
            <Button
              variant="outline"
              onClick={addFilter}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Filter</span>
            </Button>

            {/* Quick Filters */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between">
                  <span className="text-sm font-medium">Quick Filters</span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const activeFilter: FilterCondition = {
                        id: Date.now().toString(),
                        field: 'isActive',
                        operator: 'equals',
                        value: true,
                        label: 'Active Status'
                      }
                      onFiltersChange([...filters, activeFilter])
                    }}
                  >
                    Active Items
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const recentFilter: FilterCondition = {
                        id: Date.now().toString(),
                        field: 'createdAt',
                        operator: 'lastDays',
                        value: { days: 30 },
                        label: 'Created Date'
                      }
                      onFiltersChange([...filters, recentFilter])
                    }}
                  >
                    Last 30 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lowStockFilter: FilterCondition = {
                        id: Date.now().toString(),
                        field: 'stockLevel',
                        operator: 'lessThan',
                        value: 10,
                        label: 'Stock Level'
                      }
                      onFiltersChange([...filters, lowStockFilter])
                    }}
                  >
                    Low Stock
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const highValueFilter: FilterCondition = {
                        id: Date.now().toString(),
                        field: 'value',
                        operator: 'greaterThan',
                        value: 1000,
                        label: 'Total Value'
                      }
                      onFiltersChange([...filters, highValueFilter])
                    }}
                  >
                    High Value
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}