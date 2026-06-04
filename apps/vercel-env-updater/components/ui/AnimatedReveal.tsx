'use client'

import * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

type AnimatedRevealProps = {
  children: React.ReactNode
  className?: string
  /** 0–4 for stagger delay inside .reveal-stagger parents */
  staggerIndex?: number
  as?: 'div' | 'section'
}

export function AnimatedReveal({
  children,
  className,
  staggerIndex,
  as: Tag = 'div',
}: AnimatedRevealProps) {
  const style =
    staggerIndex !== undefined
      ? { animationDelay: `${staggerIndex * 70}ms` }
      : undefined

  return (
    <Tag
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both',
        className
      )}
      style={style}
    >
      {children}
    </Tag>
  )
}