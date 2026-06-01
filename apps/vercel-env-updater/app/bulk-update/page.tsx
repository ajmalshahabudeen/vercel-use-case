'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import { Separator } from '@workspace/ui/components/separator'

import { ProjectSelector } from '@vercel-env-updater/components'
import { scanVercelProjects, performBulkUpdate } from '@vercel-env-updater/server'
import type { VercelProject } from '@vercel-env-updater/config'

import { HiOutlineKey, HiOutlineDocumentDuplicate, HiArrowPath } from 'react-icons/hi2'

type FormValues = {
  token: string
  key: string
  globalValue: string
}

export default function BulkUpdatePage() {
  const [projects, setProjects] = React.useState<VercelProject[]>([])
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [isScanning, setIsScanning] = React.useState(false)
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Toggle: same value for all vs per-project
  const [applySameValue, setApplySameValue] = React.useState(true)
  const [perProjectValues, setPerProjectValues] = React.useState<Record<string, string>>({})

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      token: '',
      key: 'DATABASE_URL',
      globalValue: '',
    },
  })

  const token = watch('token')
  const key = watch('key')
  const globalValue = watch('globalValue')

  // Selected projects as array
  const selectedProjects = projects.filter((p) => selectedIds.has(p.id))

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // clean up per-project value if exists
        setPerProjectValues((vals) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [id]: _, ...rest } = vals
          return rest
        })
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(projects.map((p) => p.id)))
  const deselectAll = () => {
    setSelectedIds(new Set())
    setPerProjectValues({})
  }

  // Scan projects
  const handleScan = async () => {
    if (!token.trim()) {
      toast.error('Please enter a Vercel access token')
      return
    }

    setIsScanning(true)
    try {
      const result = await scanVercelProjects(token)

      if (result.error) {
        toast.error('Failed to scan projects', { description: result.error })
        return
      }

      setProjects(result.projects)
      setSelectedIds(new Set())
      setPerProjectValues({})
      toast.success(`Found ${result.projects.length} project(s)`)
    } finally {
      setIsScanning(false)
    }
  }

  // Handle per-project value change
  const handlePerProjectValueChange = (projectId: string, value: string) => {
    setPerProjectValues((prev) => ({ ...prev, [projectId]: value }))
  }

  // Execute bulk update
  const handleBulkUpdate = async (data: FormValues) => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one project')
      return
    }
    if (!data.key.trim()) {
      toast.error('Environment variable key is required')
      return
    }

    const projectPayload = selectedProjects.map((project) => {
      const value = applySameValue
        ? data.globalValue
        : perProjectValues[project.id] ?? ''

      return {
        id: project.id,
        name: project.name,
        value: value.trim(),
      }
    })

    // Validation for per-project mode
    if (!applySameValue) {
      const missing = projectPayload.filter((p) => !p.value)
      if (missing.length > 0) {
        toast.error(`Missing value for ${missing.length} project(s)`)
        return
      }
    }

    if (projectPayload.some((p) => !p.value)) {
      toast.error('Some projects are missing values')
      return
    }

    setIsUpdating(true)

    try {
      const result = await performBulkUpdate({
        token: data.token,
        key: data.key,
        projects: projectPayload,
        targets: ['production', 'preview', 'development'],
      })

      if (result.error) {
        toast.error('Bulk update failed', { description: result.error })
        return
      }

      const successes = result.results.filter((r) => r.success).length
      const failures = result.results.length - successes

      if (failures === 0) {
        toast.success(`Successfully updated "${data.key}" on ${successes} project(s)`)
      } else {
        toast.warning(`Completed with ${failures} error(s)`, {
          description: `${successes} succeeded, ${failures} failed`,
        })
      }

      // Show individual results in console for debugging (in real app → better UI)
      console.table(result.results)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            <HiOutlineDocumentDuplicate className="size-6" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Bulk Update</h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Update the same environment variable across multiple Vercel projects in one go.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HiOutlineKey className="size-5" />
                1. Vercel Access
              </CardTitle>
              <CardDescription>
                Your token is only used in secure Server Actions and never stored.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vercel Access Token</Label>
                <Input
                  type="password"
                  placeholder="v3t_xxxxxxxxxxxxxxxx"
                  {...register('token', { required: true })}
                />
              </div>

              <Button
                onClick={handleScan}
                disabled={!token.trim() || isScanning}
                className="w-full"
                variant="secondary"
              >
                {isScanning ? 'Scanning...' : 'Scan Projects'}
                <HiArrowPath className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Environment Variable</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">Key</Label>
                <Input
                  id="key"
                  placeholder="DATABASE_URL"
                  className="font-mono"
                  {...register('key', { required: true })}
                />
              </div>

              <Separator />

              {/* Same value vs per project toggle */}
              <div className="flex items-center justify-between rounded-2xl border p-4">
                <div>
                  <div className="font-medium text-sm">Apply same value to all</div>
                  <div className="text-xs text-muted-foreground">Toggle off for per-project values</div>
                </div>
                <Switch
                  checked={applySameValue}
                  onCheckedChange={(checked) => {
                    setApplySameValue(checked)
                    if (checked) setPerProjectValues({})
                  }}
                />
              </div>

              {applySameValue ? (
                <div className="space-y-2">
                  <Label>Value (applied to all selected projects)</Label>
                  <Input
                    placeholder="postgresql://user:pass@host/db"
                    className="font-mono"
                    {...register('globalValue')}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Enter individual values below for each selected project.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Project Selection + Values */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ProjectSelector
                projects={projects}
                selectedIds={selectedIds}
                onToggle={toggleProject}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                isLoading={isScanning}
              />
            </CardContent>
          </Card>

          {/* Per-project value inputs (only when toggle is off) */}
          {!applySameValue && selectedProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per-Project Values</CardTitle>
                <CardDescription>Provide a value for each selected project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[380px] overflow-auto pr-1 custom-scroll">
                  {selectedProjects.map((project) => (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="w-48 shrink-0 truncate text-sm font-medium">
                        {project.name}
                      </div>
                      <Input
                        placeholder="Value for this project"
                        className="font-mono flex-1"
                        value={perProjectValues[project.id] ?? ''}
                        onChange={(e) => handlePerProjectValueChange(project.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSubmit(handleBulkUpdate)}
              disabled={
                isUpdating ||
                selectedProjects.length === 0 ||
                !key ||
                (applySameValue && !globalValue)
              }
              className="min-w-52"
            >
              {isUpdating ? 'Updating environment variables...' : `Bulk Update ${selectedProjects.length} Project(s)`}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-muted-foreground">
        All API calls are executed securely from Server Actions in <code>/server</code>. Your token is never persisted.
      </div>
    </div>
  )
}
