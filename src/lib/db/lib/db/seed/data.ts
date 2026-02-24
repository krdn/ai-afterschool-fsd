/**
 * 시드 데이터 정의 (순수 데이터, DB 의존성 없음)
 *
 * 운영 DB(2026-02-14)에서 추출한 데모/개발용 시드 데이터입니다.
 * 비밀번호는 평문으로 정의하고 runSeed 실행 시 해시됩니다.
 * API 키(apiKeyEncrypted)는 포함하지 않습니다.
 */

import type { Role, ParentRelation } from '@/lib/db'

// ---------------------------------------------------------------------------
// 팀
// ---------------------------------------------------------------------------

export const SEED_TEAMS = [
  { name: "중등부" },
  { name: "고등부" },
] as const

// ---------------------------------------------------------------------------
// 선생님
// ---------------------------------------------------------------------------

export type SeedTeacher = {
  email: string
  name: string
  password: string
  phone: string | null
  role: Role
  teamName: string | null
  birthDate: string | null
  birthTimeHour: number | null
  birthTimeMinute: number | null
  nameHanja: unknown | null
  /** 로컬 이미지 파일 경로 (시드 실행 시 Cloudinary 업로드) */
  imagePath: string | null
}

export const SEED_TEACHERS: SeedTeacher[] = [
  // 원장 (팀 미배정)
  {
    email: "admin@afterschool.com",
    name: "관리자",
    password: "admin1234",
    phone: null,
    role: "DIRECTOR",
    teamName: null,
    birthDate: null,
    birthTimeHour: null,
    birthTimeMinute: null,
    nameHanja: null,
    imagePath: null,
  },
  // ── 중등부 선생님 ──
  {
    email: "kimkyungmin@afterschool.com",
    name: "김경민",
    password: "teacher1234",
    phone: "010-3100-1001",
    role: "TEAM_LEADER",
    teamName: "중등부",
    birthDate: "1983-04-12",
    birthTimeHour: 8,
    birthTimeMinute: 30,
    nameHanja: [{ syllable: "김", hanja: "金" }, { syllable: "경", hanja: "景" }, { syllable: "민", hanja: "民" }],
    imagePath: "docs/images/teachers/김경민.jpg",
  },
  {
    email: "kimminjun@afterschool.com",
    name: "김민준",
    password: "teacher1234",
    phone: "010-3100-1002",
    role: "TEACHER",
    teamName: "중등부",
    birthDate: "1986-09-23",
    birthTimeHour: 14,
    birthTimeMinute: 15,
    nameHanja: [{ syllable: "김", hanja: "金" }, { syllable: "민", hanja: "民" }, { syllable: "준", hanja: "俊" }],
    imagePath: "docs/images/teachers/김민준.jpg",
  },
  {
    email: "noyuna@afterschool.com",
    name: "노윤아",
    password: "teacher1234",
    phone: "010-3100-1003",
    role: "TEACHER",
    teamName: "중등부",
    birthDate: "1988-01-07",
    birthTimeHour: 6,
    birthTimeMinute: 45,
    nameHanja: [{ syllable: "노", hanja: "盧" }, { syllable: "윤", hanja: "允" }, { syllable: "아", hanja: "雅" }],
    imagePath: "docs/images/teachers/노윤아.jpg",
  },
  // ── 고등부 선생님 ──
  {
    email: "sonseokgu@afterschool.com",
    name: "손석구",
    password: "teacher1234",
    phone: "010-3100-1004",
    role: "TEAM_LEADER",
    teamName: "고등부",
    birthDate: "1981-11-15",
    birthTimeHour: 22,
    birthTimeMinute: 10,
    nameHanja: [{ syllable: "손", hanja: "孫" }, { syllable: "석", hanja: "碩" }, { syllable: "구", hanja: "求" }],
    imagePath: "docs/images/teachers/손석구.jpg",
  },
  {
    email: "wangjihyun@afterschool.com",
    name: "왕지현",
    password: "teacher1234",
    phone: "010-3100-1005",
    role: "TEACHER",
    teamName: "고등부",
    birthDate: "1985-06-30",
    birthTimeHour: 11,
    birthTimeMinute: 0,
    nameHanja: [{ syllable: "왕", hanja: "王" }, { syllable: "지", hanja: "智" }, { syllable: "현", hanja: "賢" }],
    imagePath: "docs/images/teachers/왕지현.jpg",
  },
  {
    email: "jangdoyun@afterschool.com",
    name: "장도윤",
    password: "teacher1234",
    phone: "010-3100-1006",
    role: "TEACHER",
    teamName: "고등부",
    birthDate: "1990-03-18",
    birthTimeHour: 16,
    birthTimeMinute: 50,
    nameHanja: [{ syllable: "장", hanja: "張" }, { syllable: "도", hanja: "道" }, { syllable: "윤", hanja: "潤" }],
    imagePath: "docs/images/teachers/장도윤.jpg",
  },
  {
    email: "jungwoojin@afterschool.com",
    name: "정우진",
    password: "teacher1234",
    phone: "010-3100-1007",
    role: "MANAGER",
    teamName: "고등부",
    birthDate: "1987-12-05",
    birthTimeHour: 3,
    birthTimeMinute: 20,
    nameHanja: [{ syllable: "정", hanja: "鄭" }, { syllable: "우", hanja: "祐" }, { syllable: "진", hanja: "鎭" }],
    imagePath: "docs/images/teachers/정우진.jpg",
  },
]

