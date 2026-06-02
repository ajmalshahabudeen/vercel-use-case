'use client'

import React from 'react'
import { toast } from 'sonner'
import {
  Avatar,
  AvatarFallback,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Separator } from '@workspace/ui/components/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { ScrollArea } from '@workspace/ui/components/scroll-area'
import {
  HiOutlineUserCircle,
  HiOutlineKey,
  HiOutlineClipboardDocumentList,
  HiOutlineTrash,
  HiStar,
} from 'react-icons/hi2'
import {
  getAppSettings,
  updateAppSettings,
  listVercelTokens,
  saveVercelToken,
  deleteVercelToken,
  setDefaultVercelToken,
  getActivityLogs,
  clearActivityLogs,
  type VercelTokenDTO,
  type ActivityLogDTO,
} from '@vercel-env-updater/server'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'LA'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const levelStyles: Record<string, string> = {
  info: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  warn: 'text-amber-600 dark:text-amber-400',
  error: 'text-destructive',
}

const sourceLabels: Record<string, string> = {
  get_started: 'Get Started',
  bulk_update: 'Bulk Update',
  account: 'Account',
}

export default function AccountPage() {
  const [displayName, setDisplayName] = React.useState('Local Admin')
  const [email, setEmail] = React.useState('')
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)

  const [tokens, setTokens] = React.useState<VercelTokenDTO[]>([])
  const [tokenLabel, setTokenLabel] = React.useState('')
  const [tokenValue, setTokenValue] = React.useState('')
  const [tokenScope, setTokenScope] = React.useState('')
  const [isSavingToken, setIsSavingToken] = React.useState(false)

  const [logs, setLogs] = React.useState<ActivityLogDTO[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadAll = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [settings, tokenList, activityLogs] = await Promise.all([
        getAppSettings(),
        listVercelTokens(),
        getActivityLogs(100),
      ])
      setDisplayName(settings.displayName)
      setEmail(settings.email)
      setTokens(tokenList)
      setLogs(activityLogs)
    } catch {
      toast.error('Failed to load account data', {
        description: 'Is Postgres running? Try: bun run --cwd packages/db db:up',
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load from server actions on mount
    void loadAll()
  }, [loadAll])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const result = await updateAppSettings({ displayName, email })
      if (!result.success) {
        toast.error('Could not save settings', { description: result.error })
        return
      }
      toast.success('Profile saved')
      const refreshed = await getActivityLogs(100)
      setLogs(refreshed)
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleSaveToken = async () => {
    if (!tokenLabel.trim() || !tokenValue.trim()) {
      toast.error('Label and token are required')
      return
    }

    setIsSavingToken(true)
    try {
      const result = await saveVercelToken({
        label: tokenLabel,
        token: tokenValue,
        scope: tokenScope,
        isDefault: tokens.length === 0,
      })

      if (!result.success) {
        toast.error('Could not save token', { description: result.error })
        return
      }

      toast.success(`Saved token "${tokenLabel}"`)
      setTokenLabel('')
      setTokenValue('')
      setTokenScope('')
      const [tokenList, activityLogs] = await Promise.all([listVercelTokens(), getActivityLogs(100)])
      setTokens(tokenList)
      setLogs(activityLogs)
    } finally {
      setIsSavingToken(false)
    }
  }

  const handleDeleteToken = async (id: string, label: string) => {
    const result = await deleteVercelToken(id)
    if (!result.success) {
      toast.error('Could not delete token', { description: result.error })
      return
    }
    toast.info(`Removed "${label}"`)
    const [tokenList, activityLogs] = await Promise.all([listVercelTokens(), getActivityLogs(100)])
    setTokens(tokenList)
    setLogs(activityLogs)
  }

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultVercelToken(id)
    if (!result.success) {
      toast.error('Could not set default', { description: result.error })
      return
    }
    toast.success('Default token updated')
    const [tokenList, activityLogs] = await Promise.all([listVercelTokens(), getActivityLogs(100)])
    setTokens(tokenList)
    setLogs(activityLogs)
  }

  const handleClearLogs = async () => {
    const result = await clearActivityLogs()
    if (!result.success) {
      toast.error('Could not clear logs', { description: result.error })
      return
    }
    toast.warning('Activity logs cleared')
    const activityLogs = await getActivityLogs(100)
    setLogs(activityLogs)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
            <p className="text-muted-foreground">
              Settings, saved Vercel tokens, and activity logs for your local instance.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <Tabs defaultValue="settings" className="gap-6">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <HiOutlineUserCircle className="size-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="tokens" className="gap-2">
            <HiOutlineKey className="size-4" />
            Tokens
            {tokens.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{tokens.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <HiOutlineClipboardDocumentList className="size-4" />
            Logs
            {logs.length > 0 && (
              <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px]">{logs.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Personal Docker app — no authentication. Display name is used for avatars across the UI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Local Admin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? 'Saving…' : 'Save profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Add Vercel token</CardTitle>
                <CardDescription>
                  Tokens are stored in Postgres. Bulk Update can auto-fill the default token.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    placeholder="Personal / Team prod"
                    value={tokenLabel}
                    onChange={(e) => setTokenLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Access token</Label>
                  <Input
                    type="password"
                    placeholder="v3t_xxxxxxxx"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scope (optional)</Label>
                  <Input
                    placeholder="my-team"
                    value={tokenScope}
                    onChange={(e) => setTokenScope(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleSaveToken} disabled={isSavingToken}>
                  {isSavingToken ? 'Saving…' : 'Save token'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Saved tokens</CardTitle>
                <CardDescription>Default token is pre-filled on Bulk Update.</CardDescription>
              </CardHeader>
              <CardContent>
                {tokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No tokens saved yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {tokens.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{t.label}</span>
                            {t.isDefault && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
                                <HiStar className="size-3" />
                                default
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs text-muted-foreground truncate">
                            {t.maskedToken}
                            {t.scope ? ` • ${t.scope}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {!t.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleSetDefault(t.id)}
                              aria-label="Set as default"
                            >
                              <HiStar className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteToken(t.id, t.label)}
                            aria-label="Delete token"
                          >
                            <HiOutlineTrash className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Activity log</CardTitle>
                <CardDescription>
                  Operations from Get Started, Bulk Update, and Account are persisted here.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                Clear all
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[min(420px,60vh)] pr-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No activity yet. Connect Vercel or run a bulk update to generate logs.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((log) => (
                      <li key={log.id} className="rounded-2xl border px-3 py-2.5 text-sm">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {sourceLabels[log.source] ?? log.source}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{log.action}</span>
                          <span className={`text-[10px] font-medium ${levelStyles[log.level] ?? ''}`}>
                            {log.level}
                          </span>
                          <span className="ml-auto text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p>{log.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="my-8" />
      <p className="text-center text-xs text-muted-foreground">
        Private local instance — data lives in your Docker Postgres volume only.
      </p>
    </div>
  )
}