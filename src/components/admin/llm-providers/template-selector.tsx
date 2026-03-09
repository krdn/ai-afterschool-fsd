'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getCapabilityLabel,
  filterDisplayCapabilities,
  getCostTierLabel,
  getCostTierBgStyle,
  getQualityTierLabel,
  getQualityTierBgStyle,
} from '@/shared/utils/llm-display';
import { Sparkles, Settings, Check } from 'lucide-react';
import type { ProviderTemplate } from '@/features/ai-engine';

interface TemplateSelectorProps {
  templates: ProviderTemplate[];
  onSelect: (templateId: string) => void;
  selectedId?: string;
}

/**
 * 제공자 템플릿 선택 컴포넌트
 * 
 * 인기 템플릿과 기타 템플릿을 구분하여 표시하며,
 * 직접 설정 옵션도 제공합니다.
 */
export function TemplateSelector({ templates, onSelect, selectedId }: TemplateSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 인기 템플릿과 기타 템플릿 분리
  const popularTemplates = templates.filter((t) => t.isPopular);
  const otherTemplates = templates.filter((t) => !t.isPopular && t.templateId !== 'custom');
  const customTemplate = templates.find((t) => t.templateId === 'custom');

  const isSelected = (id: string) => selectedId === id;
  const isHovered = (id: string) => hoveredId === id;

  return (
    <div className="space-y-8">
      {/* 인기 템플릿 섹션 */}
      {popularTemplates.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">인기 제공자</h2>
            <Badge variant="secondary" className="ml-2">
              {popularTemplates.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <Card
                key={template.templateId}
                className={cn(
                  'cursor-pointer transition-all duration-200 relative overflow-hidden',
                  'hover:shadow-lg hover:scale-[1.02]',
                  isSelected(template.templateId) && 'ring-2 ring-primary shadow-lg'
                )}
                onClick={() => onSelect(template.templateId)}
                onMouseEnter={() => setHoveredId(template.templateId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* 선택 표시 배지 */}
                {isSelected(template.templateId) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* 제공자 로고/아이콘 */}
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg font-bold">
                        {template.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">
                          {template.providerType}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {template.description}
                  </p>

                  {/* 기능 태그 (text 제외) */}
                  {(() => {
                    const caps = filterDisplayCapabilities(template.defaultCapabilities);
                    return caps.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {caps.slice(0, 3).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {getCapabilityLabel(cap)}
                          </Badge>
                        ))}
                        {caps.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{caps.length - 3}
                          </Badge>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {/* 티어 정보 */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn('px-2 py-0.5 rounded', getCostTierBgStyle(template.defaultCostTier))}>
                      {getCostTierLabel(template.defaultCostTier)}
                    </span>
                    <span className={cn('px-2 py-0.5 rounded', getQualityTierBgStyle(template.defaultQualityTier))}>
                      {getQualityTierLabel(template.defaultQualityTier)}
                    </span>
                  </div>

                  {/* 선택 버튼 */}
                  <Button
                    className={cn(
                      'w-full mt-4 transition-opacity',
                      !isSelected(template.templateId) && !isHovered(template.templateId) && 'opacity-0'
                    )}
                    variant={isSelected(template.templateId) ? 'default' : 'outline'}
                    size="sm"
                  >
                    {isSelected(template.templateId) ? '선택됨' : '선택'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 기타 템플릿 섹션 */}
      {otherTemplates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">기타 제공자</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {otherTemplates.map((template) => (
              <Card
                key={template.templateId}
                className={cn(
                  'cursor-pointer transition-all duration-200 p-4 text-center',
                  'hover:shadow-md hover:scale-105',
                  isSelected(template.templateId) && 'ring-2 ring-primary shadow-md'
                )}
                onClick={() => onSelect(template.templateId)}
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  {template.name.charAt(0)}
                </div>
                <p className="text-sm font-medium truncate">{template.name}</p>
                {isSelected(template.templateId) && (
                  <Check className="w-4 h-4 text-primary mx-auto mt-2" />
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 직접 설정 옵션 */}
      {customTemplate && (
        <section>
          <h2 className="text-lg font-semibold mb-4">직접 설정</h2>
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 max-w-md',
              'hover:shadow-lg hover:scale-[1.01]',
              isSelected('custom') && 'ring-2 ring-primary shadow-lg'
            )}
            onClick={() => onSelect('custom')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{customTemplate.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {customTemplate.description}
                  </p>
                </div>
                {isSelected('custom') ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : (
                  <Button variant="outline" size="sm">
                    선택
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

