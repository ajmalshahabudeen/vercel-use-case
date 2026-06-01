import axios, { type AxiosInstance } from 'axios'
import { VERCEL_API_BASE, VERCEL_HEADERS, VERCEL_ENDPOINTS } from '@vercel-env-updater/config'
import type { VercelProject, VercelEnvVariable, BulkUpdateResult } from '@vercel-env-updater/config'

/**
 * Creates an authenticated Axios instance for the Vercel API.
 * All server code should go through this client.
 */
export function createVercelClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: VERCEL_API_BASE,
    headers: VERCEL_HEADERS(token),
    timeout: 15000,
  })
}

/**
 * Fetches all projects the token has access to.
 */
export async function listProjects(token: string): Promise<VercelProject[]> {
  const client = createVercelClient(token)

  const { data } = await client.get<{ projects: VercelProject[] }>(
    VERCEL_ENDPOINTS.projects,
    { params: { limit: 100 } }
  )

  return data.projects ?? []
}

/**
 * Creates or updates an environment variable for a specific project.
 * Vercel will create it if it doesn't exist, or update if the key already exists for the targets.
 */
export async function upsertEnvVariable(
  token: string,
  projectIdOrName: string,
  env: Omit<VercelEnvVariable, 'id'>
): Promise<{ id: string }> {
  const client = createVercelClient(token)

  const { data } = await client.post(
    VERCEL_ENDPOINTS.env(projectIdOrName),
    {
      key: env.key,
      value: env.value,
      type: env.type ?? 'encrypted',
      target: env.target,
      ...(env.gitBranch ? { gitBranch: env.gitBranch } : {}),
    }
  )

  return data
}

/**
 * Bulk updates the same key across multiple projects.
 * Returns detailed results per project.
 */
export async function bulkUpsertEnv(
  token: string,
  key: string,
  projects: Array<{ id: string; name: string; value: string }>,
  targets: VercelEnvVariable['target']
): Promise<BulkUpdateResult[]> {
  const results: BulkUpdateResult[] = []

  // Run sequentially to be nice to Vercel's rate limits (can be parallelized with care)
  for (const project of projects) {
    try {
      const response = await upsertEnvVariable(token, project.id, {
        key,
        value: project.value,
        type: 'encrypted',
        target: targets,
      })

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
 * Triggers a new deployment (redeploy) for a project.
 * This is commonly used after updating environment variables.
 */
export async function redeployProject(
  token: string,
  projectIdOrName: string,
  target: 'production' | 'preview' = 'production'
): Promise<{ id: string; url?: string }> {
  const client = createVercelClient(token)

  const { data } = await client.post('/v13/deployments', {
    project: projectIdOrName,
    target,
    // Vercel will use the latest commit for the target environment
  })

  return data
}

/**
 * Performs env variable updates + triggers redeployments for the projects
 * where the update succeeded.
 */
export async function bulkUpdateAndRedeploy(
  token: string,
  key: string,
  projects: Array<{ id: string; name: string; value: string }>,
  targets: VercelEnvVariable['target']
): Promise<{
  updateResults: BulkUpdateResult[]
  redeployResults: Array<{
    projectId: string
    projectName: string
    success: boolean
    error?: string
    deploymentId?: string
  }>
}> {
  // Step 1: Update environment variables
  const updateResults = await bulkUpsertEnv(token, key, projects, targets)

  const redeployResults: Array<{
    projectId: string
    projectName: string
    success: boolean
    error?: string
    deploymentId?: string
  }> = []

  // Step 2: Redeploy only projects that had successful env updates
  const successfulProjectIds = new Set(
    updateResults.filter((r) => r.success).map((r) => r.projectId)
  )

  const projectsToRedeploy = projects.filter((p) => successfulProjectIds.has(p.id))

  for (const project of projectsToRedeploy) {
    try {
      const deployment = await redeployProject(token, project.id, 'production')

      redeployResults.push({
        projectId: project.id,
        projectName: project.name,
        success: true,
        deploymentId: deployment.id,
      })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string }
      const message =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to trigger redeployment'

      redeployResults.push({
        projectId: project.id,
        projectName: project.name,
        success: false,
        error: message,
      })
    }
  }

  return { updateResults, redeployResults }
}
