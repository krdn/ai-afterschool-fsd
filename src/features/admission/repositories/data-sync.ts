import { db } from '@/lib/db/client'
import type { Prisma, SyncStatus } from '@prisma/client'

export async function createSync(data: Prisma.AdmissionDataSyncUncheckedCreateInput) {
  return db.admissionDataSync.create({ data })
}

export async function updateSyncStatus(
  id: string,
  status: SyncStatus,
  extra?: { resultData?: Prisma.JsonValue; recordsFound?: number; recordsSaved?: number; errorLog?: string; source?: string },
) {
  return db.admissionDataSync.update({
    where: { id },
    data: { status, ...extra },
  })
}

export async function getSyncHistory(teacherId: string, limit = 20) {
  return db.admissionDataSync.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getSyncById(id: string) {
  return db.admissionDataSync.findUnique({ where: { id } })
}
