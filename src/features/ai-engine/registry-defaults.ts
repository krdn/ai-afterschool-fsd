/**
 * Provider Registry - Default Models
 *
 * 제공자 타입별 기본 모델 설정 데이터입니다.
 * provider-registry.ts의 createDefaultModels 메서드에서 사용합니다.
 */

import type { ProviderType, ModelInput } from './types';

/**
 * 제공자 타입별 기본 모델 설정
 */
export const DEFAULT_MODELS: Record<ProviderType, Array<Partial<ModelInput>>> = {
  openai: [
    {
      modelId: 'gpt-4o',
      displayName: 'GPT-4o',
      contextWindow: 128000,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
    {
      modelId: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      contextWindow: 128000,
      supportsVision: true,
      supportsTools: true,
    },
  ],
  anthropic: [
    {
      modelId: 'claude-sonnet-4-5',
      displayName: 'Claude Sonnet 4.5',
      contextWindow: 200000,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
    {
      modelId: 'claude-3-5-haiku-latest',
      displayName: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      supportsVision: true,
      supportsTools: true,
    },
  ],
  google: [
    {
      modelId: 'gemini-2.5-flash-preview-05-20',
      displayName: 'Gemini 2.5 Flash',
      contextWindow: 1048576,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
    {
      modelId: 'gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash',
      contextWindow: 1048576,
      supportsVision: true,
      supportsTools: true,
    },
  ],
  ollama: [
    {
      modelId: 'llama3.2:3b',
      displayName: 'Llama 3.2 (3B)',
      contextWindow: 8192,
      supportsVision: false,
      supportsTools: false,
      isDefault: true,
    },
  ],
  deepseek: [
    {
      modelId: 'deepseek-chat',
      displayName: 'DeepSeek Chat',
      contextWindow: 64000,
      supportsVision: false,
      supportsTools: true,
      isDefault: true,
    },
    {
      modelId: 'deepseek-reasoner',
      displayName: 'DeepSeek Reasoner',
      contextWindow: 64000,
      supportsVision: false,
      supportsTools: true,
    },
  ],
  mistral: [
    {
      modelId: 'mistral-large-latest',
      displayName: 'Mistral Large',
      contextWindow: 128000,
      supportsVision: false,
      supportsTools: true,
      isDefault: true,
    },
  ],
  cohere: [
    {
      modelId: 'command-r-plus',
      displayName: 'Command R+',
      contextWindow: 128000,
      supportsVision: false,
      supportsTools: true,
      isDefault: true,
    },
  ],
  xai: [
    {
      modelId: 'grok-3',
      displayName: 'Grok 3',
      contextWindow: 131072,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
  ],
  zhipu: [
    {
      modelId: 'glm-4v-plus',
      displayName: 'GLM-4V Plus',
      contextWindow: 8192,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
  ],
  moonshot: [
    {
      modelId: 'kimi-k2.5-preview',
      displayName: 'Kimi K2.5',
      contextWindow: 256000,
      supportsVision: false,
      supportsTools: true,
      isDefault: true,
    },
  ],
  openrouter: [
    {
      modelId: 'openai/gpt-4o',
      displayName: 'GPT-4o (via OpenRouter)',
      contextWindow: 128000,
      supportsVision: true,
      supportsTools: true,
      isDefault: true,
    },
    {
      modelId: 'openai/gpt-4o-mini',
      displayName: 'GPT-4o Mini (via OpenRouter)',
      contextWindow: 128000,
      supportsVision: true,
      supportsTools: true,
    },
    {
      modelId: 'anthropic/claude-sonnet-4-5',
      displayName: 'Claude Sonnet 4.5 (via OpenRouter)',
      contextWindow: 200000,
      supportsVision: true,
      supportsTools: true,
    },
    {
      modelId: 'google/gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash (via OpenRouter)',
      contextWindow: 1000000,
      supportsVision: true,
      supportsTools: true,
    },
  ],
  custom: [],
};
