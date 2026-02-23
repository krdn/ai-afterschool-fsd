import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { decrypt } from '@/lib/session'
import { routing } from '@/i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const protectedRoutes = ['/students', '/dashboard', '/teachers', '/matching', '/analytics', '/counseling', '/teams', '/satisfaction', '/issues', '/chat']
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
    return NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
  }

  // Check admin access
  if (isAdminRoute && session?.role !== 'DIRECTOR') {
    return NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
  }

  if (isProtectedRoute && !session?.userId) {
    const loginUrl = new URL(`${localePrefix}/auth/login`, req.nextUrl)
    loginUrl.searchParams.set('callbackUrl', pathnameWithoutLocale)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && session?.userId) {
    return NextResponse.redirect(new URL(`${localePrefix}/students`, req.nextUrl))
  }

  // Attach request ID to response headers for distributed tracing
  intlResponse.headers.set('x-request-id', requestId)

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|monitoring|.*\\..*).*)',
  ],
}
