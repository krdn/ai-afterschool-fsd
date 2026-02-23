/**
 * Mistral AI Adapter
 *
 * Vercel AI SDK의 @ai-sdk/mistral와 통합됩니다.
 */

import { createMistral } from '@ai-sdk/mistral';
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

export class MistralAdapter extends BaseAdapter {
  readonly providerType = 'mistral';
  readonly supportsVision = false;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.mistral.ai/v1';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;

    const provider = createMistral({
      apiKey: effectiveApiKey,
    });

    return provider(modelId);
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

    return { text: result.text, usage: result.usage };
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

    return { stream: result.textStream, provider: this.providerType, model: 'unknown' };
  }

  async validate(config: ProviderConfig): Promise<ValidationResult> {
    try {
      const apiKey = config.apiKeyEncrypted
        ? this.decryptApiKey(config.apiKeyEncrypted)
        : this.apiKey;

      if (!apiKey) {
        return { isValid: false, error: 'API 키가 설정되지 않았습니다.' };
      }

      const testModel = this.createModel('mistral-small-latest', config);
      await generateText({ model: testModel, prompt: 'Hello', maxOutputTokens: 10 });

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: this.handleError(error, 'validation').message };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    return [
      { id: 'mistral-large-latest', modelId: 'mistral-large-latest', displayName: 'Mistral Large', contextWindow: 128000, supportsVision: false, supportsTools: true },
      { id: 'mistral-medium-latest', modelId: 'mistral-medium-latest', displayName: 'Mistral Medium', contextWindow: 128000, supportsVision: false, supportsTools: true },
      { id: 'mistral-small-latest', modelId: 'mistral-small-latest', displayName: 'Mistral Small', contextWindow: 128000, supportsVision: false, supportsTools: true },
      { id: 'codestral-latest', modelId: 'codestral-latest', displayName: 'Codestral', contextWindow: 32000, supportsVision: false, supportsTools: true },
    ];
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return { temperature: params?.temperature ?? 0.7, max_tokens: params?.maxTokens, top_p: params?.topP };
  }

  setApiKey(apiKey: string): void { this.apiKey = apiKey; }
  setBaseUrl(baseUrl: string): void { this.baseUrl = baseUrl; }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = config.apiKeyEncrypted ? this.decryptApiKey(config.apiKeyEncrypted) : this.apiKey;
    return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
  }

  protected getDefaultBaseUrl(): string { return 'https://api.mistral.ai/v1'; }
}
