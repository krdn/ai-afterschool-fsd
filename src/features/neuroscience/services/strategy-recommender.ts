import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine';
import type { ProviderName } from '@/features/ai-engine/providers/types';
import { db } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { buildCondition } from '../condition-builder';
import { NeuroscienceStrategySchema, type NeuroscienceCondition, type NeuroscienceStrategy } from '../types';
import { getStrategySystemPrompt } from '../prompts/strategy';

type StrategyResult = {
  strategy: NeuroscienceStrategy;
  provider: string;
  model: string;
  cached: boolean;
};

export async function getStrategyRecommendation(
  condition: NeuroscienceCondition,
  options: { teacherId: string; locale?: string; forceRefresh?: boolean; providerId?: string }
): Promise<StrategyResult> {
  const { teacherId, locale = 'ko', forceRefresh = false, providerId } = options;
  const built = buildCondition(condition);

  // 캐시 확인
  if (!forceRefresh) {
    const cached = await db.neuroscienceCache.findUnique({
      where: { conditionHash_requestType: { conditionHash: built.hash, requestType: 'strategy' } },
    });
    if (cached && cached.expiresAt > new Date()) {
      return {
        strategy: cached.response as unknown as NeuroscienceStrategy,
        provider: cached.provider,
        model: cached.modelId,
        cached: true,
      };
    }
  }

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

  // 캐시 저장
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.neuroscienceCache.upsert({
    where: { conditionHash_requestType: { conditionHash: built.hash, requestType: 'strategy' } },
    create: {
      studentId: condition.profile?.studentId ?? null,
      conditionHash: built.hash,
      requestType: 'strategy',
      condition: JSON.parse(JSON.stringify(condition)),
      response: JSON.parse(JSON.stringify(parsed.data)),
      provider: result.provider,
      modelId: result.model,
      tokenUsage: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      expiresAt,
    },
    update: {
      response: JSON.parse(JSON.stringify(parsed.data)),
      provider: result.provider,
      modelId: result.model,
      tokenUsage: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      expiresAt,
    },
  });

  return {
    strategy: parsed.data,
    provider: result.provider,
    model: result.model,
    cached: false,
  };
}
