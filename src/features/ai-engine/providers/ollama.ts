import { createOllama } from 'ollama-ai-provider-v2';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://192.168.0.5:11434/api';
}

/**
 * 모델 목록 조회 등 직접 Ollama API 호출용 URL
 * OLLAMA_BASE_URL이 프록시(Open WebUI 등)를 가리킬 경우,
 * OLLAMA_DIRECT_URL로 직접 Ollama 서버에 접근합니다.
 */
function getOllamaDirectUrl(): string {
  return process.env.OLLAMA_DIRECT_URL || 'http://192.168.0.5:11434/api';
}

/**
 * 외부 도메인의 HTTP URL을 HTTPS로 변환.
 * 301 리다이렉트 시 POST body 유실 방지를 위해 미리 HTTPS로 변환합니다.
 * 로컬 IP/localhost는 HTTP 유지.
 */
function ensureHttps(url: string): string {
  if (!url.startsWith('http://')) return url;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    // 로컬 주소는 HTTP 유지
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return url;
    }
    return url.replace(/^http:\/\//, 'https://');
  } catch {
    return url;
  }
}

/**
 * Open WebUI 프록시 vs 직접 Ollama 서버 감지.
 * API 키가 있으면 Open WebUI 프록시로 판단 → OpenAI 호환 API 사용.
 * API 키가 없으면 직접 Ollama 서버 → Ollama 네이티브 API 사용.
 */
export function createOllamaInstance(options?: { baseUrl?: string; apiKey?: string }): (model: string) => LanguageModel {
  const rawUrl = options?.baseUrl || getOllamaBaseUrl();
  const baseUrl = ensureHttps(rawUrl);

  // API 키가 있으면 Open WebUI 프록시 → OpenAI 호환 모드
  if (options?.apiKey) {
    const provider = createOpenAICompatible({
      name: 'ollama-proxy',
      baseURL: baseUrl,
      apiKey: options.apiKey,
    });
    return (model: string) => provider.chatModel(model);
  }

  // 직접 Ollama 서버 → 네이티브 API
  return createOllama({ baseURL: baseUrl });
}

export interface OllamaConnectionResult {
  connected: boolean;
  baseUrl: string;
  error?: string;
  responseTimeMs?: number;
}

export async function testOllamaConnection(options?: { baseUrl?: string; apiKey?: string }): Promise<OllamaConnectionResult> {
  const baseUrl = ensureHttps(options?.baseUrl || getOllamaDirectUrl());
  const isProxy = !!options?.apiKey;
  const startTime = Date.now();

  try {
    // URL 정규화 후 /api/version 경로 생성
    const normalizedUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const versionUrl = `${normalizedUrl}/api/version`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const fetchHeaders: Record<string, string> = {};
    if (options?.apiKey) {
      fetchHeaders['Authorization'] = `Bearer ${options.apiKey}`;
    }

    const response = await fetch(versionUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        connected: false,
        baseUrl,
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs: Date.now() - startTime,
      };
    }

    return {
      connected: true,
      baseUrl,
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      baseUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
    };
  }
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

export async function getOllamaModels(options?: { baseUrl?: string; apiKey?: string }): Promise<OllamaModel[]> {
  const baseUrl = ensureHttps(options?.baseUrl || getOllamaDirectUrl());
  const isProxy = !!options?.apiKey;

  try {
    // URL 정규화: /api로 끝나면 제거, 슬래시도 제거
    const normalizedUrl = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    // Open WebUI 프록시: /api/models (OpenAI 형식), 직접 Ollama: /api/tags
    const modelsUrl = isProxy
      ? `${normalizedUrl}/api/models`
      : `${normalizedUrl}/api/tags`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const fetchHeaders: Record<string, string> = {};
    if (options?.apiKey) {
      fetchHeaders['Authorization'] = `Bearer ${options.apiKey}`;
    }

    const response = await fetch(modelsUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Failed to fetch Ollama models:', response.statusText);
      return [];
    }

    const data = await response.json() as { data?: any[]; models?: any[] };

    // Open WebUI 프록시: { data: [{ id, name, ollama: { size } }] }
    if (isProxy && data.data) {
      return data.data
        .filter((m: { ollama?: unknown }) => m.ollama)
        .map((m: { id: string; name: string; ollama?: { size?: number; digest?: string; modified_at?: string } }) => ({
          name: m.id,
          size: m.ollama?.size ?? 0,
          digest: m.ollama?.digest ?? '',
          modified_at: m.ollama?.modified_at ?? '',
        }));
    }

    // 직접 Ollama: { models: [...] }
    return data.models || [];
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
}

export async function testOllamaGeneration(model = 'llama3.2:3b', options?: { baseUrl?: string; apiKey?: string }): Promise<{
  success: boolean;
  response?: string;
  error?: string;
  responseTimeMs: number;
}> {
  const startTime = Date.now();

  try {
    const ollama = createOllamaInstance(options);
    const ollamaModel = ollama(model);

    const result = await generateText({
      model: ollamaModel,
      prompt: 'Say "Hello, Ollama is working!" in one short sentence.',
      maxOutputTokens: 20,
    });

    return {
      success: true,
      response: result.text,
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
    };
  }
}

export async function checkOllamaHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unavailable';
  connection: OllamaConnectionResult;
  models: OllamaModel[];
  canGenerate: boolean;
}> {
  const connection = await testOllamaConnection();

  if (!connection.connected) {
    return {
      status: 'unavailable',
      connection,
      models: [],
      canGenerate: false,
    };
  }

  const models = await getOllamaModels();

  if (models.length === 0) {
    return {
      status: 'degraded',
      connection,
      models: [],
      canGenerate: false,
    };
  }

  const genTest = await testOllamaGeneration(models[0].name);

  return {
    status: genTest.success ? 'healthy' : 'degraded',
    connection,
    models,
    canGenerate: genTest.success,
  };
}
