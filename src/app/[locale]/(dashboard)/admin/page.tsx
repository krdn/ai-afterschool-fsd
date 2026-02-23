import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { AdminTabsWrapper, AdminTabsContent } from '@/components/admin/admin-tabs-wrapper'

// LLM 사용량 관련
import { getCurrentPeriodCost } from '@/features/ai-engine'
import { getUsageStatsByProvider, getUsageStatsByFeature } from '@/features/ai-engine'
import { getBudgetSummary } from '@/features/ai-engine'
import { db } from '@/lib/db/client'
import type { DailyUsageData, ProviderUsageData, FeatureUsageData } from '@/app/[locale]/(dashboard)/admin/llm-usage/usage-charts'
import type { ProviderName } from '@/features/ai-engine'

// 새로운 탭 컴포넌트
import { StatusTab } from '@/components/admin/tabs/status-tab'
import { LogsTab } from '@/components/admin/tabs/logs-tab'
import { DatabaseTab } from '@/components/admin/tabs/database-tab'
import { AuditTab } from '@/components/admin/tabs/audit-tab'
import { TeamsTab } from '@/components/admin/tabs/teams-tab'
import { getTeams } from '@/lib/actions/common/teams'
import { pool } from '@/lib/db/client'

// LLM Hub
import { LLMHubTab } from '@/components/admin/tabs/llm-hub-tab'
import { getProvidersAction } from '@/lib/actions/admin/providers'
import { getFeatureMappingsAction } from '@/lib/actions/admin/feature-mappings'
import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// AI 프롬프트 관리 (통합)
import { AnalysisPromptsTab } from '@/components/admin/tabs/analysis-prompts-tab'
import { getAllGeneralPresetsByType, seedGeneralPresets, type AnalysisType } from '@/features/analysis'
import {
  getSajuSeedData,
  getFaceSeedData,
  getPalmSeedData,
  getMbtiSeedData,
  getVarkSeedData,
  getNameSeedData,
  getZodiacSeedData,
} from '@/features/ai-engine/prompts'

export const metadata = {
  title: '관리자 | AI AfterSchool',
  description: '시스템 관리 대시보드',
}

// 30일 일별 사용량 조회
async function getDailyUsageData(): Promise<DailyUsageData[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  try {
    const dailyData = await db.$queryRawUnsafe<{
      date: Date
      requests: bigint
      inputTokens: bigint
      outputTokens: bigint
      costUsd: number
      totalResponseTimeMs: bigint
    }[]>(`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as requests,
        COALESCE(SUM("inputTokens"), 0) as "inputTokens",
        COALESCE(SUM("outputTokens"), 0) as "outputTokens",
        COALESCE(SUM("costUsd"), 0) as "costUsd",
        COALESCE(SUM("responseTimeMs"), 0) as "totalResponseTimeMs"
      FROM "LLMUsage"
      WHERE "createdAt" >= '${startDate.toISOString()}'
        AND "createdAt" <= '${endDate.toISOString()}'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `)

    return dailyData.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      requests: Number(row.requests),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      costUsd: Number(row.costUsd) || 0,
      avgResponseTimeMs: Number(row.requests) > 0
        ? Number(row.totalResponseTimeMs) / Number(row.requests)
        : 0,
    }))
  } catch (error) {
    console.error('Failed to fetch daily usage data:', error)
    return []
  }
}

// 제공자별 사용량 조회
async function getProviderUsageData(): Promise<ProviderUsageData[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  try {
    const stats = await getUsageStatsByProvider({ startDate, endDate })

    const providers: ProviderName[] = ['ollama', 'anthropic', 'openai', 'google', 'deepseek', 'mistral', 'cohere', 'xai', 'zhipu', 'moonshot']
    return providers.map((provider) => ({
      provider,
      totalRequests: stats[provider]?.totalRequests || 0,
      totalCostUsd: stats[provider]?.totalCostUsd || 0,
      successRate: stats[provider]?.successRate || 1,
    }))
  } catch (error) {
    console.error('Failed to fetch provider usage data:', error)
    return []
  }
}

// Health check 직접 수행 (self-referencing fetch 방지)
type HealthStatus = 'healthy' | 'unhealthy' | 'unknown'

interface HealthCheckItem {
  status: HealthStatus
  message?: string
  responseTime?: number
  connectionPool?: { total: number; idle: number; waiting: number }
}

