import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { imageStorage } from '@/lib/storage/image-storage'

/**
 * 스크린샷 업로드 API Route
 *
 * 클라이언트에서 직접 S3에 접근할 수 없으므로
 * 서버 사이드에서 업로드를 처리합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifySession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    const filename = `screenshots/issue-${Date.now()}-${file.name}`
    const result = await imageStorage.uploadImage(file, filename)

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Screenshot upload failed:', error)
    const message = error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
