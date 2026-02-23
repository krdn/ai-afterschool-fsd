'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AdminTabsWrapperProps {
  children: React.ReactNode
  defaultValue?: string
}

export function AdminTabsWrapper({ children, defaultValue = 'llm-hub' }: AdminTabsWrapperProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" data-testid="admin-tabs">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
        <TabsTrigger value="llm-hub">LLM Hub</TabsTrigger>
        <TabsTrigger value="ai-prompts">AI 프롬프트</TabsTrigger>
        <TabsTrigger value="system-status">시스템 상태</TabsTrigger>
        <TabsTrigger value="system-logs">시스템 로그</TabsTrigger>
        <TabsTrigger value="database">데이터베이스</TabsTrigger>
        <TabsTrigger value="audit-logs">감사 로그</TabsTrigger>
        <TabsTrigger value="teams">팀 관리</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  )
}

interface AdminTabsContentProps {
  value: string
  children: React.ReactNode
}

export function AdminTabsContent({ value, children }: AdminTabsContentProps) {
  // Map tab values to test IDs for E2E testing
  const testIdMap: Record<string, string> = {
    'llm-hub': 'admin-llm-hub-page',
    'ai-prompts': 'admin-ai-prompts-page',
    'system-status': 'admin-system-status-page',
    'system-logs': 'admin-system-logs-page',
    'database': 'admin-backup-page',
    'audit-logs': 'admin-audit-logs-page',
    'teams': 'admin-teams-page',
  }

  return <TabsContent value={value} className="space-y-6" data-testid={testIdMap[value]}>{children}</TabsContent>
}
