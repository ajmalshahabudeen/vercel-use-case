import { prisma, Prisma } from '@workspace/db'

export type ActivityLogSource = 'get_started' | 'bulk_update' | 'account'
export type ActivityLogLevel = 'info' | 'warn' | 'error' | 'success'

export type ActivityLogInput = {
  source: ActivityLogSource
  action: string
  message: string
  level?: ActivityLogLevel
  metadata?: Record<string, unknown>
}

export async function writeActivityLog(input: ActivityLogInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        source: input.source,
        action: input.action,
        level: input.level ?? 'info',
        message: input.message,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    })
  } catch (error) {
    console.error('[activity-log] Failed to persist log:', error)
  }
}

export function maskToken(token: string): string {
  const trimmed = token.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}