import type { DeploymentTarget } from './types'

export const VERCEL_API_BASE = 'https://api.vercel.com'

export const DEFAULT_TARGETS: DeploymentTarget[] = ['production', 'preview', 'development']

export const VERCEL_ENDPOINTS = {
  projects: '/v9/projects',
  env: (projectIdOrName: string) => `/v10/projects/${projectIdOrName}/env`,
  deployments: '/v7/deployments',
  createDeployment: '/v13/deployments',
} as const

export const VERCEL_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
})
