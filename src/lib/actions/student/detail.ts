"use server";

import { db } from "@/lib/db/client";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/dal";
import type { Prisma } from '@/lib/db';
import {
    type PaginationParams,
    type PaginatedResult,
    normalizePaginationParams,
    getPrismaSkipTake,
    buildPaginatedResult,
} from "@/shared";

type StudentWithRelations = Prisma.StudentGetPayload<{
    include: { teacher: true; images: true }
}>

/**
 * 학생 목록 조회 (페이지네이션 지원)
 *
 * - pagination 파라미터가 없으면 기존처럼 전체 조회 (하위 호환)
 * - pagination 파라미터가 있으면 PaginatedResult 반환
 */
export async function getStudents(query?: string): Promise<StudentWithRelations[]>
export async function getStudents(query: string | undefined, pagination: PaginationParams): Promise<PaginatedResult<StudentWithRelations>>
export async function getStudents(query?: string, pagination?: PaginationParams) {
    const session = await verifySession();

    const where: Prisma.StudentWhereInput = {};
    if (query) {
        where.name = { contains: query, mode: 'insensitive' };
    }

    if (session.role === 'TEACHER') {
        where.teacherId = session.userId;
    }

    // 페이지네이션 파라미터가 없으면 기존 동작 유지
    if (!pagination) {
        return await db.student.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                teacher: true,
                images: true
            }
        });
    }

    // 페이지네이션 적용
    const params = normalizePaginationParams(pagination);
    const { skip, take } = getPrismaSkipTake(params);

    const [data, total] = await Promise.all([
        db.student.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                teacher: true,
                images: true
            },
            skip,
            take,
        }),
        db.student.count({ where }),
    ]);

    return buildPaginatedResult(data, total, params);
}

export async function getStudentById(id: string) {
    const session = await verifySession();

    // TEACHER 역할은 자신의 학생만 조회 가능
    if (session.role === 'TEACHER') {
        return await db.student.findFirst({
            where: { id, teacherId: session.userId },
            include: {
                parents: true,
                teacher: true,
                images: true
            }
        });
    }

    return await db.student.findUnique({
        where: { id },
        include: {
            parents: true,
            teacher: true,
            images: true
        }
    });
}

export async function deleteStudent(id: string) {
    const session = await verifySession();

    // TEACHER 역할은 자신의 학생만 삭제 가능
    if (session.role === 'TEACHER') {
        const student = await db.student.findFirst({
            where: { id, teacherId: session.userId },
            select: { id: true }
        });
        if (!student) {
            throw new Error("Forbidden: 해당 학생에 대한 권한이 없습니다");
        }
    }

    await db.student.delete({
        where: { id }
    });

    revalidatePath("/students");
}