// ---------------------------------------------------------------------------
// 학생
// ---------------------------------------------------------------------------

export type SeedStudent = {
  name: string
  school: string
  grade: number
  birthDate: string
  birthTimeHour: number | null
  birthTimeMinute: number | null
  nameHanja: unknown | null
  phone: string | null
  teacherEmail: string
  teamName: string
  /** 로컬 프로필 이미지 파일 경로 (시드 실행 시 Cloudinary 업로드) */
  imagePath: string | null
}

export const SEED_STUDENTS: SeedStudent[] = [
  // ── 중등부 학생 (중학교 1~3학년, 2011~2013년생) ──
  {
    name: "김나경",
    school: "서울중학교",
    grade: 1,
    birthDate: "2012-05-20",
    birthTimeHour: 9,
    birthTimeMinute: 30,
    nameHanja: [{ syllable: "김", hanja: "金" }, { syllable: "나", hanja: null }, { syllable: "경", hanja: "景" }],
    phone: "010-5500-2001",
    teacherEmail: "kimkyungmin@afterschool.com",
    teamName: "중등부",
    imagePath: "docs/images/students/김나경.jpg",
  },
  {
    name: "윤지민",
    school: "한강중학교",
    grade: 2,
    birthDate: "2011-08-14",
    birthTimeHour: 15,
    birthTimeMinute: 10,
    nameHanja: [{ syllable: "윤", hanja: "尹" }, { syllable: "지", hanja: "智" }, { syllable: "민", hanja: "旼" }],
    phone: "010-5500-2002",
    teacherEmail: "kimminjun@afterschool.com",
    teamName: "중등부",
    imagePath: "docs/images/students/윤지민.jpg",
  },
  {
    name: "이원희",
    school: "강남중학교",
    grade: 3,
    birthDate: "2011-02-03",
    birthTimeHour: 7,
    birthTimeMinute: 45,
    nameHanja: [{ syllable: "이", hanja: "李" }, { syllable: "원", hanja: "元" }, { syllable: "희", hanja: "熙" }],
    phone: null,
    teacherEmail: "noyuna@afterschool.com",
    teamName: "중등부",
    imagePath: "docs/images/students/이원희.jpg",
  },
  // ── 고등부 학생 (고등학교 1~3학년, 2008~2010년생) ──
  {
    name: "이채영",
    school: "서울고등학교",
    grade: 1,
    birthDate: "2010-11-25",
    birthTimeHour: 12,
    birthTimeMinute: 0,
    nameHanja: [{ syllable: "이", hanja: "李" }, { syllable: "채", hanja: "彩" }, { syllable: "영", hanja: "英" }],
    phone: "010-5500-2003",
    teacherEmail: "sonseokgu@afterschool.com",
    teamName: "고등부",
    imagePath: "docs/images/students/이채영.jpg",
  },
  {
    name: "이현서",
    school: "명문고등학교",
    grade: 2,
    birthDate: "2009-07-09",
    birthTimeHour: 20,
    birthTimeMinute: 35,
    nameHanja: [{ syllable: "이", hanja: "李" }, { syllable: "현", hanja: "賢" }, { syllable: "서", hanja: "瑞" }],
    phone: "010-5500-2004",
    teacherEmail: "wangjihyun@afterschool.com",
    teamName: "고등부",
    imagePath: "docs/images/students/이현서.jpg",
  },
  {
    name: "정수민",
    school: "한빛고등학교",
    grade: 3,
    birthDate: "2008-03-30",
    birthTimeHour: 5,
    birthTimeMinute: 15,
    nameHanja: [{ syllable: "정", hanja: "鄭" }, { syllable: "수", hanja: "秀" }, { syllable: "민", hanja: "旻" }],
    phone: "010-5500-2005",
    teacherEmail: "jangdoyun@afterschool.com",
    teamName: "고등부",
    imagePath: "docs/images/students/정수민.jpg",
  },
  {
    name: "최수아",
    school: "서울고등학교",
    grade: 1,
    birthDate: "2010-09-12",
    birthTimeHour: 18,
    birthTimeMinute: 20,
    nameHanja: [{ syllable: "최", hanja: "崔" }, { syllable: "수", hanja: "秀" }, { syllable: "아", hanja: "雅" }],
    phone: null,
    teacherEmail: "jungwoojin@afterschool.com",
    teamName: "고등부",
    imagePath: "docs/images/students/최수아.jpg",
  },
]

