import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Keyboard, Navigation, Search, FileText } from 'lucide-react'
import type { Shortcut } from '@/hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  shortcuts: Shortcut[]
  trigger?: React.ReactNode
}

const shortcutCategories = {
  navigation: {
    title: 'Navigation',
    icon: Navigation,
    shortcuts: [],
  },
  search: {
    title: 'Search',
    icon: Search,
    shortcuts: [],
  },
  actions: {
    title: 'Actions',
    icon: FileText,
    shortcuts: [],
  },
}

export default function KeyboardShortcutsHelp({ shortcuts, trigger }: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const categorizedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (shortcut.key === '/' || shortcut.description.toLowerCase().includes('search')) {
      acc.search.shortcuts.push(shortcut)
    } else if (shortcut.description.toLowerCase().includes('navigate') ||
               shortcut.description.toLowerCase().includes('go to')) {
      acc.navigation.shortcuts.push(shortcut)
    } else {
      acc.actions.shortcuts.push(shortcut)
    }
    return acc
  }, shortcutCategories)

  const formatKeyBinding = (shortcut: Shortcut) => {
    const keys = []
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.metaKey) keys.push('Cmd')
    keys.push(shortcut.key.toUpperCase())
    return keys.join(' + ')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" data-shortcuts-help>
            <Keyboard className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick keyboard shortcuts to navigate the application faster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.values(categorizedShortcuts).map((category) => {
            if (category.shortcuts.length === 0) return null

            const Icon = category.icon
            return (
              <div key={category.title} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">{category.title}</h3>
                </div>

                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatKeyBinding(shortcut)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {categorizedShortcuts.navigation.shortcuts.length === 0 &&
           categorizedShortcuts.search.shortcuts.length === 0 &&
           categorizedShortcuts.actions.shortcuts.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              <Keyboard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No keyboard shortcuts configured yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}