'use server';

import { db as prisma } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from '@/lib/db';
import { eventBus } from "@/lib/events/event-bus";
import { ok, fail, type ActionResult } from "@/lib/errors/action-result";

// 분석 결과 스키마
const AnalysisSchema = z.object({
    coreTraits: z.string(),
    scores: z.array(z.object({
        subject: z.string(),
        A: z.number(),
        fullMark: z.number()
    })),
    learningStrategy: z.object({
        strengths: z.string(),
        weaknesses: z.string()
    })
});

export async function generateAnalysis(studentId: string) {
    try {
        // 1. 학생 데이터 조회
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                gradeHistory: true, // 성적
                counselingSessions: true, // 상담 이력
            }
        });

        if (!student) {
            throw new Error("학생을 찾을 수 없습니다.");
        }

        // 2. AI 분석 수행 (현재는 Mocking 처리)
        // TODO: 실제 LLM (OpenAI/Claude) 연동
        // 실제 연동 시: student 데이터를 프롬프트로 변환하여 generateObject 호출

        // 임시: 랜덤성을 가미한 Mock 데이터 생성
        const randomScore = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

        const mockResult = {
            coreTraits: "자기주도적 탐구자",
            scores: [
                { subject: '논리적 사고', A: randomScore(70, 95), fullMark: 100 },
                { subject: '언어 능력', A: randomScore(70, 95), fullMark: 100 },
                { subject: '수리 능력', A: randomScore(60, 90), fullMark: 100 },
                { subject: '창의성', A: randomScore(75, 95), fullMark: 100 },
                { subject: '사회성', A: randomScore(60, 85), fullMark: 100 },
                { subject: '자기주도', A: randomScore(80, 98), fullMark: 100 },
            ],
            learningStrategy: {
                strengths: "관심 분야에 대한 깊이 있는 탐구 능력이 탁월하며, 스스로 목표를 설정하고 실천하는 힘이 있습니다.",
                weaknesses: "협업 활동이나 타인과의 소통 과정에서 다소 소극적일 수 있습니다. 그룹 프로젝트 참여를 독려해주세요."
            }
        };

        // 3. DB 저장 (Upsert)
        // scores는 Json 타입이므로 any[]로 캐스팅하거나 그대로 할당 (Prisma가 처리)
        await prisma.personalitySummary.upsert({
            where: { studentId: student.id },
            create: {
                studentId: student.id,
                coreTraits: mockResult.coreTraits,
                scores: mockResult.scores as Prisma.InputJsonValue,
                learningStrategy: mockResult.learningStrategy as Prisma.InputJsonValue,
                status: "complete",
                version: 1,
                generatedAt: new Date()
            },
            update: {
                coreTraits: mockResult.coreTraits,
                scores: mockResult.scores as Prisma.InputJsonValue,
                learningStrategy: mockResult.learningStrategy as Prisma.InputJsonValue,
                status: "complete",
                generatedAt: new Date(),
                updatedAt: new Date()
            }
        });

        // 4. 이벤트 발행
        eventBus.emitEvent({
            type: 'analysis:complete',
            analysisType: 'saju',
            subjectType: 'STUDENT',
            subjectId: studentId,
            subjectName: student.name,
            timestamp: new Date().toISOString(),
        });

        // 5. 페이지 갱신
        revalidatePath(`/students/${studentId}`);

        return ok(mockResult);

    } catch (error) {
        console.error("Analysis generation failed:", error);
        return fail("분석 생성 중 오류가 발생했습니다.");
    }
}

export async function getAnalysis(studentId: string) {
    const analysis = await prisma.personalitySummary.findUnique({
        where: { studentId }
    });
    return analysis;
}

/**
 * 분석 이력 조회 액션
 * 참고: 현재 스키마는 각 학생당 분석 결과가 1개만 존재합니다 (@unique 제약조건).
 * 진정한 이력 기능을 위해서는 별도 이력 테이블이 필요하며, 이는 향후 개선 사항입니다.
 * 현재는 최신 분석 결과와 계산 시간 정보를 반환합니다.
 */
