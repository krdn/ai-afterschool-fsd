/**
 * AI SDK Adapters - Factory and Registry
 *
 * 제공자 타입에 따른 어댑터 인스턴스 생성 및 관리를 담당합니다.
 */

import type { BaseAdapter } from './base';
import type { ProviderType } from '../types';
import { OpenAIAdapter } from './openai';
import { AnthropicAdapter } from './anthropic';
import { GoogleAdapter } from './google';
import { OllamaAdapter } from './ollama';
import { ZhipuAdapter } from './zhipu';
import { MoonshotAdapter } from './moonshot';
import { DeepSeekAdapter } from './deepseek';
import { MistralAdapter } from './mistral';
import { CohereAdapter } from './cohere';
import { XaiAdapter } from './xai';
import { OpenRouterAdapter } from './openrouter';

/**
 * 어댑터 팩토리 클래스
 */
class AdapterFactory {
  private adapters: Map<ProviderType, new () => BaseAdapter> = new Map();
  private instances: Map<ProviderType, BaseAdapter> = new Map();

  constructor() {
    this.registerDefaultAdapters();
  }

  /**
   * 기본 어댑터를 등록합니다.
   */
  private registerDefaultAdapters(): void {
    this.adapters.set('openai', OpenAIAdapter);
    this.adapters.set('anthropic', AnthropicAdapter);
    this.adapters.set('google', GoogleAdapter);
    this.adapters.set('ollama', OllamaAdapter);
    this.adapters.set('zhipu', ZhipuAdapter);
    this.adapters.set('moonshot', MoonshotAdapter);
    this.adapters.set('deepseek', DeepSeekAdapter);
    this.adapters.set('mistral', MistralAdapter);
    this.adapters.set('cohere', CohereAdapter);
    this.adapters.set('xai', XaiAdapter);
    this.adapters.set('openrouter', OpenRouterAdapter);
  }

  /**
   * 새로운 어댑터 타입을 등록합니다.
   *
   * @param type - 제공자 타입
   * @param adapterClass - 어댑터 클래스
   */
  registerAdapter(type: ProviderType, adapterClass: new () => BaseAdapter): void {
    this.adapters.set(type, adapterClass);
    // 기존 인스턴스가 있으면 제거 (재생성됨)
    this.instances.delete(type);
  }

  /**
   * 제공자 타입에 맞는 어댑터 인스턴스를 반환합니다.
   *
   * @param type - 제공자 타입
   * @returns 어댑터 인스턴스
   * @throws 제공자 타입을 찾을 수 없는 경우
   */
  getAdapter(type: ProviderType): BaseAdapter {
    // 이미 생성된 인스턴스가 있으면 반환
    const cached = this.instances.get(type);
    if (cached) {
      return cached;
    }

    // 새 인스턴스 생성
    const AdapterClass = this.adapters.get(type);
    if (!AdapterClass) {
      throw new Error(`No adapter registered for provider type: ${type}`);
    }

    const instance = new AdapterClass();
    this.instances.set(type, instance);
    return instance;
  }

  /**
   * 어댑터가 등록되어 있는지 확인합니다.
   *
   * @param type - 제공자 타입
   * @returns 등록 여부
   */
  hasAdapter(type: ProviderType): boolean {
    return this.adapters.has(type);
  }

  /**
   * 등록된 모든 제공자 타입을 반환합니다.
   *
   * @returns 제공자 타입 배열
   */
  getRegisteredTypes(): ProviderType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 특정 타입의 어댑터 인스턴스를 초기화합니다.
   *
   * @param type - 제공자 타입
   */
  invalidateAdapter(type: ProviderType): void {
    this.instances.delete(type);
  }

  /**
   * 모든 어댑터 인스턴스를 초기화합니다.
   */
  invalidateAll(): void {
    this.instances.clear();
  }
}

// 싱글톤 인스턴스
const adapterFactory = new AdapterFactory();

/**
 * 어댑터 팩토리 싱글톤을 반환합니다.
 */
export function getAdapterFactory(): AdapterFactory {
  return adapterFactory;
}

/**
 * 어댑터를 등록합니다.
 *
 * @param type - 제공자 타입
 * @param adapterClass - 어댑터 클래스
 */
export function registerAdapter(
  type: ProviderType,
  adapterClass: new () => BaseAdapter
): void {
  adapterFactory.registerAdapter(type, adapterClass);
}

/**
 * 제공자 타입에 맞는 어댑터 인스턴스를 반환합니다.
 *
 * @param type - 제공자 타입
 * @returns 어댑터 인스턴스
 */
export function getAdapter(type: ProviderType): BaseAdapter {
  return adapterFactory.getAdapter(type);
}

/**
 * 어댑터가 등록되어 있는지 확인합니다.
 *
 * @param type - 제공자 타입
 * @returns 등록 여부
 */
export function hasAdapter(type: ProviderType): boolean {
  return adapterFactory.hasAdapter(type);
}

/**
 * 등록된 모든 제공자 타입을 반환합니다.
 *
 * @returns 제공자 타입 배열
 */
export function getRegisteredTypes(): ProviderType[] {
  return adapterFactory.getRegisteredTypes();
}

// 어댑터 클래스 재export
export { BaseAdapter } from './base';
export { OpenAIAdapter } from './openai';
export { AnthropicAdapter } from './anthropic';
export { GoogleAdapter } from './google';
export { OllamaAdapter } from './ollama';
export { ZhipuAdapter } from './zhipu';
export { MoonshotAdapter } from './moonshot';
export { DeepSeekAdapter } from './deepseek';
export { MistralAdapter } from './mistral';
export { CohereAdapter } from './cohere';
export { XaiAdapter } from './xai';
export { OpenRouterAdapter } from './openrouter';
