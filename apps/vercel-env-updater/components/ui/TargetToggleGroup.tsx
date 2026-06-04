'use client'

import { toast } from 'sonner'
import type { DeploymentTarget } from '@vercel-env-updater/config'
import { cn } from '@workspace/ui/lib/utils'

const TARGETS: DeploymentTarget[] = ['production', 'preview', 'development']

type TargetToggleGroupProps = {
  selected: DeploymentTarget[]
  onChange: (next: DeploymentTarget[]) => void
  className?: string
}

export function TargetToggleGroup({
  selected,
  onChange,
  className,
}: TargetToggleGroupProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {TARGETS.map((target) => {
        const isSelected = selected.includes(target)
        return (
          <button
            key={target}
            type="button"
            onClick={() => {
              if (isSelected && selected.length === 1) {
                toast.error('At least one target must be selected')
                return
              }
              onChange(
                isSelected
                  ? selected.filter((t) => t !== target)
                  : [...selected, target]
              )
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 min-h-10 text-sm font-medium transition-all active:scale-[0.98]',
              isSelected
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border hover:bg-muted/60'
            )}
          >
            <span
              className={cn(
                'inline-block size-2 rounded-full transition-colors',
                isSelected ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
            />
            {target}
          </button>
        )
      })}
    </div>
  )
}

export function TargetBadgesReadonly({
  selected,
  className,
}: {
  selected: DeploymentTarget[]
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {TARGETS.map((target) => {
        const isSelected = selected.includes(target)
        return (
          <div
            key={target}
            className={cn(
              'inline-flex items-center rounded-2xl border px-3 py-1 text-sm font-medium',
              isSelected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border opacity-50'
            )}
          >
            {target}
          </div>
        )
      })}
    </div>
  )
}