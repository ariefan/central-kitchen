'use client'

import { React, useEffect, useState } from 'react'

interface HydrationBoundaryProps {
  children: React.ReactNode
}

export default function HydrationBoundary({ children }: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Prevent server-client mismatch by not rendering until hydrated
  return <>{isHydrated ? children : null}</>
}