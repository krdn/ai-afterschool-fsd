'use server';

import { db as prisma } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GradeType } from '@/lib/db';
import { getCurrentTeacher } from "@/lib/dal";
import { okVoid, fail, type ActionVoidResult } from "@/lib/errors/action-result";
import { logger } from "@/lib/logger";

// 성적 입력 데이터 검증 스키마
const GradeSchema = z.object({
    studentId: z.string(),
    subject: z.string().min(1, "과목명을 입력해주세요."),
    score: z.coerce.number().min(0).max(100, "0~100 사이의 점수를 입력해주세요."),
    gradeType: z.nativeEnum(GradeType),
    testDate: z.coerce.date(),
    academicYear: z.coerce.number().int().min(2000).default(new Date().getFullYear()),
    semester: z.coerce.number().int().min(1).max(2).default(1),
    notes: z.string().optional(),
});

/**
 * 성적 추가
 */
export async function addGrade(prevState: unknown, formData: FormData) {
    try {
        const teacher = await getCurrentTeacher();

        const rawData = {
            studentId: formData.get('studentId'),
            subject: formData.get('subject'),
            score: formData.get('score'),
            gradeType: formData.get('gradeType'),
            testDate: formData.get('testDate'),
            academicYear: formData.get('academicYear') || new Date().getFullYear(),
            semester: formData.get('semester') || 1,
            notes: formData.get('notes'),
        };

        const validatedData = GradeSchema.parse(rawData);

        await prisma.gradeHistory.create({
            data: {
                ...validatedData,
                teacherId: teacher.id,
                maxScore: 100,
                normalizedScore: validatedData.score, // 100점 만점 기준이므로 원점수
            },
        });

        revalidatePath(`/students/${validatedData.studentId}`);
        return { success: true, message: "성적이 등록되었습니다." };
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            "digest" in error &&
            typeof (error as { digest?: string }).digest === "string" &&
            (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
        ) {
            throw error;
        }
        logger.error({ err: error }, 'Failed to add grade');
        return { success: false, message: "성적 등록 중 오류가 발생했습니다." };
    }
}

/**
 * 특정 학생의 전체 성적 조회
 */
export async function getGrades(studentId: string) {
    try {
        const grades = await prisma.gradeHistory.findMany({
            where: { studentId },
            orderBy: { testDate: 'desc' }, // 최신순
        });
        return grades;
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch grades');
        return [];
    }
}

/**
 * 성적 삭제
 */
export async function deleteGrade(gradeId: string, studentId: string): Promise<ActionVoidResult> {
    try {
        await prisma.gradeHistory.delete({
            where: { id: gradeId }
        });
        revalidatePath(`/students/${studentId}`);
        return okVoid();
    } catch {
        return fail("삭제 실패");
    }
}