async function getHealthData() {
  const startTime = Date.now()
  const result: {
    status: string
    uptime: number
    version?: string
    headers: { 'X-Response-Time': string }
    checks: {
      database: HealthCheckItem
      storage: HealthCheckItem
      backup?: HealthCheckItem
    }
  } = {
    status: 'healthy',
    uptime: process.uptime(),
    headers: { 'X-Response-Time': '0' },
    checks: {
      database: { status: 'unknown', message: '' },
      storage: { status: 'unknown', message: '' },
    },
  }

  // DB 체크
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    const dbTime = Date.now() - dbStart
    const poolInfo = pool
      ? { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }
      : { total: 0, idle: 0, waiting: 0 }
    result.checks.database = {
      status: 'healthy' as HealthStatus,
      message: dbTime > 1000 ? `Database connection successful (slow: ${dbTime}ms)` : 'Database connection successful',
      responseTime: dbTime,
      connectionPool: poolInfo,
    }
    if (dbTime > 1000) result.status = 'degraded'
  } catch (error) {
    result.checks.database = {
      status: 'unhealthy' as HealthStatus,
      message: error instanceof Error ? error.message : 'Database connection failed',
      responseTime: 0,
      connectionPool: pool
        ? { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }
        : { total: 0, idle: 0, waiting: 0 },
    }
    result.status = 'unhealthy'
  }

  // 스토리지 체크
  try {
    const storageStart = Date.now()
    const storageType = process.env.PDF_STORAGE_TYPE || 'local'
    if (storageType === 's3') {
      const endpoint = process.env.MINIO_ENDPOINT
      if (endpoint && process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY) {
        result.checks.storage = { status: 'healthy' as HealthStatus, message: `S3 storage configured (${endpoint})`, responseTime: Date.now() - storageStart }
      } else {
        result.checks.storage = { status: 'unhealthy' as HealthStatus, message: 'S3 storage incomplete configuration', responseTime: 0 }
        result.status = 'unhealthy'
      }
    } else {
      const storagePath = process.env.PDF_STORAGE_PATH || './public/reports'
      if (existsSync(storagePath)) {
        result.checks.storage = { status: 'healthy' as HealthStatus, message: `Local storage accessible (${storagePath})`, responseTime: Date.now() - storageStart }
      } else {
        result.checks.storage = { status: 'unhealthy' as HealthStatus, message: `Storage directory not found: ${storagePath}`, responseTime: 0 }
        result.status = 'unhealthy'
      }
    }
  } catch (error) {
    result.checks.storage = { status: 'unhealthy' as HealthStatus, message: error instanceof Error ? error.message : 'Storage check failed', responseTime: 0 }
    result.status = 'unhealthy'
  }

  // 백업 체크
  try {
    const backupDir = process.env.BACKUP_DIR || './backups'
    const dbName = process.env.POSTGRES_DB || 'ai_afterschool'
    if (existsSync(backupDir)) {
      const files = readdirSync(backupDir).filter(f => f.startsWith(`${dbName}-`) && f.endsWith('.sql.gz'))
      if (files.length > 0) {
        const latestFile = files
          .map(f => ({ name: f, mtime: statSync(join(backupDir, f)).mtime.getTime() }))
          .sort((a, b) => b.mtime - a.mtime)[0]
        const hoursSince = (Date.now() - latestFile.mtime) / (1000 * 60 * 60)
        const size = statSync(join(backupDir, latestFile.name)).size
        result.checks.backup = {
          status: (hoursSince <= 48 ? 'healthy' : 'unhealthy') as HealthStatus,
          message: `Last backup: ${latestFile.name} (${hoursSince.toFixed(1)}h ago, ${(size / 1024).toFixed(1)}KB)`,
        }
      } else {
        result.checks.backup = { status: 'unhealthy' as HealthStatus, message: 'No backup files found' }
      }
    } else {
      result.checks.backup = { status: 'healthy' as HealthStatus, message: 'Backup directory not configured' }
    }
  } catch {
    result.checks.backup = { status: 'unknown' as HealthStatus, message: 'Backup check failed' }
  }

  result.headers['X-Response-Time'] = String(Date.now() - startTime)
  return result
}

// 기능별 사용량 조회
async function getFeatureUsageData(): Promise<FeatureUsageData[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  try {
    const stats = await getUsageStatsByFeature({ startDate, endDate })

    const features = [
      'learning_analysis',
      'counseling_suggest',
      'report_generate',
      'face_analysis',
      'palm_analysis',
      'personality_summary',
    ] as const
    return features.map((featureType) => ({
      featureType,
      totalRequests: stats[featureType]?.totalRequests || 0,
      totalCostUsd: stats[featureType]?.totalCostUsd || 0,
    }))
  } catch (error) {
    console.error('Failed to fetch feature usage data:', error)
    return []
  }
}

