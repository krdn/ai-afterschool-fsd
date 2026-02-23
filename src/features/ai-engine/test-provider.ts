import { generateText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createMistral } from '@ai-sdk/mistral';
import { createCohere } from '@ai-sdk/cohere';
import { createXai } from '@ai-sdk/xai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { testOllamaGeneration } from './providers/ollama';
import type { ProviderName } from './providers';

const TIMEOUT_MS = 15000;

export interface TestResult {
  valid: boolean;
  response?: string;
  error?: string;
}

// Ollama 연결 테스트 (DB에서 baseUrl/apiKey 읽어서 전달)
async function testOllama(): Promise<TestResult> {
  const { getLLMConfig } = await import('./config');
  const config = await getLLMConfig('ollama');
  const options = {
    baseUrl: config?.baseUrl ?? undefined,
    apiKey: config?.apiKey ?? undefined,
  };
  const result = await testOllamaGeneration(undefined, options);
  return {
    valid: result.success,
    response: result.response,
    error: result.error,
  };
}

// 공통: AI SDK generateText로 API 키 검증
export async function testProviderConnection(
  provider: ProviderName,
  apiKey?: string
): Promise<TestResult> {
  if (provider === 'ollama') {
    return testOllama();
  }

  if (!apiKey) {
    return { valid: false, error: 'API 키가 필요합니다' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let model;

    switch (provider) {
      case 'anthropic': {
        const anthropicProvider = createAnthropic({ apiKey });
        model = anthropicProvider('claude-3-5-haiku-latest');
        break;
      }
      case 'openai': {
        const openaiProvider = createOpenAI({ apiKey });
        model = openaiProvider('gpt-4o-mini');
        break;
      }
      case 'google': {
        const googleProvider = createGoogleGenerativeAI({ apiKey });
        model = googleProvider('gemini-2.0-flash');
        break;
      }
      case 'deepseek': {
        const deepseekProvider = createDeepSeek({ apiKey });
        model = deepseekProvider('deepseek-chat');
        break;
      }
      case 'mistral': {
        const mistralProvider = createMistral({ apiKey });
        model = mistralProvider('mistral-small-latest');
        break;
      }
      case 'cohere': {
        const cohereProvider = createCohere({ apiKey });
        model = cohereProvider('command-r');
        break;
      }
      case 'xai': {
        const xaiProvider = createXai({ apiKey });
        model = xaiProvider('grok-3-mini');
        break;
      }
      case 'zhipu': {
        const zhipuProvider = createOpenAICompatible({
          name: 'zhipu',
          baseURL: 'https://api.z.ai/api/paas/v4',
          apiKey,
        });
        model = zhipuProvider.chatModel('glm-4.5-air');
        break;
      }
      case 'moonshot': {
        const moonshotProvider = createOpenAICompatible({
          name: 'moonshot',
          baseURL: 'https://api.moonshot.ai/v1',
          apiKey,
        });
        model = moonshotProvider.chatModel('kimi-latest');
        break;
      }
      default:
        return { valid: false, error: `알 수 없는 제공자: ${provider}` };
    }

    const result = await generateText({
      model,
      prompt: 'Say "API key is valid" in one short sentence.',
      maxOutputTokens: 20,
      abortSignal: controller.signal,
    });

    return {
      valid: true,
      response: result.text,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // API 키 인증 실패
    if (
      errorMessage.includes('401') ||
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('API key not valid') ||
      errorMessage.includes('API_KEY_INVALID') ||
      errorMessage.includes('PERMISSION_DENIED')
    ) {
      return { valid: false, error: 'API 키가 유효하지 않습니다' };
    }

    // 사용량 초과 / 잔액 부족 (키 자체는 유효)
    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('rate') ||
      errorMessage.includes('credit balance') ||
      errorMessage.includes('insufficient balance') ||
      errorMessage.includes('suspended') ||
      errorMessage.includes('RESOURCE_EXHAUSTED')
    ) {
      return {
        valid: true,
        error: 'API 키는 유효하지만 사용량 한도를 초과했습니다. 요금제를 확인하세요.',
      };
    }

    // 타임아웃
    if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
      return { valid: false, error: '연결 시간 초과 (15초)' };
    }

    // 연결 실패
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return { valid: false, error: '프로바이더 서버에 연결할 수 없습니다' };
    }

    return { valid: false, error: errorMessage };
  } finally {
    clearTimeout(timeout);
  }
}
