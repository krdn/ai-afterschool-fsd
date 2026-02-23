'use client';

import { ProviderCard } from './provider-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { ProviderWithModels } from '@/features/ai-engine';

interface ProviderListProps {
  providers: ProviderWithModels[];
  isLoading?: boolean;
  onEdit: (provider: ProviderWithModels) => void;
  onDelete: (provider: ProviderWithModels) => void;
  onTest: (provider: ProviderWithModels) => Promise<{ success: boolean; message: string }>;
  onToggle: (provider: ProviderWithModels, enabled: boolean) => void;
}

/**
 * 제공자 목록 컴포넌트
 * 
 * 제공자 카드들을 그리드로 표시하며, 로딩 상태와 빈 상태를 처리합니다.
 */
export function ProviderList({
  providers,
  isLoading,
  onEdit,
  onDelete,
  onTest,
  onToggle,
}: ProviderListProps) {
  if (isLoading) {
    return <ProviderListSkeleton />;
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">등록된 제공자가 없습니다</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          LLM 제공자를 등록하여 AI 기능을 사용핼보세요. OpenAI, Claude, Gemini 등
          다양한 제공자를 지원합니다.
        </p>
        <Button asChild>
          <Link href="/admin/llm-providers/new">
            <Plus className="w-4 h-4 mr-2" />
            새 제공자 추가
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onEdit={() => onEdit(provider)}
          onDelete={() => onDelete(provider)}
          onTest={() => onTest(provider)}
          onToggle={(enabled) => onToggle(provider, enabled)}
        />
      ))}
    </div>
  );
}

/**
 * 로딩 상태 스켈레톤
 */
function ProviderListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
