'use client'

import { HiOutlineCheckCircle } from 'react-icons/hi2'
import { cn } from '@workspace/ui/lib/utils'

type ConnectionBannerProps = {
  scope: string
  projectId?: string
  className?: string
}

export function ConnectionBanner({ scope, projectId, className }: ConnectionBannerProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-green-500/20 bg-green-500/5 p-4 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300',
        className
      )}
      role="status"
    >
      <HiOutlineCheckCircle className="mt-0.5 size-5 text-green-600 dark:text-green-400 shrink-0" />
      <div className="min-w-0">
        <span className="text-muted-foreground">Connected to </span>
        <span className="font-medium">{scope || 'personal account'}</span>
        {projectId ? (
          <>
            <span className="text-muted-foreground"> · Project </span>
            <span className="font-mono text-xs break-all">{projectId}</span>
          </>
        ) : null}
        <p className="mt-1 text-[11px] text-muted-foreground">Token stored securely — not shown in UI</p>
      </div>
    </div>
  )
}