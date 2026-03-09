/**
 * LLM 제공자 표시 관련 공통 헬퍼
 *
 * provider-card, template-selector 등에서 공유하는
 * 레이블, 스타일, 필터 유틸리티
 */

// ── Capability ──────────────────────────────────

const CAPABILITY_LABELS: Record<string, string> = {
  vision: '시각',
  function_calling: '함수 호출',
  json_mode: 'JSON',
  streaming: '스트리밍',
  tools: '도구',
  text: '텍스트',
};

/** capability 키를 한국어 라벨로 변환 */
export function getCapabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] ?? capability;
}

/** 'text'를 제거한 표시용 capability 배열 반환 */
export function filterDisplayCapabilities(caps: string[]): string[] {
  return caps.filter((c) => c !== 'text');
}

// ── Cost Tier ───────────────────────────────────

const COST_TIER_LABELS: Record<string, string> = {
  free: '무료',
  budget: '저렴',
  low: '저렴',
  standard: '중간',
  medium: '중간',
  high: '고가',
  premium: '프리미엄',
};

/** 비용 티어 한국어 라벨 */
export function getCostTierLabel(tier: string): string {
  return COST_TIER_LABELS[tier] ?? tier;
}

/** provider-card용 비용 티어 보더 스타일 */
export function getCostTierBorderStyle(tier: string): string {
  const styles: Record<string, string> = {
    free: 'text-green-600 border-green-600',
    budget: 'text-blue-600 border-blue-600',
    low: 'text-blue-600 border-blue-600',
    standard: 'text-yellow-600 border-yellow-600',
    medium: 'text-yellow-600 border-yellow-600',
    high: 'text-red-600 border-red-600',
    premium: 'text-red-600 border-red-600',
  };
  return styles[tier] ?? '';
}

/** template-selector용 비용 티어 배경 스타일 */
export function getCostTierBgStyle(tier: string): string {
  const styles: Record<string, string> = {
    free: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    budget: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    standard: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    premium: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return styles[tier] ?? 'bg-gray-100 text-gray-700';
}

// ── Quality Tier ────────────────────────────────

const QUALITY_TIER_LABELS: Record<string, string> = {
  fast: '빠름',
  standard: '균형',
  balanced: '균형',
  high: '프리미엄',
  premium: '프리미엄',
};

/** 품질 티어 한국어 라벨 */
export function getQualityTierLabel(tier: string): string {
  return QUALITY_TIER_LABELS[tier] ?? tier;
}

/** provider-card용 품질 티어 보더 스타일 */
export function getQualityTierBorderStyle(tier: string): string {
  const styles: Record<string, string> = {
    fast: 'text-blue-600 border-blue-600',
    standard: 'text-green-600 border-green-600',
    balanced: 'text-green-600 border-green-600',
    high: 'text-purple-600 border-purple-600',
    premium: 'text-purple-600 border-purple-600',
  };
  return styles[tier] ?? '';
}

/** template-selector용 품질 티어 배경 스타일 */
export function getQualityTierBgStyle(tier: string): string {
  const styles: Record<string, string> = {
    fast: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    standard: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    balanced: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    high: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };
  return styles[tier] ?? 'bg-gray-100 text-gray-700';
}

// ── Context Window ──────────────────────────────

/** 컨텍스트 윈도우 포맷팅: 4000→4K, 128000→128K, 1000000→1M */
export function formatContextWindow(n?: number | null): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
