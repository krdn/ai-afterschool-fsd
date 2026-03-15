import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function createMajor(data: Prisma.UniversityMajorUncheckedCreateInput) {
  return db.universityMajor.create({ data, include: { cutoffs: true, university: true } })
}

export async function getMajorById(id: string) {
  return db.universityMajor.findUnique({
    where: { id },
    include: { cutoffs: { orderBy: { academicYear: 'desc' } }, university: true },
  })
}

export async function getMajorsByUniversity(universityId: string) {
  return db.universityMajor.findMany({
    where: { universityId },
    include: { cutoffs: { orderBy: { academicYear: 'desc' } } },
    orderBy: { majorName: 'asc' },
  })
}

export async function updateMajor(id: string, data: Prisma.UniversityMajorUpdateInput) {
  return db.universityMajor.update({ where: { id }, data })
}

export async function findMajorByName(universityId: string, majorName: string) {
  return db.universityMajor.findUnique({
    where: { universityId_majorName: { universityId, majorName } },
    include: { cutoffs: true },
  })
}
