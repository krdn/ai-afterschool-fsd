/**
 * 시드 이미지 업로드 (Cloudinary)
 *
 * 트랜잭션 밖에서 실행됩니다 — 외부 API는 DB 롤백 불가능하므로 의도적 분리.
 */

import type { PrismaClient } from '@/lib/db'
import path from "path"
import fs from "fs"
import type { SeedTeacher, SeedStudent } from "./data"
import type { SeedGroup, SeedDataSet } from "./constants"
import {
  SEED_TEACHERS,
  SEED_STUDENTS,
} from "./data"

export async function uploadSeedImages(
  prisma: PrismaClient,
  groups: SeedGroup[],
  dataOverride?: Partial<SeedDataSet>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cloudinary: any
  let buildResizedImageUrl: (publicId: string) => string
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore: apps/web 컨텍스트에서 실행될 때 제공되는 모듈
    const mod = await import("@/lib/cloudinary")
    if (!mod.isCloudinaryConfigured) {
      console.log("[seed] Cloudinary 미설정 — 이미지 업로드를 건너뜁니다")
      return
    }
    cloudinary = mod.cloudinary
    buildResizedImageUrl = mod.buildResizedImageUrl
  } catch {
    console.log("[seed] Cloudinary 모듈 로드 실패 — 이미지 업로드를 건너뜁니다")
    return
  }

  const projectRoot = process.cwd()
  const teachers = (dataOverride?.teachers ?? SEED_TEACHERS) as SeedTeacher[]
  const students = (dataOverride?.students ?? SEED_STUDENTS) as SeedStudent[]

  if (groups.includes("teachers")) {
    for (const teacher of teachers) {
      if (!teacher.imagePath) continue

      const absPath = path.resolve(projectRoot, teacher.imagePath)
      if (!fs.existsSync(absPath)) {
        console.warn(`[seed] 이미지 파일 없음: ${absPath}`)
        continue
      }

      const dbTeacher = await prisma.teacher.findUnique({
        where: { email: teacher.email },
        select: { id: true, profileImage: true },
      })
      if (!dbTeacher || dbTeacher.profileImage) continue

      try {
        const publicId = `afterschool/teachers/${teacher.email.split("@")[0]}`
        const uploadResult = await cloudinary.uploader.upload(absPath, {
          public_id: publicId,
          folder: undefined,
          overwrite: true,
          transformation: [{ width: 512, height: 512, crop: "fill", gravity: "auto" }],
        })

        await prisma.teacher.update({
          where: { id: dbTeacher.id },
          data: {
            profileImage: uploadResult.secure_url,
            profileImagePublicId: uploadResult.public_id,
          },
        })
        console.log(`[seed] 선생님 이미지 업로드: ${teacher.name}`)
      } catch (err) {
        console.error(`[seed] 선생님 이미지 업로드 실패 (${teacher.name}):`, err)
      }
    }
  }

  if (groups.includes("students")) {
    for (const student of students) {
      if (!student.imagePath) continue

      const absPath = path.resolve(projectRoot, student.imagePath)
      if (!fs.existsSync(absPath)) {
        console.warn(`[seed] 이미지 파일 없음: ${absPath}`)
        continue
      }

      const birthDate = new Date(student.birthDate)
      const dbStudent = await prisma.student.findFirst({
        where: { name: student.name, birthDate },
        select: { id: true },
      })
      if (!dbStudent) continue

      const existingImage = await prisma.studentImage.findUnique({
        where: { studentId_type: { studentId: dbStudent.id, type: "profile" } },
      })
      if (existingImage) continue

      try {
        const safeName = student.name.replace(/\s/g, "_")
        const publicId = `afterschool/students/${safeName}_profile`
        const uploadResult = await cloudinary.uploader.upload(absPath, {
          public_id: publicId,
          folder: undefined,
          overwrite: true,
        })

        const resizedUrl = buildResizedImageUrl(uploadResult.public_id)

        await prisma.studentImage.create({
          data: {
            studentId: dbStudent.id,
            type: "profile",
            originalUrl: uploadResult.secure_url,
            resizedUrl,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
          },
        })
        console.log(`[seed] 학생 이미지 업로드: ${student.name}`)
      } catch (err) {
        console.error(`[seed] 학생 이미지 업로드 실패 (${student.name}):`, err)
      }
    }
  }
}