export async function getAnalysisHistory(
    studentId: string,
    type: 'saju' | 'face' | 'palm' | 'mbti' | 'vark' | 'name' | 'zodiac'
) {
    try {
        let historyItem = null

        switch (type) {
            case 'saju': {
                const sajuHistoryList = await prisma.sajuAnalysisHistory.findMany({
                    where: { studentId },
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                })
                if (sajuHistoryList.length > 0) {
                    return ok({
                        history: sajuHistoryList.map((h) => ({
                            id: h.id,
                            calculatedAt: h.calculatedAt,
                            summary: `${h.promptId !== 'default' ? `[${h.promptId}] ` : ''}${h.usedProvider}${h.additionalRequest ? ' +추가요청' : ''} - ${h.interpretation?.slice(0, 50) || '사주 분석'}...`,
                            result: h.result,
                            interpretation: h.interpretation,
                            promptId: h.promptId,
                            additionalRequest: h.additionalRequest,
                            usedProvider: h.usedProvider,
                            usedModel: h.usedModel,
                        })),
                        note: "사주 분석 이력입니다.",
                    })
                }
                // 이력 테이블에 없으면 기존 SajuAnalysis에서 폴백
                const sajuAnalysis = await prisma.sajuAnalysis.findUnique({
                    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } }
                })
                if (sajuAnalysis) {
                    historyItem = {
                        id: sajuAnalysis.id,
                        calculatedAt: sajuAnalysis.calculatedAt,
                        summary: `버전 ${sajuAnalysis.version} - ${sajuAnalysis.interpretation?.slice(0, 50) || '사주 분석'}...`,
                        result: sajuAnalysis.result,
                        interpretation: sajuAnalysis.interpretation
                    }
                }
                break
            }
            case 'face':
                const faceAnalysis = await prisma.faceAnalysis.findUnique({
                    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } }
                })
                if (faceAnalysis) {
                    historyItem = {
                        id: faceAnalysis.id,
                        calculatedAt: faceAnalysis.analyzedAt,
                        summary: `상태: ${faceAnalysis.status}`,
                        result: faceAnalysis.result,
                        errorMessage: faceAnalysis.errorMessage
                    }
                }
                break
            case 'palm':
                const palmAnalysis = await prisma.palmAnalysis.findUnique({
                    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } }
                })
                if (palmAnalysis) {
                    historyItem = {
                        id: palmAnalysis.id,
                        calculatedAt: palmAnalysis.analyzedAt,
                        summary: `${palmAnalysis.hand} 손 분석 - 상태: ${palmAnalysis.status}`,
                        result: palmAnalysis.result,
                        errorMessage: palmAnalysis.errorMessage
                    }
                }
                break
            case 'mbti':
                const mbtiAnalysis = await prisma.mbtiAnalysis.findUnique({
                    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } }
                })
                if (mbtiAnalysis) {
                    historyItem = {
                        id: mbtiAnalysis.id,
                        calculatedAt: mbtiAnalysis.calculatedAt,
                        summary: `MBTI: ${mbtiAnalysis.mbtiType}`,
                        result: {
                            mbtiType: mbtiAnalysis.mbtiType,
                            percentages: mbtiAnalysis.percentages,
                            scores: mbtiAnalysis.scores
                        }
                    }
                }
                break
            case 'vark':
                const varkAnalysis = await prisma.varkAnalysis.findUnique({
                    where: { studentId }
                })
                if (varkAnalysis) {
                    historyItem = {
                        id: varkAnalysis.id,
                        calculatedAt: varkAnalysis.calculatedAt,
                        summary: `VARK: ${varkAnalysis.varkType}`,
                        result: {
                            varkType: varkAnalysis.varkType,
                            percentages: varkAnalysis.percentages,
                            scores: varkAnalysis.scores
                        }
                    }
                }
                break
            case 'name':
                const nameAnalysis = await prisma.nameAnalysis.findUnique({
                    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } }
                })
                if (nameAnalysis) {
                    historyItem = {
                        id: nameAnalysis.id,
                        calculatedAt: nameAnalysis.calculatedAt,
                        summary: `이름풀이 - ${nameAnalysis.interpretation?.slice(0, 50) || '분석 완료'}...`,
                        result: nameAnalysis.result,
                        interpretation: nameAnalysis.interpretation
                    }
                }
                break
            case 'zodiac':
                const zodiacAnalysis = await prisma.zodiacAnalysis.findUnique({
                    where: { studentId }
                })
                if (zodiacAnalysis) {
                    historyItem = {
                        id: zodiacAnalysis.id,
                        calculatedAt: zodiacAnalysis.calculatedAt,
                        summary: `별자리: ${zodiacAnalysis.zodiacName}`,
                        result: {
                            zodiacSign: zodiacAnalysis.zodiacSign,
                            zodiacName: zodiacAnalysis.zodiacName,
                            element: zodiacAnalysis.element,
                            traits: zodiacAnalysis.traits
                        }
                    }
                }
                break
        }

        return ok({
            history: historyItem ? [historyItem] : [],
            note: historyItem
                ? "현재 스키마에서는 최신 분석 결과 1개만 표시됩니다. 이력 기능은 향후 개선 예정입니다."
                : "분석 이력이 없습니다."
        })
    } catch (error) {
        console.error(`Failed to fetch ${type} analysis history:`, error)
        return fail(`${type} 분석 이력 조회 중 오류가 발생했습니다.`)
    }
}
