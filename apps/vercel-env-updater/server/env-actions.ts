'use server'

import { prisma } from '@workspace/db'
import { listProjects } from './vercel-client'
import { maskToken, writeActivityLog } from './log'

export type EnvConfigDTO = {
  vercelToken: string
  scope: string
  projectId: string
  tokenId?: string | null
}

export type StoredEnvVarDTO = {
  key: string
  value: string
}

export async function getVercelConnection(): Promise<EnvConfigDTO | null> {
  const conn = await prisma.vercelConnection.findUnique({ where: { id: 'active' } })
  if (!conn || (!conn.vercelToken && !conn.tokenId)) return null

  if (conn.tokenId) {
    const tokenRecord = await prisma.vercelToken.findUnique({ where: { id: conn.tokenId } })
    if (tokenRecord) {
      return {
        vercelToken: tokenRecord.token,
        scope: conn.scope || tokenRecord.scope,
        projectId: conn.projectId,
        tokenId: conn.tokenId,
      }
    }
  }

  return {
    vercelToken: conn.vercelToken,
    scope: conn.scope,
    projectId: conn.projectId,
    tokenId: conn.tokenId,
  }
}

export async function saveVercelConnection(
  config: EnvConfigDTO
): Promise<{ success: boolean; error?: string }> {
  const vercelToken = config.vercelToken.trim()
  const scope = config.scope.trim()
  const projectId = config.projectId.trim()

  if (!vercelToken) {
    return { success: false, error: 'Vercel token is required' }
  }

  try {
    await prisma.vercelConnection.upsert({
      where: { id: 'active' },
      create: {
        id: 'active',
        vercelToken,
        scope,
        projectId,
        tokenId: config.tokenId ?? null,
      },
      update: {
        vercelToken,
        scope,
        projectId,
        tokenId: config.tokenId ?? null,
      },
    })

    await writeActivityLog({
      source: 'get_started',
      action: 'connect',
      level: 'success',
      message: `Connected to Vercel (${scope || 'personal'})`,
      metadata: {
        scope: scope || 'personal',
        projectId: projectId || null,
        maskedToken: maskToken(vercelToken),
      },
    })

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save connection' }
  }
}

export async function listStoredEnvVars(): Promise<StoredEnvVarDTO[]> {
  const vars = await prisma.storedEnvVar.findMany({
    orderBy: { key: 'asc' },
  })
  return vars.map((v) => ({ key: v.key, value: v.value }))
}

export async function saveStoredEnvVars(
  vars: StoredEnvVarDTO[],
  context: { scope?: string; projectId?: string }
): Promise<{ success: boolean; error?: string }> {
  const scope = context.scope?.trim() ?? ''
  const projectId = context.projectId?.trim() ?? ''

  try {
    await prisma.$transaction([
      prisma.storedEnvVar.deleteMany({ where: { scope, projectId } }),
      ...vars.map((v) =>
        prisma.storedEnvVar.create({
          data: {
            key: v.key.trim(),
            value: v.value,
            scope,
            projectId,
          },
        })
      ),
    ])

    return { success: true }
  } catch {
    return { success: false, error: 'Failed to save environment variables' }
  }
}

export async function syncEnvVarsToDatabase(params: {
  config: EnvConfigDTO
  envVars: StoredEnvVarDTO[]
}): Promise<{
  success: boolean
  syncCount?: number
  error?: string
  vercelValidated?: boolean
}> {
  const { config, envVars } = params

  if (!config.vercelToken.trim() || envVars.length === 0) {
    return { success: false, error: 'Connection and at least one variable are required' }
  }

  let vercelValidated = false

  try {
    await saveVercelConnection(config)

    const saveResult = await saveStoredEnvVars(envVars, {
      scope: config.scope,
      projectId: config.projectId,
    })

    if (!saveResult.success) {
      return saveResult
    }

    try {
      await listProjects(config.vercelToken.trim())
      vercelValidated = true
    } catch {
      vercelValidated = false
    }

    await writeActivityLog({
      source: 'get_started',
      action: 'sync',
      level: 'success',
      message: `Synced ${envVars.length} environment variable(s) to Postgres`,
      metadata: {
        count: envVars.length,
        scope: config.scope || 'personal',
        projectId: config.projectId || null,
        vercelValidated,
        keys: envVars.map((v) => v.key),
      },
    })

    const existing = await prisma.appSettings.findUnique({ where: { id: 'singleton' } })
    if (!existing) {
      await prisma.appSettings.create({ data: { id: 'singleton' } })
    }

    return { success: true, syncCount: envVars.length, vercelValidated }
  } catch {
    await writeActivityLog({
      source: 'get_started',
      action: 'sync',
      level: 'error',
      message: 'Failed to sync environment variables',
    })
    return { success: false, error: 'Sync failed — check database connection' }
  }
}

export async function getSyncStats(): Promise<{ envVarCount: number; logCount: number }> {
  const [envVarCount, logCount] = await Promise.all([
    prisma.storedEnvVar.count(),
    prisma.activityLog.count(),
  ])
  return { envVarCount, logCount }
}