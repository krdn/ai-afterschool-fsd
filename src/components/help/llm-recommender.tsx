'use client';

import * as React from 'react';
import {
  Sparkles,
  Lightbulb,
  ArrowLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  type RecommenderState,
  type LLMRecommenderProps,
  calculateRecommendations,
} from './recommender-data';
import {
  StepIndicator,
  PurposeStep,
  TechLevelStep,
  BudgetStep,
  ResultStep,
} from './recommender-steps';

// ============================================================
// Main Component
// ============================================================

export function LLMRecommender({
  open,
  onOpenChange,
  variant = 'dialog',
  onSelectProvider,
  className,
}: LLMRecommenderProps) {
  const [state, setState] = React.useState<RecommenderState>({
    step: 'purpose',
  });

  // 단계별 총 단계 수 계산
  const getTotalSteps = () => {
    if (state.purpose === 'privacy') return 3; // tech-level 스킵
    return 4;
  };

  const getCurrentStepNumber = () => {
    switch (state.step) {
      case 'purpose':
        return 1;
      case 'tech-level':
        return 2;
      case 'budget':
        return state.purpose === 'privacy' ? 2 : 3;
      case 'result':
        return getTotalSteps();
      default:
        return 1;
    }
  };

  const handlePurposeSelect = (purpose: string) => {
    setState((prev) => ({ ...prev, purpose }));

    if (purpose === 'privacy') {
      // 로컬/프라이버시 선택 시 tech-level 스킵하고 바로 결과
      const techLevel = 'advanced';
      setState((prev) => ({ ...prev, purpose, techLevel, step: 'budget' }));
    } else {
      setState((prev) => ({ ...prev, purpose, step: 'tech-level' }));
    }
  };

  const handleTechLevelSelect = (techLevel: 'easy' | 'advanced') => {
    setState((prev) => ({ ...prev, techLevel, step: 'budget' }));
  };

  const handleBudgetSelect = (budget: 'free' | 'low' | 'medium' | 'unlimited') => {
    const recommendations = calculateRecommendations(
      state.purpose!,
      state.techLevel || 'easy',
      budget
    );
    setState((prev) => ({ ...prev, budget, recommendations, step: 'result' }));
  };

  const handleBack = () => {
    if (state.step === 'result') {
      setState((prev) => ({ ...prev, step: 'budget' }));
    } else if (state.step === 'budget') {
      if (state.purpose === 'privacy') {
        setState((prev) => ({ ...prev, step: 'purpose' }));
      } else {
        setState((prev) => ({ ...prev, step: 'tech-level' }));
      }
    } else if (state.step === 'tech-level') {
      setState((prev) => ({ ...prev, step: 'purpose' }));
    }
  };

  const handleClose = () => {
    onOpenChange?.(false);
    // Reset state after animation
    setTimeout(() => {
      setState({ step: 'purpose' });
    }, 300);
  };

  const content = (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <span className="font-semibold">LLM 추천 위자드</span>
        </div>
        {state.step !== 'purpose' && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
        )}
      </div>

      {/* 진행률 */}
      <StepIndicator currentStep={getCurrentStepNumber()} totalSteps={getTotalSteps()} />

      {/* 단계별 콘텐츠 */}
      <div className="py-4">
        {state.step === 'purpose' && (
          <PurposeStep selected={state.purpose} onSelect={handlePurposeSelect} />
        )}

        {state.step === 'tech-level' && (
          <TechLevelStep
            selected={state.techLevel}
            onSelect={handleTechLevelSelect}
            purpose={state.purpose}
          />
        )}

        {state.step === 'budget' && (
          <BudgetStep selected={state.budget} onSelect={handleBudgetSelect} />
        )}

        {state.step === 'result' && state.recommendations && (
          <ResultStep
            recommendations={state.recommendations}
            onSelectProvider={onSelectProvider}
            onClose={handleClose}
          />
        )}
      </div>
    </>
  );

  if (variant === 'sheet') {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn('w-full sm:max-w-lg', className)}>
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              LLM 추천받기
            </SheetTitle>
            <SheetDescription>
              몇 가지 질문에 답하면 최적의 AI 모델을 추천해드립니다
            </SheetDescription>
          </SheetHeader>
          {content}
          <SheetFooter className="pt-4">
            <Button variant="outline" className="w-full" onClick={handleClose}>
              <X className="h-4 w-4 mr-1" />
              닫기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg max-h-[90vh] overflow-hidden', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            LLM 추천받기
          </DialogTitle>
          <DialogDescription>
            몇 가지 질문에 답하면 최적의 AI 모델을 추천해드립니다
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">{content}</ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" />
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LLMRecommender;
