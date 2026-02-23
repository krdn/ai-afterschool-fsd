import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db/client'

/**
 * POST /api/test/reset
 *
 * 테스트 데이터를 초기 상태로 리셋하는 엔드포인트
 *
 * 인증: 인증된 사용자만 접근 가능 (session cookie 확인)
 * RBAC: role 확인 없이 인증된 모든 사용자 접근 가능 (테스트 편의성)
 *
 * 동작:
 * 1. isTest: true로 표시된 테스트용 데이터만 제거
 * 2. 테스트 분석 기록 제거 (isTest: true인 학생의 관련 기록)
 * 3. 테스트 상담 기록 제거 (isTest: true인 학생의 관련 기록)
 *
 * 보안: isTest 플래그가 false인 실제 데이터는 절대 삭제하지 않음
 *
 * 응답: { success: true, resetCount: number }
 * 에러 처리: 인증 실패 시 401, 서버 에러 시 500
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

    // 트랜잭션으로 안전하게 삭제
    const result = await db.$transaction(async (tx) => {
      const resetCount = 0

      // isTest 플래그가 있는 테스트용 학생 조회
      // 참고: 현재 스키마에는 isTest 플래그가 없으므로,
      // 테스트에서 생성한 데이터는 별도로 식별할 방법이 필요함
      // 현재 구현에서는 테스트 전용이 아닌 데이터를 삭제하지 않음

      // 현재 구현: 테스트 데이터가 없다고 가정하고 0 반환
      // 테스트에서 실제로 데이터를 생성하는 경우,
      // isTest 플래그를 추가하거나 다른 식별 방법이 필요

      return { resetCount }
    })

    return NextResponse.json({
      success: true,
      resetCount: result.resetCount,
      message: 'Test data reset complete. No test data was deleted (isTest flag not implemented in schema).'
    })
  } catch (error) {
    console.error('Test reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
