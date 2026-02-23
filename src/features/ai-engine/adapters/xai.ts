/**
 * xAI (Grok) Adapter
 *
 * Vercel AI SDK의 @ai-sdk/xai와 통합됩니다.
 */

import { createXai } from '@ai-sdk/xai';
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

export class XaiAdapter extends BaseAdapter {
  readonly providerType = 'xai';
  readonly supportsVision = true;
  readonly supportsStreaming = true;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.x.ai/v1';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;

    const provider = createXai({
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

      const testModel = this.createModel('grok-3-mini', config);
      await generateText({ model: testModel, prompt: 'Hello', maxOutputTokens: 10 });

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: this.handleError(error, 'validation').message };
    }
  }

  async listModels(_config: ProviderConfig): Promise<ModelInfo[]> {
    return [
      { id: 'grok-3', modelId: 'grok-3', displayName: 'Grok 3', contextWindow: 131072, supportsVision: true, supportsTools: true },
      { id: 'grok-3-fast', modelId: 'grok-3-fast', displayName: 'Grok 3 Fast', contextWindow: 131072, supportsVision: true, supportsTools: true },
      { id: 'grok-3-mini', modelId: 'grok-3-mini', displayName: 'Grok 3 Mini', contextWindow: 131072, supportsVision: false, supportsTools: true },
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

  protected getDefaultBaseUrl(): string { return 'https://api.x.ai/v1'; }
}
