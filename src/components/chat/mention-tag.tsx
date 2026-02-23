'use client';

import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { MentionedEntity } from '@/lib/chat/mention-types';

/**
 * Preview API 응답 타입
 * GET /api/chat/mentions/preview?type=student&id=xxx
 */
type EntityPreview = {
  name: string;
  sublabel: string;
  summary: string | null;
};

/** 엔티티 타입별 칩 색상 클래스 */
const CHIP_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  teacher:
    'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  team: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300',
};

type MentionTagProps = {
  entity: MentionedEntity;
};

/**
 * MentionTag — @이름 멘션 칩 컴포넌트
 *
 * 엔티티 타입별 색상 칩으로 @이름을 렌더링하고,
 * 클릭 시 Radix Popover로 엔티티 요약 프리뷰 카드를 표시한다.
 *
 * @param entity - MentionedEntity (id, type, displayName, accessDenied?)
 */
export function MentionTag({ entity }: MentionTagProps) {
  const [preview, setPreview] = useState<EntityPreview | null>(null);
  const [loading, setLoading] = useState(false);

  // Popover 열릴 때 프리뷰 데이터 지연 로딩
  const handleOpenChange = async (open: boolean) => {
    if (!open || preview || entity.accessDenied) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chat/mentions/preview?type=${entity.type}&id=${entity.id}`
      );
      if (res.ok) {
        setPreview(await res.json());
      }
    } catch {
      // 조용히 실패 — 에러 상태는 popover 내에서 처리
    } finally {
      setLoading(false);
    }
  };

  const chipColor = CHIP_COLORS[entity.type] ?? 'bg-gray-100 text-gray-800';
  const isAccessDenied = entity.accessDenied === true;

  const chipElement = (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium transition-colors mx-0.5',
        chipColor,
        isAccessDenied ? 'opacity-50 cursor-not-allowed line-through' : 'cursor-pointer',
      ]
        .join(' ')
        .trim()}
    >
      @{entity.displayName}
    </span>
  );

  // accessDenied인 경우 Popover 없이 칩만 렌더링
  if (isAccessDenied) {
    return chipElement;
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{chipElement}</PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        side="top"
        collisionPadding={8}
      >
        {loading ? (
          // 로딩 스켈레톤 플레이스홀더
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-3/4" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-1/2" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-full" />
          </div>
        ) : preview ? (
          // 프리뷰 카드 내용
          <div>
            <p className="font-semibold text-sm">{preview.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{preview.sublabel}</p>
            {preview.summary && (
              <p className="mt-2 pt-2 border-t text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {preview.summary}
              </p>
            )}
          </div>
        ) : (
          // 로딩 실패 또는 데이터 없음
          <p className="text-xs text-muted-foreground">정보를 불러올 수 없습니다</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
