'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles } from 'lucide-react';
import { HelpButton } from '@/components/help/help-button';
import { HelpCenter } from '@/components/help/help-center';
import { LLMRecommender } from '@/components/help/llm-recommender';

/**
 * 도움말 시스템 통합 컴포넌트
 *
 * HelpButton, HelpCenter, LLMRecommender를 통합 관리합니다.
 */
export function HelpIntegration() {
  const [showHelp, setShowHelp] = useState(false);
  const [showRecommender, setShowRecommender] = useState(false);
  const router = useRouter();

  const handleRecommendClick = () => {
    setShowHelp(false);
    setShowRecommender(true);
  };

  const handleSelectProvider = (templateId: string) => {
    setShowRecommender(false);
    router.push(`/admin/llm-providers/new?template=${templateId}`);
  };

  return (
    <>
      <HelpButton onClick={() => setShowHelp(true)} />
      <HelpCenter
        variant="drawer"
        open={showHelp}
        onOpenChange={setShowHelp}
        onRecommendClick={handleRecommendClick}
      />
      <LLMRecommender
        variant="dialog"
        open={showRecommender}
        onOpenChange={setShowRecommender}
        onSelectProvider={handleSelectProvider}
      />
    </>
  );
}

/**
 * 퀵 헬프 섹션
 */
export function QuickHelpSection() {
  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">빠른 도움말</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/help?topic=quick-start">
            <HelpCircle className="h-4 w-4 mr-1" />
            처음 설정하시나요?
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/help?topic=api-key-guide">
            <Sparkles className="h-4 w-4 mr-1" />
            API 키 발급 방법
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/help">
            <HelpCircle className="h-4 w-4 mr-1" />
            전체 도움말 보기
          </Link>
        </Button>
      </div>
    </div>
  );
}
