import type { MentionedEntity } from '@/lib/chat/mention-types';

/**
 * 콘텐츠 세그먼트 타입
 * - text: 일반 텍스트
 * - mention: @이름 멘션 엔티티 칩
 */
export type ContentSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mention'; entity: MentionedEntity };

/**
 * @이름 형식의 plain text를 ContentSegment[] 배열로 파싱한다.
 *
 * @param content - DB에 저장된 plain text 메시지 내용
 * @param entities - ChatMessage.mentionedEntities에서 복원된 MentionedEntity 배열 (null/undefined 허용)
 * @returns ContentSegment[] — text 세그먼트와 mention 세그먼트가 혼합된 배열
 *
 * @example
 * parseMentionChips("@홍길동 학생의 성향을 분석해줘", [{id:"abc", type:"student", displayName:"홍길동"}])
 * // → [{ kind: "mention", entity: {...} }, { kind: "text", text: " 학생의 성향을 분석해줘" }]
 *
 * @note entities가 비어있으면 전체 텍스트를 단일 text 세그먼트로 반환 (구형 메시지 호환)
 */
export function parseMentionChips(
  content: string,
  entities: MentionedEntity[] | null | undefined
): ContentSegment[] {
  // 구형 메시지 호환: entities가 없으면 텍스트 세그먼트 하나만 반환
  if (!entities || entities.length === 0) {
    return [{ kind: 'text', text: content }];
  }

  // displayName 길이 내림차순 정렬 — 부분 매칭 방지 (예: "김철수 선생님"이 "김철수"보다 먼저 매칭)
  const sorted = [...entities].sort((a, b) => b.displayName.length - a.displayName.length);

  // 특수문자 이스케이프 후 정규식 빌드
  const escaped = sorted.map((e) => e.displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})`, 'g');

  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    // 매칭 앞의 텍스트 세그먼트 추가
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: content.slice(lastIndex, match.index) });
    }

    // 매칭된 displayName으로 엔티티 찾기
    const displayName = match[1];
    const entity = sorted.find((e) => e.displayName === displayName)!;
    segments.push({ kind: 'mention', entity });

    lastIndex = match.index + match[0].length;
  }

  // 마지막 남은 텍스트 세그먼트 추가
  if (lastIndex < content.length) {
    segments.push({ kind: 'text', text: content.slice(lastIndex) });
  }

  return segments;
}
