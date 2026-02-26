/**
 * OCR 프롬프트 테스트
 */

import { describe, it, expect } from 'vitest';
import { getOcrPrompt } from '../ocr-prompts';

describe('getOcrPrompt', () => {
  describe('TRANSCRIPT', () => {
    it('성적통지표 프롬프트에 핵심 키워드가 포함되어야 함', () => {
      const prompt = getOcrPrompt('TRANSCRIPT');

      expect(prompt).toContain('성적통지표');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('documentInfo');
      expect(prompt).toContain('subjects');
      expect(prompt).toContain('rawScore');
      expect(prompt).toContain('gradeRank');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('school');
      expect(prompt).toContain('studentName');
    });

    it('성적통지표 프롬프트에 classAverage와 standardDev가 포함되어야 함', () => {
      const prompt = getOcrPrompt('TRANSCRIPT');

      expect(prompt).toContain('classAverage');
      expect(prompt).toContain('standardDev');
    });
  });

  describe('MOCK_EXAM', () => {
    it('모의고사 프롬프트에 핵심 키워드가 포함되어야 함', () => {
      const prompt = getOcrPrompt('MOCK_EXAM');

      expect(prompt).toContain('모의고사');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('examInfo');
      expect(prompt).toContain('subjects');
      expect(prompt).toContain('rawScore');
      expect(prompt).toContain('confidence');
    });

    it('모의고사 프롬프트에 표준점수와 백분위 관련 키워드가 포함되어야 함', () => {
      const prompt = getOcrPrompt('MOCK_EXAM');

      expect(prompt).toContain('standardScore');
      expect(prompt).toContain('percentile');
      expect(prompt).toContain('표준점수');
      expect(prompt).toContain('백분위');
    });
  });

  describe('CUSTOM', () => {
    it('자유 형식 프롬프트에 핵심 키워드가 포함되어야 함', () => {
      const prompt = getOcrPrompt('CUSTOM');

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('confidence');
      expect(prompt).toContain('성적');
    });
  });

  describe('알 수 없는 문서 유형', () => {
    it('알 수 없는 문서 유형에는 CUSTOM 프롬프트를 반환해야 함', () => {
      const customPrompt = getOcrPrompt('CUSTOM');
      const unknownPrompt = getOcrPrompt('UNKNOWN_TYPE');

      expect(unknownPrompt).toBe(customPrompt);
    });
  });
});
