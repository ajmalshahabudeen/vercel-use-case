'use client'

import * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

type MobileActionBarProps = {
  children: React.ReactNode
  className?: string
}

/** Sticky bottom bar for primary actions on small screens */
export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.15)] sm:hidden',
        className
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2">{children}</div>
    </div>
  )
}