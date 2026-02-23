/**
 * Moonshot AI (KIMI) Adapter (OpenAI Compatible)
 *
 * Moonshot AI KIMI 모델 - OpenAI 호환 API 사용
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import { BaseAdapter } from './base';
import type {
  ProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamResult,
  ValidationResult,
  ModelInfo,
} from '../types';

export class MoonshotAdapter extends BaseAdapter {
  readonly providerType = 'moonshot';
  readonly supportsVision = true;
  readonly supportsStreaming = false;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.moonshot.ai/v1';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    const moonshot = createOpenAICompatible({
      name: 'moonshot',
      baseURL: effectiveBaseUrl,
      apiKey: effectiveApiKey,
    });

    return moonshot.chatModel(modelId);
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

  async stream(_options: GenerateOptions): Promise<StreamResult> {
    throw new Error('Stream not implemented for Moonshot adapter');
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

      const testModel = this.createModel('kimi-latest', config);

      await generateText({
        model: testModel,
        prompt: 'Hello',
        maxOutputTokens: 10,
      });

      return {
        isValid: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);

      // 잔액 부족 / 계정 정지 → API 키 자체는 유효
      if (
        msg.includes('insufficient balance') ||
        msg.includes('suspended') ||
        msg.includes('quota') ||
        msg.includes('credit')
      ) {
        return {
          isValid: true,
          error: 'API 키는 유효하지만 잔액이 부족합니다. 충전 후 이용하세요.',
        };
      }

      return {
        isValid: false,
        error: this.handleError(error, 'validation').message,
      };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    try {
      const apiKey = config.apiKeyEncrypted
        ? this.decryptApiKey(config.apiKeyEncrypted)
        : this.apiKey;
      const baseUrl = config.baseUrl || this.baseUrl;

      if (!apiKey) {
        return this.getDefaultModels();
      }

      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Moonshot API error:', response.status);
        return this.getDefaultModels();
      }

      const data = await response.json() as { data?: Array<{ id: string; context_length?: number; supports_image_in?: boolean }> };

      if (!data.data || !Array.isArray(data.data)) {
        return this.getDefaultModels();
      }

      return data.data.map((model) => ({
        id: model.id,
        modelId: model.id,
        displayName: this.formatDisplayName(model.id),
        contextWindow: model.context_length || 8192,
        supportsVision: model.supports_image_in || false,
        supportsTools: true,
      }));
    } catch (error) {
      console.error('Failed to fetch Moonshot models:', error);
      return this.getDefaultModels();
    }
  }

  private formatDisplayName(modelId: string): string {
    if (modelId.startsWith('kimi-')) {
      const parts = modelId.replace('kimi-', '').split('-');
      return 'Kimi ' + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    if (modelId.startsWith('moonshot-')) {
      const parts = modelId.replace('moonshot-v1-', '').split('-');
      return 'Moonshot ' + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return modelId;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'kimi-k2.5',
        modelId: 'kimi-k2.5',
        displayName: 'Kimi K2.5',
        contextWindow: 262144,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'kimi-k2-thinking',
        modelId: 'kimi-k2-thinking',
        displayName: 'Kimi K2 Thinking',
        contextWindow: 262144,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'kimi-latest',
        modelId: 'kimi-latest',
        displayName: 'Kimi Latest',
        contextWindow: 131072,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'moonshot-v1-8k',
        modelId: 'moonshot-v1-8k',
        displayName: 'Moonshot 8K',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'moonshot-v1-32k',
        modelId: 'moonshot-v1-32k',
        displayName: 'Moonshot 32K',
        contextWindow: 32768,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'moonshot-v1-128k',
        modelId: 'moonshot-v1-128k',
        displayName: 'Moonshot 128K',
        contextWindow: 131072,
        supportsVision: false,
        supportsTools: true,
      },
    ];
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  normalizeParams(): Record<string, unknown> {
    return {};
  }

  protected buildHeaders(_config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  protected getDefaultBaseUrl(): string {
    return 'https://api.moonshot.ai/v1';
  }
}
