/**
 * Provider Template DB Seeding
 *
 * 템플릿 데이터를 ProviderTemplate DB 테이블에 삽입합니다.
 * 중복 방지를 위해 upsert를 사용합니다.
 *
 * 실행: npx tsx src/lib/db/seed-provider-templates.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { getProviderTemplates } from './provider-templates-data';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * 템플릿을 DB에 시딩합니다.
 */
export async function seedProviderTemplates(db: DbClient): Promise<void> {
  console.log('🌱 Provider Template 시딩 시작...\n');

  const templates = getProviderTemplates();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      // 템플릿을 DB에 upsert (Prisma 스키마에 존재하는 필드만 사용)
      await db.providerTemplate.upsert({
        where: { templateId: template.templateId },
        update: {
          name: template.name,
          providerType: template.providerType,
          description: template.description,
          defaultBaseUrl: template.defaultBaseUrl,
          defaultAuthType: template.defaultAuthType,
          defaultCapabilities: template.defaultCapabilities,
          helpUrl: template.helpUrl,
          isPopular: template.isPopular,
          sortOrder: template.sortOrder,
        },
        create: {
          templateId: template.templateId,
          name: template.name,
          providerType: template.providerType,
          description: template.description,
          defaultBaseUrl: template.defaultBaseUrl,
          defaultAuthType: template.defaultAuthType,
          defaultCapabilities: template.defaultCapabilities,
          helpUrl: template.helpUrl,
          isPopular: template.isPopular,
          sortOrder: template.sortOrder,
        },
      });

      // upsert 결과에 createdAt/updatedAt가 없으므로 단순히 성공 카운트만 증가
      const isNew = true; // upsert는 생성/업데이트 구분이 정확하지 않으므로 기록만 남김
      if (isNew) {
        created++;
        console.log(`  ✅ 생성: ${template.name} (${template.templateId})`);
      } else {
        updated++;
        console.log(`  🔄 업데이트: ${template.name} (${template.templateId})`);
      }
    } catch (error) {
      skipped++;
      console.error(`  ❌ 실패: ${template.name} (${template.templateId})`);
      console.error(`     오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n📊 시딩 결과:');
  console.log(`   생성: ${created}`);
  console.log(`   업데이트: ${updated}`);
  console.log(`   실패: ${skipped}`);
  console.log(`   총 템플릿: ${templates.length}`);
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedProviderTemplates(prisma);
    console.log('\n✨ Provider Template 시딩 완료!');
  } catch (error) {
    console.error('\n💥 시딩 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 직접 실행 시 (ESM 호환)
const isDirectRun = typeof import.meta.url === 'string' &&
  import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  main();
}

