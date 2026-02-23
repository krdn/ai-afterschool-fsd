'use client';

import {
  Sparkles,
  ArrowRight,
  Check,
  Shield,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type Recommendation,
  purposeOptions,
  techLevelOptions,
  budgetOptions,
} from './recommender-data';

// ============================================================
// StepIndicator
// ============================================================

export function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>단계 {currentStep} / {totalSteps}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// ============================================================
// PurposeStep
// ============================================================

export function PurposeStep({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">어떤 용도로 LLM을 사용하시나요?</h3>
        <p className="text-sm text-muted-foreground">
          사용 목적에 따라 최적의 AI 모델을 추천해드립니다
        </p>
      </div>

      <div className="grid gap-3">
        {purposeOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => onSelect(option.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{option.label}</h4>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// TechLevelStep
// ============================================================

export function TechLevelStep({
  selected,
  onSelect,
  purpose,
}: {
  selected?: 'easy' | 'advanced';
  onSelect: (level: 'easy' | 'advanced') => void;
  purpose?: string;
}) {
  // 로컬/프라이버시 선택 시 기술 수준 단계 스킵
  if (purpose === 'privacy') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="p-4 bg-muted rounded-full inline-flex">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">로컬 실행을 선택하셨네요</h3>
        <p className="text-sm text-muted-foreground">
          Ollama를 통해 컴퓨터에서 직접 LLM을 실행합니다.<br />
          기술적인 설정이 필요하지만 데이터가 외부로 전송되지 않습니다.
        </p>
        <Button onClick={() => onSelect('advanced')}>계속하기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">기술적인 설정이 편하신가요?</h3>
        <p className="text-sm text-muted-foreground">
          설정 난이도에 따라 적합한 옵션을 추천해드립니다
        </p>
      </div>

      <div className="grid gap-3">
        {techLevelOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => onSelect(option.id as 'easy' | 'advanced')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{option.label}</h4>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// BudgetStep
// ============================================================

export function BudgetStep({
  selected,
  onSelect,
}: {
  selected?: 'free' | 'low' | 'medium' | 'unlimited';
  onSelect: (budget: 'free' | 'low' | 'medium' | 'unlimited') => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">월 예산은 어느 정도로 생각하시나요?</h3>
        <p className="text-sm text-muted-foreground">
          예산에 따라 가장 적합한 제공자를 추천해드립니다
        </p>
      </div>

      <div className="grid gap-3">
        {budgetOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selected === option.id;

          return (
            <Card
              key={option.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md',
                isSelected && 'ring-2 ring-primary border-primary'
              )}
              onClick={() => onSelect(option.id as 'free' | 'low' | 'medium' | 'unlimited')}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{option.label}</h4>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ResultStep
// ============================================================

export function ResultStep({
  recommendations,
  onSelectProvider,
  onClose,
}: {
  recommendations: Recommendation[];
  onSelectProvider?: (templateId: string) => void;
  onClose?: () => void;
}) {
  const [first, second] = recommendations;

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-primary/10 rounded-full">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">추천 결과</h3>
        <p className="text-sm text-muted-foreground">
          입력하신 조건에 가장 적합한 AI 모델입니다
        </p>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {/* 1순위 추천 */}
          {first && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">1순위 추천</Badge>
                  <Badge variant="outline">{first.template.defaultCostTier === 'free' ? '묶음' : first.template.defaultCostTier}</Badge>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {first.template.name}
                </CardTitle>
                <CardDescription>{first.template.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {first.reasons.map((reason, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      {reason}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      onSelectProvider?.(first.template.templateId);
                      onClose?.();
                    }}
                  >
                    바로 등록하기
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(first.template.apiKeyUrl || first.template.helpUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 2순위 추천 */}
          {second && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">2순위</Badge>
                  <Badge variant="outline">{second.template.defaultCostTier === 'free' ? '묶음' : second.template.defaultCostTier}</Badge>
                </div>
                <CardTitle className="text-base">{second.template.name}</CardTitle>
                <CardDescription className="text-sm">
                  {second.template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {second.reasons.slice(0, 2).map((reason, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onSelectProvider?.(second.template.templateId);
                    onClose?.();
                  }}
                >
                  이 모델로 등록하기
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
