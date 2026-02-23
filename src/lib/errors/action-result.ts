/**
 * Server Action 표준 반환 타입
 *
 * 모든 Server Action은 ActionResult<T> 또는 ActionVoidResult를 반환하여
 * 일관된 성공/실패 처리를 보장합니다.
 *
 * @example
 * // 데이터 반환
 * return ok(data)
 *
 * // 데이터 없는 성공 (삭제, 상태 변경 등)
 * return okVoid()
 *
 * // 실패
 * return fail("에러 메시지")
 *
 * // 필드 검증 실패
 * return fieldError({ email: ["이메일 형식이 잘못되었습니다"] })
 */

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type ActionSuccess<T> = {
  success: true
  data: T
}

export type ActionVoidSuccess = {
  success: true
}

export type ActionFailure = {
  success: false
  error: string
  code?: string
}

export type ActionFieldError = {
  success: false
  error?: string
  fieldErrors: Record<string, string[]>
}

/**
 * Server Action 표준 반환 타입 (데이터 포함)
 *
 * 기존 패턴과 호환:
 * - { success: true, data: T }
 * - { success: false, error: string }
 * - { success: false, fieldErrors: Record<string, string[]> }
 */
export type ActionResult<T> =
  | ActionSuccess<T>
  | ActionFailure
  | ActionFieldError

/**
 * Server Action 표준 반환 타입 (데이터 없음)
 *
 * 삭제, 상태 변경 등 반환 데이터가 없는 액션용
 * 기존 { success: true } 패턴과 정확히 호환
 */
export type ActionVoidResult =
  | ActionVoidSuccess
  | ActionFailure
  | ActionFieldError

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

/** 데이터 포함 성공 결과 생성 */
export function ok<T>(data: T): ActionSuccess<T> {
  return { success: true, data }
}

/** 데이터 없는 성공 결과 생성 */
export function okVoid(): ActionVoidSuccess {
  return { success: true }
}

/** 실패 결과 생성 */
export function fail(error: string, code?: string): ActionFailure {
  return code
    ? { success: false, error, code }
    : { success: false, error }
}

/** 필드 검증 실패 결과 생성 */
export function fieldError(
  fieldErrors: Record<string, string[]>,
  error?: string
): ActionFieldError {
  return error
    ? { success: false, error, fieldErrors }
    : { success: false, fieldErrors }
}

// ---------------------------------------------------------------------------
// 타입 가드
// ---------------------------------------------------------------------------

/** 성공 여부 확인 (타입 narrowing) */
export function isOk<T>(
  result: ActionResult<T> | ActionVoidResult
): result is ActionSuccess<T> | ActionVoidSuccess {
  return result.success === true
}

/** 필드 에러 여부 확인 */
export function isFieldError(
  result: ActionResult<unknown> | ActionVoidResult
): result is ActionFieldError {
  return !result.success && "fieldErrors" in result
}
