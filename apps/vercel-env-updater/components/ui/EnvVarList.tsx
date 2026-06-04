'use client'

import { Button } from '@workspace/ui/components/button'
import { HiOutlineTrash } from 'react-icons/hi2'
import { cn } from '@workspace/ui/lib/utils'

export type EnvVarItem = { key: string; value: string }

type EnvVarListProps = {
  items: EnvVarItem[]
  onRemove: (index: number) => void
  className?: string
  emptyMessage?: string
}

export function EnvVarList({
  items,
  onRemove,
  className,
  emptyMessage = 'No variables yet. Add some above.',
}: EnvVarListProps) {
  return (
    <div
      className={cn(
        'flex-1 space-y-1.5 overflow-auto text-sm min-h-[140px] max-h-[min(220px,40vh)] pr-1 custom-scroll',
        className
      )}
    >
      {items.length === 0 ? (
        <div className="flex h-full min-h-[140px] items-center justify-center text-center py-8 text-muted-foreground text-sm px-4">
          {emptyMessage}
        </div>
      ) : (
        items.map((variable, index) => (
          <div
            key={variable.key}
            className="env-list-item-enter group flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 min-h-11 hover:bg-muted/60 transition-colors"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <div className="font-mono text-xs min-w-0 flex-1">
              <span className="text-foreground/80 font-medium">{variable.key}</span>
              <span className="text-muted-foreground/60 mx-1">=</span>
              <span className="text-muted-foreground break-all">{variable.value}</span>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              type="button"
              aria-label={`Remove ${variable.key}`}
              className="shrink-0 opacity-50 group-hover:opacity-100 text-destructive hover:text-destructive min-h-9 min-w-9"
              onClick={() => onRemove(index)}
            >
              <HiOutlineTrash className="size-3.5" />
            </Button>
          </div>
        ))
      )}
    </div>
  )
}