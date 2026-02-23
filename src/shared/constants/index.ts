export const PACKAGE_NAME = "@/shared";

/** 분석 유형 목록 */
export const ANALYSIS_TYPES = [
  "saju",
  "face",
  "palm",
  "mbti",
  "vark",
  "name",
  "zodiac",
] as const;

/** 분석 유형 한국어 라벨 */
export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  saju: "사주",
  face: "관상",
  palm: "손금",
  mbti: "MBTI",
  vark: "VARK",
  name: "성명학",
  zodiac: "띠/별자리",
};

/** 역할 목록 */
export const ROLES = [
  "DIRECTOR",
  "TEAM_LEADER",
  "MANAGER",
  "TEACHER",
] as const;

/** 역할 한국어 라벨 */
export const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: "원장",
  TEAM_LEADER: "팀장",
  MANAGER: "매니저",
  TEACHER: "교사",
};

/** 상담 유형 한국어 라벨 */
export const COUNSELING_TYPE_LABELS: Record<string, string> = {
  ACADEMIC: "학업",
  CAREER: "진로",
  PSYCHOLOGICAL: "심리",
  BEHAVIORAL: "행동",
};

/** 페이지네이션 기본값 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
