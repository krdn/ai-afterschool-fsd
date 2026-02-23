'use client';

import * as React from 'react';
import { ChevronRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HelpTopic, HelpCategory } from '@/lib/help/help-content';

interface HelpTopicCardProps {
  topic: HelpTopic;
  isExpanded?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * 도움말 주제 카드 컴포넌트
 *
 * 개별 도움말 주제를 카드 형태로 표시합니다.
 */
export function HelpTopicCard({
  topic,
  isExpanded = false,
  onClick,
  className,
}: HelpTopicCardProps) {
  const categoryColors: Record<HelpCategory, string> = {
    'getting-started': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    providers: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    features: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    troubleshooting: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  const categoryLabels: Record<HelpCategory, string> = {
    'getting-started': '시작하기',
    providers: '제공자',
    features: '기능',
    troubleshooting: '문제해결',
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isExpanded && 'ring-2 ring-primary',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className={cn('text-xs', categoryColors[topic.category])}
              >
                {categoryLabels[topic.category]}
              </Badge>
            </div>
            <CardTitle className="text-base">{topic.title}</CardTitle>
          </div>
          <ChevronRight
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {topic.summary}
        </p>

        {/* 선행 필요 주제 */}
        {topic.prerequisites && topic.prerequisites.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span>선행: {topic.prerequisites.join(', ')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HelpTopicCard;
