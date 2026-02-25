/**
 * 빌드/런타임 환경변수 검증
 *
 * NEXT_PUBLIC_ 변수는 빌드 시점에 인라인되므로,
 * 누락되면 운영에서 undefined로 하드코딩되어 런타임 에러 발생.
 * 이 모듈을 instrumentation.ts에서 호출하여 서버 시작 시 조기 검증.
 */

type EnvRule = {
  name: string
  required: boolean
  /** true면 누락 시 경고만. false(기본)면 에러로 처리 */
  warnOnly?: boolean
}

// 필수 환경변수 목록
// required: true → 없으면 서버 시작 실패
// warnOnly: true → 없으면 경고만 (선택적 기능)
const envRules: EnvRule[] = [
  // 핵심 설정
  { name: "DATABASE_URL", required: true },
  { name: "SESSION_SECRET", required: true },

  // Cloudinary (이미지 업로드)
  { name: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", required: false, warnOnly: true },
  { name: "NEXT_PUBLIC_CLOUDINARY_API_KEY", required: false, warnOnly: true },
  { name: "CLOUDINARY_API_KEY", required: false, warnOnly: true },
  { name: "CLOUDINARY_API_SECRET", required: false, warnOnly: true },

  // 앱 URL
  { name: "NEXT_PUBLIC_APP_URL", required: true },
]

export function checkEnv(): void {
  const missing: string[] = []
  const warnings: string[] = []

  for (const rule of envRules) {
    const value = process.env[rule.name]
    if (!value) {
      if (rule.warnOnly) {
        warnings.push(rule.name)
      } else if (rule.required) {
        missing.push(rule.name)
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[env-check] ⚠ 선택적 환경변수 미설정 (관련 기능 비활성화): ${warnings.join(", ")}`
    )
  }

  if (missing.length > 0) {
    const message = `[env-check] ✗ 필수 환경변수 누락: ${missing.join(", ")}\n` +
      `.env.example을 참고하여 설정해주세요.`
    console.error(message)
    // 운영에서만 에러로 처리 (개발 환경에서는 경고만)
    if (process.env.NODE_ENV === "production") {
      throw new Error(message)
    }
  }
}
