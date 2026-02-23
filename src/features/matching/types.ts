/**
 * @/features/matching 타입 정의
 *
 * 매칭/배정 알고리즘에 사용되는 타입들입니다.
 * Prisma 의존성 없이 독립적으로 사용할 수 있습니다.
 */

// =============================================================================
// 배정 관련 타입
// =============================================================================

export interface Assignment {
  studentId: string
  teacherId: string
  score: number
}

export interface DetailedAssignment {
  studentId: string
  teacherId: string
  score: CompatibilityScore
}

export interface AutoAssignmentOptions {
  maxStudentsPerTeacher?: number
  minCompatibilityThreshold?: number
}

export interface AssignmentSummary {
  totalStudents: number
  assignedStudents: number
  averageScore: number
  minScore: number
  maxScore: number
  teacherCounts: Record<string, number>
}

export interface LoadStats {
  mean: number
  variance: number
  stdDev: number
  min: number
  max: number
  range: number
}

// =============================================================================
// 궁합 점수 타입
// =============================================================================

export interface CompatibilityScore {
  overall: number
  breakdown: CompatibilityBreakdown
  reasons: string[]
}

export interface CompatibilityBreakdown {
  mbti: number
  learningStyle: number
  saju: number
  name: number
  loadBalance: number
}

// =============================================================================
// 공정성 메트릭 타입
// =============================================================================

export interface FairnessMetrics {
  disparityIndex: number
  abroca: number
  distributionBalance: number
  recommendations: string[]
}

// =============================================================================
// 팀 구성 분석 타입
// =============================================================================

export interface TeamComposition {
  teamId: string
  teacherCount: number
  mbtiDistribution: MBTIDistribution
  learningStyleDistribution: LearningStyleDistribution
  sajuElementsDistribution: SajuElementsDistribution
  expertiseCoverage: ExpertiseCoverage
  roleDistribution: RoleDistribution
}

export interface MBTIDistribution {
  typeCounts: Record<string, number>
  mostCommon: string[]
  rarest: string[]
  axisRatios: {
    E: number
    I: number
    S: number
    N: number
    T: number
    F: number
    J: number
    P: number
  }
}

export interface LearningStyleDistribution {
  visual: number
  auditory: number
  reading: number
  kinesthetic: number
  dominant: string
}

export interface SajuElementsDistribution {
  wood: number
  fire: number
  earth: number
  metal: number
  water: number
  dominant: string
  deficient: string[]
}

export interface ExpertiseCoverage {
  subjects: Record<string, number>
  grades: Record<string, number>
  experienceLevels: {
    junior: number
    mid: number
    senior: number
  }
  weakSubjects: string[]
  weakGrades: string[]
}

export interface RoleDistribution {
  TEAM_LEADER: number
  MANAGER: number
  TEACHER: number
}

export interface DiversityScore {
  overall: number
  mbtiDiversity: number
  learningStyleDiversity: number
  sajuElementsDiversity: number
  subjectDiversity: number
  gradeDiversity: number
}

export interface Recommendation {
  id: string
  type: "diversity" | "coverage" | "balance"
  priority: "high" | "medium" | "low"
  title: string
  description: string
  evidence: string
  actionItems: string[]
}

export interface TeamCompositionAnalysis {
  composition: TeamComposition
  diversityScore: DiversityScore
  recommendations: Recommendation[]
  analyzedAt: Date
}

// =============================================================================
// 분석 데이터 입력 타입 (DB에서 받아오는 데이터 인터페이스)
// =============================================================================

export interface TeacherAnalysisData {
  mbti: MbtiPercentages | null
  saju: SajuResult | null
  name: NameResult | null
  currentLoad: number
}

export interface StudentAnalysisData {
  mbti: MbtiPercentages | null
  saju: SajuResult | null
  name: NameResult | null
}

export interface MbtiPercentages {
  E?: number
  I?: number
  S?: number
  N?: number
  T?: number
  F?: number
  J?: number
  P?: number
  visual?: number
  auditory?: number
  reading?: number
  kinesthetic?: number
  [key: string]: number | undefined
}

export interface SajuResult {
  fiveElements?: Record<string, number>
  dayMaster?: string
  [key: string]: unknown
}

export interface NameResult {
  totalScore?: number
  [key: string]: unknown
}

// =============================================================================
// 팀 분석용 선생님 데이터
// =============================================================================

export interface TeacherTeamData {
  id: string
  name: string
  role: string
  createdAt: Date
  mbtiType?: string | null
  mbtiPercentages?: MbtiPercentages | null
  sajuResult?: SajuResult | null
  studentGrades?: number[]
}
