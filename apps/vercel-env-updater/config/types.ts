// Shared types for the Vercel Env Updater app

export interface VercelProject {
  id: string
  name: string
  accountId: string
  updatedAt: number
  createdAt: number
  targets?: string[]
}

export interface VercelEnvVariable {
  id?: string
  key: string
  value: string
  type: 'encrypted' | 'plain' | 'system'
  target: ('production' | 'preview' | 'development')[]
  gitBranch?: string | null
}

export type DeploymentTarget = 'production' | 'preview' | 'development'

export interface BulkUpdateRequest {
  token: string
  key: string
  projects: Array<{
    id: string
    name: string
    value: string
  }>
  targets: DeploymentTarget[]
}

export interface BulkUpdateResult {
  projectId: string
  projectName: string
  success: boolean
  error?: string
  envId?: string
}

export interface ScanProjectsResult {
  projects: VercelProject[]
  error?: string
}
