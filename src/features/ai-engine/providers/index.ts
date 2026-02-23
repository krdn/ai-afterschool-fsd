import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { deepseek } from '@ai-sdk/deepseek';
import { mistral } from '@ai-sdk/mistral';
import { cohere } from '@ai-sdk/cohere';
import { xai } from '@ai-sdk/xai';
import { zhipu } from 'zhipu-ai-provider';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { createOllamaInstance } from './ollama';
import type { ProviderName } from './types';

const moonshotProvider = createOpenAICompatible({
  name: 'moonshot',
  baseURL: 'https://api.moonshot.ai/v1',
});

const openrouterProvider = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
});

export const providers: Record<ProviderName, (model?: string) => LanguageModel> = {
  anthropic: (model?: string) => anthropic(model || 'claude-sonnet-4-5'),
  openai: (model?: string) => openai(model || 'gpt-4o'),
  google: (model?: string) => google(model || 'gemini-2.5-flash-preview-05-20'),
  ollama: (model?: string) => {
    const ollamaInstance = createOllamaInstance();
    return ollamaInstance(model || 'llama3.2:3b');
  },
  deepseek: (model?: string) => deepseek(model || 'deepseek-chat'),
  mistral: (model?: string) => mistral(model || 'mistral-large-latest'),
  cohere: (model?: string) => cohere(model || 'command-r-plus'),
  xai: (model?: string) => xai(model || 'grok-3'),
  zhipu: (model?: string) => zhipu(model || 'glm-4v-plus'),
  moonshot: (model?: string) => moonshotProvider.chatModel(model || 'kimi-k2.5-preview'),
  openrouter: (model?: string) => openrouterProvider.chatModel(model || 'openai/gpt-4o'),
};

/**
 * 프로바이더 인스턴스를 반환합니다.
 * Ollama는 ollamaOptions를 통해 DB 설정(baseUrl, apiKey)을 전달할 수 있습니다.
 * 호출 측(router.ts 등 서버 전용 코드)에서 DB 접근 후 옵션을 넘겨야 합니다.
 */
export function getProvider(
  name: ProviderName,
  model?: string,
  ollamaOptions?: { baseUrl?: string; apiKey?: string }
) {
  if (name === 'ollama') {
    const ollamaInstance = createOllamaInstance(ollamaOptions);
    return ollamaInstance(model || 'llama3.2:3b');
  }
  const providerFn = providers[name];
  if (!providerFn) {
    throw new Error(`Unknown provider: ${name}`);
  }
  return providerFn(model);
}

export * from './types';
export {
  testOllamaConnection,
  getOllamaModels,
  checkOllamaHealth,
  getOllamaBaseUrl,
} from './ollama';
