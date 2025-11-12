import { Outlet } from '@tanstack/react-router'
import { Suspense } from 'react'

import AppSidebar from './AppSidebar'
import { Skeleton } from '@/components/ui/skeleton'

export default function AppLayout() {
  return (
    <AppSidebar>
      <Suspense fallback={<Skeleton className="w-full h-full" />}>
        <Outlet />
      </Suspense>
    </AppSidebar>
  )
}