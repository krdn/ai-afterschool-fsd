/**
 * Ollama Adapter
 *
 * Vercel AI SDK의 ollama-ai-provider-v2와 통합됩니다.
 * 로컬/원격 Ollama 서버 및 Open WebUI 프록시를 지원합니다.
 */

import { createOllama } from 'ollama-ai-provider-v2';
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

export class OllamaAdapter extends BaseAdapter {
  readonly providerType = 'ollama';
  readonly supportsVision = true;
  readonly supportsStreaming = true;
  readonly supportsTools = false;
  readonly supportsJsonMode = false;

  private apiKey: string = '';
  private baseUrl: string = 'http://localhost:11434/api';

  createModel(modelId: string, config?: ProviderConfig): LanguageModel {
    const effectiveConfig = config || ({} as ProviderConfig);
    const effectiveBaseUrl = effectiveConfig.baseUrl || this.baseUrl;

    // 직접 Ollama 서버 URL이 있으면 네이티브 API 우선 사용
    // (Open WebUI 프록시에 모델이 미등록되어 있어도 직접 서버에서 실행 가능)
    const directUrl = this.getDirectUrl(effectiveBaseUrl);
    return createOllama({
      baseURL: this.ensureHttps(directUrl),
    })(modelId);
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
      const baseUrl = this.ensureHttps(config.baseUrl || this.baseUrl);
      const apiKey = config.apiKeyEncrypted
        ? this.decryptApiKey(config.apiKeyEncrypted)
        : this.apiKey;

      // 연결 테스트 - /api/version 호출
      const versionUrl = baseUrl.replace(/\/api$/, '/api/version');

      console.log('[OllamaAdapter] Validating URL:', versionUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log('[OllamaAdapter] Timeout after 10s');
        controller.abort();
      }, 10000);

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(versionUrl, {
        signal: controller.signal,
        headers: {
          ...headers,
          'User-Agent': 'AI-AfterSchool/1.0',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          isValid: false,
          error: `Ollama 서버 연결 실패: HTTP ${response.status}`,
        };
      }

      // 모델 존재 여부로 실제 연결 유효성 검증
      const modelsController = new AbortController();
      const modelsTimeout = setTimeout(() => modelsController.abort(), 10000);

      try {
        let modelsResponse: Response;

        if (apiKey) {
          // 프록시 모드: Open WebUI /api/models (Bearer 인증 필요)
          const modelsUrl = baseUrl.replace(/\/api$/, '/api/models');
          modelsResponse = await fetch(modelsUrl, {
            signal: modelsController.signal,
            headers: { 'Authorization': `Bearer ${apiKey}` },
          });
        } else {
          // 직접 연결 모드: Ollama /api/tags (인증 불필요)
          const tagsUrl = baseUrl.replace(/\/api$/, '/api/tags');
          modelsResponse = await fetch(tagsUrl, {
            signal: modelsController.signal,
            headers,
          });
        }

        clearTimeout(modelsTimeout);

        if (!modelsResponse.ok) {
          return {
            isValid: false,
            error: apiKey
              ? `API 키 인증 실패: HTTP ${modelsResponse.status}`
              : `모델 목록 조회 실패: HTTP ${modelsResponse.status}`,
          };
        }

        // JSON 응답인지 확인 (Open WebUI는 인증 실패 시 HTML 반환)
        const contentType = modelsResponse.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return {
            isValid: false,
            error: 'API 키 인증 실패: 유효하지 않은 응답 형식',
          };
        }

        const modelsData = await modelsResponse.json() as { data?: any[]; models?: any[] };
        const modelCount = apiKey
          ? (modelsData.data?.length ?? 0)
          : (modelsData.models?.length ?? 0);

        if (modelCount === 0 && apiKey) {
          // 프록시에서 모델 0개 → 직접 Ollama 서버로 폴백 확인
          const directUrl = this.getDirectUrl(baseUrl);
          const directModels = await this.fetchDirectModels(directUrl);
          if (directModels.length === 0) {
            return {
              isValid: true,
              error: '연결 성공, 그러나 사용 가능한 모델이 없습니다.',
            };
          }
        } else if (modelCount === 0) {
          return {
            isValid: true,
            error: '연결 성공, 그러나 사용 가능한 모델이 없습니다.',
          };
        }
      } catch {
        clearTimeout(modelsTimeout);
        // 모델 조회 실패해도 서버 연결 자체는 성공이므로 경고만
        return {
          isValid: true,
          error: '서버 연결 성공, 모델 목록 조회에 실패했습니다.',
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      console.error('[OllamaAdapter] Validation error:', error);

      // 더 구체적인 오류 메시지
      let errorMessage = '알 수 없는 오류';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = '연결 시간 초과 (10초). 서버가 접근 가능한지 확인하세요.';
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = '연결 거부됨. 서버가 실행 중인지 확인하세요.';
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = '호스트를 찾을 수 없음. URL을 확인하세요.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        isValid: false,
        error: `[Ollama] ${errorMessage}`,
      };
    }
  }

  async listModels(config: ProviderConfig): Promise<ModelInfo[]> {
    const baseUrl = this.ensureHttps(config.baseUrl || this.baseUrl);
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;
    const isProxy = !!apiKey;

    try {
      // 프록시 모드: Open WebUI /api/models 먼저 시도
      if (isProxy) {
        const proxyModels = await this.fetchProxyModels(baseUrl, apiKey);
        if (proxyModels.length > 0) {
          return proxyModels;
        }
        // 프록시에서 모델을 가져오지 못하면 직접 Ollama /api/tags 폴백
        // OLLAMA_DIRECT_URL이 설정되어 있으면 해당 URL을 사용
        const directUrl = this.getDirectUrl(baseUrl);
        console.log('[OllamaAdapter] 프록시에서 모델 없음, 직접 Ollama 서버로 폴백:', directUrl);
        return await this.fetchDirectModels(directUrl);
      }

      // 직접 Ollama /api/tags
      return await this.fetchDirectModels(baseUrl);
    } catch {
      return [];
    }
  }

  /**
   * Open WebUI 프록시에서 모델 목록을 가져옵니다.
   */
  private async fetchProxyModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
    try {
      const modelsUrl = baseUrl.replace(/\/api$/, '/api/models');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(modelsUrl, {
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      clearTimeout(timeout);

      if (!response.ok) return [];

      const data = await response.json() as { data?: any[] };
      if (!data.data) return [];

      return data.data
        .filter((m: { ollama?: unknown }) => m.ollama)
        .map((m: { id: string; name: string; ollama?: { size?: number } }) => ({
          id: m.id,
          modelId: m.id,
          displayName: m.name || m.id,
          contextWindow: 8192,
          supportsVision: m.id.includes('vision') || m.id.includes('llava'),
          supportsTools: false,
        }));
    } catch {
      return [];
    }
  }

  /**
   * 직접 Ollama 서버에서 모델 목록을 가져옵니다.
   */
  private async fetchDirectModels(baseUrl: string, apiKey?: string): Promise<ModelInfo[]> {
    try {
      const tagsUrl = baseUrl.replace(/\/api$/, '/api/tags');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(tagsUrl, {
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeout);

      if (!response.ok) return [];

      const data = await response.json() as { models?: any[] };
      const models = data.models || [];
      return models.map((m: { name: string }) => ({
        id: m.name,
        modelId: m.name,
        displayName: m.name,
        contextWindow: 8192,
        supportsVision: m.name.includes('vision') || m.name.includes('llava'),
        supportsTools: false,
      }));
    } catch {
      return [];
    }
  }

  normalizeParams(params?: ModelParams): Record<string, unknown> {
    return {
      temperature: params?.temperature ?? 0.7,
      num_predict: params?.maxTokens,
      top_p: params?.topP,
    };
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {};
    const apiKey = config.apiKeyEncrypted
      ? this.decryptApiKey(config.apiKeyEncrypted)
      : this.apiKey;

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  protected getDefaultBaseUrl(): string {
    return 'http://localhost:11434/api';
  }

  /**
   * 프록시 폴백 시 직접 Ollama 서버 URL을 반환합니다.
   * OLLAMA_DIRECT_URL 환경변수가 있으면 우선 사용, 없으면 기본 URL 사용.
   */
  private getDirectUrl(_proxyBaseUrl: string): string {
    const directUrl = process.env.OLLAMA_DIRECT_URL;
    if (directUrl) {
      return this.ensureHttps(directUrl);
    }
    // 환경변수 없으면 기본 로컬 Ollama 서버
    return this.getDefaultBaseUrl();
  }

  /**
   * 외부 도메인의 HTTP URL을 HTTPS로 변환합니다.
   * 로컬 IP/localhost는 HTTP 유지.
   */
  private ensureHttps(url: string): string {
    if (!url.startsWith('http://')) return url;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      // 로컬 주소는 HTTP 유지
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.')
      ) {
        return url;
      }
      return url.replace(/^http:\/\//, 'https://');
    } catch {
      return url;
    }
  }
}
