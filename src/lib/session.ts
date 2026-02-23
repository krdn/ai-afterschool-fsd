import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

let _encodedKey: Uint8Array | null = null

function getEncodedKey(): Uint8Array {
  if (!_encodedKey) {
    const secretKey = process.env.SESSION_SECRET
    if (!secretKey) {
      throw new Error('SESSION_SECRET environment variable is not set')
    }
    _encodedKey = new TextEncoder().encode(secretKey)
  }
  return _encodedKey
}

export type SessionPayload = {
  userId: string
  role: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
  teamId: string | null
  expiresAt: Date
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getEncodedKey())
}

export async function decrypt(
  session: string | undefined
): Promise<SessionPayload | null> {
  if (!session) return null

  try {
    const { payload } = await jwtVerify(session, getEncodedKey(), {
      algorithms: ['HS256'],
    })
    return {
      userId: payload.userId as string,
      role: (payload.role || 'TEACHER') as SessionPayload['role'],
      teamId: (payload.teamId || null) as string | null,
      expiresAt: new Date(payload.expiresAt as string),
    }
  } catch (error) {
    console.error('Session decryption failed:', error)
    return null
  }
}

export async function createSession(
  userId: string,
  role: SessionPayload['role'] = 'TEACHER',
  teamId: string | null = null
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, teamId, expiresAt })
  const cookieStore = await cookies()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const isHttps = appUrl.startsWith('https://')

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: isHttps,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function updateSession(
  userId: string,
  role: SessionPayload['role'],
  teamId: string | null
): Promise<void> {
  // NOTE: Session update is disabled in Next.js 15
  // Cookies can only be modified in Server Actions or Route Handlers
  // Session refresh should only happen in middleware or during login
  return
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  return decrypt(session)
}
