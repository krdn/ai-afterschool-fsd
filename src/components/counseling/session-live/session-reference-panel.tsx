'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseAiSummary } from '../utils'

interface SessionReferencePanelProps {
  aiSummary: string | null
  topic: string
}

export function SessionReferencePanel({ aiSummary, topic }: SessionReferencePanelProps) {
  const [activeTab, setActiveTab] = useState('analysis')

  // aiSummary가 없으면 안내 메시지
  if (!aiSummary) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="font-medium">AI 자료가 없습니다</p>
          <p className="text-sm mt-1">Wizard로 예약하면 AI 분석 자료가 생성됩니다</p>
        </div>
      </div>
    )
  }

  // parseAiSummary로 3개 섹션 분리
  const { analysis, scenario, parent } = parseAiSummary(aiSummary)

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="analysis">분석 보고서</TabsTrigger>
        <TabsTrigger value="scenario">시나리오</TabsTrigger>
        <TabsTrigger value="parent">학부모용</TabsTrigger>
      </TabsList>

      <TabsContent value="analysis" className="mt-3 flex-1 overflow-hidden">
        <div className="prose prose-sm max-w-none h-full overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {analysis}
          </ReactMarkdown>
        </div>
      </TabsContent>

      <TabsContent value="scenario" className="mt-3 flex-1 overflow-hidden">
        <div className="prose prose-sm max-w-none h-full overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {scenario}
          </ReactMarkdown>
        </div>
      </TabsContent>

      <TabsContent value="parent" className="mt-3 flex-1 overflow-hidden">
        <div className="prose prose-sm max-w-none h-full overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {parent}
          </ReactMarkdown>
        </div>
      </TabsContent>
    </Tabs>
  )
}
