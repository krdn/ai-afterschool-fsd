import { z } from 'zod'

export const universitySchema = z.object({
  name: z.string().min(2, '대학명을 입력해주세요'),
  nameShort: z.string().optional(),
  type: z.enum(['FOUR_YEAR', 'COLLEGE', 'CYBER', 'EDUCATION']),
  region: z.string().min(1, '지역을 입력해주세요'),
  ranking: z.coerce.number().int().positive().optional(),
  website: z.string().url().optional().or(z.literal('')),
})

export const universityMajorSchema = z.object({
  universityId: z.string().cuid(),
  majorName: z.string().min(1, '학과명을 입력해주세요'),
  department: z.string().optional(),
  requiredSubjects: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export const admissionCutoffSchema = z.object({
  universityMajorId: z.string().cuid(),
  academicYear: z.coerce.number().int().min(2020).max(2030),
  admissionType: z.string().min(1, '전형을 입력해주세요'),
  cutoffGrade: z.coerce.number().min(1).max(9).optional(),
  cutoffScore: z.coerce.number().min(0).max(400).optional(),
  cutoffPercentile: z.coerce.number().min(0).max(100).optional(),
  competitionRate: z.coerce.number().min(0).optional(),
  enrollmentCount: z.coerce.number().int().min(0).optional(),
  applicantCount: z.coerce.number().int().min(0).optional(),
  additionalInfo: z.string().optional(),
  dataSource: z.string().optional(),
})

export const studentTargetSchema = z.object({
  studentId: z.string().cuid(),
  universityMajorId: z.string().cuid(),
  priority: z.coerce.number().int().min(1).max(10),
  admissionType: z.string().optional(),
  motivation: z.string().optional(),
  status: z.enum(['INTERESTED', 'TARGET', 'APPLIED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']).default('INTERESTED'),
})

export const aiResearchQuerySchema = z.object({
  universityName: z.string().min(2, '대학명을 입력해주세요'),
  majorName: z.string().optional(),
  academicYear: z.coerce.number().int().min(2020).max(2030).optional(),
})

export const admissionSettingsSchema = z.object({
  defaultAcademicYear: z.coerce.number().int().min(2020).max(2030),
  defaultAdmissionType: z.enum(['수시', '정시']),
  autoAnalysis: z.boolean(),
  analysisRefreshDays: z.coerce.number().int().min(1).max(30),
  showTrendChart: z.boolean(),
  maxTargetsPerStudent: z.coerce.number().int().min(1).max(10),
})

export const aiResearchResultSchema = z.object({
  university: z.object({
    name: z.string(),
    nameShort: z.string().optional(),
    type: z.enum(['FOUR_YEAR', 'COLLEGE', 'CYBER', 'EDUCATION']).default('FOUR_YEAR'),
    region: z.string(),
    website: z.string().optional(),
  }),
  majors: z.array(z.object({
    majorName: z.string(),
    department: z.string().optional(),
    requiredSubjects: z.array(z.string()).default([]),
    preparationGuide: z.string().optional(),
    cutoffs: z.array(z.object({
      academicYear: z.number(),
      admissionType: z.string(),
      cutoffGrade: z.number().optional(),
      cutoffScore: z.number().optional(),
      cutoffPercentile: z.number().optional(),
      competitionRate: z.number().optional(),
      enrollmentCount: z.number().optional(),
      applicantCount: z.number().optional(),
      additionalInfo: z.string().optional(),
    })).default([]),
  })),
  sources: z.array(z.string()).default([]),
})

export type UniversityInput = z.infer<typeof universitySchema>
export type UniversityMajorInput = z.infer<typeof universityMajorSchema>
export type AdmissionCutoffInput = z.infer<typeof admissionCutoffSchema>
export type StudentTargetInput = z.infer<typeof studentTargetSchema>
export type AIResearchQuery = z.infer<typeof aiResearchQuerySchema>
export type AdmissionSettingsInput = z.infer<typeof admissionSettingsSchema>
