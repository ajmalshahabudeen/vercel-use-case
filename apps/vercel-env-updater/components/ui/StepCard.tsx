'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { cn } from '@workspace/ui/lib/utils'

type StepCardProps = {
  step?: number
  title: string
  description?: React.ReactNode
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  headerExtra?: React.ReactNode
}

export function StepCard({
  step,
  title,
  description,
  icon,
  children,
  className,
  contentClassName,
  headerExtra,
}: StepCardProps) {
  return (
    <Card className={cn('overflow-hidden border-border/80 shadow-sm', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="shrink-0 rounded-2xl bg-primary/10 p-2.5 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                {step !== undefined && (
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background tabular-nums">
                    {step}
                  </span>
                )}
                <span className="truncate">{title}</span>
              </CardTitle>
              {description && (
                <CardDescription className="mt-1 text-left">{description}</CardDescription>
              )}
            </div>
          </div>
          {headerExtra}
        </div>
      </CardHeader>
      <CardContent className={cn('pt-0', contentClassName)}>{children}</CardContent>
    </Card>
  )
}