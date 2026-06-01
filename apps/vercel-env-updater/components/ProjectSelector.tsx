'use client'

import { ScrollArea } from '@workspace/ui/components/scroll-area'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Label } from '@workspace/ui/components/label'
import type { VercelProject } from '@vercel-env-updater/config'

interface ProjectSelectorProps {
  projects: VercelProject[]
  selectedIds: Set<string>
  onToggle: (projectId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isLoading?: boolean
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Available Projects ({projects.length})</Label>
          {selectedIds.size > 0 && (
            <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {projects.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              disabled={allSelected}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              disabled={selectedIds.size === 0}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-card p-1">
        <ScrollArea className="h-[320px] w-full rounded-[inherit] px-3 py-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Scanning Vercel projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No projects found. Enter a valid token and scan.
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((project) => {
                const checked = selectedIds.has(project.id)
                return (
                  <label
                    key={project.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => onToggle(project.id)}
                      id={`project-${project.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{project.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {project.id}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
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
