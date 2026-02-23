// 타입
export type {
  Assignment,
  DetailedAssignment,
  AutoAssignmentOptions,
  AssignmentSummary,
  LoadStats,
  CompatibilityScore,
  CompatibilityBreakdown,
  FairnessMetrics,
  TeamComposition,
  TeamCompositionAnalysis,
  MBTIDistribution,
  LearningStyleDistribution,
  SajuElementsDistribution,
  ExpertiseCoverage,
  RoleDistribution,
  DiversityScore,
  Recommendation,
  TeacherAnalysisData,
  StudentAnalysisData,
  MbtiPercentages,
  SajuResult,
  NameResult,
  TeacherTeamData,
} from "./types"

// 공정성 메트릭
export {
  calculateFairnessMetrics,
  calculateDisparityIndex,
  calculateABROCA,
  calculateDistributionBalance,
} from "./fairness-metrics"

// 팀 구성 분석
export {
  analyzeTeamComposition,
  calculateShannonDiversity,
  calculateDiversityScore,
  getTeamRecommendations,
} from "./team-composition"

// 자동 배정 알고리즘
export {
  generateAutoAssignment,
  calculateLoadStats,
  summarizeAssignments,
} from "./auto-assignment"

export type {
  TeacherCandidate,
  StudentCandidate,
  CompatibilityScoreFn,
} from "./auto-assignment"

export * from "./repositories/index"
