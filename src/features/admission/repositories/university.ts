import { db } from '@/lib/db/client'
import type { Prisma } from '@prisma/client'

export async function createUniversity(data: Prisma.UniversityUncheckedCreateInput) {
  return db.university.create({ data, include: { majors: true } })
}

export async function findUniversityByName(name: string) {
  return db.university.findFirst({
    where: { name: { contains: name, mode: 'insensitive' } },
    include: { majors: { include: { cutoffs: true } } },
  })
}

export async function searchUniversities(query: string, limit = 20) {
  return db.university.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { nameShort: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: { majors: true },
    take: limit,
    orderBy: { name: 'asc' },
  })
}

export async function getUniversityById(id: string) {
  return db.university.findUnique({
    where: { id },
    include: { majors: { include: { cutoffs: true } } },
  })
}

export async function updateUniversity(id: string, data: Prisma.UniversityUpdateInput) {
  return db.university.update({ where: { id }, data })
}

export async function listUniversities(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize
  const [universities, total] = await Promise.all([
    db.university.findMany({
      where: { isActive: true },
      include: { majors: true },
      skip,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    db.university.count({ where: { isActive: true } }),
  ])
  return { universities, total, page, pageSize }
}