// ---------------------------------------------------------------------------
// 학부모
// ---------------------------------------------------------------------------

export type SeedParent = {
  name: string
  phone: string
  relation: ParentRelation
  studentName: string
  isPrimary?: boolean
}

export const SEED_PARENTS: SeedParent[] = [
  // 김나경 학부모
  { name: "김태호", phone: "010-7700-3001", relation: "FATHER", studentName: "김나경" },
  { name: "박서연", phone: "010-7700-3002", relation: "MOTHER", studentName: "김나경", isPrimary: true },
  // 윤지민 학부모
  { name: "윤상철", phone: "010-7700-3003", relation: "FATHER", studentName: "윤지민" },
  { name: "한미영", phone: "010-7700-3004", relation: "MOTHER", studentName: "윤지민", isPrimary: true },
  // 이원희 학부모
  { name: "이정훈", phone: "010-7700-3005", relation: "FATHER", studentName: "이원희" },
  { name: "최윤정", phone: "010-7700-3006", relation: "MOTHER", studentName: "이원희", isPrimary: true },
  // 이채영 학부모
  { name: "이동수", phone: "010-7700-3007", relation: "FATHER", studentName: "이채영" },
  { name: "김혜진", phone: "010-7700-3008", relation: "MOTHER", studentName: "이채영", isPrimary: true },
  // 이현서 학부모
  { name: "이민재", phone: "010-7700-3009", relation: "FATHER", studentName: "이현서" },
  { name: "정은주", phone: "010-7700-3010", relation: "MOTHER", studentName: "이현서", isPrimary: true },
  // 정수민 학부모
  { name: "정대현", phone: "010-7700-3011", relation: "FATHER", studentName: "정수민" },
  { name: "오수진", phone: "010-7700-3012", relation: "MOTHER", studentName: "정수민", isPrimary: true },
  // 최수아 학부모
  { name: "최영호", phone: "010-7700-3013", relation: "FATHER", studentName: "최수아" },
  { name: "송미래", phone: "010-7700-3014", relation: "MOTHER", studentName: "최수아", isPrimary: true },
]

// ---------------------------------------------------------------------------
// Provider (Universal LLM Hub)
// ---------------------------------------------------------------------------

export type SeedProvider = {
  name: string
  providerType: string
  baseUrl: string | null
  authType: string
  capabilities: string[]
  costTier: string
  qualityTier: string
}

export const SEED_PROVIDERS: SeedProvider[] = [
  {
    name: "Ollama (로컬)",
    providerType: "ollama",
    baseUrl: "http://localhost:11434",
    authType: "none",
    capabilities: ["text", "vision"],
    costTier: "free",
    qualityTier: "medium",
  },
  {
    name: "Anthropic",
    providerType: "anthropic",
    baseUrl: null,
    authType: "api_key",
    capabilities: ["text", "vision", "tools"],
    costTier: "premium",
    qualityTier: "high",
  },
  {
    name: "OpenAI",
    providerType: "openai",
    baseUrl: null,
    authType: "api_key",
    capabilities: ["text", "vision", "tools"],
    costTier: "premium",
    qualityTier: "high",
  },
  {
    name: "Google AI",
    providerType: "google",
    baseUrl: null,
    authType: "api_key",
    capabilities: ["text", "vision", "tools"],
    costTier: "standard",
    qualityTier: "high",
  },
  {
    name: "DeepSeek",
    providerType: "deepseek",
    baseUrl: "https://api.deepseek.com",
    authType: "api_key",
    capabilities: ["text"],
    costTier: "budget",
    qualityTier: "medium",
  },
  {
    name: "Mistral AI",
    providerType: "mistral",
    baseUrl: null,
    authType: "api_key",
    capabilities: ["text", "tools"],
    costTier: "standard",
    qualityTier: "medium",
  },
  {
    name: "xAI (Grok)",
    providerType: "xai",
    baseUrl: "https://api.x.ai",
    authType: "api_key",
    capabilities: ["text"],
    costTier: "standard",
    qualityTier: "medium",
  },
]
