'use client';

import * as React from 'react';
import { Search, X, Sparkles, Lightbulb, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  getAllHelpTopics,
  getCategories,
  searchHelp,
  getHelpByCategory,
  type HelpTopic,
  type HelpCategory,
} from '@/lib/help/help-content';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { HelpTopicCard } from './help-topic-card';

interface HelpCenterProps {
  initialCategory?: HelpCategory;
  searchQuery?: string;
  onTopicClick?: (topic: HelpTopic) => void;
  variant?: 'page' | 'drawer' | 'dialog';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRecommendClick?: () => void;
  className?: string;
}

/**
 * 헬프 센터 컴포넌트
 *
 * 주제별 가이드, 검색, 상세 내용을 제공하는 종합 도움말 시스템입니다.
 */
export function HelpCenter({
  initialCategory = 'getting-started',
  searchQuery: initialSearchQuery = '',
  onTopicClick,
  variant = 'page',
  open,
  onOpenChange,
  onRecommendClick,
  className,
}: HelpCenterProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);
  const [selectedTopic, setSelectedTopic] = React.useState<HelpTopic | null>(null);
  const [activeCategory, setActiveCategory] = React.useState<HelpCategory>(initialCategory);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const categories = getCategories();
  const allTopics = getAllHelpTopics();

  // 검색 또는 카테고리별 주제 필터링
  const filteredTopics = React.useMemo(() => {
    if (searchQuery.trim()) {
      return searchHelp(searchQuery);
    }
    return getHelpByCategory(activeCategory);
  }, [searchQuery, activeCategory]);

  // 주제 선택 핸들러
  const handleTopicClick = (topic: HelpTopic) => {
    setSelectedTopic(topic);
    setIsDetailOpen(true);
    onTopicClick?.(topic);
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // LLM 추천 클릭
  const handleRecommendClick = () => {
    onRecommendClick?.();
    onOpenChange?.(false);
  };

  // 컨텐츠 렌더링
  const content = (
    <>
      {/* 검색 바 */}
      <div className="sticky top-0 z-10 bg-background pb-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="도움말 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 검색 결과 요약 */}
        {searchQuery.trim() && (
          <div className="mt-2 text-sm text-muted-foreground">
            &ldquo;{searchQuery}&rdquo; 검색 결과: {filteredTopics.length}개
          </div>
        )}
      </div>

      {/* 카테고리 탭 */}
      {!searchQuery.trim() && (
        <Tabs
          value={activeCategory}
          onValueChange={(value) => setActiveCategory(value as HelpCategory)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="grid gap-3">
                  {getHelpByCategory(cat.id).map((topic) => (
                    <HelpTopicCard
                      key={topic.id}
                      topic={topic}
                      isExpanded={selectedTopic?.id === topic.id}
                      onClick={() => handleTopicClick(topic)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* 검색 결과 목록 */}
      {searchQuery.trim() && (
        <ScrollArea className="h-[calc(100vh-240px)] mt-4">
          {filteredTopics.length > 0 ? (
            <div className="grid gap-3">
              {filteredTopics.map((topic) => (
                <HelpTopicCard
                  key={topic.id}
                  topic={topic}
                  isExpanded={selectedTopic?.id === topic.id}
                  onClick={() => handleTopicClick(topic)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
              <p className="text-sm text-muted-foreground">
                다른 키워드로 검색하거나 카테고리를 둘러보세요.
              </p>
            </div>
          )}
        </ScrollArea>
      )}

      {/* LLM 추천 CTA */}
      <div className="mt-6 pt-4 border-t">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">어떤 LLM을 선택해야 할지 모르겠나요?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                몇 가지 질문에 답하면 최적의 AI 모델을 추천해드립니다.
              </p>
              <Button
                size="sm"
                onClick={handleRecommendClick}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                LLM 추천받기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 주제 상세 Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          {selectedTopic && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTopic.title}</DialogTitle>
                <DialogDescription>{selectedTopic.summary}</DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[50vh] mt-4 pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MarkdownRenderer
                    content={
                      Array.isArray(selectedTopic.content)
                        ? selectedTopic.content.join('\n')
                        : selectedTopic.content
                    }
                  />
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  // variant에 따라 다른 래퍼 적용
  if (variant === 'drawer') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn('w-full sm:max-w-lg', className)}>
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              도움말 센터
            </SheetTitle>
            <SheetDescription>
              LLM Hub 사용 가이드 및 문제 해결
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  if (variant === 'dialog') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('max-w-3xl max-h-[90vh] overflow-hidden', className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              도움말 센터
            </DialogTitle>
            <DialogDescription>
              LLM Hub 사용 가이드 및 문제 해결
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // page variant (default)
  return <div className={cn('max-w-4xl mx-auto p-4', className)}>{content}</div>;
}

export default HelpCenter;
