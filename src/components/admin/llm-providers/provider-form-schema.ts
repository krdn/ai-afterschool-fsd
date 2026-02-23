import { z } from 'zod';
import type { Capability } from '@/features/ai-engine';

// Zod 스키마 정의
export const providerFormSchema = z.object({
  name: z.string().min(1, '제공자명을 입력해주세요').max(100, '100자 이내로 입력해주세요'),
  providerType: z.enum([
    'openai',
    'anthropic',
    'google',
    'ollama',
    'deepseek',
    'mistral',
    'cohere',
    'xai',
    'zhipu',
    'moonshot',
    'openrouter',
    'custom',
  ]),
  baseUrl: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  authType: z.enum(['none', 'api_key', 'bearer', 'custom_header']),
  customAuthHeader: z.string().optional(),
  apiKey: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  costTier: z.enum(['free', 'low', 'medium', 'high']),
  qualityTier: z.enum(['fast', 'balanced', 'premium']),
  isEnabled: z.boolean().default(false),
});

export type ProviderFormValues = z.infer<typeof providerFormSchema>;

export const ALL_CAPABILITIES: { value: Capability; label: string; description: string }[] = [
  { value: 'vision', label: 'Vision', description: '이미지 인식 및 분석' },
  { value: 'function_calling', label: 'Function Calling', description: '함수 호출 지원' },
  { value: 'json_mode', label: 'JSON Mode', description: 'JSON 출력 형식' },
  { value: 'streaming', label: 'Streaming', description: '실시간 스트리밍 응답' },
  { value: 'tools', label: 'Tools', description: '도구 사용 지원' },
];
