/**
 * GET /api/chat/mentions/preview
 *
 * 멘션 칩 프리뷰 API — 칩 클릭 시 Popover에 표시할 엔티티 요약 정보 반환
 * RBAC 적용: DIRECTOR는 전체 조회, 그 외 역할은 자신의 팀 소속 엔티티만 반환
 *
 * Query params:
 *   - type: student | teacher | team
 *   - id: 엔티티 ID
 *
 * Response: { name: string, sublabel: string, summary: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';

/** 역할 한국어 매핑 */
const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: '원장',
  TEAM_LEADER: '팀장',
  MANAGER: '매니저',
  TEACHER: '교사',
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. 인증 확인 — 미인증 시 verifySession이 redirect() throw
  const session = await verifySession();

  // 2. 쿼리 파라미터 검증
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'type과 id 파라미터가 필요합니다' }, { status: 400 });
  }

  if (!['student', 'teacher', 'team'].includes(type)) {
    return NextResponse.json(
      { error: '유효하지 않은 type입니다. student | teacher | team 중 하나여야 합니다' },
      { status: 400 }
    );
  }

  // 3. 타입별 분기 처리
  if (type === 'student') {
    const student = await db.student.findFirst({
      where: {
        id,
        ...(session.role !== 'DIRECTOR' ? { teamId: session.teamId } : {}),
      },
      select: {
        name: true,
        grade: true,
        school: true,
        personalitySummary: { select: { coreTraits: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: student.name,
      sublabel: `${student.grade}학년 · ${student.school}`,
      summary: student.personalitySummary?.coreTraits ?? null,
    });
  }

  if (type === 'teacher') {
    const teacher = await db.teacher.findFirst({
      where: {
        id,
        ...(session.role !== 'DIRECTOR' ? { teamId: session.teamId } : {}),
      },
      select: {
        name: true,
        role: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // MBTI 분석 조회 (별도 쿼리)
    const mbti = await db.mbtiAnalysis.findUnique({
      where: {
        subjectType_subjectId: {
          subjectType: 'TEACHER',
          subjectId: id,
        },
      },
      select: { mbtiType: true, interpretation: true },
    });

    const roleLabel = ROLE_LABELS[teacher.role] ?? teacher.role;
    const summary = mbti
      ? `${mbti.mbtiType}${mbti.interpretation ? ` — ${mbti.interpretation.slice(0, 100)}` : ''}`
      : null;

    return NextResponse.json({
      name: teacher.name,
      sublabel: roleLabel,
      summary,
    });
  }

  if (type === 'team') {
    // RBAC: DIRECTOR가 아니면 자기 팀만 조회 가능
    if (session.role !== 'DIRECTOR' && id !== session.teamId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const team = await db.team.findUnique({
      where: { id },
      select: {
        name: true,
        _count: { select: { students: true, teachers: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: team.name,
      sublabel: `학생 ${team._count.students}명 · 교사 ${team._count.teachers}명`,
      summary: null,
    });
  }

  // 도달하지 않아야 하는 경로 (타입 검증에서 걸러짐)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
