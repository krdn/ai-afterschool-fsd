import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

const targetInclude = {
  universityMajor: {
    include: { university: true, cutoffs: true },
  },
} as const

export async function setTarget(data: Prisma.StudentTargetUncheckedCreateInput) {
  return db.studentTarget.upsert({
    where: {
      studentId_universityMajorId: {
        studentId: data.studentId,
        universityMajorId: data.universityMajorId,
      },
    },
    update: {
      priority: data.priority,
      admissionType: data.admissionType,
      motivation: data.motivation,
      status: data.status,
    },
    create: data,
    include: targetInclude,
  })
}

export async function getStudentTargets(studentId: string) {
  return db.studentTarget.findMany({
    where: { studentId },
    include: targetInclude,
    orderBy: { priority: 'asc' },
  })
}

export async function removeTarget(studentId: string, universityMajorId: string) {
  return db.studentTarget.delete({
    where: { studentId_universityMajorId: { studentId, universityMajorId } },
  })
}

export async function updateTargetStatus(id: string, status: string) {
  return db.studentTarget.update({
    where: { id },
    data: { status: status as never },
  })
}

export async function updateTargetAnalysis(
  id: string,
  gapAnalysis: Prisma.InputJsonValue,
  admissionProbability: number,
) {
  return db.studentTarget.update({
    where: { id },
    data: { gapAnalysis, admissionProbability, analysisUpdatedAt: new Date() },
  })
}
