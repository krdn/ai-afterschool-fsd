/**
 * Integration Test Script for Universal LLM Hub
 *
 * 수동 실행용 통합 테스트 스크립트입니다.
 * 전체 흐름이 정상 작동하는지 검증합니다.
 *
 * 실행 방법:
 *   npx tsx src/lib/ai/test-integration.ts
 */

import { PrismaClient } from '@prisma/client';
import { ProviderRegistry } from './provider-registry';
import { FeatureResolver } from './feature-resolver';
import { getProviderTemplates } from './templates';
import type { ProviderInput } from './types';

const prisma = new PrismaClient();

// 테스트 결과 추적
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

// 테스트 헬퍼
async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${name}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'PASS', duration });
    console.log(`\n✅ PASS (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', duration, error: errorMessage });
    console.log(`\n❌ FAIL (${duration}ms)`);
    console.log(`   Error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.log(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
    }
  }
}

// 테스트 시나리오
async function runIntegrationTests(): Promise<void> {
  console.log('\n🏁 Universal LLM Hub Integration Tests');
  console.log(`Started at: ${new Date().toISOString()}`);

  // Reset singletons
  ProviderRegistry.resetInstance();

  const registry = ProviderRegistry.getInstance(prisma);
  const resolver = new FeatureResolver(prisma);

  // ============================================================
  // 시나리오 1: 템플릿 시딩 확인
  // ============================================================
  await runTest('Provider Template Seeding', async () => {
    const templates = getProviderTemplates();
    console.log(`   Found ${templates.length} provider templates`);

    if (templates.length === 0) {
      throw new Error('No provider templates found');
    }

    const popularTemplates = templates.filter(t => t.isPopular);
    console.log(`   Popular templates: ${popularTemplates.map(t => t.name).join(', ')}`);

    // 주요 템플릿 확인
    const openai = templates.find(t => t.templateId === 'openai');
    if (!openai) throw new Error('OpenAI template not found');

    console.log(`   ✅ OpenAI template: ${openai.defaultModels.length} models`);
  });

  // ============================================================
  // 시나리오 2: 템플릿 기반 Provider 등록
  // ============================================================
  let testProviderId: string;

  await runTest('Template-based Provider Registration', async () => {
    const templates = getProviderTemplates();
    const ollamaTemplate = templates.find(t => t.templateId === 'ollama');

    if (!ollamaTemplate) {
      throw new Error('Ollama template not found (needed for local testing)');
    }

    // 테스트용 Provider 입력
    const input: ProviderInput = {
      name: 'Test Ollama (Integration)',
      providerType: 'ollama',
      baseUrl: 'http://localhost:11434/api',
      authType: 'api_key',
      apiKey: '', // Ollama는 API 키 불필요
      capabilities: ollamaTemplate.defaultCapabilities,
      costTier: 'free',
      qualityTier: 'balanced',
      isEnabled: false, // 테스트용으로 비활성화
    };

    const provider = await registry.register(input);
    testProviderId = provider.id;

    console.log(`   ✅ Created provider: ${provider.id}`);
    console.log(`   Name: ${provider.name}`);
    console.log(`   Models: ${provider.models.length}`);

    // 기본 모델 생성 확인
    if (provider.models.length === 0) {
      throw new Error('No default models created');
    }
  });

  // ============================================================
  // 시나리오 3: Provider 조회 및 캐싱
  // ============================================================
  await runTest('Provider Retrieval and Caching', async () => {
    if (!testProviderId) {
      throw new Error('No test provider created');
    }

    // 첫 번째 조회 (DB)
    const provider1 = await registry.get(testProviderId);
    if (!provider1) throw new Error('Provider not found');

    console.log(`   First retrieval (DB): ${provider1.name}`);

    // 두 번째 조회 (Cache)
    const provider2 = await registry.get(testProviderId);
    console.log(`   Second retrieval (Cache): ${provider2?.name}`);

    // 목록 조회
    const allProviders = await registry.list();
    console.log(`   Total providers: ${allProviders.length}`);

    // 활성화된 Provider만
    const enabledProviders = await registry.list({ enabledOnly: true });
    console.log(`   Enabled providers: ${enabledProviders.length}`);
  });

  // ============================================================
  // 시나리오 4: Provider 수정
  // ============================================================
  await runTest('Provider Update', async () => {
    if (!testProviderId) {
      throw new Error('No test provider created');
    }

    const updated = await registry.update(testProviderId, {
      name: 'Updated Test Ollama',
      costTier: 'low',
    });

    console.log(`   ✅ Updated: ${updated.name}`);
    console.log(`   Cost tier: ${updated.costTier}`);

    if (updated.name !== 'Updated Test Ollama') {
      throw new Error('Name not updated');
    }
  });

  // ============================================================
  // 시나리오 5: 기능 매핑 설정
  // ============================================================
  await runTest('Feature Mapping Configuration', async () => {
    // 태그 기반 매핑 생성
    const mapping1 = await resolver.createOrUpdateMapping({
      featureType: 'test_analysis',
      matchMode: 'auto_tag',
      requiredTags: ['free', 'balanced'],
      excludedTags: [],
      priority: 1,
      fallbackMode: 'next_priority',
    });

    console.log(`   ✅ Created mapping 1: ${mapping1.id}`);
    console.log(`   Feature: ${mapping1.featureType}`);
    console.log(`   Mode: ${mapping1.matchMode}`);

    // 직접 지정 매핑 생성
    const testProvider = await registry.get(testProviderId);
    const testModel = testProvider?.models[0];

    if (testModel) {
      const mapping2 = await resolver.createOrUpdateMapping({
        featureType: 'test_specific',
        matchMode: 'specific_model',
        specificModelId: testModel.id,
        priority: 1,
        fallbackMode: 'fail',
      });

      console.log(`   ✅ Created mapping 2: ${mapping2.id}`);
      console.log(`   Specific model: ${mapping2.specificModelId}`);
    }
  });

  // ============================================================
  // 시나리오 6: 기능 해상도 (Resolution)
  // ============================================================
  await runTest('Feature Resolution', async () => {
    // 태그 기반 해상도
    const results = await resolver.resolveWithFallback('test_analysis');
    console.log(`   Resolved ${results.length} candidates for 'test_analysis'`);

    for (const result of results.slice(0, 3)) {
      console.log(`   - ${result.provider.name} / ${result.model.displayName} (priority: ${result.priority})`);
    }

    // 폴 백 체인 확인
    if (results.length === 0) {
      console.log('   ⚠️ No matching providers (expected if no free/balanced providers)');
    }
  });

  // ============================================================
  // 시나리오 7: 매핑 목록 조회
  // ============================================================
  await runTest('Feature Mapping Listing', async () => {
    const allMappings = await resolver.getMappings();
    console.log(`   Total mappings: ${allMappings.length}`);

    const testMappings = await resolver.getMappings('test_analysis');
    console.log(`   'test_analysis' mappings: ${testMappings.length}`);

    for (const mapping of testMappings) {
      console.log(`   - ${mapping.matchMode} (priority: ${mapping.priority})`);
    }
  });

  // ============================================================
  // 시나리오 8: 모델 CRUD
  // ============================================================
  let testModelId: string;

  await runTest('Model CRUD Operations', async () => {
    if (!testProviderId) {
      throw new Error('No test provider created');
    }

    // 모델 추가
    const newModel = await registry.addModel({
      providerId: testProviderId,
      modelId: 'test-model-v1',
      displayName: 'Test Model V1',
      contextWindow: 4096,
      supportsVision: false,
      supportsTools: false,
    });

    testModelId = newModel.id;
    console.log(`   ✅ Created model: ${newModel.id}`);

    // 모델 수정
    const updated = await registry.updateModel(testModelId, {
      displayName: 'Test Model V1 (Updated)',
      contextWindow: 8192,
    });

    console.log(`   ✅ Updated model: ${updated.displayName}`);
    console.log(`   Context window: ${updated.contextWindow}`);

    // 캐시 무효화 확인
    const provider = await registry.get(testProviderId);
    const foundModel = provider?.models.find(m => m.id === testModelId);

    if (!foundModel) {
      throw new Error('Updated model not found in provider');
    }

    console.log(`   ✅ Found in provider: ${foundModel.displayName}`);
  });

  // ============================================================
  // 시나리오 9: 캐시 관리
  // ============================================================
  await runTest('Cache Management', async () => {
    if (!testProviderId) {
      throw new Error('No test provider created');
    }

    // 캐시 채우기
    await registry.get(testProviderId);
    console.log('   Cache populated');

    // 특정 캐시 무효화
    registry.invalidateCache(testProviderId);
    console.log('   Cache invalidated for provider');

    // 다시 조회 (DB)
    await registry.get(testProviderId);
    console.log('   Re-populated from DB');

    // 전체 캐시 무효화
    registry.invalidateCache();
    console.log('   All cache invalidated');
  });

  // ============================================================
  // 시나리오 10: 정리 (Cleanup)
  // ============================================================
  await runTest('Cleanup', async () => {
    // 생성한 모델 삭제
    if (testModelId) {
      await registry.removeModel(testModelId);
      console.log(`   ✅ Deleted model: ${testModelId}`);
    }

    // 테스트 매핑 삭제
    const testMappings = await resolver.getMappings('test_analysis');
    for (const mapping of testMappings) {
      await resolver.deleteMapping(mapping.id);
      console.log(`   ✅ Deleted mapping: ${mapping.id}`);
    }

    const testSpecificMappings = await resolver.getMappings('test_specific');
    for (const mapping of testSpecificMappings) {
      await resolver.deleteMapping(mapping.id);
      console.log(`   ✅ Deleted mapping: ${mapping.id}`);
    }

    // 테스트 Provider 삭제
    if (testProviderId) {
      await registry.remove(testProviderId);
      console.log(`   ✅ Deleted provider: ${testProviderId}`);
    }

    // 삭제 확인
    const deleted = await registry.get(testProviderId);
    if (deleted) {
      throw new Error('Provider still exists after deletion');
    }

    console.log('   ✅ All test data cleaned up');
  });

  // ============================================================
  // 결과 출력
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal: ${results.length} tests`);
  console.log(`  ✅ PASS: ${passed}`);
  console.log(`  ❌ FAIL: ${failed}`);
  console.log(`  ⏭️  SKIP: ${skipped}`);
  console.log(`\nDuration: ${totalDuration}ms`);
  console.log(`Average: ${Math.round(totalDuration / results.length)}ms/test`);

  if (failed > 0) {
    console.log('\n🔴 Failed Tests:');
    for (const result of results.filter(r => r.status === 'FAIL')) {
      console.log(`  - ${result.name}: ${result.error}`);
    }
  }

  console.log('\n' + (failed === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed'));
}

// 실행
runIntegrationTests()
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// 직접 실행 시
if (require.main === module) {
  // Node.js 환경에서 직접 실행
  console.log('Running integration tests...');
}
