import { describe, it, expect } from 'vitest';
import {
  getCapabilityLabel,
  filterDisplayCapabilities,
  getCostTierLabel,
  getCostTierBorderStyle,
  getCostTierBgStyle,
  getQualityTierLabel,
  getQualityTierBorderStyle,
  getQualityTierBgStyle,
  formatContextWindow,
} from '../llm-display';

describe('LLM 표시 헬퍼', () => {
  describe('getCapabilityLabel', () => {
    it('정의된 capability를 한국어로 반환', () => {
      expect(getCapabilityLabel('vision')).toBe('시각');
      expect(getCapabilityLabel('function_calling')).toBe('함수 호출');
      expect(getCapabilityLabel('json_mode')).toBe('JSON');
      expect(getCapabilityLabel('streaming')).toBe('스트리밍');
      expect(getCapabilityLabel('tools')).toBe('도구');
    });

    it('미정의 키는 원본 반환', () => {
      expect(getCapabilityLabel('unknown_cap')).toBe('unknown_cap');
    });
  });

  describe('filterDisplayCapabilities', () => {
    it('text를 제거', () => {
      expect(filterDisplayCapabilities(['text', 'vision', 'tools'])).toEqual([
        'vision',
        'tools',
      ]);
    });

    it('text만 있으면 빈 배열', () => {
      expect(filterDisplayCapabilities(['text'])).toEqual([]);
    });

    it('text 없으면 그대로 반환', () => {
      expect(filterDisplayCapabilities(['vision', 'tools'])).toEqual([
        'vision',
        'tools',
      ]);
    });
  });

  describe('getCostTierLabel', () => {
    it.each([
      ['free', '무료'],
      ['budget', '저렴'],
      ['low', '저렴'],
      ['standard', '중간'],
      ['medium', '중간'],
      ['high', '고가'],
      ['premium', '프리미엄'],
    ])('%s → %s', (tier, expected) => {
      expect(getCostTierLabel(tier)).toBe(expected);
    });

    it('미정의 키는 원본 반환', () => {
      expect(getCostTierLabel('unknown')).toBe('unknown');
    });
  });

  describe('getQualityTierLabel', () => {
    it.each([
      ['fast', '빠름'],
      ['standard', '균형'],
      ['balanced', '균형'],
      ['high', '프리미엄'],
      ['premium', '프리미엄'],
    ])('%s → %s', (tier, expected) => {
      expect(getQualityTierLabel(tier)).toBe(expected);
    });

    it('미정의 키는 원본 반환', () => {
      expect(getQualityTierLabel('unknown')).toBe('unknown');
    });
  });

  describe('getCostTierBorderStyle / getCostTierBgStyle', () => {
    it('정의된 티어는 빈 문자열이 아닌 스타일 반환', () => {
      for (const tier of ['free', 'budget', 'low', 'standard', 'medium', 'high', 'premium']) {
        expect(getCostTierBorderStyle(tier)).not.toBe('');
        expect(getCostTierBgStyle(tier)).toContain('bg-');
      }
    });

    it('미정의 키 fallback', () => {
      expect(getCostTierBorderStyle('unknown')).toBe('');
      expect(getCostTierBgStyle('unknown')).toBe('bg-gray-100 text-gray-700');
    });
  });

  describe('getQualityTierBorderStyle / getQualityTierBgStyle', () => {
    it('정의된 티어는 빈 문자열이 아닌 스타일 반환', () => {
      for (const tier of ['fast', 'standard', 'balanced', 'high', 'premium']) {
        expect(getQualityTierBorderStyle(tier)).not.toBe('');
        expect(getQualityTierBgStyle(tier)).toContain('bg-');
      }
    });

    it('미정의 키 fallback', () => {
      expect(getQualityTierBorderStyle('unknown')).toBe('');
      expect(getQualityTierBgStyle('unknown')).toBe('bg-gray-100 text-gray-700');
    });
  });

  describe('formatContextWindow', () => {
    it('null/undefined/0은 빈 문자열', () => {
      expect(formatContextWindow(null)).toBe('');
      expect(formatContextWindow(undefined)).toBe('');
      expect(formatContextWindow(0)).toBe('');
    });

    it('1000 미만은 숫자 그대로', () => {
      expect(formatContextWindow(500)).toBe('500');
    });

    it('1K~999K 범위는 K 단위', () => {
      expect(formatContextWindow(4000)).toBe('4K');
      expect(formatContextWindow(128000)).toBe('128K');
    });

    it('1M 이상은 M 단위', () => {
      expect(formatContextWindow(1000000)).toBe('1M');
      expect(formatContextWindow(2000000)).toBe('2M');
    });

    it('1.5M 같은 소수점 표시', () => {
      expect(formatContextWindow(1500000)).toBe('1.5M');
    });
  });
});
