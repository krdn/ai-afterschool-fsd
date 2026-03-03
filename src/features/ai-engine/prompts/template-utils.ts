/**
 * 프롬프트 템플릿 변수 치환 유틸리티
 *
 * DB에 저장된 프롬프트 템플릿의 {{변수}} 를 실제 값으로 치환합니다.
 * 누락된 변수는 빈 문자열로 대체되고, 알 수 없는 변수는 그대로 유지됩니다.
 */

/**
 * 템플릿 문자열의 {{key}} 패턴을 values 맵의 값으로 치환
 *
 * @param template - {{key}} 패턴을 포함한 프롬프트 템플릿
 * @param values - key-value 맵 (값이 undefined/null이면 빈 문자열로 대체)
 * @returns 변수가 치환된 문자열
 */
export function replaceTemplateVars(
  template: string,
  values: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in values) {
      const val = values[key]
      return val != null ? String(val) : ''
    }
    // 알 수 없는 변수는 그대로 유지
    return match
  })
}
