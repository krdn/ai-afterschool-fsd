/**
 * OpenRouter Adapter (OpenAI Compatible)
 *
 * OpenRouter - 200+ AI 모델을 단일 API로 접근
 * OpenAI 호환 API 사용 (https://openrouter.ai/api/v1)
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, streamText, type LanguageModel } from 'ai';
import { BaseAdapter } from './base';
import type {
  ProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamResult,
  ValidationResult,
  ModelInfo,
  ModelParams,
} from '../types';

export class OpenRouterAdapter extends BaseAdapter {
  readonly providerType = 'openrouter';
  readonly supportsVision = true;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: effectiveBaseUrl,
      apiKey: effectiveApiKey,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Afterschool',
      },
    });

    return openrouter.chatModel(modelId);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const result = await generateText({
      model: options.model,
      ...(options.messages
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }),
      system: options.system,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });

    return {
      text: result.text,
      usage: result.usage,
    };
  }

  async stream(options: GenerateOptions): Promise<StreamResult> {
    const result = streamText({
      model: options.model,
      ...(options.messages
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }),
      system: options.system,
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
      topP: options.topP,
    });

    return {
      stream: result.textStream,
      provider: this.providerType,
      model: 'unknown',
    };
  }

  async validate(config: ProviderConfig): Promise<ValidationResult> {
    try {
      const apiKey = config.apiKeyEncrypted
        ? this.decryptApiKey(config.apiKeyEncrypted)
        : this.apiKey;

      if (!apiKey) {
        return {
          isValid: false,
          error: 'API 키가 설정되지 않았습니다.',
        };
      }

      const baseUrl = (config.baseUrl || this.baseUrl).replace(/\/$/, '');

      // OpenRouter 전용: /auth/key 엔드포인트로 무비용 검증
      const response = await fetch(`${baseUrl}/auth/key`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return { isValid: true };
      }

      if (response.status === 401) {
        return {
          isValid: false,
          error: 'API 키가 유효하지 않습니다.',
        };
      }

      if (response.status === 402) {
        return {
          isValid: true,
          error: 'API 키는 유효하지만 크레딧이 부족합니다. 충전 후 이용하세요.',
        };
      }

      return {
        isValid: false,
        error: `검증 실패 (HTTP ${response.status})`,
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.handleError(error, 'validation').message,
      };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const baseUrl = (config.baseUrl || this.baseUrl).replace(/\/$/, '');

      // OpenRouter /models API는 인증 불필요 (공개 API)
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('OpenRouter models API error:', response.status);
        return this.getDefaultModels();
      }

      const data = await response.json() as {
        data?: Array<{
          id: string;
          name: string;
          context_length?: number;
          architecture?: {
            modality?: string;
            input_modalities?: string[];
          };
          supported_parameters?: string[];
        }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        return this.getDefaultModels();
      }

      return data.data.map((model) => ({
        id: model.id,
        modelId: model.id,
        displayName: model.name || this.formatDisplayName(model.id),
        contextWindow: model.context_length || 4096,
        supportsVision: this.checkVisionSupport(model),
        supportsTools: model.supported_parameters?.includes('tools') ?? false,
      }));
    } catch (error) {
      console.error('Failed to fetch OpenRouter models:', error);
      return this.getDefaultModels();
    }
  }

  private checkVisionSupport(model: {
    architecture?: { modality?: string; input_modalities?: string[] };
  }): boolean {
    if (model.architecture?.input_modalities?.includes('image')) return true;
    if (model.architecture?.modality === 'multimodal') return true;
    return false;
  }

  private formatDisplayName(modelId: string): string {
    // TODO(human): 모델 ID를 사람이 읽기 좋은 표시명으로 변환
    // 현재: 'meta-llama/llama-3.3-70b-instruct' → 'llama-3.3-70b-instruct (via OpenRouter)'
    // 목표: 더 읽기 좋은 이름 (예: 'Llama 3.3 70B Instruct (via OpenRouter)')
    const parts = modelId.split('/');
    const name = parts.length > 1 ? parts[1] : parts[0];
    return `${name} (via OpenRouter)`;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      { id: 'openai/gpt-4o', modelId: 'openai/gpt-4o', displayName: 'GPT-4o (via OpenRouter)', contextWindow: 128000, supportsVision: true, supportsTools: true },
      { id: 'openai/gpt-4o-mini', modelId: 'openai/gpt-4o-mini', displayName: 'GPT-4o Mini (via OpenRouter)', contextWindow: 128000, supportsVision: true, supportsTools: true },
      { id: 'anthropic/claude-sonnet-4-5', modelId: 'anthropic/claude-sonnet-4-5', displayName: 'Claude Sonnet 4.5 (via OpenRouter)', contextWindow: 200000, supportsVision: true, supportsTools: true },
      { id: 'anthropic/claude-3-5-haiku', modelId: 'anthropic/claude-3-5-haiku', displayName: 'Claude 3.5 Haiku (via OpenRouter)', contextWindow: 200000, supportsVision: false, supportsTools: true },
      { id: 'google/gemini-2.5-flash', modelId: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash (via OpenRouter)', contextWindow: 1000000, supportsVision: true, supportsTools: true },
      { id: 'google/gemini-2.0-flash', modelId: 'google/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash (via OpenRouter)', contextWindow: 1048576, supportsVision: true, supportsTools: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', modelId: 'meta-llama/llama-3.3-70b-instruct', displayName: 'Llama 3.3 70B (via OpenRouter)', contextWindow: 131072, supportsVision: false, supportsTools: true },
      { id: 'deepseek/deepseek-chat-v3', modelId: 'deepseek/deepseek-chat-v3', displayName: 'DeepSeek V3 (via OpenRouter)', contextWindow: 131072, supportsVision: false, supportsTools: true },
      { id: 'mistralai/mistral-large', modelId: 'mistralai/mistral-large', displayName: 'Mistral Large (via OpenRouter)', contextWindow: 128000, supportsVision: false, supportsTools: true },
      { id: 'qwen/qwen-2.5-72b-instruct', modelId: 'qwen/qwen-2.5-72b-instruct', displayName: 'Qwen 2.5 72B (via OpenRouter)', contextWindow: 131072, supportsVision: false, supportsTools: true },
    ];
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return {
      temperature: params?.temperature ?? 0.7,
      max_tokens: params?.maxTokens,
      top_p: params?.topP,
    };
  }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Afterschool',
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://openrouter.ai/api/v1';
  }
}
