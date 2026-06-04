'use server'

import { prisma } from '@workspace/db'
import { DEFAULT_TARGETS } from '@vercel-env-updater/config'
import type { DeploymentTarget } from '@vercel-env-updater/config'
import { listProjects, redeployProjectTargets, upsertProjectEnvVars } from './vercel-client'
import { maskToken, writeActivityLog } from './log'

export type EnvConfigDTO = {
  vercelToken: string
  scope: string
  projectId: string
  projectName?: string
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
        projectName: conn.projectName,
        tokenId: conn.tokenId,
      }
    }
  }

  return {
    vercelToken: conn.vercelToken,
    scope: conn.scope,
    projectId: conn.projectId,
    projectName: conn.projectName,
    tokenId: conn.tokenId,
  }
}

export async function saveVercelConnection(
  config: EnvConfigDTO
): Promise<{ success: boolean; error?: string }> {
  const vercelToken = config.vercelToken.trim()
  const scope = config.scope.trim()
  const projectId = config.projectId.trim()
  const projectName = config.projectName?.trim() ?? ''

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
        projectName,
        tokenId: config.tokenId ?? null,
      },
      update: {
        vercelToken,
        scope,
        projectId,
        projectName,
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
        projectName: projectName || null,
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
      await listProjects(config.vercelToken.trim(), config.scope?.trim())
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

async function resolveProject(
  config: EnvConfigDTO
): Promise<{ id: string; name: string } | { error: string }> {
  const projectId = config.projectId.trim()
  if (!projectId) {
    return { error: 'Select a Vercel project before deploying' }
  }

  const nameFromConfig = config.projectName?.trim()
  if (nameFromConfig) {
    return { id: projectId, name: nameFromConfig }
  }

  try {
    const projects = await listProjects(config.vercelToken.trim(), config.scope?.trim())
    const match = projects.find((p) => p.id === projectId)
    if (match) {
      return { id: match.id, name: match.name }
    }
  } catch {
    // fall through to id-only
  }

  return { id: projectId, name: projectId }
}

export async function syncEnvVarsAndDeploy(params: {
  config: EnvConfigDTO
  envVars: StoredEnvVarDTO[]
  targets?: DeploymentTarget[]
}): Promise<{
  success: boolean
  syncCount?: number
  error?: string
  vercelValidated?: boolean
  envResults?: Array<{ key: string; success: boolean; error?: string }>
  redeployResults?: Array<{
    target: 'production' | 'preview'
    success: boolean
    error?: string
    deploymentId?: string
  }>
}> {
  const { config, envVars, targets = DEFAULT_TARGETS } = params

  const syncResult = await syncEnvVarsToDatabase({ config, envVars })
  if (!syncResult.success) {
    return syncResult
  }

  const project = await resolveProject(config)
  if ('error' in project) {
    return { success: false, error: project.error }
  }

  const token = config.vercelToken.trim()
  const scope = config.scope?.trim()

  const envResults = await upsertProjectEnvVars(token, project, envVars, targets, scope)
  const envFailures = envResults.filter((r) => !r.success)

  if (envFailures.length > 0) {
    const first = envFailures[0]
    await writeActivityLog({
      source: 'get_started',
      action: 'sync-deploy',
      level: 'warn',
      message: `Saved to Postgres; Vercel env update failed for "${first.key}"`,
      metadata: {
        projectId: project.id,
        projectName: project.name,
        failures: envFailures.length,
      },
    })

    return {
      success: false,
      syncCount: syncResult.syncCount,
      vercelValidated: syncResult.vercelValidated,
      envResults,
      error: first.error ?? `Failed to update ${first.key} on Vercel`,
    }
  }

  const redeployResults = await redeployProjectTargets(token, project, targets, scope)
  const redeployFailures = redeployResults.filter((r) => !r.success)
  const overallSuccess = redeployFailures.length === 0

  await writeActivityLog({
    source: 'get_started',
    action: 'sync-deploy',
    level: overallSuccess ? 'success' : 'warn',
    message: overallSuccess
      ? `Synced ${envVars.length} var(s) and deployed "${project.name}"`
      : `Synced vars; deploy issues on ${project.name}`,
    metadata: {
      projectId: project.id,
      projectName: project.name,
      envCount: envVars.length,
      redeploySuccesses: redeployResults.filter((r) => r.success).length,
      redeployFailures: redeployFailures.length,
    },
  })

  if (!overallSuccess) {
    const firstRedeploy = redeployFailures[0]
    return {
      success: false,
      syncCount: syncResult.syncCount,
      vercelValidated: syncResult.vercelValidated,
      envResults,
      redeployResults,
      error: firstRedeploy.error ?? `Failed to redeploy (${firstRedeploy.target})`,
    }
  }

  return {
    success: true,
    syncCount: syncResult.syncCount,
    vercelValidated: syncResult.vercelValidated,
    envResults,
    redeployResults,
  }
}

export async function getSyncStats(): Promise<{ envVarCount: number; logCount: number }> {
  const [envVarCount, logCount] = await Promise.all([
    prisma.storedEnvVar.count(),
    prisma.activityLog.count(),
  ])
  return { envVarCount, logCount }
}