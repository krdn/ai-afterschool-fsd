/**
 * 성적관리 OCR 관련 타입 정의
 *
 * 성적통지표, 모의고사 성적표 등 다양한 문서에서 추출된
 * 성적 데이터의 구조를 정의합니다.
 */

// =============================================================================
// 성적통지표 OCR 추출 결과
// =============================================================================

/** 성적통지표 문서 정보 */
export interface TranscriptDocumentInfo {
  /** 학교명 */
  school: string;
  /** 학생 이름 */
  studentName: string;
  /** 학년 */
  grade: number;
  /** 학년도 */
  academicYear: number;
  /** 학기 */
  semester: number;
}

/** 성적통지표 과목별 성적 */
export interface TranscriptSubject {
  /** 과목명 */
  name: string;
  /** 원점수 */
  rawScore: number;
  /** 반 평균 */
  classAverage?: number;
  /** 표준편차 */
  standardDev?: number;
  /** 등급 */
  gradeRank?: number;
  /** 반 석차 */
  classRank?: number;
  /** 전체 학생 수 */
  totalStudents?: number;
  /** 과목 분류 (국어, 수학, 영어 등) */
  category?: string;
  /** OCR 추출 신뢰도 (0~1) */
  confidence: number;
}

/** 성적통지표 OCR 추출 결과 */
export interface TranscriptOcrResult {
  documentInfo: TranscriptDocumentInfo;
  subjects: TranscriptSubject[];
}

// =============================================================================
// 모의고사 OCR 추출 결과
// =============================================================================

/** 모의고사 시험 정보 */
export interface MockExamInfo {
  /** 시험명 (예: "2025학년도 6월 모의고사") */
  examName: string;
  /** 시험 일자 (YYYY-MM-DD) */
  examDate: string;
  /** 학생 이름 */
  studentName?: string;
}

/** 모의고사 과목별 성적 */
export interface MockExamSubject {
  /** 과목명 */
  name: string;
  /** 원점수 */
  rawScore: number;
  /** 표준점수 */
  standardScore?: number;
  /** 백분위 */
  percentile?: number;
  /** 등급 */
  gradeRank?: number;
  /** OCR 추출 신뢰도 (0~1) */
  confidence: number;
}

/** 모의고사 OCR 추출 결과 */
export interface MockExamOcrResult {
  examInfo: MockExamInfo;
  subjects: MockExamSubject[];
}

// =============================================================================
// AI 분석 결과 타입
// =============================================================================

/** 강점/약점 분석 결과 */
export interface StrengthWeaknessResult {
  /** 강점 과목 목록 */
  strengths: Array<{
    subject: string;
    reason: string;
    score: number;
  }>;
  /** 약점 과목 목록 */
  weaknesses: Array<{
    subject: string;
    reason: string;
    score: number;
    improvementTip: string;
  }>;
  /** 종합 분석 */
  summary: string;
}

/** 학습 계획 추천 결과 */
export interface StudyPlanResult {
  /** 추천 주간 학습 계획 */
  weeklyPlan: Array<{
    day: string;
    subjects: Array<{
      name: string;
      hours: number;
      focus: string;
    }>;
  }>;
  /** 우선순위 과목 */
  prioritySubjects: string[];
  /** 추천 사유 */
  rationale: string;
}

/** 목표 대비 갭 분석 결과 */
export interface GoalGapResult {
  /** 과목별 갭 분석 */
  gaps: Array<{
    subject: string;
    currentScore: number;
    targetScore: number;
    gap: number;
    achievability: 'HIGH' | 'MEDIUM' | 'LOW';
    strategy: string;
  }>;
  /** 전체 달성 가능성 */
  overallAchievability: number;
  /** 종합 조언 */
  advice: string;
}

/** 또래 비교 분석 결과 */
export interface PeerComparison {
  /** 과목별 비교 */
  subjects: Array<{
    name: string;
    studentScore: number;
    classAverage: number;
    percentile: number;
    trend: 'UP' | 'STABLE' | 'DOWN';
  }>;
  /** 전체 순위 백분위 */
  overallPercentile: number;
  /** 분석 코멘트 */
  comment: string;
}

/** 학습 습관 상관관계 분석 */
export interface StudyHabitCorrelation {
  /** 상관관계 데이터 */
  correlations: Array<{
    habit: string;
    impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    affectedSubjects: string[];
    description: string;
  }>;
  /** 개선 추천 */
  recommendations: string[];
}

/** 선생님 알림 (주의 필요 학생) */
export interface TeacherAlert {
  /** 알림 유형 */
  alertType: 'SCORE_DROP' | 'BELOW_AVERAGE' | 'IMPROVEMENT' | 'AT_RISK';
  /** 심각도 (1~5) */
  severity: number;
  /** 해당 과목 */
  subjects: string[];
  /** 알림 메시지 */
  message: string;
  /** 추천 조치 */
  suggestedAction: string;
}
