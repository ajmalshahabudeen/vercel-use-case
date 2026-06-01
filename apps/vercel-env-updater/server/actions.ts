'use server'

import { listProjects, bulkUpsertEnv } from './vercel-client'
import type { ScanProjectsResult, BulkUpdateResult, DeploymentTarget } from '@vercel-env-updater/config'
import { DEFAULT_TARGETS } from '@vercel-env-updater/config'

/**
 * Server Action: Scan Vercel projects for the given token.
 */
export async function scanVercelProjects(token: string): Promise<ScanProjectsResult> {
  if (!token || token.trim().length < 10) {
    return { projects: [], error: 'Invalid or missing Vercel access token' }
  }

  try {
    const projects = await listProjects(token.trim())
    return { projects }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string }
    const message =
      err?.response?.data?.error?.message ||
      err?.message ||
      'Failed to fetch projects from Vercel'

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
}): Promise<{
  success: boolean
  results: BulkUpdateResult[]
  error?: string
}> {
  const { token, key, projects, targets = DEFAULT_TARGETS } = params

  if (!token || !key || projects.length === 0) {
    return {
      success: false,
      results: [],
      error: 'Missing required fields (token, key, or selected projects)',
    }
  }

  try {
    const results = await bulkUpsertEnv(token.trim(), key.trim(), projects, targets)

    const hasFailures = results.some((r) => !r.success)

    return {
      success: !hasFailures,
      results,
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    return {
      success: false,
      results: [],
      error: err?.message || 'Bulk update failed',
    }
  }
}
