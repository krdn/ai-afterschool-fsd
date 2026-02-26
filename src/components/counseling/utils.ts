// 상담 관련 공유 헬퍼 함수

/**
 * 상담 유형 한글 라벨
 */
export function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ACADEMIC: "학업",
    CAREER: "진로",
    PSYCHOLOGICAL: "심리",
    BEHAVIORAL: "행동",
  }
  return labels[type] || type
}

/**
 * 상담 유형별 배지 색상 클래스
 */
export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ACADEMIC: "bg-blue-100 text-blue-800",
    CAREER: "bg-green-100 text-green-800",
    PSYCHOLOGICAL: "bg-purple-100 text-purple-800",
    BEHAVIORAL: "bg-orange-100 text-orange-800",
  }
  return colors[type] || "bg-gray-100 text-gray-800"
}

/**
 * 학부모 관계 한글 라벨
 */
export function getParentRelationLabel(relation: string): string {
  const labels: Record<string, string> = {
    FATHER: "아버지",
    MOTHER: "어머니",
    GRANDFATHER: "조부",
    GRANDMOTHER: "조모",
    OTHER: "기타",
  }
  return labels[relation] || relation
}

/**
 * AI 요약 문서를 섹션별로 파싱
 * "---" 구분자로 분리하여 분석/시나리오/학부모 공유 3개 섹션으로 나눔
 */
export function parseAiSummary(aiSummary: string) {
  const parts = aiSummary.split(/\n---\n/)
  const clean = (text: string) => text.replace(/^## .+\n\n?/, "").trim()

  return {
    analysis: parts[0] ? clean(parts[0]) : "내용 없음",
    scenario: parts[1] ? clean(parts[1]) : "내용 없음",
    parent: parts[2] ? clean(parts[2]) : "내용 없음",
  }
}
