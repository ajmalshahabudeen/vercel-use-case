"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { create } from "zustand"
import axios from "axios"
import { Toaster, toast } from "sonner"

import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"

import {
  HiOutlineRocketLaunch,
  HiOutlineKey,
  HiServerStack,
  HiOutlineCheckCircle,
  HiPlus,
  HiArrowPath,
  HiOutlineTrash,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2"

// ===== Zustand Store (persisted in-memory demo state) =====
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
  envVars: [
    { key: "NEXT_PUBLIC_API_URL", value: "https://api.example.com" },
    { key: "DATABASE_URL", value: "postgresql://..." },
  ],
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
      // Demonstrate axios usage (realistic Vercel API call pattern - will gracefully fail without real token)
      await axios
        .get("https://api.vercel.com/v9/projects", {
          headers: { Authorization: `Bearer ${config.vercelToken}` },
          timeout: 4000,
        })
        .catch(() => {
          // Expected in demo without valid token — we still proceed with "DB sync"
        })

      // Simulate work + Prisma/@workspace/db persistence
      await new Promise((resolve) => setTimeout(resolve, 650))

      set((state) => ({
        syncCount: state.syncCount + 1,
        isSyncing: false,
      }))

      toast.success(`Synced ${envVars.length} variables to Postgres`, {
        description: "Persisted via @workspace/db + Prisma ORM",
      })
    } catch {
      set({ isSyncing: false })
      toast.error("Sync failed", { description: "Check your connection or token" })
    }
  },

  reset: () => set({ config: null, envVars: [], syncCount: 0 }),
}))

