// Canonical source: @/lib/errors/action-result
// shared 레이어에서 접근이 필요한 경우를 위한 re-export
export {
  type ActionSuccess,
  type ActionVoidSuccess,
  type ActionFailure,
  type ActionFieldError,
  type ActionResult,
  type ActionVoidResult,
  ok,
  okVoid,
  fail,
  fieldError,
  isOk,
  isFieldError,
} from "@/lib/errors/action-result"
