'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ManualAssignmentForm } from '@/components/assignment/manual-assignment-form'
import { BatchAssignment } from '@/components/assignment/batch-assignment'
import { TeacherAssignmentTable } from '@/components/assignment/teacher-assignment-table'
import { MatchingHistoryTab } from '@/components/matching/MatchingHistoryTab'
import { SmartMatchingSection } from '@/components/matching/smart-matching-section'
import type { UnassignedStudent, AssignedStudent } from '@/components/matching/unassigned-student-combobox'
import type { LlmProviderOption } from '@/components/matching/matching-model-selector'
import { Brain, ArrowRight, History } from 'lucide-react'
interface TeacherWithStudents {
  id: string
  name: string
  role: string
  email: string
  students: {
    id: string
    name: string
    school: string
    grade: number
  }[]
}

interface MatchingPageTabsProps {
  teachers: TeacherWithStudents[]
  allStudents: {
    id: string
    name: string
    school: string
    grade: number
    teacherId: string | null
  }[]
  teachersList: {
    id: string
    name: string
    role: string
  }[]
  unassignedStudents: UnassignedStudent[]
  llmProviders?: LlmProviderOption[]
}

export function MatchingPageTabs({
  teachers,
  allStudents,
  teachersList,
  unassignedStudents,
  llmProviders = [],
}: MatchingPageTabsProps) {
  const [activeTab, setActiveTab] = useState('current')

  // 배정된 학생 목록 (선생님 이름 포함)
  const teacherNameMap = new Map(teachers.map((t) => [t.id, t.name]))
  const assignedStudents: AssignedStudent[] = allStudents
    .filter((s) => s.teacherId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      school: s.school,
      grade: s.grade,
      teacherId: s.teacherId!,
      teacherName: teacherNameMap.get(s.teacherId!) ?? "알 수 없음",
    }))

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="current" data-testid="tab-current">
          배정 현황
        </TabsTrigger>
        <TabsTrigger value="history" data-testid="tab-history">
          <History className="h-4 w-4 mr-1" />
          이력 조회
        </TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="space-y-6">
        {/* 스마트 배정 섹션 */}
        <SmartMatchingSection
          unassignedStudents={unassignedStudents}
          assignedStudents={assignedStudents}
          llmProviders={llmProviders}
        />

        <Card>
          <CardHeader>
            <CardTitle>배정 작업</CardTitle>
            <CardDescription>학생-선생님 배정을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <ManualAssignmentForm students={allStudents} teachers={teachersList} />
            <BatchAssignment students={allStudents} teachers={teachersList} />
            <Button asChild variant="secondary">
              <Link href="/matching/auto-assign" data-testid="auto-assign-link">
                <Brain className="mr-2 h-4 w-4" />
                AI 자동 배정 제안
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>선생님별 배정 현황</CardTitle>
            <CardDescription>
              각 선생님의 담당 학생 수와 목록을 확인합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherAssignmentTable teachers={teachers} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <MatchingHistoryTab />
      </TabsContent>
    </Tabs>
  )
}
