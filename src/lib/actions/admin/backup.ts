'use server'

import { verifySession } from '@/lib/dal'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

export interface BackupFileEntry {
  name: string
  size: number
  createdAt: Date
  path: string
}

export async function getBackupList(): Promise<BackupFileEntry[]> {
  const session = await verifySession()

  // Allow both DIRECTOR and TEAM_LEADER roles
  if (session.role !== 'DIRECTOR' && session.role !== 'TEAM_LEADER') {
    return []
  }

  const backupDir = process.env.BACKUP_DIR || './backups'
  const dbName = process.env.POSTGRES_DB || 'ai_afterschool'

  if (!existsSync(backupDir)) {
    return []
  }

  try {
    const files = readdirSync(backupDir)
      .filter((f) => f.startsWith(`${dbName}-`) && f.endsWith('.sql.gz'))
      .map((f) => {
        const filePath = join(backupDir, f)
        const stats = statSync(filePath)
        return {
          name: f,
          size: stats.size,
          createdAt: stats.mtime,
          path: filePath,
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return files
  } catch (error) {
    console.error('Failed to read backup directory:', error)
    return []
  }
}
