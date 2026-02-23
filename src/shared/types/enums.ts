// Prisma schema에서 추출한 enum 정의
// @/lib/db가 Prisma를 래핑하지만, 다른 패키지에서도 타입으로 사용 가능하도록 shared에 정의

export type SubjectType = "STUDENT" | "TEACHER";

export type Role = "DIRECTOR" | "TEAM_LEADER" | "MANAGER" | "TEACHER";

export type BloodType = "A" | "B" | "AB" | "O";

export type ParentRelation =
  | "FATHER"
  | "MOTHER"
  | "GRANDFATHER"
  | "GRANDMOTHER"
  | "OTHER";

export type GradeType = "MIDTERM" | "FINAL" | "QUIZ" | "ASSIGNMENT";

export type CounselingType =
  | "ACADEMIC"
  | "CAREER"
  | "PSYCHOLOGICAL"
  | "BEHAVIORAL";

export type ReservationStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type StudentImageType = "profile" | "face" | "palm";

export type IssueCategory =
  | "BUG"
  | "FEATURE"
  | "IMPROVEMENT"
  | "UI_UX"
  | "DOCUMENTATION"
  | "PERFORMANCE"
  | "SECURITY";

export type IssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "CLOSED"
  | "ARCHIVED";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type AnalysisType =
  | "saju"
  | "face"
  | "palm"
  | "mbti"
  | "vark"
  | "name"
  | "zodiac";
