"use client"

import { useRef, useCallback } from 'react'
import type { MentionDataItem } from 'react-mentions-ts'
import type { MentionItem, MentionSearchResponse, MentionType } from '@/lib/chat/mention-types'

/**
 * react-mentions-ts MentionDataItem에 추가되는 멘션 타입 정보
 */
export type MentionExtra = {
  type: 'student' | 'teacher' | 'team'
  sublabel: string
}

/**
 * useMention 훅
 *
 * react-mentions-ts의 <Mention data={...}> prop에 전달할 async 함수를 제공한다.
 * - 200ms 디바운스: 연속 입력 시 마지막 쿼리만 서버로 전송
 * - AbortController: 이전 요청을 취소하여 race condition 방지
 * - stale 쿼리 감지: 디바운스 대기 중 쿼리가 바뀌면 즉시 빈 배열 반환
 * - 최소 2자 조건: 1자 이하는 API 호출 없이 빈 배열 반환
 */
export function useMention(): { fetchMentions: (query: string) => Promise<MentionDataItem<MentionExtra>[]> } {
  // stale 쿼리 감지용: 디바운스 중 쿼리가 바뀌었는지 확인
  const latestQueryRef = useRef<string>('')
  // 이전 요청 취소용: 새 요청 시작 전 이전 AbortController 중단
  const abortRef = useRef<AbortController | null>(null)

  const fetchMentions = useCallback(async (query: string): Promise<MentionDataItem<MentionExtra>[]> => {
    // 최소 2자 미만이면 API 호출 없이 빈 배열 반환
    if (query.length < 2) return []

    // 현재 쿼리를 ref에 저장
    latestQueryRef.current = query

    // 200ms 디바운스: 연속 입력 중 마지막 쿼리만 처리
    await new Promise(resolve => setTimeout(resolve, 200))

    // stale 쿼리 감지: 대기 중 다른 쿼리가 들어왔다면 무시
    if (latestQueryRef.current !== query) return []

    // 이전 요청 취소
    abortRef.current?.abort()

    // 새 AbortController 생성
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(
        '/api/chat/mentions/search?q=' + encodeURIComponent(query),
        { signal: controller.signal }
      )

      const data = (await response.json()) as MentionSearchResponse

      // flat 배열 변환: 학생 → 선생님 → 팀 순서
      return [
        ...data.students.map(s => ({
          id: `student:${s.id}`,
          display: s.name,
          type: 'student' as const,
          sublabel: s.sublabel,
        })),
        ...data.teachers.map(t => ({
          id: `teacher:${t.id}`,
          display: t.name,
          type: 'teacher' as const,
          sublabel: t.sublabel,
        })),
        ...data.teams.map(t => ({
          id: `team:${t.id}`,
          display: t.name,
          type: 'team' as const,
          sublabel: t.sublabel,
        })),
      ]
    } catch {
      // AbortError 포함 모든 에러 → 빈 배열 반환 (조용히 실패)
      return []
    }
  }, [])

  return { fetchMentions }
}

/**
 * Submit 시 react-mentions-ts의 MentionOccurrence[]를 서버 전송용 MentionItem[]으로 변환
 *
 * - 중복 제거: 같은 엔티티를 여러 번 멘션해도 한 번만 서버에 전달
 * - id 형식 파싱: "student:abc123" → { type: "student", id: "abc123" }
 *
 * @param mentions react-mentions-ts onAdd/onChange에서 받은 멘션 발생 배열
 * @returns 서버로 전송할 MentionItem 배열 (중복 제거됨)
 */
export function occurrencesToMentionItems(
  mentions: Array<{ id: string | number }>
): MentionItem[] {
  const seen = new Set<string>()
  return mentions.flatMap(m => {
    const raw = String(m.id)
    if (seen.has(raw)) return []
    seen.add(raw)
    const colonIdx = raw.indexOf(':')
    const type = raw.slice(0, colonIdx) as MentionType
    const id = raw.slice(colonIdx + 1)
    return [{ type, id }]
  })
}
