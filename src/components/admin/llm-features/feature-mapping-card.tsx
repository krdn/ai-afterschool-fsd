'use client';

/**
 * Feature Mapping Card Component
 * 
 * 개별 기능 매핑 규칙을 카드 형태로 표시하는 컴포넌트
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Server,
  Tags,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchMode, FallbackMode } from '@/features/ai-engine';

// Feature 타입 한글 라벨 매핑
const FEATURE_TYPE_LABELS: Record<string, string> = {
  learning_analysis: '학습 분석',
  face_analysis: '관상 분석',
  palm_analysis: '손금 분석',
  counseling: '상담',
  report_generation: '보고서 생성',
  recommendation: '추천',
  content_generation: '콘텐츠 생성',
  translation: '번역',
  summarization: '요약',
  classification: '분류',
  embedding: '임베딩',
  image_analysis: '이미지 분석',
};

// 태그 한글 라벨 매핑
const TAG_LABELS: Record<string, string> = {
  vision: 'Vision',
  function_calling: 'Function Calling',
  json_mode: 'JSON Mode',
  streaming: 'Streaming',
  tools: 'Tools',
  fast: '빠른',
  balanced: '균형',
  premium: '프리미엄',
  low: '저렴',
  medium: '중간',
  high: '비쌈',
  free: '묶음',
};

interface FeatureMappingCardProps {
  mapping: {
    id: string;
    featureType: string;
    matchMode: MatchMode;
    requiredTags: string[];
    excludedTags: string[];
    specificModel: {
      id: string;
      modelId: string;
      displayName: string;
      contextWindow: number | null;
      supportsVision: boolean;
      supportsTools: boolean;
      provider: {
        id: string;
        name: string;
      };
    } | null;
    priority: number;
    fallbackMode: FallbackMode;
  };
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function FeatureMappingCard({
  mapping,
  index,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}: FeatureMappingCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getFeatureTypeLabel = (type: string): string => {
    return FEATURE_TYPE_LABELS[type] || type;
  };

  const getTagLabel = (tag: string): string => {
    return TAG_LABELS[tag] || tag;
  };

  const getMatchModeLabel = (mode: MatchMode): string => {
    switch (mode) {
      case 'auto_tag':
        return '자동 매칭';
      case 'specific_model':
        return '직접 지정';
      default:
        return mode;
    }
  };

  const getMatchModeColor = (mode: MatchMode): string => {
    switch (mode) {
      case 'auto_tag':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'specific_model':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFallbackModeLabel = (mode: FallbackMode): string => {
    switch (mode) {
      case 'next_priority':
        return '다음 우선순위';
      case 'any_available':
        return '任何 사용 가능';
      case 'fail':
        return '실패 처리';
      default:
        return mode;
    }
  };

  const getPriorityLabel = (priority: number): string => {
    if (priority >= 10) return `${priority}순위`;
    if (priority === 1) return '1순위';
    if (priority === 2) return '2순위';
    if (priority === 3) return '3순위';
    return `${priority}순위`;
  };

  const getPriorityBadgeVariant = (priority: number): string => {
    if (priority >= 8) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    if (priority >= 5) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    if (priority >= 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200';
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  return (
    <Card className={cn(
      'relative transition-all',
      index === 0 && 'border-primary/50 shadow-sm'
    )}>
      {/* 순서 번호 배지 */}
      <div className="absolute -top-3 left-4">
        <Badge
          className={cn(
            'font-semibold px-2 py-0.5',
            getPriorityBadgeVariant(mapping.priority)
          )}
        >
          {getPriorityLabel(mapping.priority)}
        </Badge>
      </div>

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-lg">{getFeatureTypeLabel(mapping.featureType)}</span>
            <Badge
              variant="secondary"
              className={cn('text-xs', getMatchModeColor(mapping.matchMode))}
            >
              {getMatchModeLabel(mapping.matchMode)}
            </Badge>
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-1">
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onMoveUp}
                  disabled={isFirst || !onMoveUp}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onMoveDown}
                  disabled={isLast || !onMoveDown}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>매핑 규칙 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    &quot;{getFeatureTypeLabel(mapping.featureType)}&quot;의 {getPriorityLabel(mapping.priority)} 규칙을 삭제하시겠습니까?
                    <br />
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 자동 매칭 모드 내용 */}
        {mapping.matchMode === 'auto_tag' && (
          <div className="space-y-3">
            {/* 필수 태그 */}
            {mapping.requiredTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">필수 태그</p>
                <div className="flex flex-wrap gap-1">
                  {mapping.requiredTags.map((tag) => (
                    <Badge key={tag} variant="default" className="text-xs">
                      <Tags className="h-3 w-3 mr-1" />
                      {getTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 제외 태그 */}
            {mapping.excludedTags.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">제외 태그</p>
                <div className="flex flex-wrap gap-1">
                  {mapping.excludedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs line-through">
                      <Tags className="h-3 w-3 mr-1" />
                      {getTagLabel(tag)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {mapping.requiredTags.length === 0 && mapping.excludedTags.length === 0 && (
              <p className="text-sm text-muted-foreground">모든 모델에서 선택 (태그 제한 없음)</p>
            )}
          </div>
        )}

        {/* 직접 지정 모드 내용 */}
        {mapping.matchMode === 'specific_model' && mapping.specificModel && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{mapping.specificModel.provider.name}</p>
                <p className="text-sm text-muted-foreground">{mapping.specificModel.displayName}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {mapping.specificModel.supportsVision && (
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">👁</span>Vision
                </Badge>
              )}
              {mapping.specificModel.supportsTools && (
                <Badge variant="outline" className="text-xs">
                  <span className="mr-1">🛠</span>Tools
                </Badge>
              )}
              {mapping.specificModel.contextWindow && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {(mapping.specificModel.contextWindow / 1000).toFixed(0)}K ctx
                </Badge>
              )}
            </div>

            <code className="text-xs text-muted-foreground">{mapping.specificModel.modelId}</code>
          </div>
        )}

        {/* 폴 백 정보 */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">폴 백:</span>
          <Badge variant="outline" className="text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            {getFallbackModeLabel(mapping.fallbackMode)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
