/**
 * Server Action 표준 반환 타입
 *
 * 모든 Server Action은 ActionResult<T> 또는 ActionVoidResult를 반환하여
 * 일관된 성공/실패 처리를 보장합니다.
 */

export type ActionSuccess<T> = {
  success: true;
  data: T;
};

export type ActionVoidSuccess = {
  success: true;
};

export type ActionFailure = {
  success: false;
  error: string;
  code?: string;
};

export type ActionFieldError = {
  success: false;
  error?: string;
  fieldErrors: Record<string, string[]>;
};

export type ActionResult<T> =
  | ActionSuccess<T>
  | ActionFailure
  | ActionFieldError;

export type ActionVoidResult =
  | ActionVoidSuccess
  | ActionFailure
  | ActionFieldError;

/** 데이터 포함 성공 결과 생성 */
export function ok<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

/** 데이터 없는 성공 결과 생성 */
export function okVoid(): ActionVoidSuccess {
  return { success: true };
}

/** 실패 결과 생성 */
export function fail(error: string, code?: string): ActionFailure {
  return code ? { success: false, error, code } : { success: false, error };
}

/** 필드 검증 실패 결과 생성 */
export function fieldError(
  fieldErrors: Record<string, string[]>,
  error?: string
): ActionFieldError {
  return error
    ? { success: false, error, fieldErrors }
    : { success: false, fieldErrors };
}

/** 성공 여부 확인 (타입 narrowing) */
export function isOk<T>(
  result: ActionResult<T> | ActionVoidResult
): result is ActionSuccess<T> | ActionVoidSuccess {
  return result.success === true;
}

/** 필드 에러 여부 확인 */
export function isFieldError(
  result: ActionResult<unknown> | ActionVoidResult
): result is ActionFieldError {
  return !result.success && "fieldErrors" in result;
}
