import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import type { IssueStatus, Prisma } from '@/lib/db'

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET

/**
 * Bearer 토큰 기반 내부 API 인증
 * INTERNAL_API_SECRET 미설정 시 모든 요청 거부 (fail-closed)
 */
function validateAuth(request: NextRequest): boolean {
  if (!INTERNAL_API_SECRET) return false

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7)
  return token === INTERNAL_API_SECRET
}

/**
 * POST /api/internal/issues/[id]/events
 *
 * 파이프라인에서 이슈 상태를 업데이트하는 내부 API
 * INTERNAL_API_SECRET으로 인증
 *
 * Body:
 *   eventType: string (auto_fix_started, auto_fix_completed, auto_fix_failed, pr_created, merged_and_deployed)
 *   metadata?: object
 *   status?: IssueStatus (상태 변경 시)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { eventType, metadata, status } = body as {
      eventType: string
      metadata?: Record<string, unknown>
      status?: IssueStatus
    }

    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 })
    }

    // 이슈 존재 확인
    const issue = await db.issue.findUnique({ where: { id } })
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // 트랜잭션: 이벤트 기록 + 상태 업데이트 (있는 경우)
    await db.$transaction(async (tx) => {
      await tx.issueEvent.create({
        data: {
          issueId: id,
          eventType,
          performedBy: issue.createdBy,
          metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      })

      if (status) {
        await tx.issue.update({
          where: { id },
          data: {
            status,
            ...(status === 'CLOSED' && { closedAt: new Date() }),
          },
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Internal event API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
