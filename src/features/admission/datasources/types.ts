/**
 * 공공데이터 소스 어댑터 시스템
 *
 * 확장 가능한 구조: 새 API를 추가하려면 BaseDataSource를 상속하고
 * DataSourceRegistry에 등록하면 됩니다.
 */

// === 데이터 소스 식별자 ===

export type DataSourceType =
  | 'data_go_kr_admission'    // 전국대학별입학정원정보
  | 'data_go_kr_major'        // 대학별 학과정보
  | 'data_go_kr_student'      // 대학정보공시 학생현황 (경쟁률)
  | 'data_go_kr_basic'        // 대학알리미 기본정보
  | 'career_net'              // 커리어넷 대학학과정보
  | 'perplexity_ai'           // Perplexity AI 웹 검색

// === 수집 결과 공통 타입 ===

export type FetchResult<T> = {
  success: boolean
  data: T | null
  totalCount: number
  source: DataSourceType
  error?: string
  rawResponse?: unknown
}

// === 대학 기본 정보 (공공 API 공통) ===

export type PublicUniversityInfo = {
  schoolName: string          // 학교명
  schoolType: string          // 학교구분 (대학, 전문대학 등)
  establishType: string       // 설립유형 (국립, 사립 등)
  region: string              // 지역 (시도)
  address?: string            // 주소
  website?: string            // 홈페이지
  schoolCode?: string         // 학교코드
}

// === 학과 정보 (공공 API) ===

export type PublicMajorInfo = {
  schoolName: string
  majorName: string           // 학과명
  collegeName?: string        // 단과대학명
  department?: string         // 계열 (7대 계열)
  degreeType?: string         // 학위과정명
  studyYears?: number         // 수업연한
  admissionQuota?: number     // 입학정원수
  curriculum?: string         // 교육과정
  relatedJobs?: string        // 관련직업명
}

// === 입학정원 정보 (표준데이터) ===

export type PublicAdmissionQuota = {
  referenceDate: string       // 기준년도
  schoolType: string          // 학교구분
  regionCode: string          // 시도코드
  schoolName: string          // 학교명
  majorField: string          // 대계열
  subField?: string           // 소계열
  dayNight: string            // 주야구분
  admissionQuota: number      // 입학정원
}

// === 학생 현황 (경쟁률 등) ===

export type PublicStudentStats = {
  schoolName: string
  schoolType: string
  establishType: string
  year: number                // 공시년도
  competitionRate?: number    // 정원내 신입생 경쟁률
  enrollmentRate?: number     // 충원율
  dropoutRate?: number        // 중도탈락률
  foreignStudents?: number    // 외국인 학생수
}

// === 데이터 소스 설정 ===

export type DataSourceConfig = {
  type: DataSourceType
  name: string                // 표시명
  description: string
  baseUrl: string
  apiKey?: string             // 환경변수 키 이름
  enabled: boolean
  rateLimit: number           // 일일 호출 제한
}

// === 베이스 어댑터 인터페이스 ===

export interface BaseDataSource<T> {
  readonly type: DataSourceType
  readonly name: string

  /** API 연결 상태 확인 */
  testConnection(): Promise<{ connected: boolean; error?: string }>

  /** 대학명으로 검색 */
  searchByUniversity(universityName: string, options?: {
    year?: number
    pageNo?: number
    numOfRows?: number
  }): Promise<FetchResult<T[]>>

  /** 전체 목록 조회 (페이지네이션) */
  fetchAll(options?: {
    pageNo?: number
    numOfRows?: number
    year?: number
  }): Promise<FetchResult<T[]>>
}

// === 레지스트리 ===

export type DataSourceRegistry = Map<DataSourceType, BaseDataSource<unknown>>

// === 공공데이터포털 공통 응답 ===

export type DataGoKrResponse<T> = {
  response: {
    header: {
      resultCode: string
      resultMsg: string
    }
    body?: {
      items?: T[] | { item: T[] | T }
      totalCount?: number
      pageNo?: number
      numOfRows?: number
    }
  }
}
