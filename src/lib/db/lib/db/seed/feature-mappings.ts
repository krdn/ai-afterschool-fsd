/**
 * Feature Mapping Seed Data
 * 
 * 기본 기능별 LLM 모델 매핑 규칙을 초기화합니다.
 * idempotent하게 설계되어 여러 번 실행핼도 중복 생성되지 않습니다.
 */

import { PrismaClient, Prisma } from '@prisma/client';
type FallbackMode = 'next_priority' | 'any_available' | 'fail';

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * 기본 기능 매핑 규칙 정의
 */
const DEFAULT_FEATURE_MAPPINGS: Array<{
  featureType: string;
  rules: Array<{
    matchMode: 'auto_tag' | 'specific_model';
    priority: number;
    requiredTags?: string[];
    excludedTags?: string[];
    specificModelId?: string;
    fallbackMode: FallbackMode;
  }>;
}> = [
    // 1. learning_analysis (학습 분석)
    {
      featureType: 'learning_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 2. face_analysis (얼굴 분석) - Vision 필요
    {
      featureType: 'face_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['vision', 'balanced'],
          fallbackMode: 'any_available',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['vision'],
          fallbackMode: 'any_available',
        },
      ],
    },

    // 3. palm_analysis (손금 분석) - Vision 필요
    {
      featureType: 'palm_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['vision', 'balanced'],
          fallbackMode: 'any_available',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['vision'],
          fallbackMode: 'any_available',
        },
      ],
    },

    // 4. report_generate (보고서 생성) - 고품질 선호
    {
      featureType: 'report_generate',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['premium'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 5. saju_analysis (사주 분석)
    {
      featureType: 'saju_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['balanced'],
          fallbackMode: 'any_available',
        },
      ],
    },

    // 6. mbti_analysis (MBTI 분석) - 빠른 응답 선호
    {
      featureType: 'mbti_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['fast'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 7. vark_analysis (VARK 분석) - 빠른 응답 선호
    {
      featureType: 'vark_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['fast'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 8. name_analysis (이름 분석) - 빠른 응답 선호
    {
      featureType: 'name_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['fast'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 9. zodiac_analysis (별자리 분석) - 빠른 응답 선호
    {
      featureType: 'zodiac_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['fast'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 10. counseling_suggest (상담 제안)
    {
      featureType: 'counseling_suggest',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['balanced'],
          fallbackMode: 'any_available',
        },
      ],
    },

    // 11. personality_summary (성격 종합 분석)
    {
      featureType: 'personality_summary',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['premium'],
          fallbackMode: 'next_priority',
        },
        {
          matchMode: 'auto_tag',
          priority: 2,
          requiredTags: ['balanced'],
          fallbackMode: 'next_priority',
        },
      ],
    },

    // 12. compatibility_analysis (궁합 분석)
    {
      featureType: 'compatibility_analysis',
      rules: [
        {
          matchMode: 'auto_tag',
          priority: 1,
          requiredTags: ['balanced'],
          fallbackMode: 'any_available',
        },
      ],
    },
  ];

/**
 * 기본 기능 매핑을 시딩합니다.
 * 이미 존재하는 매핑은 건너뜁니다 (idempotent).
 * 
 * @param db - PrismaClient 인스턴스
 * @returns 생성된 매핑 수
 */
export async function seedFeatureMappings(db: DbClient): Promise<number> {
  let createdCount = 0;

  for (const feature of DEFAULT_FEATURE_MAPPINGS) {
    for (const rule of feature.rules) {
      // 이미 존재하는지 확인
      const existing = await db.featureMapping.findFirst({
        where: {
          featureType: feature.featureType,
          priority: rule.priority,
        },
      });

      if (!existing) {
        // 새 매핑 생성
        const input = {
          featureType: feature.featureType,
          matchMode: rule.matchMode,
          requiredTags: rule.requiredTags || [],
          excludedTags: rule.excludedTags || [],
          specificModelId: rule.specificModelId,
          priority: rule.priority,
          fallbackMode: rule.fallbackMode,
        };

        await db.featureMapping.create({
          data: {
            featureType: input.featureType,
            matchMode: input.matchMode,
            requiredTags: input.requiredTags,
            excludedTags: input.excludedTags,
            specificModelId: input.specificModelId,
            priority: input.priority,
            fallbackMode: input.fallbackMode,
          },
        });

        createdCount++;
        console.log(`✓ Created mapping: ${feature.featureType} (priority: ${rule.priority})`);
      } else {
        console.log(`⊘ Skipped existing: ${feature.featureType} (priority: ${rule.priority})`);
      }
    }
  }

  console.log(`\n✅ Seeding complete: ${createdCount} mappings created`);
  return createdCount;
}

/**
 * 특정 기능의 매핑을 초기화합니다 (기존 매핑 삭제 후 재생성).
 * 
 * @param db - PrismaClient 인스턴스
 * @param featureType - 초기화할 기능 타입
 * @returns 생성된 매핑 수
 */
export async function resetFeatureMappings(
  db: DbClient,
  featureType: string
): Promise<number> {
  // 기존 매핑 삭제
  await db.featureMapping.deleteMany({
    where: { featureType },
  });

  console.log(`🗑️ Deleted existing mappings for: ${featureType}`);

  // 새 매핑 생성
  const feature = DEFAULT_FEATURE_MAPPINGS.find(f => f.featureType === featureType);
  if (!feature) {
    console.warn(`⚠️ No default mappings found for: ${featureType}`);
    return 0;
  }

  let createdCount = 0;
  for (const rule of feature.rules) {
    await db.featureMapping.create({
      data: {
        featureType: feature.featureType,
        matchMode: rule.matchMode,
        requiredTags: rule.requiredTags || [],
        excludedTags: rule.excludedTags || [],
        specificModelId: rule.specificModelId,
        priority: rule.priority,
        fallbackMode: rule.fallbackMode,
      },
    });
    createdCount++;
  }

  console.log(`✅ Reset complete for ${featureType}: ${createdCount} mappings created`);
  return createdCount;
}

/**
 * 모든 기능 매핑을 삭제합니다.
 * 
 * @param db - PrismaClient 인스턴스
 * @returns 삭제된 매핑 수
 */
export async function clearAllFeatureMappings(db: DbClient): Promise<number> {
  const result = await db.featureMapping.deleteMany({});
  console.log(`🗑️ Deleted ${result.count} feature mappings`);
  return result.count;
}

/**
 * CLI 스크립트용 메인 함수
 */
async function main() {
  const db = new PrismaClient();

  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'seed';

    switch (command) {
      case 'seed':
        await seedFeatureMappings(db);
        break;
      case 'reset':
        const featureType = args[1];
        if (!featureType) {
          console.error('Usage: tsx seed-feature-mappings.ts reset <featureType>');
          process.exit(1);
        }
        await resetFeatureMappings(db, featureType);
        break;
      case 'clear':
        await clearAllFeatureMappings(db);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Usage: tsx seed-feature-mappings.ts [seed|reset <featureType>|clear]');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// 직접 실행 시
if (require.main === module) {
  main();
}
