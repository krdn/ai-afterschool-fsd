// 멘션 시스템 공유 타입 — Phase 36~40에서 사용

/**
 * 멘션 가능한 엔티티 타입
 * - student: 학생
 * - teacher: 선생님
 * - team: 팀(학급)
 */
export type MentionType = 'student' | 'teacher' | 'team';

/**
 * 클라이언트에서 서버로 전송되는 멘션 튜플
 * 클라이언트는 최소한의 정보만 전송하고, 서버에서 RBAC 포함 데이터 조회
 */
export type MentionItem = {
  type: MentionType;
  id: string;
};

/**
 * ChatMessage.mentionedEntities JSON에 저장되는 메타데이터
 * - id: 엔티티 ID
 * - type: 엔티티 타입
 * - displayName: UI 렌더링용 표시 이름
 * - accessDenied: RBAC 실패한 멘션 추적용 (선택적 필드)
 */
export type MentionedEntity = {
  id: string;
  type: MentionType;
  displayName: string;
  accessDenied?: boolean;
};

/**
 * mention-resolver가 반환하는 해결된 멘션 데이터
 * - item: 원본 멘션 튜플
 * - displayName: 표시 이름
 * - contextData: context-builder가 system prompt에 주입할 엔티티 요약 텍스트
 * - accessDenied: RBAC 실패 여부
 * - deniedReason: 접근 거부 사유 (선택적)
 */
export type ResolvedMention = {
  item: MentionItem;
  displayName: string;
  contextData: string;
  accessDenied: boolean;
  deniedReason?: string;
};

/**
 * mention-resolver의 전체 반환 타입
 * - resolved: 해결된 멘션 배열
 * - metadata: ChatMessage.mentionedEntities에 저장할 메타데이터 배열
 * - accessDeniedMessages: UI에 표시할 접근 거부 알림 메시지 배열
 *   형태: "○○○님은 접근 권한이 없어 제외되었습니다"
 */
export type MentionResolutionResult = {
  resolved: ResolvedMention[];
  metadata: MentionedEntity[];
  accessDeniedMessages: string[];
};

/**
 * 자동완성 검색 결과 단일 항목 — GET /api/chat/mentions/search 응답 내 각 엔티티
 * - id: 엔티티 ID (Student.id, Teacher.id, Team.id)
 * - type: 엔티티 타입 (기존 MentionType 재사용)
 * - name: 표시 이름
 * - sublabel: 엔티티 구분용 서브레이블
 *   - 학생: "3학년 · 강남초 · 2010-05-12"
 *   - 선생님: "원장 · 담당 5명"
 *   - 학급: "학생 12명 · 교사 3명"
 * - avatarUrl: 프로필 이미지 URL (학생: StudentImage.resizedUrl, 선생님: Teacher.profileImage, 학급: null)
 */
export type MentionSearchItem = {
  id: string;
  type: MentionType;
  name: string;
  sublabel: string;
  avatarUrl: string | null;
};

/**
 * GET /api/chat/mentions/search 전체 응답 타입 — 타입별 그룹 구조
 * Phase 38 드롭다운 섹션 렌더링에 직접 매핑됨
 */
export type MentionSearchResponse = {
  students: MentionSearchItem[];
  teachers: MentionSearchItem[];
  teams: MentionSearchItem[];
};
