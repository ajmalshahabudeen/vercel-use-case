'use server'

import { listProjects, bulkUpsertEnv, bulkUpdateAndRedeploy } from './vercel-client'
import { maskToken, writeActivityLog } from './log'
import type { ScanProjectsResult, BulkUpdateResult, DeploymentTarget } from '@vercel-env-updater/config'
import { DEFAULT_TARGETS } from '@vercel-env-updater/config'

/**
 * Server Action: Scan Vercel projects for the given token.
 */
export async function scanVercelProjects(
  token: string,
  scope?: string
): Promise<ScanProjectsResult> {
  if (!token || token.trim().length < 10) {
    return { projects: [], error: 'Invalid or missing Vercel access token' }
  }

  try {
    const projects = await listProjects(token.trim(), scope?.trim())

    await writeActivityLog({
      source: 'bulk_update',
      action: 'scan',
      level: 'success',
      message: `Scanned ${projects.length} Vercel project(s)`,
      metadata: { projectCount: projects.length, maskedToken: maskToken(token) },
    })

    return { projects }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string }
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Failed to fetch projects from Vercel'

    await writeActivityLog({
      source: 'bulk_update',
      action: 'scan',
      level: 'error',
      message: `Project scan failed: ${message}`,
      metadata: { maskedToken: maskToken(token) },
    })

    return { projects: [], error: message }
  }
}

/**
 * Server Action: Perform bulk environment variable update across selected projects.
 */
export async function performBulkUpdate(params: {
  token: string
  key: string
  projects: Array<{ id: string; name: string; value: string }>
  targets?: DeploymentTarget[]
  scope?: string
}): Promise<{
  success: boolean
  results: BulkUpdateResult[]
  error?: string
}> {
  const { token, key, projects, targets = DEFAULT_TARGETS, scope } = params

  if (!token || !key || projects.length === 0) {
    return {
      success: false,
      results: [],
      error: 'Missing required fields (token, key, or selected projects)',
    }
  }

  try {
    const results = await bulkUpsertEnv(
      token.trim(),
      key.trim(),
      projects,
      targets,
      scope?.trim()
    )

    const hasFailures = results.some((r) => !r.success)
    const successes = results.filter((r) => r.success).length
    const failures = results.length - successes

    await writeActivityLog({
      source: 'bulk_update',
      action: 'bulk-update',
      level: failures === 0 ? 'success' : 'warn',
      message: `Bulk update "${key.trim()}": ${successes} succeeded, ${failures} failed`,
      metadata: {
        key: key.trim(),
        projectCount: projects.length,
        successes,
        failures,
        targets,
        maskedToken: maskToken(token),
      },
    })

    return {
      success: !hasFailures,
      results,
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    const message = err?.message || 'Bulk update failed'

    await writeActivityLog({
      source: 'bulk_update',
      action: 'bulk-update',
      level: 'error',
      message,
      metadata: { key: key.trim(), projectCount: projects.length },
    })

    return {
      success: false,
      results: [],
      error: message,
    }
  }
}

export async function performBulkUpdateAndRedeploy(params: {
  token: string
  key: string
  projects: Array<{ id: string; name: string; value: string }>
  targets?: DeploymentTarget[]
  scope?: string
}): Promise<{
  success: boolean
  updateResults: BulkUpdateResult[]
  redeployResults: Array<{
    projectId: string
    projectName: string
    target: 'production' | 'preview'
    success: boolean
    error?: string
    deploymentId?: string
  }>
  error?: string
}> {
  const { token, key, projects, targets = DEFAULT_TARGETS, scope } = params

  if (!token || !key || projects.length === 0) {
    return {
      success: false,
      updateResults: [],
      redeployResults: [],
      error: 'Missing required fields (token, key, or selected projects)',
    }
  }

  try {
    const { updateResults, redeployResults } = await bulkUpdateAndRedeploy(
      token.trim(),
      key.trim(),
      projects,
      targets,
      scope?.trim()
    )

    const allUpdatesSucceeded = updateResults.every((r) => r.success)
    const allRedeploysSucceeded = redeployResults.every((r) => r.success)
    const overallSuccess = allUpdatesSucceeded && allRedeploysSucceeded

    const updateSuccesses = updateResults.filter((r) => r.success).length
    const redeploySuccesses = redeployResults.filter((r) => r.success).length

    await writeActivityLog({
      source: 'bulk_update',
      action: 'bulk-update-redeploy',
      level: overallSuccess ? 'success' : 'warn',
      message: `Bulk update + redeploy "${key.trim()}": updates ${updateSuccesses}/${updateResults.length}, redeploys ${redeploySuccesses}/${redeployResults.length}`,
      metadata: {
        key: key.trim(),
        projectCount: projects.length,
        targets,
        maskedToken: maskToken(token),
        updateSuccesses,
        redeploySuccesses,
      },
    })

    return {
      success: overallSuccess,
      updateResults,
      redeployResults,
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    const message = err?.message || 'Bulk update + redeploy failed'

    await writeActivityLog({
      source: 'bulk_update',
      action: 'bulk-update-redeploy',
      level: 'error',
      message,
      metadata: { key: key.trim(), projectCount: projects.length },
    })

    return {
      success: false,
      updateResults: [],
      redeployResults: [],
      error: message,
    }
  }
}
