'use server'

import { db as prisma } from "@/lib/db/client"
import { ok, fail } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

/**
 * 선생님 분석 이력 조회
 * 통합 테이블에서 subjectType='TEACHER'로 조회합니다.
 */
export async function getTeacherAnalysisHistory(
  teacherId: string,
  type: 'saju' | 'face' | 'palm' | 'mbti' | 'name'
) {
  try {
    let historyItem = null

    switch (type) {
      case 'saju': {
        const analysis = await prisma.sajuAnalysis.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: 'TEACHER',
              subjectId: teacherId,
            }
          }
        })
        if (analysis) {
          historyItem = {
            id: analysis.id,
            calculatedAt: analysis.calculatedAt,
            summary: `버전 ${analysis.version} - ${analysis.interpretation?.slice(0, 50) || '사주 분석'}...`,
            result: analysis.result,
            interpretation: analysis.interpretation,
          }
        }
        break
      }
      case 'face': {
        const analysis = await prisma.faceAnalysis.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: 'TEACHER',
              subjectId: teacherId,
            }
          }
        })
        if (analysis) {
          historyItem = {
            id: analysis.id,
            calculatedAt: analysis.analyzedAt,
            summary: `상태: ${analysis.status}`,
            result: analysis.result,
            errorMessage: analysis.errorMessage,
          }
        }
        break
      }
      case 'palm': {
        const analysis = await prisma.palmAnalysis.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: 'TEACHER',
              subjectId: teacherId,
            }
          }
        })
        if (analysis) {
          historyItem = {
            id: analysis.id,
            calculatedAt: analysis.analyzedAt,
            summary: `${analysis.hand} 손 분석 - 상태: ${analysis.status}`,
            result: analysis.result,
            errorMessage: analysis.errorMessage,
          }
        }
        break
      }
      case 'mbti': {
        const analysis = await prisma.mbtiAnalysis.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: 'TEACHER',
              subjectId: teacherId,
            }
          }
        })
        if (analysis) {
          historyItem = {
            id: analysis.id,
            calculatedAt: analysis.calculatedAt,
            summary: `MBTI: ${analysis.mbtiType}`,
            result: {
              mbtiType: analysis.mbtiType,
              percentages: analysis.percentages,
              scores: analysis.scores,
            },
          }
        }
        break
      }
      case 'name': {
        const analysis = await prisma.nameAnalysis.findUnique({
          where: {
            subjectType_subjectId: {
              subjectType: 'TEACHER',
              subjectId: teacherId,
            }
          }
        })
        if (analysis) {
          historyItem = {
            id: analysis.id,
            calculatedAt: analysis.calculatedAt,
            summary: `이름풀이 - ${analysis.interpretation?.slice(0, 50) || '분석 완료'}...`,
            result: analysis.result,
            interpretation: analysis.interpretation,
          }
        }
        break
      }
    }

    return ok({
      history: historyItem ? [historyItem] : [],
      note: historyItem
        ? "현재 스키마에서는 최신 분석 결과 1개만 표시됩니다."
        : "분석 이력이 없습니다.",
    })
  } catch (error) {
    logger.error({ err: error, type }, 'Failed to fetch teacher analysis history')
    return fail(`${type} 분석 이력 조회 중 오류가 발생했습니다.`)
  }
}
