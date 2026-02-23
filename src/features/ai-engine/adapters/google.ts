/**
 * Google Adapter
 *
 * Vercel AI SDK의 @ai-sdk/google와 통합됩니다.
 */

import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
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

export class GoogleAdapter extends BaseAdapter {
  readonly providerType = 'google';
  readonly supportsVision = true;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    if (effectiveApiKey) {
      const custom = createGoogleGenerativeAI({
        apiKey: effectiveApiKey,
      });
      return custom(modelId);
    }

    return google(modelId);
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

      const testModel = this.createModel('gemini-2.0-flash', config);

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
        id: 'gemini-2.5-flash-preview-05-20',
        modelId: 'gemini-2.5-flash-preview-05-20',
        displayName: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'gemini-2.0-flash',
        modelId: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'gemini-2.0-pro',
        modelId: 'gemini-2.0-pro',
        displayName: 'Gemini 2.0 Pro',
        contextWindow: 2097152,
        supportsVision: true,
        supportsTools: true,
      },
    ];
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return {
      temperature: params?.temperature ?? 0.7,
      maxOutputTokens: params?.maxTokens,
      topP: params?.topP,
    };
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;

    return {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com/v1beta';
  }
}
