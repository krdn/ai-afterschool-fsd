/**
 * Perplexity Adapter (OpenAI Compatible)
 *
 * Perplexity - 웹 검색 내장 AI 모델
 * OpenAI 호환 API 사용 (https://api.perplexity.ai)
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

export class PerplexityAdapter extends BaseAdapter {
  readonly providerType = 'perplexity';
  readonly supportsVision = false;
  readonly supportsStreaming = true;
  readonly supportsTools = false;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.perplexity.ai';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    const perplexity = createOpenAICompatible({
      name: 'perplexity',
      baseURL: effectiveBaseUrl,
      apiKey: effectiveApiKey,
    });

    return perplexity.chatModel(modelId);
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

      // Perplexity는 별도의 키 검증 엔드포인트가 없으므로 키 존재 여부만 확인
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: this.handleError(error, 'validation').message,
      };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    // Perplexity는 모델 목록 API를 제공하지 않으므로 정적 목록 반환
    return [
      {
        id: 'sonar',
        modelId: 'sonar',
        displayName: 'Sonar (Perplexity)',
        contextWindow: 128000,
        supportsVision: false,
        supportsTools: false,
      },
      {
        id: 'sonar-pro',
        modelId: 'sonar-pro',
        displayName: 'Sonar Pro (Perplexity)',
        contextWindow: 200000,
        supportsVision: false,
        supportsTools: false,
      },
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
      temperature: params?.temperature ?? 0.3,
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
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.perplexity.ai';
  }
}