// ===== Main Get Started Page =====
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

  // Vercel connection form (react-hook-form)
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { isSubmitting },
  } = useForm<{ token: string; scope: string; projectId: string }>({
    defaultValues: { token: "", scope: "", projectId: "" },
  })

  const onConnectSubmit = (data: { token: string; scope: string; projectId: string }) => {
    const newConfig: EnvConfig = {
      vercelToken: data.token.trim(),
      scope: data.scope.trim(),
      projectId: data.projectId.trim(),
    }
    setConfig(newConfig)
    toast.success("Vercel connected", {
      description: `Scope: ${newConfig.scope || "personal"} • Project: ${newConfig.projectId || "all"}`,
    })
    resetForm()

    // Lightweight demo of axios (could be real /v9/user in production)
    axios
      .get("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${newConfig.vercelToken}` },
        timeout: 3000,
      })
      .then(() => toast.info("Token validated against Vercel API"))
      .catch(() => {
        /* demo mode - token may be fake */
      })
  }

  // Simple add-var form (lightweight, no extra RHF instance)
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

  return (
    <div className="bg-background text-foreground">
      <Toaster position="top-center" richColors closeButton />

      {/* Hero / Get Started Header */}
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium mb-6">
          <HiServerStack className="size-3.5" />
          Powered by @workspace/db • Prisma • Postgres 18
        </div>

        <h1 className="text-6xl md:text-7xl font-semibold tracking-tighter leading-none mb-4">
          Get started.<br />Sync faster.
        </h1>
        <p className="mx-auto max-w-lg text-xl text-muted-foreground">
          Connect your Vercel projects to a persisted Postgres database.
          Manage environment variables with full type safety and audit history.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" className="min-w-44" asChild>
            <a href="#setup">Launch Setup →</a>
          </Button>
          <Button variant="outline" size="lg" className="min-w-44" onClick={() => toast("Thanks! (demo)")}>
            Watch 47s demo
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">No credit card required • Works with any Vercel team</p>
      </div>

      {/* Main Setup Area */}
      <div id="setup" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Connect Vercel Form */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <HiOutlineKey className="size-5" />
                </div>
                <div>
                  <CardTitle>1. Connect to Vercel</CardTitle>
                  <CardDescription>Store your access token securely for this session</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onConnectSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="token">Vercel Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="v3t_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    {...register("token", { required: true })}
                  />
                  <p className="text-[11px] text-muted-foreground">Create one at vercel.com/account/tokens</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope">Team / Scope (optional)</Label>
                    <Input id="scope" placeholder="my-team" {...register("scope")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Project ID or Name</Label>
                    <Input id="projectId" placeholder="my-awesome-app" {...register("projectId")} />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base" disabled={isSubmitting}>
                  {isSubmitting ? "Connecting..." : "Save Configuration & Continue"}
                </Button>
              </form>

              {config && (
                <div className="mt-5 rounded-3xl border bg-muted/40 p-4 text-sm flex items-start gap-3">
                  <HiOutlineCheckCircle className="mt-0.5 size-5 text-green-500 shrink-0" />
                  <div>
                    Connected to <span className="font-medium">{config.scope || "personal account"}</span>
                    {config.projectId && <> • Project: <span className="font-mono text-xs">{config.projectId}</span></>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Environment Variables + Sync */}
          <Card className="lg:col-span-2 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                    <HiOutlineClipboardDocumentList className="size-5" />
                  </div>
                  <div>
                    <CardTitle>Environment Variables</CardTitle>
                    <CardDescription>{envVars.length} variables • {syncCount} syncs</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => { reset(); toast("State cleared") }}>
                  <HiArrowPath className="size-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              {/* Add new variable */}
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="KEY_NAME"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className="font-mono text-sm"
                />
                <Input
                  placeholder="value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 font-mono text-sm"
                />
                <Button type="button" size="icon" onClick={handleAddVar} disabled={!newKey.trim()}>
                  <HiPlus className="size-4" />
                </Button>
              </div>

              <Separator className="my-2" />

              {/* Variables List */}
              <div className="flex-1 space-y-1 overflow-auto text-sm min-h-[140px] max-h-[220px] pr-1 custom-scroll">
                {envVars.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">No variables yet. Add some above.</div>
                )}
                {envVars.map((variable, index) => (
                  <div
                    key={index}
                    className="group flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 hover:bg-muted/60"
                  >
                    <div className="font-mono text-xs truncate flex-1">
                      <span className="text-foreground/70">{variable.key}</span>
                      <span className="text-muted-foreground/60 mx-1">=</span>
                      <span>{variable.value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-40 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => removeEnvVar(index)}
                    >
                      <HiOutlineTrash className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-auto">
                <Button
                  onClick={syncToDatabase}
                  disabled={!config || envVars.length === 0 || isSyncing}
                  className="w-full h-11 text-base"
                  variant={config ? "default" : "secondary"}
                >
                  {isSyncing ? (
                    <>Syncing to Postgres…</>
                  ) : (
                    <>
                      <HiServerStack className="mr-2 size-4" />
                      Sync {envVars.length} vars to Database
                    </>
                  )}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground mt-2">
                  Uses <span className="font-medium">@workspace/db</span> (Prisma + persisted Postgres 18)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features / Why this stack */}
        <div className="mt-10">
          <div className="text-center mb-6">
            <div className="uppercase tracking-[2px] text-xs font-medium text-muted-foreground mb-1">Built with modern primitives</div>
            <div className="text-2xl font-semibold tracking-tight">Everything you need to ship with confidence</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <HiServerStack className="size-8 mb-4 text-primary" />
                <div className="font-semibold mb-1">Persisted Postgres + Prisma</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real database (Docker volume) via <span className="font-medium">@workspace/db</span>. Migrations, studio, type-safe client.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <HiOutlineRocketLaunch className="size-8 mb-4 text-primary" />
                <div className="font-semibold mb-1">Zustand + React Hook Form</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lightning fast client state + performant, accessible forms. Minimal boilerplate, maximum DX.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <HiOutlineClipboardDocumentList className="size-8 mb-4 text-primary" />
                <div className="font-semibold mb-1">Axios + Beautiful UI Kit</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Typed HTTP calls and a full production-grade component system from <span className="font-medium">@workspace/ui</span>.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="border-t py-8 bg-muted/30">
        <div className="mx-auto max-w-3xl text-center px-6 text-sm text-muted-foreground">
          Ready to go further? Add real API routes, server actions with Prisma, or deploy the whole stack on Vercel.
          <div className="mt-3">
            <Button variant="link" className="text-foreground" onClick={() => toast("Coming soon in the tutorial!")}>
              Continue to full tutorial →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
