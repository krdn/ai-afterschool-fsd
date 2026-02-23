import {
  Sparkles,
  Zap,
  Brain,
  Image,
  Coins,
  Shield,
  Server,
} from 'lucide-react';
import {
  getProviderTemplates,
  type ProviderTemplate,
} from '@/features/ai-engine/templates';

// ============================================================
// Types
// ============================================================

export type Step = 'purpose' | 'tech-level' | 'budget' | 'result';

export interface Recommendation {
  rank: 1 | 2;
  template: ProviderTemplate;
  reasons: string[];
  score: number;
}

export interface RecommenderState {
  step: Step;
  purpose?: string;
  techLevel?: 'easy' | 'advanced';
  budget?: 'free' | 'low' | 'medium' | 'unlimited';
  recommendations?: Recommendation[];
}

export interface LLMRecommenderProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: 'dialog' | 'sheet';
  onSelectProvider?: (templateId: string) => void;
  className?: string;
}

// ============================================================
// Purpose Options
// ============================================================

export const purposeOptions = [
  {
    id: 'analysis',
    label: '학생 분석 및 상담 보고서',
    description: '학생 성향 분석, 상담 내용 요약 등 균형잡힌 성능 필요',
    icon: Brain,
    tags: ['balanced', 'korean', 'premium'],
    priority: 1,
  },
  {
    id: 'vision',
    label: '이미지 분석 (관상, 손금)',
    description: '사진을 업로드하여 분석하는 기능에 최적화된 모델',
    icon: Image,
    tags: ['vision', 'premium'],
    priority: 2,
  },
  {
    id: 'quick',
    label: '빠른 간단 분석',
    description: '즉각적인 응답이 필요한 간단한 작업',
    icon: Zap,
    tags: ['low', 'balanced', 'fast'],
    priority: 3,
  },
  {
    id: 'quality',
    label: '고품질 심층 분석',
    description: '복잡한 추론과 고품질 결과가 필요한 작업',
    icon: Sparkles,
    tags: ['premium', 'high'],
    priority: 4,
  },
  {
    id: 'cost',
    label: '비용 절감',
    description: '가능한 낮은 비용으로 기본적인 AI 기능 사용',
    icon: Coins,
    tags: ['low', 'free'],
    priority: 5,
  },
  {
    id: 'privacy',
    label: '로컬에서만 사용',
    description: '데이터가 외부로 나가지 않는 프라이버시 중시',
    icon: Shield,
    tags: ['free', 'local'],
    priority: 6,
  },
];

// ============================================================
// Tech Level Options
// ============================================================

export const techLevelOptions = [
  {
    id: 'easy',
    label: '쉬운 방법을 원해요',
    description: '클릭 몇 번으로 바로 사용할 수 있는 상용 클라우드 서비스',
    icon: Zap,
  },
  {
    id: 'advanced',
    label: '직접 설정할 수 있어요',
    description: '로컬 설치나 복잡한 설정도 문제없어요',
    icon: Server,
  },
];

// ============================================================
// Budget Options
// ============================================================

export const budgetOptions = [
  {
    id: 'free',
    label: '물뤂으로 사용',
    description: '완전 물뤂이거나 로컬에서 실행',
    icon: Shield,
  },
  {
    id: 'low',
    label: '월 10만원 이하',
    description: '비용 효율적인 선택',
    icon: Coins,
  },
  {
    id: 'medium',
    label: '월 50만원 이하',
    description: '적당한 성능과 비용의 균형',
    icon: Coins,
  },
  {
    id: 'unlimited',
    label: '예산 제한 없음',
    description: '최고 성능이 우선',
    icon: Sparkles,
  },
];

// ============================================================
// Scoring Functions
// ============================================================

export function calculateRecommendations(
  purpose: string,
  techLevel: 'easy' | 'advanced',
  budget: 'free' | 'low' | 'medium' | 'unlimited'
): Recommendation[] {
  const templates = getProviderTemplates().filter(t => t.isPopular !== false);
  const purposeOption = purposeOptions.find((p) => p.id === purpose);
  const purposeTags = purposeOption?.tags || [];

  const scored = templates
    .filter((template: ProviderTemplate) => {
      // 기술 수준 필터링
      if (techLevel === 'easy' && template.templateId === 'ollama') {
        return false; // Ollama는 advanced
      }

      // 예산 필터링
      if (budget === 'free' && template.defaultCostTier !== 'free') {
        return false;
      }
      if (budget === 'low' && ['high'].includes(template.defaultCostTier)) {
        return false;
      }
      if (budget === 'medium' && template.defaultCostTier === 'high') {
        return false;
      }

      return true;
    })
    .map((template: ProviderTemplate) => {
      let score = 0;
      const reasons: string[] = [];

      // 목적 기반 점수
      if (purposeTags.includes('vision') && template.defaultCapabilities.includes('vision')) {
        score += 30;
        reasons.push('Vision(이미지 분석) 지원');
      }

      if (purposeTags.includes('premium') && template.defaultQualityTier === 'premium') {
        score += 25;
        reasons.push('프리미엄 품질');
      }

      if (purposeTags.includes('balanced') && template.defaultQualityTier === 'balanced') {
        score += 20;
        reasons.push('균형잡힌 성능');
      }

      if (purposeTags.includes('low') && template.defaultCostTier === 'low') {
        score += 20;
        reasons.push('비용 효율적');
      }

      if (purposeTags.includes('free') && template.defaultCostTier === 'free') {
        score += 30;
        reasons.push('완전 물뤂');
      }

      if (purposeTags.includes('korean')) {
        // Google Gemini는 한국어에 강함
        if (template.templateId === 'google') {
          score += 15;
          reasons.push('한국어 성능 우수');
        }
      }

      // 예산 기반 점수
      if (budget === 'free' && template.defaultCostTier === 'free') {
        score += 25;
      } else if (budget === 'low' && template.defaultCostTier === 'low') {
        score += 20;
      }

      // 인기도 별 점수
      if (template.isPopular) {
        score += 10;
      }

      // 기본 이유 추가
      if (reasons.length === 0) {
        reasons.push('안정적인 성능');
      }

      // 특별 보정
      if (purpose === 'privacy' && template.templateId === 'ollama') {
        score = 100;
        reasons.push('로컬 실행으로 데이터 프라이버시 보장');
      }

      if (purpose === 'vision' && template.templateId === 'google') {
        score += 10;
        reasons.push('Vision 기능 및 비용 효율적');
      }

      return {
        template,
        score,
        reasons: [...new Set(reasons)], // 중복 제거
        rank: 1 as 1 | 2,
      };
    });

  // 점수순 정렬
  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  // 순위 할당
  const results: Recommendation[] = scored.slice(0, 2).map((item: { template: ProviderTemplate, score: number, reasons: string[], rank: 1 | 2 }, index: number) => ({
    ...item,
    rank: (index + 1) as 1 | 2,
  }));

  return results;
}
