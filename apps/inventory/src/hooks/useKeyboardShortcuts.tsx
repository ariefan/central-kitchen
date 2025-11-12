import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface Shortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : true
        const metaMatches = shortcut.metaKey ? event.metaKey : true

        if (keyMatches && ctrlMatches && metaMatches) {
          event.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()

  const shortcuts: Shortcut[] = [
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        searchInput?.focus()
      },
      description: 'Focus global search',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        navigate({ to: '/products' })
      },
      description: 'Go to Products',
    },
    {
      key: 'l',
      ctrlKey: true,
      action: () => {
        navigate({ to: '/inventory/lots' })
      },
      description: 'Go to Lots',
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => {
        navigate({ to: '/inventory/onhand' })
      },
      description: 'Go to On-Hand Inventory',
    },
    {
      key: 'h',
      action: () => {
        navigate({ to: '/' })
      },
      description: 'Go to Dashboard',
    },
    {
      key: 'g',
      action: () => {
        navigate({ to: '/purchasing/gr' })
      },
      description: 'Go to Goods Receipt',
    },
    {
      key: 't',
      action: () => {
        navigate({ to: '/transfers' })
      },
      description: 'Go to Transfers',
    },
    {
      key: 'p',
      action: () => {
        navigate({ to: '/production/orders' })
      },
      description: 'Go to Production',
    },
    {
      key: '?',
      action: () => {
        // This will be handled by the KeyboardShortcutsHelp component
        const helpButton = document.querySelector('[data-shortcuts-help]') as HTMLButtonElement
        helpButton?.click()
      },
      description: 'Show keyboard shortcuts',
    },
  ]

  useKeyboardShortcuts(shortcuts)
  return shortcuts
}