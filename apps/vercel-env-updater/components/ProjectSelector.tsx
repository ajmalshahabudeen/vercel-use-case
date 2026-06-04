'use client'

import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Label } from '@workspace/ui/components/label'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type { VercelProject } from '@vercel-env-updater/config'
import { cn } from '@workspace/ui/lib/utils'

interface ProjectSelectorProps {
  projects: VercelProject[]
  selectedIds: Set<string>
  onToggle: (projectId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isLoading?: boolean
}

function ProjectSkeletonRows() {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProjectSelector({
  projects,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  isLoading,
}: ProjectSelectorProps) {
  const allSelected = projects.length > 0 && selectedIds.size === projects.length

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm font-medium">Available Projects ({projects.length})</Label>
          {selectedIds.size > 0 && (
            <span className="text-xs rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium animate-in fade-in zoom-in-95 duration-200">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {projects.length > 0 && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={allSelected}
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 min-h-9 px-1"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={selectedIds.size === 0}
              className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 min-h-9 px-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-card/50 p-1 shadow-sm">
        <ScrollArea className="h-[min(320px,50vh)] w-full rounded-[inherit] px-2 sm:px-3 py-2">
          {isLoading ? (
            <ProjectSkeletonRows />
          ) : projects.length === 0 ? (
            <div className="flex h-[min(200px,40vh)] items-center justify-center text-center text-sm text-muted-foreground px-4">
              No projects found. Enter a valid token and scan.
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.map((project, index) => {
                const checked = selectedIds.has(project.id)
                return (
                  <label
                    key={project.id}
                    className={cn(
                      'group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 min-h-11 transition-all animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                      checked
                        ? 'bg-primary/5 ring-1 ring-primary/25'
                        : 'hover:bg-muted/60'
                    )}
                    style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(project.id)}
                      id={`project-${project.id}`}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{project.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {project.id}
                      </div>
                    </div>
                    <div className="hidden sm:block text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}