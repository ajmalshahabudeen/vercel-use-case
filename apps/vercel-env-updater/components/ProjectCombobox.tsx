'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { HiArrowPath } from 'react-icons/hi2'

import { scanVercelProjects } from '@vercel-env-updater/server'
import type { VercelProject } from '@vercel-env-updater/config'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@workspace/ui/components/combobox'
import { Button } from '@workspace/ui/components/button'
import { Spinner } from '@workspace/ui/components/spinner'

export type ProjectOption = {
  label: string
  value: string
  name: string
}

function toOption(project: VercelProject): ProjectOption {
  return {
    label: project.name,
    value: project.id,
    name: project.name,
  }
}

type ProjectComboboxProps = {
  value: string
  onValueChange: (projectId: string) => void
  token: string
  scope?: string
  disabled?: boolean
  id?: string
}

export function ProjectCombobox({
  value,
  onValueChange,
  token,
  scope = '',
  disabled = false,
  id = 'projectId',
}: ProjectComboboxProps) {
  const [projects, setProjects] = React.useState<ProjectOption[]>([])
  const [loadedForKey, setLoadedForKey] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const fetchKey = token.trim() ? `${token}:${scope}` : ''

  const loadProjects = React.useCallback(
    async (options?: { quiet?: boolean }) => {
      if (!token.trim()) {
        toast.error('Enter a Vercel access token first')
        return
      }

      setIsLoading(true)
      try {
        const result = await scanVercelProjects(token, scope)

        if (result.error) {
          toast.error('Failed to load projects', { description: result.error })
          return
        }

        const key = `${token}:${scope}`
        setProjects(result.projects.map(toOption))
        setLoadedForKey(key)

        if (!options?.quiet) {
          toast.success(`Loaded ${result.projects.length} project(s)`)
        }
      } finally {
        setIsLoading(false)
      }
    },
    [token, scope]
  )

  const activeProjects = React.useMemo(
    () => (loadedForKey === fetchKey ? projects : []),
    [loadedForKey, fetchKey, projects]
  )

  const items = React.useMemo(() => {
    if (!value.trim()) return activeProjects
    if (activeProjects.some((p) => p.value === value)) return activeProjects
    return [{ label: value, value, name: value }, ...activeProjects]
  }, [activeProjects, value])

  const selected = React.useMemo(() => {
    if (!value.trim()) return null
    return items.find((p) => p.value === value) ?? { label: value, value, name: value }
  }, [value, items])

  const comboboxDisabled = disabled || !token.trim()

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Combobox
            items={items}
            value={selected}
            onValueChange={(item) => onValueChange(item?.value ?? '')}
            disabled={comboboxDisabled}
            isItemEqualToValue={(a, b) => a.value === b.value}
            autoHighlight
            onOpenChange={(open) => {
              if (open && token.trim() && activeProjects.length === 0 && !isLoading) {
                void loadProjects({ quiet: true })
              }
            }}
          >
            <ComboboxInput
              id={id}
              placeholder={
                isLoading
                  ? 'Loading projects…'
                  : activeProjects.length
                    ? 'Search by name or ID…'
                    : 'Load projects to search'
              }
              className="w-full min-h-11"
              showClear={!!value}
              disabled={comboboxDisabled || isLoading}
            />
            <ComboboxContent>
              <ComboboxList>
                {(item: ProjectOption) => (
                  <ComboboxItem key={item.value} value={item}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate font-mono text-[10px] text-muted-foreground">
                        {item.value}
                      </span>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
              <ComboboxEmpty>
                {isLoading
                  ? 'Loading projects…'
                  : token.trim()
                    ? 'No matching projects'
                    : 'Enter a token, then refresh'}
              </ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11 shrink-0"
          onClick={() => void loadProjects()}
          disabled={comboboxDisabled || isLoading}
          aria-label="Refresh projects"
          title="Refresh projects"
        >
          {isLoading ? <Spinner /> : <HiArrowPath className="size-4" />}
        </Button>
      </div>

      {activeProjects.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {activeProjects.length} project(s) available · search or pick from the list
        </p>
      )}
      {token.trim() && loadedForKey && loadedForKey !== fetchKey && (
        <p className="text-[11px] text-amber-600 dark:text-amber-500">
          Token or scope changed — refresh projects
        </p>
      )}
    </div>
  )
}