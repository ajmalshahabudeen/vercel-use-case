"use client"

import React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { create } from "zustand"
import { toast } from "sonner"

import {
  getVercelConnection,
  getDefaultVercelToken,
  listStoredEnvVars,
  saveVercelConnection,
  syncEnvVarsToDatabase,
} from "@vercel-env-updater/server"

import {
  AnimatedReveal,
  ConnectionBanner,
  EnvVarList,
  PageHero,
  StepCard,
} from "@vercel-env-updater/components"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"

import {
  HiOutlineRocketLaunch,
  HiOutlineKey,
  HiServerStack,
  HiPlus,
  HiArrowPath,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2"

type EnvConfig = {
  vercelToken: string
  scope: string
  projectId: string
}

interface UpdaterStore {
  config: EnvConfig | null
  envVars: Array<{ key: string; value: string }>
  syncCount: number
  isSyncing: boolean
  setConfig: (config: EnvConfig) => void
  addEnvVar: (key: string, value: string) => void
  removeEnvVar: (index: number) => void
  syncToDatabase: () => Promise<void>
  reset: () => void
}

const useUpdaterStore = create<UpdaterStore>((set, get) => ({
  config: null,
  envVars: [],
  syncCount: 0,
  isSyncing: false,

  setConfig: (config) => {
    set({ config })
  },

  addEnvVar: (key, value) => {
    if (!key.trim()) return
    const { envVars } = get()
    if (envVars.some((v) => v.key === key)) {
      toast.error("Variable already exists")
      return
    }
    set({ envVars: [...envVars, { key: key.trim(), value }] })
    toast.success(`Added ${key}`)
  },

  removeEnvVar: (index) => {
    const { envVars } = get()
    const removed = envVars[index]
    set({ envVars: envVars.filter((_, i) => i !== index) })
    toast.info(`Removed ${removed.key}`)
  },

  syncToDatabase: async () => {
    const { envVars, config } = get()
    if (!config || envVars.length === 0) return

    set({ isSyncing: true })

    try {
      const result = await syncEnvVarsToDatabase({
        config,
        envVars,
      })

      if (!result.success) {
        set({ isSyncing: false })
        toast.error("Sync failed", { description: result.error })
        return
      }

      set((state) => ({
        syncCount: state.syncCount + 1,
        isSyncing: false,
      }))

      const description = result.vercelValidated
        ? "Persisted via @workspace/db — Vercel API validated"
        : "Persisted via @workspace/db (token not validated against Vercel)"

      toast.success(`Synced ${envVars.length} variables to Postgres`, { description })
    } catch {
      set({ isSyncing: false })
      toast.error("Sync failed", { description: "Check database connection (packages/db db:up)" })
    }
  },

  reset: () => set({ config: null, envVars: [], syncCount: 0 }),
}))

export default function VercelEnvUpdaterPage() {
  const {
    config,
    envVars,
    syncCount,
    isSyncing,
    setConfig,
    addEnvVar,
    removeEnvVar,
    syncToDatabase,
    reset,
  } = useUpdaterStore()

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { isSubmitting },
  } = useForm<{ token: string; scope: string; projectId: string }>({
    defaultValues: { token: "", scope: "", projectId: "" },
  })

  const credentialsToastShown = React.useRef(false)

  const onConnectSubmit = async (data: { token: string; scope: string; projectId: string }) => {
    const newConfig: EnvConfig = {
      vercelToken: data.token.trim(),
      scope: data.scope.trim(),
      projectId: data.projectId.trim(),
    }

    const saved = await saveVercelConnection(newConfig)
    if (!saved.success) {
      toast.error("Could not save connection", { description: saved.error })
      return
    }

    setConfig(newConfig)
    toast.success("Vercel connected", {
      description: `Scope: ${newConfig.scope || "personal"} • Project: ${newConfig.projectId || "all"}`,
    })
    resetForm()
  }

  const [newKey, setNewKey] = React.useState("")
  const [newValue, setNewValue] = React.useState("")

  const handleAddVar = () => {
    if (!newKey.trim()) return
    addEnvVar(newKey, newValue)
    setNewKey("")
    setNewValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddVar()
    }
  }

  React.useEffect(() => {
    let cancelled = false

    async function loadFromDatabase() {
      try {
        const [connection, storedVars, defaultToken] = await Promise.all([
          getVercelConnection(),
          listStoredEnvVars(),
          getDefaultVercelToken(),
        ])

        if (cancelled) return

        const token = connection?.vercelToken || defaultToken?.token || ""
        const scope = connection?.scope || defaultToken?.scope || ""
        const projectId = connection?.projectId || ""

        if (token) {
          resetForm({ token, scope, projectId })

          if (connection) {
            setConfig({
              vercelToken: connection.vercelToken,
              scope: connection.scope,
              projectId: connection.projectId,
            })
          } else {
            setConfig({ vercelToken: token, scope, projectId })
          }

          if (!credentialsToastShown.current) {
            credentialsToastShown.current = true
            const source = connection
              ? "saved Vercel connection"
              : `default token (${defaultToken?.label ?? "Account"})`
            toast.info(`Loaded ${source}`, { duration: 3000 })
          }
        }

        if (storedVars.length > 0) {
          useUpdaterStore.setState({ envVars: storedVars })
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load saved data", {
            description: "Start Postgres: bun run --cwd packages/db db:up",
          })
        }
      }
    }

    void loadFromDatabase()
    return () => {
      cancelled = true
    }
  }, [setConfig, resetForm])

  return (
    <div className="bg-background text-foreground pb-8">
      <PageHero
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
            <HiServerStack className="size-3.5" />
            @workspace/db · Prisma · Postgres 18
          </span>
        }
        title={
          <>
            Get started.
            <br />
            Sync faster.
          </>
        }
        description="Connect your Vercel projects to a persisted Postgres database. Manage environment variables with full type safety and audit history."
        actions={
          <>
            <Button size="lg" className="min-h-12 w-full sm:min-w-44 sm:w-auto" asChild>
              <a href="#setup">Launch Setup →</a>
            </Button>
            <Button variant="outline" size="lg" className="min-h-12 w-full sm:min-w-44 sm:w-auto" asChild>
              <Link href="/bulk-update">Bulk update →</Link>
            </Button>
          </>
        }
        footnote="No credit card required · Works with any Vercel team"
      />

      <div id="setup" className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="reveal-stagger grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <AnimatedReveal className="lg:col-span-3" staggerIndex={0}>
            <StepCard
              step={1}
              title="Connect to Vercel"
              description="Store your access token securely for this session"
              icon={<HiOutlineKey className="size-5" />}
            >
              <form onSubmit={handleSubmit(onConnectSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="token">Vercel Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    autoComplete="off"
                    placeholder="v3t_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="min-h-11"
                    {...register("token", { required: true })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Create one at vercel.com/account/tokens
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope">Team / Scope (optional)</Label>
                    <Input id="scope" placeholder="my-team" className="min-h-11" {...register("scope")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project ID or Name</Label>
                    <Input
                      id="projectId"
                      placeholder="my-awesome-app"
                      className="min-h-11"
                      {...register("projectId")}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-11 text-base"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2" />
                      Connecting...
                    </>
                  ) : (
                    "Save Configuration & Continue"
                  )}
                </Button>
              </form>

              {config && (
                <ConnectionBanner
                  className="mt-5"
                  scope={config.scope || "personal account"}
                  projectId={config.projectId || undefined}
                />
              )}
            </StepCard>
          </AnimatedReveal>

          <AnimatedReveal className="lg:col-span-2 flex flex-col" staggerIndex={1}>
            <StepCard
              step={2}
              title="Environment Variables"
              description={`${envVars.length} variables · ${syncCount} syncs`}
              icon={<HiOutlineClipboardDocumentList className="size-5" />}
              contentClassName="flex flex-1 flex-col"
              headerExtra={
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Reset local state">
                      <HiArrowPath className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear local state?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This clears the in-memory list and connection banner on this page. Saved
                        data in Postgres is not deleted until you sync again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          reset()
                          toast("State cleared")
                        }}
                      >
                        Clear
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              }
            >
              <div className="flex flex-col flex-1 gap-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="KEY_NAME"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm min-h-11 sm:max-w-[40%]"
                  />
                  <Input
                    placeholder="value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="font-mono text-sm flex-1 min-h-11"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="min-h-11 min-w-11 shrink-0 self-end sm:self-auto"
                    onClick={handleAddVar}
                    disabled={!newKey.trim()}
                  >
                    <HiPlus className="size-4" />
                  </Button>
                </div>

                <Separator />

                <EnvVarList items={envVars} onRemove={removeEnvVar} />

                <div className="pt-2 mt-auto">
                  <Button
                    onClick={syncToDatabase}
                    disabled={!config || envVars.length === 0 || isSyncing}
                    className="w-full min-h-11 text-base"
                    variant={config ? "default" : "secondary"}
                  >
                    {isSyncing ? (
                      <>
                        <Spinner className="mr-2" />
                        Syncing to Postgres…
                      </>
                    ) : (
                      <>
                        <HiServerStack className="mr-2 size-4" />
                        Sync {envVars.length} vars to Database
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground mt-2">
                    Uses <span className="font-medium">@workspace/db</span> (Prisma + Postgres 18)
                  </p>
                </div>
              </div>
            </StepCard>
          </AnimatedReveal>
        </div>

        <AnimatedReveal className="mt-8 sm:mt-10" staggerIndex={2}>
          <div className="text-center mb-5 sm:mb-6">
            <div className="uppercase tracking-[2px] text-xs font-medium text-muted-foreground mb-1">
              Built with modern primitives
            </div>
            <div className="text-xl sm:text-2xl font-semibold tracking-tight">
              Everything you need to ship with confidence
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                icon: HiServerStack,
                title: "Persisted Postgres + Prisma",
                body: (
                  <>
                    Real database via <span className="font-medium">@workspace/db</span>. Migrations,
                    studio, type-safe client.
                  </>
                ),
              },
              {
                icon: HiOutlineRocketLaunch,
                title: "Zustand + React Hook Form",
                body: "Lightning fast client state + accessible forms. Minimal boilerplate.",
              },
              {
                icon: HiOutlineClipboardDocumentList,
                title: "Server Actions + UI Kit",
                body: (
                  <>
                    Typed server flows and <span className="font-medium">@workspace/ui</span>{" "}
                    components.
                  </>
                ),
              },
            ].map(({ icon: Icon, title, body }) => (
              <Card key={title} className="border-border/80">
                <CardContent className="pt-5 sm:pt-6">
                  <Icon className="size-7 sm:size-8 mb-3 sm:mb-4 text-primary" />
                  <div className="font-semibold mb-1 text-sm sm:text-base">{title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </AnimatedReveal>
      </div>

      <div className="border-t py-6 sm:py-8 bg-muted/30">
        <div className="mx-auto max-w-3xl text-center px-4 sm:px-6 text-sm text-muted-foreground">
          Ready to update many projects at once?
          <div className="mt-3">
            <Button variant="link" className="text-foreground min-h-11" asChild>
              <Link href="/bulk-update">Open Bulk Update →</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}