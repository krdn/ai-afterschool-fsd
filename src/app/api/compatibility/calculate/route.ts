import { NextResponse } from "next/server"
import { z } from "zod"
import { verifySession } from "@/lib/dal"
import { analyzeCompatibility } from "@/lib/actions/matching/compatibility"

/**
 * Request body schema for compatibility calculation
 */
const CalculateCompatibilitySchema = z.object({
  teacherId: z.string().min(1, "teacherId is required"),
  studentId: z.string().min(1, "studentId is required"),
})

/**
 * POST /api/compatibility/calculate
 *
 * 선생님-학생 궁합 점수 계산 API
 *
 * Request body:
 * {
 *   "teacherId": "string",
 *   "studentId": "string"
 * }
 *
 * Response (200 OK):
 * {
 *   "success": true,
 *   "score": {
 *     "overall": 85,
 *     "breakdown": { ... },
 *     "reasons": [...]
 *   }
 * }
 */
export async function POST(request: Request) {
  // 인증 확인
  const session = await verifySession()

  // Request body 파싱
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    )
  }

  // Request body 검증
  const parsed = CalculateCompatibilitySchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid teacherId or studentId" },
      { status: 400 }
    )
  }

  const { teacherId, studentId } = parsed.data

  // 궁합 분석 실행
  try {
    const result = await analyzeCompatibility(teacherId, studentId)
    if (!result.success) {
      const errorMsg = result.error ?? "궁합 분석에 실패했습니다."
      // 404 Not Found: Teacher or Student not found
      if (errorMsg.includes("찾을 수 없어요")) {
        return NextResponse.json({ error: errorMsg }, { status: 404 })
      }
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }
    return NextResponse.json({ success: true, score: result.data.score }, { status: 200 })
  } catch (error) {
    // 500 Internal Server Error: Other errors
    const errorMessage =
      error instanceof Error ? error.message : "Failed to calculate compatibility"
    console.error("Compatibility calculation error:", error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
