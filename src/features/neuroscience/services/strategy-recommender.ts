import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine';
import type { ProviderName } from '@/features/ai-engine/providers/types';
import { logger } from '@/lib/logger';
import { buildCondition } from '../condition-builder';
import { NeuroscienceStrategySchema, type NeuroscienceCondition, type NeuroscienceStrategy } from '../types';
import { getStrategySystemPrompt } from '../prompts/strategy';

type StrategyResult = {
  strategy: NeuroscienceStrategy;
  provider: string;
  model: string;
};

export async function getStrategyRecommendation(
  condition: NeuroscienceCondition,
  options: { teacherId: string; locale?: string; providerId?: string }
): Promise<StrategyResult> {
  const { teacherId, locale = 'ko', providerId } = options;
  const built = buildCondition(condition);

  // LLM 호출
  const llmOptions = {
    featureType: 'neuroscience_strategy',
    prompt: built.contextString,
    system: getStrategySystemPrompt(locale),
    teacherId,
    maxOutputTokens: 4096,
  };

  const result = providerId && providerId !== 'auto'
    ? await generateWithSpecificProvider(providerId as ProviderName, llmOptions)
    : await generateWithProvider(llmOptions);

  // 응답 파싱
  const parsed = NeuroscienceStrategySchema.safeParse(JSON.parse(result.text));
  if (!parsed.success) {
    logger.error({ err: parsed.error, rawText: result.text.slice(0, 500) }, 'Failed to parse neuroscience strategy response');
    throw new Error('학습 전략 응답 형식이 올바르지 않습니다.');
  }

  return {
    strategy: parsed.data,
    provider: result.provider,
    model: result.model,
  };
}
