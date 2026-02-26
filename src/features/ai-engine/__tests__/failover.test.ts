/**
 * failover.ts 테스트
 *
 * LLM Failover 유틸리티의 핵심 기능을 테스트합니다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FailoverError,
  isRetryableError,
  withFailover,
  createFailoverExecutor,
  type ProviderError,
} from '../failover';
import type { ProviderName, FeatureType } from '../providers';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../usage-tracker', () => ({
  trackFailure: vi.fn().mockResolvedValue(undefined),
}));

describe('isRetryableError', () => {
  it('rate limit (429) 에러는 재시도 가능해야 함', () => {
    const error = new Error('Rate limit exceeded (429)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('rate limit 키워드가 포함된 에러는 재시도 가능해야 함', () => {
    const error = new Error('You have hit the rate limit');
    expect(isRetryableError(error)).toBe(true);
  });

  it('service unavailable (503) 에러는 재시도 가능해야 함', () => {
    const error = new Error('Service unavailable (503)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('timeout 에러는 재시도 가능해야 함', () => {
    const error = new Error('Request timeout');
    expect(isRetryableError(error)).toBe(true);
  });

  it('network 에러는 재시도 가능해야 함', () => {
    const error = new Error('ECONNREFUSED');
    expect(isRetryableError(error)).toBe(true);
  });

  it('fetch failed 에러는 재시도 가능해야 함', () => {
    const error = new Error('fetch failed');
    expect(isRetryableError(error)).toBe(true);
  });

  it('500 서버 에러는 재시도 가능해야 함', () => {
    const error = new Error('Internal server error (500)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('502 bad gateway 에러는 재시도 가능해야 함', () => {
    const error = new Error('Bad gateway (502)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('504 gateway timeout 에러는 재시도 가능해야 함', () => {
    const error = new Error('Gateway timeout (504)');
    expect(isRetryableError(error)).toBe(true);
  });

  it('400 bad request 에러는 재시도 불가능해야 함', () => {
    const error = new Error('Bad request (400)');
    expect(isRetryableError(error)).toBe(false);
  });

  it('401 unauthorized 에러는 재시도 불가능해야 함', () => {
    const error = new Error('Unauthorized (401)');
    expect(isRetryableError(error)).toBe(false);
  });

  it('403 forbidden 에러는 재시도 불가능해야 함', () => {
    const error = new Error('Forbidden (403)');
    expect(isRetryableError(error)).toBe(false);
  });

  it('알 수 없는 에러는 기본적으로 재시도 가능해야 함', () => {
    const error = new Error('Unknown error');
    expect(isRetryableError(error)).toBe(true);
  });

  it('대소문자 구분 없이 처리해야 함', () => {
    const error = new Error('RATE LIMIT EXCEEDED');
    expect(isRetryableError(error)).toBe(true);
  });
});

describe('FailoverError', () => {
  const mockErrors: ProviderError[] = [
    {
      provider: 'anthropic' as ProviderName,
      error: new Error('Rate limit'),
      timestamp: new Date(),
      durationMs: 100,
    },
    {
      provider: 'openai' as ProviderName,
      error: new Error('Timeout'),
      timestamp: new Date(),
      durationMs: 200,
    },
  ];

  it('기본 메시지를 생성해야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors);
    expect(error.message).toContain('2 providers failed');
    expect(error.message).toContain('learning_analysis');
  });

  it('커스텀 메시지를 사용할 수 있어야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors, 'Custom message');
    expect(error.message).toBe('Custom message');
  });

  it('lastError getter가 마지막 에러를 반환해야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors);
    expect(error.lastError?.provider).toBe('openai');
  });

  it('빈 에러 배열에서 lastError는 undefined를 반환해야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, []);
    expect(error.lastError).toBeUndefined();
  });

  it('userMessage getter가 사용자 친화적 메시지를 반환해야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors);
    expect(error.userMessage).toBe('AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
  });

  it('instanceof 체크가 동작해야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors);
    expect(error instanceof FailoverError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it('속성들이 올바르게 설정되어야 함', () => {
    const error = new FailoverError('learning_analysis' as FeatureType, mockErrors);
    expect(error.featureType).toBe('learning_analysis');
    expect(error.errors).toHaveLength(2);
    expect(error.totalAttempts).toBe(2);
  });
});

describe('withFailover', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('첫 번째 제공자가 성공하면 결과를 반환해야 함', async () => {
    const providers: ProviderName[] = ['ollama', 'anthropic', 'openai'];
    const fn = vi.fn().mockResolvedValue({ text: 'Success' });

    const result = await withFailover(providers, fn, {
      featureType: 'learning_analysis' as FeatureType,
    });

    expect(result.data).toEqual({ text: 'Success' });
    expect(result.provider).toBe('ollama');
    expect(result.wasFailover).toBe(false);
    expect(result.failoverFrom).toBeUndefined();
    expect(result.totalAttempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('첫 번째 실패 시 두 번째 제공자로 폴백해야 함', async () => {
    const providers: ProviderName[] = ['ollama', 'anthropic', 'openai'];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({ text: 'Success from anthropic' });

    const result = await withFailover(providers, fn, {
      featureType: 'learning_analysis' as FeatureType,
    });

    expect(result.data).toEqual({ text: 'Success from anthropic' });
    expect(result.provider).toBe('anthropic');
    expect(result.wasFailover).toBe(true);
    expect(result.failoverFrom).toBe('ollama');
    expect(result.totalAttempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('모든 제공자가 실패하면 FailoverError를 발생시켜야 함', async () => {
    const providers: ProviderName[] = ['ollama', 'anthropic'];
    const fn = vi.fn().mockRejectedValue(new Error('All failed'));

    await expect(
      withFailover(providers, fn, { featureType: 'learning_analysis' as FeatureType })
    ).rejects.toThrow(FailoverError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('non-retryable 에러는 폴백 체인을 중단해야 함', async () => {
    const providers: ProviderName[] = ['ollama', 'anthropic', 'openai'];
    const fn = vi.fn().mockRejectedValue(new Error('Bad request (400)'));

    await expect(
      withFailover(providers, fn, { featureType: 'learning_analysis' as FeatureType })
    ).rejects.toThrow(FailoverError);

    // 400 에러는 non-retryable이므로 첫 번째 제공자만 시도
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('빈 제공자 배열은 즉시 FailoverError를 발생시켜야 함', async () => {
    const fn = vi.fn();

    await expect(
      withFailover([], fn, { featureType: 'learning_analysis' as FeatureType })
    ).rejects.toThrow(FailoverError);

    expect(fn).not.toHaveBeenCalled();
  });

  it('totalDurationMs가 측정되어야 함', async () => {
    const providers: ProviderName[] = ['ollama'];
    const fn = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { text: 'Success' };
    });

    const result = await withFailover(providers, fn, {
      featureType: 'learning_analysis' as FeatureType,
    });

    expect(result.totalDurationMs).toBeGreaterThanOrEqual(40);
  });

  it('teacherId가 컨텍스트에 전달되어야 함', async () => {
    const providers: ProviderName[] = ['ollama'];
    const fn = vi.fn().mockResolvedValue({ text: 'Success' });

    await withFailover(providers, fn, {
      featureType: 'learning_analysis' as FeatureType,
      teacherId: 'teacher-123',
    });

    expect(fn).toHaveBeenCalledWith('ollama', 1);
  });

  it('attempt 번호가 올바르게 전달되어야 함', async () => {
    const providers: ProviderName[] = ['ollama', 'anthropic'];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Rate limit'))
      .mockResolvedValueOnce({ text: 'Success' });

    await withFailover(providers, fn, {
      featureType: 'learning_analysis' as FeatureType,
    });

    expect(fn).toHaveBeenNthCalledWith(1, 'ollama', 1);
    expect(fn).toHaveBeenNthCalledWith(2, 'anthropic', 2);
  });
});

describe('createFailoverExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기본 설정으로 executor를 생성해야 함', async () => {
    const executor = createFailoverExecutor(['ollama', 'anthropic'], {
      featureType: 'face_analysis' as FeatureType,
    });

    const fn = vi.fn().mockResolvedValue({ result: 'ok' });
    const result = await executor(fn);

    expect(result.data).toEqual({ result: 'ok' });
    expect(result.provider).toBe('ollama');
  });

  it('제공자 오버라이드가 가능해야 함', async () => {
    const executor = createFailoverExecutor(['ollama'], {
      featureType: 'face_analysis' as FeatureType,
    });

    const fn = vi.fn().mockResolvedValue({ result: 'ok' });
    const result = await executor(fn, ['anthropic']);

    expect(result.provider).toBe('anthropic');
  });

  it('컨텍스트 오버라이드가 가능해야 함', async () => {
    const executor = createFailoverExecutor(['ollama'], {
      featureType: 'face_analysis' as FeatureType,
    });

    const fn = vi.fn().mockResolvedValue({ result: 'ok' });
    const result = await executor(fn, undefined, {
      teacherId: 'teacher-456',
    });

    expect(result.data).toEqual({ result: 'ok' });
  });

  it('여러 번 호출 시 각각 독립적으로 동작해야 함', async () => {
    const executor = createFailoverExecutor(['ollama', 'anthropic'], {
      featureType: 'face_analysis' as FeatureType,
    });

    const fn1 = vi.fn().mockResolvedValue({ id: 1 });
    const fn2 = vi.fn().mockResolvedValue({ id: 2 });

    const result1 = await executor(fn1);
    const result2 = await executor(fn2);

    expect(result1.data).toEqual({ id: 1 });
    expect(result2.data).toEqual({ id: 2 });
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});
