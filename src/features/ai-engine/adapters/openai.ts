/**
 * OpenAI Adapter
 *
 * Vercel AI SDK의 @ai-sdk/openai와 통합됩니다.
 */

import { openai, createOpenAI } from '@ai-sdk/openai';
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

export class OpenAIAdapter extends BaseAdapter {
  readonly providerType = 'openai';
  readonly supportsVision = true;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.openai.com/v1';
  private customOpenAI: ReturnType<typeof createOpenAI> | null = null;

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    if (effectiveBaseUrl !== 'https://api.openai.com/v1' || effectiveApiKey) {
      const custom = createOpenAI({
        apiKey: effectiveApiKey,
        baseURL: effectiveBaseUrl,
      });
      return custom(modelId);
    }

    return openai(modelId);
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const model = options.model;

    const result = await generateText({
      model,
      ...(options.messages 
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }
      ),
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
    const model = options.model;

    const result = streamText({
      model,
      ...(options.messages 
        ? { messages: options.messages }
        : { prompt: options.prompt || '' }
      ),
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

      const testModel = this.createModel('gpt-4o-mini', config);

      await generateText({
        model: testModel,
        prompt: 'Hello',
        maxOutputTokens: 1,
      });

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.handleError(error, 'validation').message,
      };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4o',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'gpt-4o-mini',
        modelId: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        contextWindow: 128000,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'gpt-4-turbo',
        modelId: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'gpt-3.5-turbo',
        modelId: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        supportsVision: false,
        supportsTools: true,
      },
    ];
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return {
      temperature: params?.temperature ?? 0.7,
      max_tokens: params?.maxTokens,
      top_p: params?.topP,
      frequency_penalty: params?.frequencyPenalty,
      presence_penalty: params?.presencePenalty,
    };
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.customOpenAI = null;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
    this.customOpenAI = null;
  }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;

    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.openai.com/v1';
  }
}
