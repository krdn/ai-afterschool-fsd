import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function upsertCutoff(data: Prisma.AdmissionCutoffUncheckedCreateInput) {
  const { universityMajorId, academicYear, admissionType, ...rest } = data
  return db.admissionCutoff.upsert({
    where: {
      universityMajorId_academicYear_admissionType: {
        universityMajorId,
        academicYear,
        admissionType,
      },
    },
    update: rest,
    create: data,
  })
}

export async function getCutoffsByMajor(universityMajorId: string) {
  return db.admissionCutoff.findMany({
    where: { universityMajorId },
    orderBy: [{ academicYear: 'desc' }, { admissionType: 'asc' }],
  })
}

export async function getCutoffTrend(universityMajorId: string, admissionType: string) {
  return db.admissionCutoff.findMany({
    where: { universityMajorId, admissionType },
    orderBy: { academicYear: 'asc' },
  })
}

export async function deleteCutoff(id: string) {
  return db.admissionCutoff.delete({ where: { id } })
}

export async function verifyCutoff(id: string) {
  return db.admissionCutoff.update({
    where: { id },
    data: { isVerified: true },
  })
}