export default async function AdminPage() {
  const session = await verifySession()
  // Allow both DIRECTOR and TEAM_LEADER roles to access Admin page
  if (!session || (session.role !== 'DIRECTOR' && session.role !== 'TEAM_LEADER')) {
    redirect('/dashboard')
  }

  // 병렬로 모든 데이터 조회
  const [
    usageSummary,
    dailyCost,
    weeklyCost,
    monthlyCost,
    dailyUsageData,
    providerUsageData,
    featureUsageData,
    teams,
    universalProviders,
    universalMappings,
  ] = await Promise.all([
    getBudgetSummary(),
    getCurrentPeriodCost('daily'),
    getCurrentPeriodCost('weekly'),
    getCurrentPeriodCost('monthly'),
    getDailyUsageData(),
    getProviderUsageData(),
    getFeatureUsageData(),
    getTeams(),
    getProvidersAction(),
    getFeatureMappingsAction(),
  ])

  // AI 프롬프트 seed 및 조회
  await Promise.all([
    seedGeneralPresets(getSajuSeedData()),
    seedGeneralPresets(getFaceSeedData()),
    seedGeneralPresets(getPalmSeedData()),
    seedGeneralPresets(getMbtiSeedData()),
    seedGeneralPresets(getVarkSeedData()),
    seedGeneralPresets(getNameSeedData()),
    seedGeneralPresets(getZodiacSeedData()),
  ])

  const analysisPromptPresets = {
    saju: await getAllGeneralPresetsByType('saju'),
    face: await getAllGeneralPresetsByType('face'),
    palm: await getAllGeneralPresetsByType('palm'),
    mbti: await getAllGeneralPresetsByType('mbti'),
    vark: await getAllGeneralPresetsByType('vark'),
    name: await getAllGeneralPresetsByType('name'),
    zodiac: await getAllGeneralPresetsByType('zodiac'),
  }

  // Health 데이터 직접 수집 (self-referencing fetch 방지)
  const healthData = await getHealthData()

  return (
    <div className="container py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-muted-foreground">
          시스템 설정, 모니터링, 로그를 관리합니다.
        </p>
      </div>

      <AdminTabsWrapper defaultValue="llm-hub">

        {/* LLM Hub 통합 탭 */}
        <AdminTabsContent value="llm-hub">
          <LLMHubTab
            providers={universalProviders}
            mappings={universalMappings.success ? universalMappings.data?.map((m) => ({
              id: (m as unknown as Record<string, string>).id || '',
              featureType: (m as unknown as Record<string, string>).featureType || '',
              matchMode: (m as unknown as Record<string, string>).matchMode as import('@/features/ai-engine').MatchMode,
              requiredTags: ((m as unknown as Record<string, string[]>).requiredTags) || [],
              excludedTags: ((m as unknown as Record<string, string[]>).excludedTags) || [],
              specificModelId: (m as unknown as Record<string, string | null>).specificModelId || null,
              priority: (m as unknown as Record<string, number>).priority || 1,
              fallbackMode: (m as unknown as Record<string, string>).fallbackMode as import('@/features/ai-engine').FallbackMode,
              specificModel: null,
            })) || [] : []}
            dailyCost={dailyCost}
            weeklyCost={weeklyCost}
            monthlyCost={monthlyCost}
            dailyUsageData={dailyUsageData}
            providerUsageData={providerUsageData}
            featureUsageData={featureUsageData}
            usageSummary={usageSummary.map((s) => ({
              period: s.period,
              budget: s.budget,
              currentCost: s.currentCost,
              percentUsed: s.percentUsed,
              remaining: s.remaining,
              isOverBudget: s.isOverBudget,
            }))}
          />
        </AdminTabsContent>

        {/* AI 프롬프트 관리 탭 (통합) */}
        <AdminTabsContent value="ai-prompts">
          <AnalysisPromptsTab initialPresets={analysisPromptPresets} />
        </AdminTabsContent>

        {/* 시스템 상태 탭 */}
        <AdminTabsContent value="system-status">
          <StatusTab healthData={healthData} />
        </AdminTabsContent>

        {/* 시스템 로그 탭 */}
        <AdminTabsContent value="system-logs">
          <LogsTab />
        </AdminTabsContent>

        {/* 데이터베이스 탭 */}
        <AdminTabsContent value="database">
          <DatabaseTab userRole={session.role} />
        </AdminTabsContent>

        {/* 감사 로그 탭 */}
        <AdminTabsContent value="audit-logs">
          <AuditTab />
        </AdminTabsContent>

        {/* 팀 관리 탭 */}
        <AdminTabsContent value="teams">
          <TeamsTab initialTeams={teams} userRole={session.role} />
        </AdminTabsContent>
      </AdminTabsWrapper>
    </div>
  )
}
