import { z } from 'zod';

// ─── 조건 타입 ───

export type NeuroscienceCondition = {
  profile?: {
    studentId: string;
    name: string;
    age: number;
    grade: number;
    varkType?: string | null;
    mbtiType?: string | null;
    sajuTraits?: string | null;
    personalitySummary?: string | null;
  };
  situation?: {
    subject: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    fatigueLevel?: 'low' | 'medium' | 'high';
    concentrationLevel?: 'low' | 'medium' | 'high';
    studyDuration?: number;
  };
  goal?: {
    type: 'memorization' | 'comprehension' | 'problem_solving' | 'creativity' | 'review';
    specificTopic?: string;
  };
  gradeContext?: {
    recentTrend: 'improving' | 'stable' | 'declining';
    weakSubjects: string[];
    strongSubjects: string[];
    averageScore?: number;
  };
};

export type BuiltCondition = {
  condition: NeuroscienceCondition;
  contextString: string;
  hash: string;
};

// ─── 응답 Zod 스키마 ───

export const NeuroscienceStrategySchema = z.object({
  strategies: z.array(z.object({
    name: z.string(),
    neuroBasis: z.string(),
    fitReason: z.string(),
    steps: z.array(z.string()),
    expectedEffect: z.string(),
    caution: z.string().optional(),
  })).min(1).max(5),
  overallAdvice: z.string(),
  references: z.array(z.string()),
});

export type NeuroscienceStrategy = z.infer<typeof NeuroscienceStrategySchema>;

// ─── Server Action 입력 스키마 ───

export const strategyInputSchema = z.object({
  studentId: z.string().min(1, '학생을 선택해주세요'),
  situation: z.object({
    subject: z.string().min(1, '과목을 입력해주세요'),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening']),
    fatigueLevel: z.enum(['low', 'medium', 'high']).optional(),
    concentrationLevel: z.enum(['low', 'medium', 'high']).optional(),
    studyDuration: z.coerce.number().int().min(10).max(240).optional(),
  }),
  goal: z.object({
    type: z.enum(['memorization', 'comprehension', 'problem_solving', 'creativity', 'review']),
    specificTopic: z.string().optional(),
  }),
  locale: z.enum(['ko', 'en']).default('ko'),
  provider: z.string().default('auto'),
  forceRefresh: z.boolean().default(false),
});

export type StrategyInput = z.infer<typeof strategyInputSchema>;
