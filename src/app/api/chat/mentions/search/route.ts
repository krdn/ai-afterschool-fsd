/**
 * GET /api/chat/mentions/search
 *
 * 멘션 자동완성 검색 API — 학생, 선생님, 학급 3가지 엔티티를 이름으로 검색
 * RBAC 필터 적용: DIRECTOR는 전체 조회, 그 외 역할은 자신의 팀 소속만 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';
import type { MentionType, MentionSearchItem, MentionSearchResponse } from '@/lib/chat/mention-types';
import type { VerifiedSession } from '@/lib/dal';
import { logger } from '@/lib/logger';

// 타입별 최대 결과 건수 (총 최대 15건)
const RESULTS_PER_TYPE = 5;

// 한국어 역할명 매핑 — user-menu.tsx의 roleLabels와 일치
const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: '원장',
  TEAM_LEADER: '팀장',
  MANAGER: '매니저',
  TEACHER: '선생님',
};

/**
 * 학생 RBAC where 조건 생성
 * - DIRECTOR: 전체 학생 검색
 * - 그 외: teamId 소속 학생만. teamId null이면 null 반환 (빈 결과 보장)
 */
function buildStudentWhere(q: string, session: VerifiedSession) {
  const base = { name: { contains: q, mode: 'insensitive' as const } };
  if (session.role === 'DIRECTOR') return base;
  if (!session.teamId) return null;
  return { ...base, teamId: session.teamId };
}

/**
 * 선생님 RBAC where 조건 생성
 * - DIRECTOR: 전체 선생님 검색
 * - 그 외: teamId 소속 선생님만. teamId null이면 null 반환 (빈 결과 보장)
 */
function buildTeacherWhere(q: string, session: VerifiedSession) {
  const base = { name: { contains: q, mode: 'insensitive' as const } };
  if (session.role === 'DIRECTOR') return base;
  if (!session.teamId) return null;
  return { ...base, teamId: session.teamId };
}

/**
 * 학급(팀) RBAC where 조건 생성
 * - DIRECTOR: 전체 팀 이름 검색
 * - 그 외: 자신의 팀 ID만 (id로 매칭). teamId null이면 null 반환 (빈 결과 보장)
 */
function buildTeamWhere(q: string, session: VerifiedSession) {
  if (session.role === 'DIRECTOR') {
    return { name: { contains: q, mode: 'insensitive' as const } };
  }
  if (!session.teamId) return null;
  return { id: session.teamId, name: { contains: q, mode: 'insensitive' as const } };
}

/**
 * GET /api/chat/mentions/search
 *
 * @param q - 검색어 (최소 1자 이상 필요)
 * @param types - 검색할 타입 (콤마 구분, 예: "student,teacher,team"). 생략 시 전체 검색
 * @returns MentionSearchResponse — { students, teachers, teams } 타입별 그룹 JSON
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. 인증: verifySession은 미인증 시 redirect()를 throw (Next.js가 처리)
    const session = await verifySession();

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = request.nextUrl;
    const q = searchParams.get('q')?.trim() ?? '';

    // 최소 2자 미만이면 DB 조회 없이 빈 응답 즉시 반환 (한국어 1자 검색은 결과가 너무 광범위)
    if (q.length < 2) {
      return NextResponse.json({ students: [], teachers: [], teams: [] } satisfies MentionSearchResponse);
    }

    // types 파라미터 파싱 (빈 배열이면 3가지 모두 검색)
    const typesParam = searchParams.get('types') ?? '';
    const validTypes: MentionType[] = ['student', 'teacher', 'team'];
    const requestedTypes: MentionType[] =
      typesParam.length > 0
        ? typesParam
            .split(',')
            .map((t) => t.trim())
            .filter((t): t is MentionType => validTypes.includes(t as MentionType))
        : validTypes;

    // 활성 검색 타입 (파싱 결과가 비면 전체 검색)
    const activeTypes: MentionType[] = requestedTypes.length > 0 ? requestedTypes : validTypes;

    // 3. RBAC where 조건 생성
    const studentWhere = buildStudentWhere(q, session);
    const teacherWhere = buildTeacherWhere(q, session);
    const teamWhere = buildTeamWhere(q, session);

    // 4. Promise.all 병렬 쿼리 — 타입별 조건부 실행
    const [studentResults, teacherResults, teamResults] = await Promise.all([
      // 학생 쿼리: 타입 포함 + where 유효할 때만 실행
      activeTypes.includes('student') && studentWhere !== null
        ? db.student.findMany({
            where: studentWhere,
            select: {
              id: true,
              name: true,
              grade: true,
              school: true,
              birthDate: true,
              images: {
                where: { type: 'profile' },
                select: { resizedUrl: true },
                take: 1,
              },
            },
            orderBy: { name: 'asc' },
            take: RESULTS_PER_TYPE,
          })
        : Promise.resolve([]),

      // 선생님 쿼리: 타입 포함 + where 유효할 때만 실행
      activeTypes.includes('teacher') && teacherWhere !== null
        ? db.teacher.findMany({
            where: teacherWhere,
            select: {
              id: true,
              name: true,
              role: true,
              profileImage: true,
              _count: { select: { students: true } },
            },
            orderBy: { name: 'asc' },
            take: RESULTS_PER_TYPE,
          })
        : Promise.resolve([]),

      // 학급(팀) 쿼리: 타입 포함 + where 유효할 때만 실행
      activeTypes.includes('team') && teamWhere !== null
        ? db.team.findMany({
            where: teamWhere,
            select: {
              id: true,
              name: true,
              _count: { select: { students: true, teachers: true } },
            },
            orderBy: { name: 'asc' },
            take: RESULTS_PER_TYPE,
          })
        : Promise.resolve([]),
    ]);

    // 5. DB 결과 → MentionSearchItem[] 변환
    const students: MentionSearchItem[] = studentResults.map((s) => ({
      id: s.id,
      type: 'student' as const,
      name: s.name,
      sublabel: `${s.grade}학년 · ${s.school} · ${s.birthDate.toISOString().slice(0, 10)}`,
      avatarUrl: s.images[0]?.resizedUrl ?? null,
    }));

    const teachers: MentionSearchItem[] = teacherResults.map((t) => ({
      id: t.id,
      type: 'teacher' as const,
      name: t.name,
      sublabel: `${ROLE_LABELS[t.role] ?? t.role} · 담당 ${t._count.students}명`,
      avatarUrl: t.profileImage ?? null,
    }));

    const teams: MentionSearchItem[] = teamResults.map((t) => ({
      id: t.id,
      type: 'team' as const,
      name: t.name,
      sublabel: `학생 ${t._count.students}명 · 교사 ${t._count.teachers}명`,
      avatarUrl: null,
    }));

    // 6. 응답
    return NextResponse.json({ students, teachers, teams } satisfies MentionSearchResponse);
  } catch (error) {
    logger.error({ err: error }, '[MentionSearch] Error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
