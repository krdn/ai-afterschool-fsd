'use client';

import * as React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getHelpTopic, getRelatedTopics, type HelpTopic } from '@/lib/help/help-content';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface InlineHelpProps {
  helpId: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: 'hover' | 'click';
  children?: React.ReactNode;
  className?: string;
}

/**
 * 인라인 도움말 컴포넌트
 *
 * (?) 아이콘을 통해 도움말을 제공합니다.
 * Hover 시 요약을 표시하고, 클릭 시 상세 내용을 Dialog로 표시합니다.
 */
export function InlineHelp({
  helpId,
  placement = 'top',
  trigger = 'hover',
  children,
  className,
}: InlineHelpProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const topic = getHelpTopic(helpId);

  if (!topic) {
    console.warn(`Help topic not found: ${helpId}`);
    return null;
  }

  const relatedTopics = getRelatedTopics(helpId);

  // 위치별 스타일
  const placementStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  // 방향별 화살표
  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent',
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setShowPreview(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setShowPreview(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click' || !showPreview) {
      setIsOpen(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn('relative inline-flex items-center', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}

        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={handleClick}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="sr-only">도움말: {topic.title}</span>
          </Button>
        </DialogTrigger>

        {/* Hover Preview Tooltip */}
        {trigger === 'hover' && showPreview && (
          <div
            className={cn(
              'absolute z-50 w-64 p-3 rounded-lg border bg-popover text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95 duration-200',
              placementStyles[placement]
            )}
          >
            <div className="font-medium text-sm mb-1">{topic.title}</div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {topic.summary}
            </p>
            <div className="mt-2 flex items-center text-xs text-primary">
              <span>자세히 보기</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </div>
            {/* 화살표 */}
            <div
              className={cn(
                'absolute w-2 h-2 border-4 border-popover',
                arrowStyles[placement]
              )}
            />
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {topic.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {topic.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 overflow-y-auto max-h-[50vh] pr-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={Array.isArray(topic.content) ? topic.content.join('\n') : topic.content} />
          </div>

          {/* 관련 주제 */}
          {relatedTopics.length > 0 && (
            <div className="pt-4 border-t">
              <div className="text-sm font-medium mb-2">관련 주제</div>
              <div className="flex flex-wrap gap-2">
                {relatedTopics.map((related) => (
                  <Button
                    key={related.id}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setIsOpen(false);
                      // TODO: 관련 주제로 이동 (Help Center에서 처리)
                    }}
                  >
                    {related.title}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InlineHelp;
