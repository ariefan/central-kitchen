import { Link } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Package,
  Truck,
  Factory,
  Scan,
  Scale,
  ArrowRight,
} from 'lucide-react'

const quickActions = [
  {
    title: 'New Product',
    description: 'Add a new product to the catalog',
    icon: Package,
    href: '/products',
    action: 'create',
  },
  {
    title: 'Goods Receipt',
    description: 'Receive inventory from suppliers',
    icon: Truck,
    href: '/purchasing/gr',
    action: 'create',
  },
  {
    title: 'Stock Transfer',
    description: 'Move inventory between locations',
    icon: ArrowRight,
    href: '/transfers',
    action: 'create',
  },
  {
    title: 'Production Order',
    description: 'Start a new production batch',
    icon: Factory,
    href: '/production/orders',
    action: 'create',
  },
  {
    title: 'Stock Count',
    description: 'Perform physical inventory count',
    icon: Scan,
    href: '/stock-counts',
    action: 'create',
  },
  {
    title: 'Inventory Adjustment',
    description: 'Adjust stock levels manually',
    icon: Scale,
    href: '/adjustments',
    action: 'create',
  },
]

interface QuickActionsProps {
  trigger?: React.ReactNode
}

export default function QuickActions({ trigger }: QuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Quick Actions
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <DropdownMenuItem key={action.title} asChild>
              <Link
                to={action.href}
                className="flex items-start p-2 cursor-pointer"
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}