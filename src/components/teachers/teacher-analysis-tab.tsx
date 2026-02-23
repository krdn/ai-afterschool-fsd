"use client"

import { useState, useEffect, useCallback } from "react"
import { History } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TeacherSajuPanel } from "@/components/teachers/teacher-saju-panel"
import { TeacherFacePanel } from "@/components/teachers/teacher-face-panel"
import { TeacherPalmPanel } from "@/components/teachers/teacher-palm-panel"
import { TeacherMbtiPanel } from "@/components/teachers/teacher-mbti-panel"
import { TeacherNamePanel } from "@/components/teachers/teacher-name-panel"
import { AnalysisHistoryDialog } from "@/components/students/analysis-history-dialog"
import { AnalysisHistoryDetailDialog } from "@/components/students/analysis-history-detail-dialog"
import { getTeacherAnalysisData } from "@/lib/actions/teacher/analysis-tab"
import { getTeacherAnalysisHistory } from "@/lib/actions/teacher/analysis-history"
import type { AnalysisHistoryItem } from "@/components/students/analysis-history-dialog"
import type { TeacherAnalysisData } from "@/lib/actions/teacher/analysis-tab"

export default function TeacherAnalysisTab({ teacherId }: { teacherId: string }) {
  const [subTab, setSubTab] = useState("saju")
  const [data, setData] = useState<TeacherAnalysisData>({
    teacher: null,
    faceAnalysis: null,
    palmAnalysis: null,
    mbtiAnalysis: null,
    nameAnalysis: null,
    enabledProviders: [],
    visionProviders: [],
    lastUsedProvider: null,
    lastUsedModel: null,
    facePromptOptions: [],
    palmPromptOptions: [],
    mbtiPromptOptions: [],
    namePromptOptions: [],
  })
  const [loading, setLoading] = useState(true)

  // History dialog states
  const [showHistory, setShowHistory] = useState(false)
  const [showHistoryDetail, setShowHistoryDetail] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([])
  const [historyNote, setHistoryNote] = useState<string>()
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AnalysisHistoryItem | null>(null)

  const tabTitles: Record<string, string> = {
    saju: "사주",
    face: "관상",
    palm: "손금",
    mbti: "MBTI",
    name: "이름",
  }

  // Fetch history when dialog opens
  useEffect(() => {
    if (showHistory) {
      const loadHistory = async () => {
        setHistoryLoading(true)
        try {
          const result = await getTeacherAnalysisHistory(
            teacherId,
            subTab as 'saju' | 'face' | 'palm' | 'mbti' | 'name'
          )
          if (result.success) {
            setHistoryItems(result.data.history)
            setHistoryNote(result.data.note)
          }
        } catch (error) {
          console.error("Failed to load history:", error)
        } finally {
          setHistoryLoading(false)
        }
      }

      loadHistory()
    }
  }, [showHistory, teacherId, subTab])

  const handleViewDetail = useCallback((item: AnalysisHistoryItem) => {
    setSelectedHistoryItem(item)
    setShowHistory(false)
    setShowHistoryDetail(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setShowHistoryDetail(false)
    setSelectedHistoryItem(null)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const result = await getTeacherAnalysisData(teacherId)
      setData(result)
    } catch (error) {
      console.error("Failed to load analysis data:", error)
    }
  }, [teacherId])

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await getTeacherAnalysisData(teacherId)
        setData(result)
      } catch (error) {
        console.error("Failed to load analysis data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [teacherId])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data.teacher) {
    return (
      <div className="text-center py-8 text-gray-500">
        선생님 정보를 불러올 수 없습니다.
      </div>
    )
  }

  // 프로필 이미지를 관상/손금용 이미지로 사용
  const faceImageUrl = data.faceAnalysis?.imageUrl || data.teacher.profileImage || null
  const palmImageUrl = data.palmAnalysis?.imageUrl || data.teacher.profileImage || null

  return (
    <>
      <Tabs value={subTab} onValueChange={setSubTab}>
        <div className="flex items-center justify-between mb-4 gap-2">
          <TabsList className="flex overflow-x-auto whitespace-nowrap flex-1 max-w-xl">
            <TabsTrigger value="saju" className="flex-shrink-0">
              사주
              {data.teacher?.sajuAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="face" className="flex-shrink-0">
              관상
              {data.faceAnalysis?.status === "complete" && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="palm" className="flex-shrink-0">
              손금
              {data.palmAnalysis?.status === "complete" && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="mbti" className="flex-shrink-0">
              MBTI
              {data.mbtiAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="name" className="flex-shrink-0">
              이름
              {data.nameAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">이력 보기</span>
          </Button>
        </div>

        <TabsContent value="saju" className="mt-6">
          <TeacherSajuPanel
            teacherId={data.teacher.id}
            teacherName={data.teacher.name}
            analysis={data.teacher.sajuAnalysis}
            teacherBirthDate={data.teacher.birthDate}
            teacherBirthTimeHour={data.teacher.birthTimeHour}
            teacherBirthTimeMinute={data.teacher.birthTimeMinute}
            enabledProviders={data.enabledProviders}
            onAnalysisComplete={refreshData}
            lastUsedProvider={data.lastUsedProvider}
            lastUsedModel={data.lastUsedModel}
          />
        </TabsContent>

        <TabsContent value="face" className="mt-6">
          <TeacherFacePanel
            teacherId={teacherId}
            teacherName={data.teacher.name}
            analysis={data.faceAnalysis}
            faceImageUrl={faceImageUrl}
            enabledProviders={data.enabledProviders}
            visionProviders={data.visionProviders}
            promptOptions={data.facePromptOptions}
          />
        </TabsContent>

        <TabsContent value="palm" className="mt-6">
          <TeacherPalmPanel
            teacherId={teacherId}
            teacherName={data.teacher.name}
            analysis={data.palmAnalysis}
            palmImageUrl={palmImageUrl}
            enabledProviders={data.enabledProviders}
            promptOptions={data.palmPromptOptions}
          />
        </TabsContent>

        <TabsContent value="mbti" className="mt-6">
          <TeacherMbtiPanel
            teacherId={teacherId}
            teacherName={data.teacher.name}
            analysis={data.mbtiAnalysis}
            enabledProviders={data.enabledProviders}
            promptOptions={data.mbtiPromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="name" className="mt-6">
          <TeacherNamePanel
            teacherId={data.teacher.id}
            teacherName={data.teacher.name}
            analysis={data.nameAnalysis}
            teacherNameHanja={data.teacher.nameHanja}
            enabledProviders={data.enabledProviders}
            promptOptions={data.namePromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>
      </Tabs>

      {/* History List Dialog */}
      <AnalysisHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        title={`${tabTitles[subTab]} 분석 이력`}
        history={historyItems}
        note={historyNote}
        loading={historyLoading}
        onViewDetail={handleViewDetail}
      />

      {/* History Detail Dialog */}
      <AnalysisHistoryDetailDialog
        open={showHistoryDetail}
        onOpenChange={handleCloseDetail}
        title={`${tabTitles[subTab]} 분석 상세`}
        item={selectedHistoryItem}
        type={subTab as 'saju' | 'face' | 'palm' | 'mbti'}
      />
    </>
  )
}
