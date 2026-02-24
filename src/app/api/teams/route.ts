import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db/client'
import { TeamSchema } from '@/lib/validations/teams'
import { logger } from '@/lib/logger'

/**
 * GET /api/teams
 *
 * 팀 목록을 조회하는 엔드포인트
 *
 * 인증: 로그인한 사용자 (session cookie 확인)
 * RBAC:
 *   - DIRECTOR: 전체 팀 목록 반환
 *   - TEAM_LEADER: 자신이 리더인 팀만 반환
 *   - TEACHER: 자신이 속한 팀만 반환
 *
 * 응답: { teams: Array<{ id, name, leaderId, teacherCount }> }
 * 에러 처리: 인증 실패 시 401, 권한 없음 시 403
 */
export async function GET(_req: NextRequest) {
  try {
    // 인증 확인
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { role, teamId } = session

    // RBAC에 따라 팀 목록 필터링
    type TeamWithCount = {
      id: string
      name: string
      createdAt: Date
      updatedAt: Date
      _count: {
        teachers: number
        students: number
      }
    }

    let teams: TeamWithCount[]
    if (role === 'DIRECTOR') {
      // DIRECTOR: 전체 팀 목록 반환
      teams = await db.team.findMany({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              teachers: true,
              students: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      })
    } else if (role === 'TEAM_LEADER' && teamId) {
      // TEAM_LEADER: 자신이 속한 팀만 반환
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              teachers: true,
              students: true,
            },
          },
        },
      })

      teams = team ? [team] : []
    } else if (role === 'TEACHER' && teamId) {
      // TEACHER: 자신이 속한 팀만 반환
      const team = await db.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              teachers: true,
              students: true,
            },
          },
        },
      })

      teams = team ? [team] : []
    } else if (role === 'MANAGER') {
      // MANAGER: 팀이 없는 경우 빈 배열 반환
      teams = []
    } else {
      // 팀이 없는 선생님
      teams = []
    }

    // 응답 형식 변환
    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      teacherCount: team._count.teachers,
      studentCount: team._count.students,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }))

    return NextResponse.json({
      teams: formattedTeams,
      total: formattedTeams.length,
    })
  } catch (error) {
    logger.error({ err: error }, 'Teams API error')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams
 *
 * 새 팀을 생성하는 엔드포인트 (테스트용)
 *
 * 인증: 인증된 사용자
 * RBAC: DIRECTOR만 생성 가능
 */
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // RBAC: DIRECTOR만 팀 생성 가능
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Only directors can create teams' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = TeamSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }
    const { name } = parsed.data

    // 팀 생성
    const team = await db.team.create({
      data: {
        name,
      },
    })

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Team creation error')

    // Prisma unique constraint error
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Team with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
