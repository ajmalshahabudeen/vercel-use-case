'use client'

import React from 'react'
import Link from 'next/link'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import { Separator } from '@workspace/ui/components/separator'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'

import {
  AnimatedReveal,
  BulkStepProgress,
  MobileActionBar,
  ProjectSelector,
  StepCard,
  TargetBadgesReadonly,
  TargetToggleGroup,
} from '@vercel-env-updater/components'
import {
  scanVercelProjects,
  performBulkUpdate,
  performBulkUpdateAndRedeploy,
  getDefaultVercelToken,
  getVercelConnection,
} from '@vercel-env-updater/server'
import type { VercelProject, DeploymentTarget } from '@vercel-env-updater/config'

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
  const [isRedeploying, setIsRedeploying] = React.useState(false)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<'update' | 'update-redeploy' | null>(null)

  const [selectedTargets, setSelectedTargets] = React.useState<DeploymentTarget[]>([
    'production',
    'preview',
    'development',
  ])

  const [applySameValue, setApplySameValue] = React.useState(true)
  const [perProjectValues, setPerProjectValues] = React.useState<Record<string, string>>({})
  const [teamScope, setTeamScope] = React.useState('')

  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      token: '',
      key: 'DATABASE_URL',
      globalValue: '',
    },
  })

  React.useEffect(() => {
    let cancelled = false

    async function loadSavedCredentials() {
      try {
        const [connection, defaultToken] = await Promise.all([
          getVercelConnection(),
          getDefaultVercelToken(),
        ])

        if (cancelled) return

        const token = connection?.vercelToken || defaultToken?.token
        const scope = connection?.scope || defaultToken?.scope || ''

        if (token) {
          setValue('token', token)
          setTeamScope(scope)
          const source = connection
            ? 'saved Vercel connection'
            : `default token (${defaultToken?.label ?? 'Account'})`
          toast.info(`Loaded ${source}`, { duration: 3000 })
        }
      } catch {
        // DB unavailable — user can paste token manually
      }
    }

    void loadSavedCredentials()
    return () => {
      cancelled = true
    }
  }, [setValue])

  const token = useWatch({ control, name: 'token' }) ?? ''
  const key = useWatch({ control, name: 'key' }) ?? ''
  const globalValue = useWatch({ control, name: 'globalValue' }) ?? ''

  const selectedProjects = projects.filter((p) => selectedIds.has(p.id))

  const toggleProject = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
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

  const handleScan = async () => {
    if (!token.trim()) {
      toast.error('Please enter a Vercel access token')
      return
    }

    setIsScanning(true)
    try {
      const result = await scanVercelProjects(token, teamScope)

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

  const handlePerProjectValueChange = (projectId: string, value: string) => {
    setPerProjectValues((prev) => ({ ...prev, [projectId]: value }))
  }

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
        targets: selectedTargets,
        scope: teamScope,
      })

      if (result.error) {
        toast.error('Bulk update failed', { description: result.error })
        return
      }

      const successes = result.results.filter((r) => r.success).length
      const failures = result.results.length - successes
      const firstFailure = result.results.find((r) => !r.success)

      if (failures === 0) {
        toast.success(`Successfully updated "${data.key}" on ${successes} project(s)`)
      } else {
        toast.warning(`Completed with ${failures} error(s)`, {
          description:
            firstFailure?.error ??
            `${successes} succeeded, ${failures} failed`,
        })
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const openDeployDialog = (action: 'update' | 'update-redeploy') => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one project')
      return
    }
    if (!key.trim()) {
      toast.error('Environment variable key is required')
      return
    }
    setPendingAction(action)
    setDialogOpen(true)
  }

  const confirmDeployment = () => {
    if (!pendingAction) return

    if (selectedTargets.length === 0) {
      toast.error('Please select at least one target')
      return
    }

    setDialogOpen(false)

    if (pendingAction === 'update') {
      handleSubmit(handleBulkUpdate)()
    } else {
      handleSubmit(handleBulkUpdateAndRedeploy)()
    }

    setTimeout(() => setPendingAction(null), 200)
  }

  const handleBulkUpdateAndRedeploy = async (data: FormValues) => {
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

    setIsRedeploying(true)

    try {
      const result = await performBulkUpdateAndRedeploy({
        token: data.token,
        key: data.key,
        projects: projectPayload,
        targets: selectedTargets,
        scope: teamScope,
      })

      if (result.error) {
        toast.error('Operation failed', { description: result.error })
        return
      }

      const successfulUpdates = result.updateResults.filter((r) => r.success).length
      const failedUpdates = result.updateResults.length - successfulUpdates

      const successfulRedeploys = result.redeployResults.filter((r) => r.success).length
      const failedRedeploys = result.redeployResults.length - successfulRedeploys

      const firstUpdateFailure = result.updateResults.find((r) => !r.success)
      const firstRedeployFailure = result.redeployResults.find((r) => !r.success)

      if (failedUpdates === 0 && failedRedeploys === 0) {
        toast.success('Bulk update + redeploy completed successfully!', {
          description: `Updated ${successfulUpdates} project(s) and triggered ${successfulRedeploys} deployment(s).`,
        })

        reset({ token: data.token, key: '', globalValue: '' })
        setPerProjectValues({})
      } else {
        const detail = [
          failedUpdates > 0
            ? `Update: ${firstUpdateFailure?.projectName ?? 'project'} — ${firstUpdateFailure?.error ?? 'failed'}`
            : null,
          failedRedeploys > 0
            ? `Redeploy (${firstRedeployFailure?.target ?? 'target'}): ${firstRedeployFailure?.projectName ?? 'project'} — ${firstRedeployFailure?.error ?? 'failed'}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')

        toast.warning('Operation completed with some issues', {
          description:
            detail ||
            `Updates: ${successfulUpdates} ok, ${failedUpdates} failed. Redeploys: ${successfulRedeploys} ok, ${failedRedeploys} failed.`,
        })
      }
    } catch {
      toast.error('Unexpected error during bulk update + redeploy')
    } finally {
      setIsRedeploying(false)
    }
  }

  const actionsDisabled =
    isUpdating ||
    isRedeploying ||
    selectedProjects.length === 0 ||
    selectedTargets.length === 0 ||
    !key ||
    (applySameValue && !globalValue)

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 pb-28 sm:pb-10">
      <AnimatedReveal className="mb-6 sm:mb-8">
        <div className="env-updater-mesh rounded-4xl border border-border/60 p-5 sm:p-8 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-2xl bg-primary/10 p-2.5 text-primary shrink-0">
              <HiOutlineDocumentDuplicate className="size-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight">Bulk Update</h1>
              <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mt-1">
                Update the same environment variable across multiple Vercel projects in one go.
              </p>
            </div>
          </div>
          <BulkStepProgress
            hasToken={!!token.trim()}
            hasKey={!!key.trim()}
            selectedCount={selectedIds.size}
          />
        </div>
      </AnimatedReveal>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-5 space-y-4 sm:space-y-6 reveal-stagger">
          <AnimatedReveal staggerIndex={0}>
            <StepCard
              step={1}
              title="Vercel Access"
              description={
                <>
                  Token is sent via secure Server Actions. Save defaults on{' '}
                  <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
                    Account → Tokens
                  </Link>
                  .
                </>
              }
              icon={<HiOutlineKey className="size-5" />}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vercel Access Token</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder="v3t_xxxxxxxxxxxxxxxx"
                    className="min-h-11"
                    {...register('token', { required: true })}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleScan}
                  disabled={!token.trim() || isScanning}
                  className="w-full min-h-11"
                  variant="secondary"
                >
                  {isScanning ? (
                    <>
                      <Spinner className="mr-2" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      Scan Projects
                      <HiArrowPath className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </StepCard>
          </AnimatedReveal>

          <AnimatedReveal staggerIndex={1}>
            <StepCard step={2} title="Environment Variable">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    placeholder="DATABASE_URL"
                    className="font-mono min-h-11"
                    {...register('key', { required: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Apply to Targets</Label>
                  <TargetToggleGroup
                    selected={selectedTargets}
                    onChange={setSelectedTargets}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Selected: {selectedTargets.join(', ')}
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3 rounded-2xl border p-4 min-h-11">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">Apply same value to all</div>
                    <div className="text-xs text-muted-foreground">
                      Toggle off for per-project values
                    </div>
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
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label>Value (applied to all selected projects)</Label>
                    <Input
                      placeholder="postgresql://user:pass@host/db"
                      className="font-mono min-h-11"
                      {...register('globalValue')}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground animate-in fade-in duration-200">
                    Enter individual values below for each selected project.
                  </p>
                )}
              </div>
            </StepCard>
          </AnimatedReveal>
        </div>

        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <AnimatedReveal staggerIndex={2}>
            <StepCard step={3} title="Select Projects" contentClassName="pt-2">
              <ProjectSelector
                projects={projects}
                selectedIds={selectedIds}
                onToggle={toggleProject}
                onSelectAll={selectAll}
                onDeselectAll={deselectAll}
                isLoading={isScanning}
              />
            </StepCard>
          </AnimatedReveal>

          {!applySameValue && selectedProjects.length > 0 && (
            <AnimatedReveal>
              <StepCard
                title="Per-Project Values"
                description="Provide a value for each selected project"
              >
                <div className="space-y-4 max-h-[min(380px,50vh)] overflow-auto pr-1 custom-scroll">
                  {selectedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-2xl border p-3 sm:border-0 sm:p-0"
                    >
                      <div className="sm:w-40 md:w-48 shrink-0">
                        <div className="text-sm font-medium truncate">{project.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">
                          {project.id}
                        </div>
                      </div>
                      <Input
                        placeholder="Value for this project"
                        className="font-mono flex-1 min-h-11"
                        value={perProjectValues[project.id] ?? ''}
                        onChange={(e) => handlePerProjectValueChange(project.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </StepCard>
            </AnimatedReveal>
          )}

          <div className="hidden sm:flex justify-end gap-3 flex-wrap">
            <Button
              size="lg"
              onClick={() => openDeployDialog('update')}
              disabled={actionsDisabled}
              variant="secondary"
              className="min-w-52 min-h-11"
            >
              {isUpdating ? (
                <>
                  <Spinner className="mr-2" />
                  Updating...
                </>
              ) : (
                `Bulk Update ${selectedProjects.length} Project(s)`
              )}
            </Button>

            <Button
              size="lg"
              onClick={() => openDeployDialog('update-redeploy')}
              disabled={actionsDisabled}
              className="min-w-60 min-h-11"
            >
              {isRedeploying ? (
                <>
                  <Spinner className="mr-2" />
                  Updating & Redeploying...
                </>
              ) : (
                'Bulk update and redeploy'
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-6 sm:mt-8 text-xs text-muted-foreground text-center sm:text-left">
        All API calls run via Server Actions in <code className="text-[11px]">/server</code>. Activity
        is logged to Postgres — view on{' '}
        <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
          Account → Logs
        </Link>
        .
      </p>

      <MobileActionBar>
        <Button
          size="lg"
          className="w-full min-h-11"
          onClick={() => openDeployDialog('update-redeploy')}
          disabled={actionsDisabled}
        >
          {isRedeploying ? (
            <>
              <Spinner className="mr-2" />
              Updating & Redeploying...
            </>
          ) : (
            `Update & redeploy (${selectedProjects.length})`
          )}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="w-full min-h-11"
          onClick={() => openDeployDialog('update')}
          disabled={actionsDisabled}
        >
          {isUpdating ? (
            <>
              <Spinner className="mr-2" />
              Updating...
            </>
          ) : (
            `Bulk update (${selectedProjects.length})`
          )}
        </Button>
      </MobileActionBar>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Environment Update</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to update{' '}
              <span className="font-mono font-medium text-foreground">{key || '—'}</span> across{' '}
              <span className="font-medium text-foreground">{selectedProjects.length}</span>{' '}
              project(s) on{' '}
              <span className="font-medium text-foreground">{selectedTargets.length}</span> target
              environment(s).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-3xl border bg-muted/40 p-4 max-h-48 overflow-y-auto custom-scroll">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Targets ({selectedTargets.length} selected):
            </div>
            <TargetBadgesReadonly selected={selectedTargets} />
            {!selectedTargets.length && (
              <p className="mt-2 text-xs text-destructive">No targets selected!</p>
            )}
          </div>

          {pendingAction === 'update-redeploy' && (
            <p className="text-sm text-muted-foreground">
              After updating, a new deployment will be triggered for each successfully updated
              project.
            </p>
          )}

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setPendingAction(null)} className="min-h-11">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeployment} className="min-h-11">
              {pendingAction === 'update-redeploy'
                ? 'Update & Redeploy'
                : 'Update Environment Variables'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}