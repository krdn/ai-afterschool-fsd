'use server'

import { db } from "@/lib/db/client"
import { getFaceAnalysisByStudentId } from '@/features/analysis'
import { getPalmAnalysisByStudentId } from '@/features/analysis'
import { getMbtiAnalysis } from '@/features/analysis'
import { getVarkAnalysis } from '@/features/analysis'
import { getNameAnalysisByStudentId } from '@/features/analysis'
import { getZodiacAnalysis } from '@/features/analysis'
import { getSajuAnalysis } from '@/features/analysis'
import { getEnabledProviders, getEnabledProvidersWithVision } from '@/features/ai-engine'
import { getActiveGeneralPresetsByType } from '@/features/analysis'
import type { ProviderName } from '@/features/ai-engine'
import { logger } from "@/lib/logger"

export type PromptOption = {
  id: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
}

export type StudentAnalysisData = {
  student: {
    id: string
    name: string
    nameHanja: unknown
    birthDate: Date | string
    birthTimeHour: number | null
    birthTimeMinute: number | null
    sajuAnalysis: {
      result: unknown
      interpretation: string | null
      calculatedAt: Date | string
    } | null
    images: Array<{
      type: string
      originalUrl: string
      resizedUrl: string
    }> | null
  } | null
  faceAnalysis: {
    id: string
    status: string
    result: unknown
    imageUrl: string
    errorMessage: string | null
    usedProvider: string | null
    usedModel: string | null
  } | null
  palmAnalysis: {
    id: string
    status: string
    result: unknown
    imageUrl: string
    hand: string
    errorMessage: string | null
  } | null
  mbtiAnalysis: {
    mbtiType: string
    percentages: Record<string, number>
    calculatedAt: Date
  } | null
  varkAnalysis: {
    varkType: string
    scores: Record<string, number>
    percentages: Record<string, number>
    interpretation: string | null
    calculatedAt: Date
  } | null
  nameAnalysis: {
    result: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null
  zodiacAnalysis: {
    zodiacSign: string
    zodiacName: string
    element: string
    traits: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null
  enabledProviders: ProviderName[]
  visionProviders: ProviderName[]
  lastUsedProvider: string | null
  lastUsedModel: string | null
  facePromptOptions: PromptOption[]
  palmPromptOptions: PromptOption[]
  mbtiPromptOptions: PromptOption[]
  varkPromptOptions: PromptOption[]
  namePromptOptions: PromptOption[]
  zodiacPromptOptions: PromptOption[]
}

export async function getStudentAnalysisData(studentId: string): Promise<StudentAnalysisData> {
  try {
    // Fetch student data, enabled providers, and prompt options in parallel
    const [student, enabledProviders, providersWithVision, facePresets, palmPresets, mbtiPresets, varkPresets, namePresets, zodiacPresets] = await Promise.all([
      db.student.findUnique({
        where: { id: studentId },
        include: {
          images: true
        }
      }),
      getEnabledProviders().catch(() => [] as ProviderName[]),
      getEnabledProvidersWithVision().catch(() => []),
      getActiveGeneralPresetsByType("face").catch(() => []),
      getActiveGeneralPresetsByType("palm").catch(() => []),
      getActiveGeneralPresetsByType("mbti").catch(() => []),
      getActiveGeneralPresetsByType("vark").catch(() => []),
      getActiveGeneralPresetsByType("name").catch(() => []),
      getActiveGeneralPresetsByType("zodiac").catch(() => []),
    ])

    const visionProviders = providersWithVision
      .filter(p => p.hasVisionModel)
      .map(p => p.name)

    const toPromptOptions = (presets: Awaited<ReturnType<typeof getActiveGeneralPresetsByType>>): PromptOption[] =>
      presets.map(p => ({
        id: p.promptKey,
        name: p.name,
        shortDescription: p.shortDescription,
        target: p.target,
        levels: p.levels,
        purpose: p.purpose,
        recommendedTiming: p.recommendedTiming,
        tags: p.tags,
      }))

    if (!student) {
      return {
        student: null,
        faceAnalysis: null,
        palmAnalysis: null,
        mbtiAnalysis: null,
        varkAnalysis: null,
        nameAnalysis: null,
        zodiacAnalysis: null,
        enabledProviders,
        visionProviders,
        lastUsedProvider: null,
        lastUsedModel: null,
        facePromptOptions: toPromptOptions(facePresets),
        palmPromptOptions: toPromptOptions(palmPresets),
        mbtiPromptOptions: toPromptOptions(mbtiPresets),
        varkPromptOptions: toPromptOptions(varkPresets),
        namePromptOptions: toPromptOptions(namePresets),
        zodiacPromptOptions: toPromptOptions(zodiacPresets),
      }
    }

    // Fetch all analysis types in parallel from unified tables
    const [sajuAnalysis, faceAnalysis, palmAnalysis, mbtiAnalysis, varkAnalysis, nameAnalysis, zodiacAnalysis, sajuHistory] = await Promise.all([
      getSajuAnalysis('STUDENT', studentId),
      getFaceAnalysisByStudentId(studentId),
      getPalmAnalysisByStudentId(studentId),
      getMbtiAnalysis(studentId),
      getVarkAnalysis(studentId),
      getNameAnalysisByStudentId(studentId),
      getZodiacAnalysis(studentId),
      db.sajuAnalysisHistory.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        select: { usedProvider: true, usedModel: true }
      })
    ])

    return {
      student: {
        id: student.id,
        name: student.name,
        nameHanja: student.nameHanja,
        birthDate: student.birthDate,
        birthTimeHour: student.birthTimeHour,
        birthTimeMinute: student.birthTimeMinute,
        sajuAnalysis: sajuAnalysis ? {
          result: sajuAnalysis.result,
          interpretation: sajuAnalysis.interpretation,
          calculatedAt: sajuAnalysis.calculatedAt,
        } : null,
        images: student.images
      },
      faceAnalysis,
      palmAnalysis,
      mbtiAnalysis: mbtiAnalysis ? {
        mbtiType: mbtiAnalysis.mbtiType,
        percentages: mbtiAnalysis.percentages as Record<string, number>,
        calculatedAt: mbtiAnalysis.calculatedAt
      } : null,
      varkAnalysis: varkAnalysis ? {
        varkType: varkAnalysis.varkType,
        scores: varkAnalysis.scores as Record<string, number>,
        percentages: varkAnalysis.percentages as Record<string, number>,
        interpretation: varkAnalysis.interpretation,
        calculatedAt: varkAnalysis.calculatedAt
      } : null,
      nameAnalysis: nameAnalysis ? {
        result: nameAnalysis.result,
        interpretation: nameAnalysis.interpretation,
        calculatedAt: nameAnalysis.calculatedAt
      } : null,
      zodiacAnalysis: zodiacAnalysis ? {
        zodiacSign: zodiacAnalysis.zodiacSign,
        zodiacName: zodiacAnalysis.zodiacName,
        element: zodiacAnalysis.element,
        traits: zodiacAnalysis.traits,
        interpretation: zodiacAnalysis.interpretation,
        calculatedAt: zodiacAnalysis.calculatedAt
      } : null,
      enabledProviders,
      visionProviders,
      lastUsedProvider: sajuHistory?.usedProvider ?? null,
      lastUsedModel: sajuHistory?.usedModel ?? null,
      facePromptOptions: toPromptOptions(facePresets),
      palmPromptOptions: toPromptOptions(palmPresets),
      mbtiPromptOptions: toPromptOptions(mbtiPresets),
      varkPromptOptions: toPromptOptions(varkPresets),
      namePromptOptions: toPromptOptions(namePresets),
      zodiacPromptOptions: toPromptOptions(zodiacPresets),
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to load analysis data')
    return {
      student: null,
      faceAnalysis: null,
      palmAnalysis: null,
      mbtiAnalysis: null,
      varkAnalysis: null,
      nameAnalysis: null,
      zodiacAnalysis: null,
      enabledProviders: [],
      visionProviders: [],
      lastUsedProvider: null,
      lastUsedModel: null,
      facePromptOptions: [],
      palmPromptOptions: [],
      mbtiPromptOptions: [],
      varkPromptOptions: [],
      namePromptOptions: [],
      zodiacPromptOptions: [],
    }
  }
}
