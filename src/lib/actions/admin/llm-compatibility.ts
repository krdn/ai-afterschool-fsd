"use server"

import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { generateWithProvider } from '@/features/ai-engine'
import {
  COMPATIBILITY_SYSTEM_PROMPT,
  buildCompatibilityPrompt,
  type CompatibilityStudentData as StudentData,
  type CompatibilityTeacherData as TeacherData,
} from "@/features/ai-engine/prompts"
import type { TeacherRecommendation } from "@/lib/actions/matching/assignment"
import { logger } from "@/lib/logger"
import { fetchSubjectAnalyses, fetchBatchAnalyses } from '@/features/matching'

// ---------------------------------------------------------------------------
// LLM 응답 파싱
// ---------------------------------------------------------------------------

type LLMRecommendation = {
  teacherId: string
  overall: number
  breakdown: {
    mbti: number
    learningStyle: number
    saju: number
    name: number
    loadBalance: number
  }
  reasons: string[]
}

/**
 * LLM 응답에서 JSON을 추출하고 파싱합니다.
 * markdown 코드블록이 포함되어 있을 수 있으므로 제거 후 파싱합니다.
 */
function parseLLMResponse(text: string): LLMRecommendation[] {
  // markdown 코드블록 제거
  let cleaned = text.trim()
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "")
  }

  const parsed = JSON.parse(cleaned)

  if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
    throw new Error("LLM 응답에 recommendations 배열이 없습니다.")
  }

  return parsed.recommendations
}

/**
 * LLM 추천 결과를 TeacherRecommendation 형태로 변환합니다.
 */
function toTeacherRecommendation(
  llmRec: LLMRecommendation,
  teacherMap: Map<string, { name: string; role: string; currentStudentCount: number }>,
): TeacherRecommendation | null {
  const teacher = teacherMap.get(llmRec.teacherId)
  if (!teacher) return null

  return {
    teacherId: llmRec.teacherId,
    teacherName: teacher.name,
    teacherRole: teacher.role,
    currentStudentCount: teacher.currentStudentCount,
    score: {
      overall: llmRec.overall,
      breakdown: llmRec.breakdown,
      reasons: llmRec.reasons,
    },
    breakdown: llmRec.breakdown,
    reasons: llmRec.reasons,
  }
}

// ---------------------------------------------------------------------------
// Feature Mapping 자동 초기화
// ---------------------------------------------------------------------------

/**
 * compatibility_analysis 매핑이 DB에 없으면 자동 생성합니다.
 * 한 번만 실행되도록 인메모리 플래그로 관리합니다.
 */
let mappingEnsured = false

async function ensureFeatureMapping() {
  if (mappingEnsured) return

  const existing = await db.featureMapping.findFirst({
    where: { featureType: "compatibility_analysis" },
  })

  if (!existing) {
    await db.featureMapping.create({
      data: {
        featureType: "compatibility_analysis",
        matchMode: "auto_tag",
        requiredTags: [],
        excludedTags: [],
        priority: 1,
        fallbackMode: "any_available",
      },
    })
    logger.info('[LLM Compatibility] compatibility_analysis 매핑 자동 생성')
  }

  mappingEnsured = true
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * LLM 기반 선생님 추천 목록 조회
 *
 * 학생 1명에 대해 모든 선생님과의 궁합을 LLM이 분석하여 점수를 매깁니다.
 *
 * @param studentId - 학생 ID
 * @returns 추천 선생님 목록 (overall 내림차순 정렬)
 */
export async function getLLMTeacherRecommendations(studentId: string, providerId?: string) {
  await verifySession()

  // 매핑 자동 초기화 (최초 1회)
  await ensureFeatureMapping()

  // 학생 데이터 조회
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!student) {
    throw new Error("학생을 찾을 수 없어요.")
  }

  // 학생 분석 데이터 조회
  const studentAnalyses = await fetchSubjectAnalyses(studentId, "STUDENT")

  // 선생님 목록 조회
  const teachers = await db.teacher.findMany({
    where: {
      role: { in: ["TEACHER", "MANAGER", "TEAM_LEADER"] },
    },
    select: {
      id: true,
      name: true,
      role: true,
      _count: {
        select: { students: true },
      },
    },
  })

  // 선생님 분석 데이터 일괄 조회
  const teacherIds = teachers.map(t => t.id)
  const teacherAnalysesMap = await fetchBatchAnalyses(teacherIds, "TEACHER")

  if (teachers.length === 0) {
    return {
      studentId: student.id,
      studentName: student.name,
      recommendations: [],
    }
  }

  // 프롬프트용 데이터 변환
  const studentData: StudentData = {
    id: student.id,
    name: student.name,
    mbti: studentAnalyses.mbti,
    saju: studentAnalyses.saju,
    nameAnalysis: studentAnalyses.name,
  }

  const teacherDataList: TeacherData[] = teachers.map((t) => {
    const tAnalyses = teacherAnalysesMap.get(t.id) ?? { mbti: null, saju: null, name: null }
    return {
      id: t.id,
      name: t.name,
      role: t.role,
      mbti: tAnalyses.mbti,
      saju: tAnalyses.saju,
      nameAnalysis: tAnalyses.name,
      currentStudentCount: t._count.students,
    }
  })

  // 프롬프트 생성
  const userPrompt = buildCompatibilityPrompt(studentData, teacherDataList)

  // LLM 호출
  let result
  try {
    result = await generateWithProvider({
      prompt: userPrompt,
      system: COMPATIBILITY_SYSTEM_PROMPT,
      featureType: "compatibility_analysis",
      temperature: 0.3,
      maxOutputTokens: 4096,
      providerId,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("No providers available")) {
      throw new Error(
        "LLM 제공자가 설정되지 않았습니다. 관리자 > LLM 설정에서 제공자를 추가하고 활성화해주세요."
      )
    }
    throw error
  }

  // JSON 파싱
  let llmRecommendations: LLMRecommendation[]
  try {
    llmRecommendations = parseLLMResponse(result.text)
  } catch (error) {
    logger.error({ err: error }, '[LLM Compatibility] JSON 파싱 실패')
    logger.error({ detail: result.text }, '[LLM Compatibility] 원본 응답')
    throw new Error(
      "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요."
    )
  }

  // teacherId → 이름/역할 매핑
  const teacherMap = new Map(
    teachers.map((t) => [t.id, { name: t.name, role: t.role, currentStudentCount: t._count.students }])
  )

  // TeacherRecommendation 변환 + 누락 필터링
  const recommendations = llmRecommendations
    .map((r) => toTeacherRecommendation(r, teacherMap))
    .filter((r): r is TeacherRecommendation => r !== null)

  // overall 내림차순 정렬
  recommendations.sort((a, b) => b.score.overall - a.score.overall)

  return {
    studentId: student.id,
    studentName: student.name,
    recommendations,
    llmProvider: result.provider,
    llmModel: result.model,
  }
}
