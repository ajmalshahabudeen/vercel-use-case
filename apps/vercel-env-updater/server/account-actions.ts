'use server'

import { prisma } from '@workspace/db'
import { maskToken, writeActivityLog } from './log'

export type AppSettingsDTO = {
  displayName: string
  email: string
}

export type VercelTokenDTO = {
  id: string
  label: string
  maskedToken: string
  scope: string
  isDefault: boolean
  createdAt: string
}

export type ActivityLogDTO = {
  id: string
  source: string
  action: string
  level: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

async function ensureAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })
}

export async function getAppSettings(): Promise<AppSettingsDTO> {
  const settings = await ensureAppSettings()
  return {
    displayName: settings.displayName,
    email: settings.email,
  }
}

export async function updateAppSettings(
  data: AppSettingsDTO
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        displayName: data.displayName.trim() || 'Local Admin',
        email: data.email.trim(),
      },
      update: {
        displayName: data.displayName.trim() || 'Local Admin',
        email: data.email.trim(),
      },
    })

    await writeActivityLog({
      source: 'account',
      action: 'settings-update',
      level: 'success',
      message: `Updated profile: ${data.displayName.trim() || 'Local Admin'}`,
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save settings' }
  }
}

export async function listVercelTokens(): Promise<VercelTokenDTO[]> {
  const tokens = await prisma.vercelToken.findMany({
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return tokens.map((t) => ({
    id: t.id,
    label: t.label,
    maskedToken: maskToken(t.token),
    scope: t.scope,
    isDefault: t.isDefault,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function saveVercelToken(params: {
  label: string
  token: string
  scope?: string
  isDefault?: boolean
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const label = params.label.trim()
  const token = params.token.trim()

  if (!label || !token) {
    return { success: false, error: 'Label and token are required' }
  }

  try {
    if (params.isDefault) {
      await prisma.vercelToken.updateMany({ data: { isDefault: false } })
    }

    const created = await prisma.vercelToken.create({
      data: {
        label,
        token,
        scope: params.scope?.trim() ?? '',
        isDefault: params.isDefault ?? false,
      },
    })

    await writeActivityLog({
      source: 'account',
      action: 'token-save',
      level: 'success',
      message: `Saved Vercel token "${label}"`,
      metadata: { tokenId: created.id, scope: created.scope, masked: maskToken(token) },
    })

    return { success: true, id: created.id }
  } catch {
    return { success: false, error: 'Failed to save token' }
  }
}

export async function deleteVercelToken(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const deleted = await prisma.vercelToken.delete({ where: { id } })

    await writeActivityLog({
      source: 'account',
      action: 'token-delete',
      level: 'info',
      message: `Deleted Vercel token "${deleted.label}"`,
      metadata: { tokenId: id },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Token not found or could not be deleted' }
  }
}

export async function setDefaultVercelToken(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.vercelToken.updateMany({ data: { isDefault: false } })
    const updated = await prisma.vercelToken.update({
      where: { id },
      data: { isDefault: true },
    })

    await writeActivityLog({
      source: 'account',
      action: 'token-default',
      level: 'success',
      message: `Set default token to "${updated.label}"`,
      metadata: { tokenId: id },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to set default token' }
  }
}

export async function getDefaultVercelToken(): Promise<{
  token: string
  scope: string
  label: string
} | null> {
  const record = await prisma.vercelToken.findFirst({
    where: { isDefault: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (!record) return null

  return {
    token: record.token,
    scope: record.scope,
    label: record.label,
  }
}

export async function getActivityLogs(limit = 50): Promise<ActivityLogDTO[]> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return logs.map((log) => ({
    id: log.id,
    source: log.source,
    action: log.action,
    level: log.level,
    message: log.message,
    metadata:
      log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
        ? (log.metadata as Record<string, unknown>)
        : null,
    createdAt: log.createdAt.toISOString(),
  }))
}

export async function clearActivityLogs(): Promise<{ success: boolean; error?: string }> {
  try {
    const { count } = await prisma.activityLog.deleteMany()

    await writeActivityLog({
      source: 'account',
      action: 'logs-clear',
      level: 'warn',
      message: `Cleared ${count} activity log entries`,
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to clear logs' }
  }
}