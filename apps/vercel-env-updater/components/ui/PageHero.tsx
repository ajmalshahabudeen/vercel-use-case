'use client'

import * as React from 'react'
import { cn } from '@workspace/ui/lib/utils'

type PageHeroProps = {
  badge?: React.ReactNode
  title: React.ReactNode
  description: string
  actions?: React.ReactNode
  footnote?: string
  className?: string
}

export function PageHero({
  badge,
  title,
  description,
  actions,
  footnote,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'env-updater-mesh mx-auto max-w-4xl px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12 text-center',
        className
      )}
    >
      {badge && <div className="mb-5 flex justify-center">{badge}</div>}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-semibold tracking-tighter leading-[1.05] mb-4">
        {title}
      </h1>
      <p className="mx-auto max-w-lg text-base sm:text-xl text-muted-foreground leading-relaxed">
        {description}
      </p>
      {actions && (
        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          {actions}
        </div>
      )}
      {footnote && (
        <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>
      )}
    </section>
  )
}