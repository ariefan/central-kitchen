import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode } from 'react'

import { queryClient } from '@/lib/api'

interface QueryProviderProps {
  children: ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <div suppressHydrationWarning>
        {children}
      </div>
      {import.meta.env.DEV && (
        <div suppressHydrationWarning>
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        </div>
      )}
    </QueryClientProvider>
  )
}