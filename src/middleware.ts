import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { decrypt } from '@/lib/session'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const protectedRoutes = ['/students', '/dashboard', '/teachers', '/matching', '/analytics', '/counseling', '/teams', '/satisfaction', '/issues', '/chat', '/grades']
const authRoutes = ['/auth/login', '/auth/register', '/auth/reset-password']
const adminRoutes = ['/admin']

export async function middleware(req: NextRequest) {
  // i18n 미들웨어를 먼저 실행하여 locale 처리
  const intlResponse = intlMiddleware(req)

  // locale prefix를 제거하여 실제 경로 추출
  const pathname = req.nextUrl.pathname
  const pathnameWithoutLocale = pathname.replace(
    new RegExp(`^/(${routing.locales.join('|')})`),
    ''
  ) || '/'

  // Generate or extract request ID for tracing
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID()

  const sessionCookie = req.cookies.get('session')?.value
  const session = await decrypt(sessionCookie)

  // 쿠키는 존재하지만 복호화(jwtVerify)에 실패하여 session이 null로 반환된 경우 (ex: 운영 서버 재배포로 Secret Key 환경 변경)
  const isInvalidSession = sessionCookie && !session;

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathnameWithoutLocale.startsWith(route))
  const isAdminRoute = adminRoutes.some((route) => pathnameWithoutLocale.startsWith(route))

  // locale prefix 추출 (있는 경우)
  const localeMatch = pathname.match(new RegExp(`^/(${routing.locales.join('|')})`))
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : ''

  // Redirect /dashboard to /students
  if (pathnameWithoutLocale === '/dashboard') {
    const response = NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
    if (isInvalidSession) response.cookies.delete('session')
    return response
  }

  // Check admin access
  if (isAdminRoute && session?.role !== 'DIRECTOR') {
    const response = NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
    if (isInvalidSession) response.cookies.delete('session')
    return response
  }

  if (isProtectedRoute && !session?.userId) {
    const loginUrl = new URL(`${localePrefix}/auth/login`, req.nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathnameWithoutLocale)
    const response = NextResponse.redirect(loginUrl)
    if (isInvalidSession) response.cookies.delete('session') // 오염된 쿠키 강제 삭제 지시
    return response
  }

  if (isAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
  }

  // Attach request ID to response headers for distributed tracing
  intlResponse.headers.set('x-request-id', requestId)

  if (isInvalidSession) {
    intlResponse.cookies.delete('session') // 보호되지 않은 라우트(ex: 랜딩 페이지)로 갈 때도 오염된 쿠키는 삭제 처리
  }

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|.*\\..*).*)',
  ],
}
