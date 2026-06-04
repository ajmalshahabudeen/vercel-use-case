import axios, { type AxiosInstance } from 'axios'
import { VERCEL_API_BASE, VERCEL_HEADERS, VERCEL_ENDPOINTS } from '@vercel-env-updater/config'
import type { VercelProject, VercelEnvVariable, BulkUpdateResult } from '@vercel-env-updater/config'

type VercelTeamQuery = { teamId?: string; slug?: string }

type EnvUpsertApiResponse = {
  created?:
    | { id?: string; key: string }
    | Array<{ id?: string; key: string }>
  failed?: Array<{ error?: { message?: string; code?: string } }>
}

type VercelDeploymentListItem = {
  uid: string
  name: string
  projectId: string
  target?: string | null
  state?: string
}

export type RedeployTarget = 'production' | 'preview'

/**
 * Creates an authenticated Axios instance for the Vercel API.
 * All server code should go through this client.
 */
export function createVercelClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: VERCEL_API_BASE,
    headers: VERCEL_HEADERS(token),
    timeout: 30000,
  })
}

function teamQuery(scope?: string): VercelTeamQuery {
  const trimmed = scope?.trim()
  if (!trimmed) return {}
  return { slug: trimmed }
}

/**
 * Fetches all projects the token has access to.
 */
export async function listProjects(token: string, scope?: string): Promise<VercelProject[]> {
  const client = createVercelClient(token)

  const { data } = await client.get<{ projects: VercelProject[] }>(
    VERCEL_ENDPOINTS.projects,
    { params: { limit: 100, ...teamQuery(scope) } }
  )

  return data.projects ?? []
}

/**
 * Creates or updates an environment variable for a specific project.
 * Uses upsert=true so existing keys are updated instead of rejected.
 */
export async function upsertEnvVariable(
  token: string,
  projectIdOrName: string,
  env: Omit<VercelEnvVariable, 'id'>,
  scope?: string
): Promise<{ id: string }> {
  const client = createVercelClient(token)

  const { data } = await client.post<EnvUpsertApiResponse>(
    VERCEL_ENDPOINTS.env(projectIdOrName),
    {
      key: env.key,
      value: env.value,
      type: env.type ?? 'encrypted',
      target: env.target,
      ...(env.gitBranch ? { gitBranch: env.gitBranch } : {}),
    },
    { params: { upsert: 'true', ...teamQuery(scope) } }
  )

  if (data.failed?.length) {
    const message =
      data.failed[0]?.error?.message ?? 'Vercel rejected the environment variable update'
    throw new Error(message)
  }

  const created = Array.isArray(data.created) ? data.created[0] : data.created
  if (!created?.id) {
    throw new Error('Vercel API did not return a created environment variable id')
  }

  return { id: created.id }
}

/**
 * Bulk updates the same key across multiple projects.
 * Returns detailed results per project.
 */
export async function bulkUpsertEnv(
  token: string,
  key: string,
  projects: Array<{ id: string; name: string; value: string }>,
  targets: VercelEnvVariable['target'],
  scope?: string
): Promise<BulkUpdateResult[]> {
  const results: BulkUpdateResult[] = []

  for (const project of projects) {
    try {
      const response = await upsertEnvVariable(
        token,
        project.id,
        {
          key,
          value: project.value,
          type: 'encrypted',
          target: targets,
        },
        scope
      )

      results.push({
        projectId: project.id,
        projectName: project.name,
        success: true,
        envId: response.id,
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string }
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Unknown error from Vercel API'

      results.push({
        projectId: project.id,
        projectName: project.name,
        success: false,
        error: message,
      })
    }
  }

  return results
}

/**
 * Returns the latest READY deployment for a project and target.
 */
export async function getLatestDeployment(
  token: string,
  projectId: string,
  deployTarget: RedeployTarget,
  scope?: string
): Promise<VercelDeploymentListItem | null> {
  const client = createVercelClient(token)

  const { data } = await client.get<{ deployments: VercelDeploymentListItem[] }>(
    VERCEL_ENDPOINTS.deployments,
    {
      params: {
        projectId,
        limit: 20,
        state: 'READY',
        ...(deployTarget === 'production' ? { target: 'production' } : {}),
        ...teamQuery(scope),
      },
    }
  )

  const deployments = data.deployments ?? []
  if (deployments.length === 0) return null

  if (deployTarget === 'production') {
    return deployments.find((d) => d.target === 'production') ?? deployments[0] ?? null
  }

  return deployments.find((d) => d.target !== 'production') ?? deployments[0] ?? null
}

/**
 * Redeploys a project by cloning the latest READY deployment for the target.
 */
export async function redeployProject(
  token: string,
  project: { id: string; name: string },
  deployTarget: RedeployTarget,
  scope?: string
): Promise<{ id: string; url?: string }> {
  const client = createVercelClient(token)
  const latest = await getLatestDeployment(token, project.id, deployTarget, scope)

  if (!latest?.uid) {
    throw new Error(
      `No ${deployTarget} deployment found for "${project.name}". Push to Git or deploy once from the Vercel dashboard first.`
    )
  }

  const body: Record<string, unknown> = {
    name: project.name,
    project: project.id,
    deploymentId: latest.uid,
  }

  if (deployTarget === 'production') {
    body.target = 'production'
  }

  const { data } = await client.post<{ id: string; url?: string }>(
    VERCEL_ENDPOINTS.createDeployment,
    body,
    { params: teamQuery(scope) }
  )

  return { id: data.id, url: data.url }
}

function redeployTargetsFromEnvTargets(
  targets: VercelEnvVariable['target']
): RedeployTarget[] {
  const out: RedeployTarget[] = []
  if (targets.includes('production')) out.push('production')
  if (targets.includes('preview')) out.push('preview')
  return out.length > 0 ? out : ['production']
}

/**
 * Performs env variable updates + triggers redeployments for the projects
 * where the update succeeded.
 */
export async function bulkUpdateAndRedeploy(
  token: string,
  key: string,
  projects: Array<{ id: string; name: string; value: string }>,
  targets: VercelEnvVariable['target'],
  scope?: string
): Promise<{
  updateResults: BulkUpdateResult[]
  redeployResults: Array<{
    projectId: string
    projectName: string
    target: RedeployTarget
    success: boolean
    error?: string
    deploymentId?: string
  }>
}> {
  const updateResults = await bulkUpsertEnv(token, key, projects, targets, scope)

  const redeployResults: Array<{
    projectId: string
    projectName: string
    target: RedeployTarget
    success: boolean
    error?: string
    deploymentId?: string
  }> = []

  const successfulProjectIds = new Set(
    updateResults.filter((r) => r.success).map((r) => r.projectId)
  )

  const projectsToRedeploy = projects.filter((p) => successfulProjectIds.has(p.id))
  const deployTargets = redeployTargetsFromEnvTargets(targets)

  for (const project of projectsToRedeploy) {
    for (const deployTarget of deployTargets) {
      try {
        const deployment = await redeployProject(token, project, deployTarget, scope)

        redeployResults.push({
          projectId: project.id,
          projectName: project.name,
          target: deployTarget,
          success: true,
          deploymentId: deployment.id,
        })
      } catch (error: unknown) {
        const err = error as {
          response?: { data?: { error?: { message?: string } } }
          message?: string
        }
        const message =
          err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to trigger redeployment'

        redeployResults.push({
          projectId: project.id,
          projectName: project.name,
          target: deployTarget,
          success: false,
          error: message,
        })
      }
    }
  }

  return { updateResults, redeployResults }
}