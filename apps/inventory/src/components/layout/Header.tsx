import { useState } from 'react'
import { Search, Bell, Settings, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts'
import QuickActions from './QuickActions'
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp'

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { results, navigateToResult, hasResults } = useGlobalSearch(searchQuery)
  const shortcuts = useGlobalShortcuts()

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'product':
        return '📦'
      case 'lot':
        return '🏷️'
      case 'inventory':
        return '📊'
      default:
        return '📄'
    }
  }

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case 'product':
        return 'Product'
      case 'lot':
        return 'Lot'
      case 'inventory':
        return 'Inventory'
      default:
        return 'Document'
    }
  }

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Global Search */}
        <div className="flex-1 max-w-md">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search products, lots, inventory...
                <kbd className="ml-auto text-xs bg-muted px-2 py-1 rounded">
                  /
                </kbd>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search products, lots, inventory..."
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {searchQuery ? 'No results found.' : 'Type to search...'}
                  </CommandEmpty>

                  {hasResults && (
                    <>
                      <CommandGroup heading="Products">
                        {results
                          .filter(r => r.type === 'product')
                          .map((result) => (
                            <CommandItem
                              key={result.id}
                              onSelect={() => navigateToResult(result)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 w-full">
                                <span>{getResultIcon(result.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.title}</div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {result.subtitle}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {getResultTypeLabel(result.type)}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>

                      <CommandGroup heading="Lots">
                        {results
                          .filter(r => r.type === 'lot')
                          .map((result) => (
                            <CommandItem
                              key={result.id}
                              onSelect={() => navigateToResult(result)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 w-full">
                                <span>{getResultIcon(result.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.title}</div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {result.subtitle}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {getResultTypeLabel(result.type)}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>

                      <CommandGroup heading="Inventory">
                        {results
                          .filter(r => r.type === 'inventory')
                          .map((result) => (
                            <CommandItem
                              key={result.id}
                              onSelect={() => navigateToResult(result)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 w-full">
                                <span>{getResultIcon(result.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{result.title}</div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {result.subtitle}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {getResultTypeLabel(result.type)}
                                </Badge>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <QuickActions />

          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>

          <KeyboardShortcutsHelp shortcuts={shortcuts} />

          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}