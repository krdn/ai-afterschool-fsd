/**
 * Feature Resolver
 * 
 * 기능별 LLM 모델 해결 시스템
 * 태그 기반 자동 매칭 + 직접 지정 하이브리드 방식
 */

import { PrismaClient, type FeatureMapping, type Model, type Provider } from '@prisma/client';
import type {
  CostTier,
  QualityTier,
  FeatureMappingInput,
  FeatureMappingConfig,
  ResolutionResult,
  ResolutionRequirements,
} from './types';

// 확장된 FeatureMapping 타입 (relations 포함)
interface FeatureMappingWithModel extends FeatureMapping {
  specificModel: (Model & { provider: Provider }) | null;
}

// 해상도 결과 with priority
interface ResolutionResultWithPriority extends ResolutionResult {
  priority: number;
  fallbackMode: string;
}

/**
 * FeatureResolver 클래스
 * 
 * 기능 타입에 따라 적절한 LLM 모델을 선택합니다.
 */
export class FeatureResolver {
  private db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * 주어진 기능에 가장 적합한 모델을 찾습니다.
   * 
   * @param featureType - 기능 타입
   * @param requirements - 해상도 요구사항 (optional)
   * @returns 해상도 결과 (provider, model, priority)
   */
  async resolve(
    featureType: string,
    requirements?: ResolutionRequirements
  ): Promise<ResolutionResultWithPriority | null> {
    const results = await this.resolveWithFallback(featureType, requirements);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 우선순위 순으로 정렬된 후보 목록을 반환합니다.
   * 폴 백 체인 구성에 사용됩니다.
   * 
   * @param featureType - 기능 타입
   * @param requirements - 해상도 요구사항 (optional)
   * @returns 우선순위 순으로 정렬된 해상도 결과 배열
   */
  async resolveWithFallback(
    featureType: string,
    requirements?: ResolutionRequirements
  ): Promise<ResolutionResultWithPriority[]> {
    const reqs = requirements || {};
    
    // 1. 모든 매핑 규칙 조회
    const mappings = await this.getMappingsForFeature(featureType);
    
    if (mappings.length === 0) {
      return [];
    }

    // 2. 우선순위 순으로 정렬
    const sortedMappings = mappings.sort((a, b) => b.priority - a.priority);
    
    const results: ResolutionResultWithPriority[] = [];

    for (const mapping of sortedMappings) {
      let resolved: ResolutionResultWithPriority | null = null;

      if (mapping.matchMode === 'auto_tag') {
        // 태그 기반 해상도
        const tagResults = await this.resolveByTags(mapping, reqs);
        // 우선순위가 높은 것부터 추가
        results.push(...tagResults);
      } else if (mapping.matchMode === 'specific_model' && mapping.specificModelId) {
        // 직접 지정 모델 해상도
        resolved = await this.resolveBySpecificModel(mapping);
        if (resolved) {
          results.push(resolved);
        }
      }

      // fallbackMode가 'fail'이면 여기서 중단
      if (mapping.fallbackMode === 'fail') {
        break;
      }
    }

    // 중복 제거 (같은 provider+model 조합)
    const seen = new Set<string>();
    const uniqueResults: ResolutionResultWithPriority[] = [];
    
    for (const result of results) {
      const key = `${result.provider.id}:${result.model.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  /**
   * 매핑 규칙 목록을 조회합니다.
   * 
   * @param featureType - 특정 기능 타입으로 필터링 (optional)
   * @returns 매핑 규칙 목록 (specificModel 포함)
   */
  async getMappings(featureType?: string): Promise<FeatureMappingWithModel[]> {
    const where: { featureType?: string } = {};
    
    if (featureType) {
      where.featureType = featureType;
    }

    const mappings = await this.db.featureMapping.findMany({
      where,
      include: {
        specificModel: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: [
        { featureType: 'asc' },
        { priority: 'desc' },
      ],
    });

    return mappings as FeatureMappingWithModel[];
  }

  /**
   * 새로운 매핑 규칙을 생성하거나 기존 규칙을 업데이트합니다.
   * 
   * @param input - 매핑 입력 데이터
   * @returns 생성되거나 업데이트된 매핑 설정
   */
  async createOrUpdateMapping(input: FeatureMappingInput): Promise<FeatureMappingConfig> {
    // 기존 매핑 확인 (featureType + priority로 식별)
    const existing = await this.db.featureMapping.findFirst({
      where: {
        featureType: input.featureType,
        priority: input.priority ?? 1,
      },
    });

    const data = {
      featureType: input.featureType,
      matchMode: input.matchMode,
      requiredTags: input.requiredTags || [],
      excludedTags: input.excludedTags || [],
      specificModelId: input.specificModelId || null,
      priority: input.priority ?? 1,
      fallbackMode: input.fallbackMode,
    };

    if (existing) {
      // 업데이트
      const updated = await this.db.featureMapping.update({
        where: { id: existing.id },
        data,
      });
      return updated;
    } else {
      // 생성
      const created = await this.db.featureMapping.create({
        data,
      });
      return created;
    }
  }

  /**
   * 매핑 규칙을 삭제합니다.
   * 
   * @param id - 매핑 ID
   */
  async deleteMapping(id: string): Promise<void> {
    await this.db.featureMapping.delete({
      where: { id },
    });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * 특정 기능의 모든 매핑 규칙을 조회합니다.
   */
  private async getMappingsForFeature(featureType: string): Promise<FeatureMappingWithModel[]> {
    const mappings = await this.db.featureMapping.findMany({
      where: { featureType },
      include: {
        specificModel: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    return mappings as FeatureMappingWithModel[];
  }

  /**
   * 태그 기반으로 모델을 해상도합니다.
   */
  private async resolveByTags(
    mapping: FeatureMappingWithModel,
    requirements: ResolutionRequirements
  ): Promise<ResolutionResultWithPriority[]> {
    const results: ResolutionResultWithPriority[] = [];

    // 1. 활성화된 제공자의 모든 모델 조회
    const models = await this.db.model.findMany({
      where: {
        provider: {
          isEnabled: true,
        },
      },
      include: {
        provider: true,
      },
    });

    for (const model of models) {
      const provider = model.provider;

      // 2. requiredTags 필터링
      if (mapping.requiredTags.length > 0) {
        const hasAllRequiredTags = mapping.requiredTags.every(tag => {
          switch (tag) {
            case 'vision':
              return model.supportsVision;
            case 'tools':
              return model.supportsTools;
            case 'fast':
              return provider.qualityTier === 'fast';
            case 'balanced':
              return provider.qualityTier === 'balanced';
            case 'premium':
              return provider.qualityTier === 'premium';
            case 'cheap':
            case 'low':
              return provider.costTier === 'low' || provider.costTier === 'free';
            case 'medium':
              return provider.costTier === 'medium';
            case 'expensive':
            case 'high':
              return provider.costTier === 'high';
            default:
              // provider의 capabilities에서 확인
              return provider.capabilities.includes(tag);
          }
        });

        if (!hasAllRequiredTags) {
          continue;
        }
      }

      // 3. excludedTags 필터링
      if (mapping.excludedTags.length > 0) {
        const hasExcludedTag = mapping.excludedTags.some(tag => {
          switch (tag) {
            case 'vision':
              return model.supportsVision;
            case 'tools':
              return model.supportsTools;
            case 'fast':
              return provider.qualityTier === 'fast';
            case 'balanced':
              return provider.qualityTier === 'balanced';
            case 'premium':
              return provider.qualityTier === 'premium';
            case 'cheap':
            case 'low':
              return provider.costTier === 'low' || provider.costTier === 'free';
            case 'medium':
              return provider.costTier === 'medium';
            case 'expensive':
            case 'high':
              return provider.costTier === 'high';
            default:
              return provider.capabilities.includes(tag);
          }
        });

        if (hasExcludedTag) {
          continue;
        }
      }

      // 4. 추가 요구사항 필터링
      if (requirements.needsVision && !model.supportsVision) {
        continue;
      }

      if (requirements.needsTools && !model.supportsTools) {
        continue;
      }

      if (requirements.preferredCost && provider.costTier !== requirements.preferredCost) {
        // 정확히 일치하지 않으면 스킵
        continue;
      }

      if (requirements.preferredQuality && provider.qualityTier !== requirements.preferredQuality) {
        // 정확히 일치하지 않으면 스킵
        continue;
      }

      if (requirements.minContextWindow && model.contextWindow && model.contextWindow < requirements.minContextWindow) {
        continue;
      }

      // 5. 결과 추가
      results.push({
        provider,
        model,
        priority: mapping.priority,
        fallbackMode: mapping.fallbackMode,
      });
    }

    // 6. 모델 품질 기반 정렬: 무료(:free) 모델을 뒤로, 유명 모델을 앞으로
    results.sort((a, b) => {
      const aIsFree = a.model.modelId.includes(':free');
      const bIsFree = b.model.modelId.includes(':free');
      if (aIsFree !== bIsFree) return aIsFree ? 1 : -1;

      // contextWindow가 큰 모델 우선 (일반적으로 더 능력 있는 모델)
      const aCtx = a.model.contextWindow || 0;
      const bCtx = b.model.contextWindow || 0;
      return bCtx - aCtx;
    });

    return results;
  }

  /**
   * 직접 지정된 모델을 해상도합니다.
   */
  private async resolveBySpecificModel(
    mapping: FeatureMappingWithModel
  ): Promise<ResolutionResultWithPriority | null> {
    if (!mapping.specificModelId) {
      return null;
    }

    // 이미 조회된 specificModel 사용
    if (mapping.specificModel) {
      return {
        provider: mapping.specificModel.provider,
        model: mapping.specificModel,
        priority: mapping.priority,
        fallbackMode: mapping.fallbackMode,
      };
    }

    // DB에서 조회
    const model = await this.db.model.findUnique({
      where: { id: mapping.specificModelId },
      include: { provider: true },
    });

    if (!model || !model.provider.isEnabled) {
      return null;
    }

    return {
      provider: model.provider,
      model,
      priority: mapping.priority,
      fallbackMode: mapping.fallbackMode,
    };
  }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * FeatureResolver 인스턴스를 생성합니다.
 */
export function createFeatureResolver(db: PrismaClient): FeatureResolver {
  return new FeatureResolver(db);
}
