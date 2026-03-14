// 기존 SSE용 분석 완료 이벤트 (콜론 구분자 — NotificationProvider 호환 유지)
export type AnalysisCompleteEvent = {
  type: 'analysis:complete';
  analysisType: 'saju' | 'mbti' | 'vark' | 'face' | 'palm' | 'name' | 'zodiac';
  subjectType: 'STUDENT' | 'TEACHER';
  subjectId: string;
  subjectName: string;
  timestamp: string;
};

// Agent 이벤트 맵
export type AgentEventMap = {
  'student.created': { studentId: string; teacherId: string };
  'student.updated': { studentId: string; fields: string[] };
  'grade.uploaded': { studentId: string; scanId: string; imageUrl: string };
  'grade.confirmed': { studentId: string; gradeHistoryId: string };
  'counseling.scheduled': { reservationId: string; studentId: string; scheduledAt: string };
  'counseling.started': { reservationId: string };
  'counseling.completed': { sessionId: string; reservationId: string };
  'analysis.completed': { studentId: string; analysisType: string; subjectType: string; subjectId: string; subjectName: string; timestamp: string };
  'profile.updated': { studentId: string; completedAnalyses: string[] };
  'report.generated': { studentId: string; reportId: string; reportType: string };
  'mbti.submitted': { studentId: string; resultId: string };
  'vark.submitted': { studentId: string; resultId: string };
  'agent.execution.completed': { agentType: string; executionId: string; status: string };
};

export type AgentEventName = keyof AgentEventMap;

// 기존 SSE용 타입 (하위 호환 — 콜론 구분자 유지)
export type ServerEvent = AnalysisCompleteEvent;
