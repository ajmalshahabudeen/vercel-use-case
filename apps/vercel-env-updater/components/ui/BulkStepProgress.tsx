'use client'

import { cn } from '@workspace/ui/lib/utils'

type BulkStepProgressProps = {
  hasToken: boolean
  hasKey: boolean
  selectedCount: number
  className?: string
}

const steps = [
  { id: 'access', label: 'Access' },
  { id: 'variable', label: 'Variable' },
  { id: 'projects', label: 'Projects' },
] as const

export function BulkStepProgress({
  hasToken,
  hasKey,
  selectedCount,
  className,
}: BulkStepProgressProps) {
  const done = [hasToken, hasKey, selectedCount > 0]
  const activeIndex = done.findIndex((d) => !d)
  const current = activeIndex === -1 ? steps.length - 1 : activeIndex

  return (
    <nav aria-label="Bulk update progress" className={cn('w-full', className)}>
      <ol className="flex items-center gap-1 sm:gap-2">
        {steps.map((step, i) => {
          const isComplete = done[i]
          const isCurrent = i === current && !isComplete
          const isPast = i < current || (isComplete && i <= current)

          return (
            <li key={step.id} className="flex flex-1 items-center gap-1 sm:gap-2 min-w-0">
              <div
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 rounded-2xl border px-2 sm:px-3 py-2 transition-colors',
                  isPast || isComplete
                    ? 'border-primary/30 bg-primary/5'
                    : isCurrent
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums transition-colors',
                    isPast || isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-foreground text-background'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete ? '✓' : i + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-xs sm:text-sm font-medium',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'hidden sm:block h-px w-4 shrink-0',
                    done[i] ? 'bg-primary/40' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}