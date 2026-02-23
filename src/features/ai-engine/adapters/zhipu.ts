/**
 * Zhipu AI Adapter (OpenAI Compatible)
 *
 * Zhipu AI GLM 모델 - OpenAI 호환 API 사용
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

export class ZhipuAdapter extends BaseAdapter {
  readonly providerType = 'zhipu';
  readonly supportsVision = true;
  readonly supportsStreaming = false;
  readonly supportsTools = true;
  readonly supportsJsonMode = true;

  private apiKey: string = '';
  private baseUrl: string = 'https://api.z.ai/api/paas/v4';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveApiKey = effectiveConfig.apiKeyEncrypted
      ? this.decryptApiKey(effectiveConfig.apiKeyEncrypted)
      : this.apiKey;
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    const zhipu = createOpenAICompatible({
      name: 'zhipu',
      baseURL: effectiveBaseUrl,
      apiKey: effectiveApiKey,
    });

    return zhipu.chatModel(modelId);
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
    throw new Error('Stream not implemented for Zhipu adapter');
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

      const testModel = this.createModel('glm-4.5-air', config);

      await generateText({
        model: testModel,
        prompt: 'Hello',
        maxOutputTokens: 10,
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
        console.error('Zhipu API error:', response.status);
        return this.getDefaultModels();
      }

      const data = await response.json() as { data?: Array<{ id: string }> };

      if (!data.data || !Array.isArray(data.data)) {
        return this.getDefaultModels();
      }

      return data.data.map((model) => ({
        id: model.id,
        modelId: model.id,
        displayName: this.formatDisplayName(model.id),
        contextWindow: 8192,
        supportsVision: this.isVisionModel(model.id),
        supportsTools: true,
      }));
    } catch (error) {
      console.error('Failed to fetch Zhipu models:', error);
      return this.getDefaultModels();
    }
  }

  private formatDisplayName(modelId: string): string {
    const parts = modelId.split('-');
    const name = parts[0].toUpperCase();
    const version = parts.slice(1).join(' ');
    const formattedVersion = version.charAt(0).toUpperCase() + version.slice(1);
    return `${name} ${formattedVersion}`;
  }

  private getDefaultModels(): ModelInfo[] {
    return [
      {
        id: 'glm-4.5-air',
        modelId: 'glm-4.5-air',
        displayName: 'GLM-4.5 Air',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'glm-4.5',
        modelId: 'glm-4.5',
        displayName: 'GLM-4.5',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'glm-4.5v',
        modelId: 'glm-4.5v',
        displayName: 'GLM-4.5V',
        contextWindow: 128000,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'glm-4.6',
        modelId: 'glm-4.6',
        displayName: 'GLM-4.6',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'glm-4.6v',
        modelId: 'glm-4.6v',
        displayName: 'GLM-4.6V',
        contextWindow: 128000,
        supportsVision: true,
        supportsTools: true,
      },
      {
        id: 'glm-4.7',
        modelId: 'glm-4.7',
        displayName: 'GLM-4.7',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
      {
        id: 'glm-5',
        modelId: 'glm-5',
        displayName: 'GLM-5',
        contextWindow: 8192,
        supportsVision: false,
        supportsTools: true,
      },
    ];
  }

  /**
   * 모델 ID에 'v' 접미사가 있으면 Vision 모델로 판별
   * 예: glm-4.5v, glm-4.6v, glm-4.6v-flash, glm-4v-plus → true
   *     glm-4.5, glm-4.7, glm-5 → false
   */
  private isVisionModel(modelId: string): boolean {
    return /\dv($|-)/.test(modelId);
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
    return 'https://api.z.ai/api/paas/v4';
  }
}
