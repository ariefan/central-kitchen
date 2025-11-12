import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Clock,
  TrendingUp,
  Filter,
  X,
  ChevronRight,
  Star,
  Hash,
  Calendar,
  Package,
  Tag,
  User,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchSuggestion {
  id: string
  type: 'recent' | 'popular' | 'suggested'
  text: string
  category?: string
  count?: number
  icon?: React.ReactNode
}

interface SearchFilter {
  field: string
  label: string
  value: string
  type: string
}

interface SmartSearchProps {
  value: string
  onChange: (value: string) => void
  onSearch: (query: string, filters?: SearchFilter[]) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
  popularSearches?: string[]
  enableFilters?: boolean
  filterFields?: Array<{
    key: string
    label: string
    type: string
    options?: Array<{ value: string; label: string }>
  }>
  className?: string
}

export default function SmartSearch({
  value,
  onChange,
  onSearch,
  placeholder = 'Search products, suppliers, categories...',
  suggestions = [],
  recentSearches = [],
  popularSearches = [],
  enableFilters = true,
  filterFields = [],
  className = ''
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions based on current input
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.text.toLowerCase().includes(value.toLowerCase())
  )

  // Get recent searches that match current input
  const filteredRecentSearches = recentSearches.filter(search =>
    search.toLowerCase().includes(value.toLowerCase())
  )

  const handleSearch = (query: string = value) => {
    if (query.trim()) {
      // Save to recent searches
      const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      // In a real app, you'd save this to localStorage or API

      onSearch(query, activeFilters)
      setIsOpen(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    handleSearch(suggestion.text)
  }

  const addFilter = (field: string, label: string, value: string, type: string) => {
    const newFilter: SearchFilter = { field, label, value, type }
    setActiveFilters([...activeFilters.filter(f => f.field !== field), newFilter])
  }

  const removeFilter = (field: string) => {
    setActiveFilters(activeFilters.filter(f => f.field !== field))
  }

  const clearAllFilters = () => {
    setActiveFilters([])
  }

  const getFilterSummary = () => {
    if (activeFilters.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {activeFilters.map((filter) => (
          <Badge key={filter.field} variant="secondary" className="flex items-center gap-1">
            <span>{filter.label}: {filter.value}</span>
            <button
              onClick={() => removeFilter(filter.field)}
              className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-xs h-6 px-2"
        >
          Clear all
        </Button>
      </div>
    )
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case 'popular':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'suggested':
        return <Star className="h-4 w-4 text-blue-600" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  return (
    <div className={cn('w-full max-w-xl', className)}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-10 pr-20"
          />

          {/* Search and Filter Buttons */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {value && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {enableFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(true)}
                className={activeFilters.length > 0 ? 'text-blue-600' : ''}
              >
                <Filter className="h-4 w-4" />
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleSearch()}
              disabled={!value.trim()}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Filter Summary */}
        {getFilterSummary()}

        {/* Search Suggestions Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-96 overflow-hidden">
            <Command className="w-full">
              <CommandList>
                {/* Quick Actions */}
                {(filteredRecentSearches.length > 0 || popularSearches.length > 0) && (
                  <CommandGroup heading="Quick Actions">
                    {value && (
                      <CommandItem onSelect={() => handleSearch()}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search for "{value}"</span>
                        <ChevronRight className="ml-auto h-4 w-4" />
                      </CommandItem>
                    )}
                    {filteredRecentSearches.slice(0, 3).map((search, index) => (
                      <CommandItem
                        key={`recent-${index}`}
                        onSelect={() => {
                          onChange(search)
                          handleSearch(search)
                        }}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        <span>{search}</span>
                        <Badge variant="outline" className="ml-auto">Recent</Badge>
                      </CommandItem>
                    ))}
                    {popularSearches.slice(0, 3).map((search, index) => (
                      <CommandItem
                        key={`popular-${index}`}
                        onSelect={() => {
                          onChange(search)
                          handleSearch(search)
                        }}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        <span>{search}</span>
                        <Badge variant="outline" className="ml-auto">Popular</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Suggestions */}
                {filteredSuggestions.length > 0 && (
                  <CommandGroup heading="Suggestions">
                    {filteredSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        onSelect={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion.icon || getSuggestionIcon(suggestion.type)}
                        <span className="ml-2">{suggestion.text}</span>
                        {suggestion.category && (
                          <Badge variant="outline" className="ml-auto">
                            {suggestion.category}
                          </Badge>
                        )}
                        {suggestion.count && (
                          <span className="ml-auto text-sm text-muted-foreground">
                            {suggestion.count} results
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* No Results */}
                {filteredSuggestions.length === 0 &&
                 filteredRecentSearches.length === 0 &&
                 value && (
                  <CommandEmpty>
                    <div className="text-center py-4">
                      <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p>No suggestions found</p>
                      <p className="text-sm text-muted-foreground">
                        Try "{value}" or use advanced filters
                      </p>
                    </div>
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {/* Advanced Filters Dialog */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advanced Search Filters</DialogTitle>
            <DialogDescription>
              Refine your search with specific filters and conditions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Filters */}
            {activeFilters.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Active Filters</h4>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Badge key={filter.field} variant="default" className="flex items-center gap-1">
                      <span>{filter.label}: {filter.value}</span>
                      <button
                        onClick={() => removeFilter(filter.field)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            <Separator />

            {/* Filter Options */}
            <div className="space-y-4">
              <h4 className="font-medium">Add Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filterFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}</label>

                    {field.type === 'select' && field.options ? (
                      <div className="space-y-1">
                        {field.options.map((option) => (
                          <Button
                            key={option.value}
                            variant={activeFilters.some(f => f.field === field.key && f.value === option.value)
                              ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (activeFilters.some(f => f.field === field.key && f.value === option.value)) {
                                removeFilter(field.key)
                              } else {
                                addFilter(field.key, field.label, option.value, field.type)
                              }
                            }}
                            className="w-full justify-start"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    ) : field.type === 'range' ? (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Min value"
                          className="w-full"
                        />
                        <Input
                          type="number"
                          placeholder="Max value"
                          className="w-full"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => addFilter(field.key, field.label, 'range', field.type)}
                        >
                          Apply Range
                        </Button>
                      </div>
                    ) : field.type === 'date' ? (
                      <div className="space-y-2">
                        <Input
                          type="date"
                          className="w-full"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => addFilter(field.key, field.label, 'date', field.type)}
                        >
                          Apply Date
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="text"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement
                            if (target.value.trim()) {
                              addFilter(field.key, field.label, target.value.trim(), field.type)
                              target.value = ''
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Filter Presets */}
            <div className="space-y-3">
              <h4 className="font-medium">Quick Filters</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('status', 'Status', 'Active', 'select')}
                >
                  Active Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('stock', 'Stock Level', 'Low', 'select')}
                >
                  Low Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('created', 'Created Date', 'This Week', 'date')}
                >
                  Created This Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('category', 'Category', 'Produce', 'select')}
                >
                  Produce Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('supplier', 'Supplier', 'Local', 'select')}
                >
                  Local Suppliers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addFilter('value', 'Value', 'High', 'range')}
                >
                  High Value
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowFilters(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSearch()
              setShowFilters(false)
            }}>
              Apply Filters & Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}