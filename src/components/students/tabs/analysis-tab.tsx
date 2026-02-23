"use client"

import { useState, useEffect, useCallback } from "react"
import { History } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { SajuAnalysisPanel } from "@/components/students/saju-analysis-panel"
import { FaceAnalysisPanel } from "@/components/students/face-analysis-panel"
import { PalmAnalysisPanel } from "@/components/students/palm-analysis-panel"
import { MbtiAnalysisPanel } from "@/components/students/mbti-analysis-panel"
import { VarkAnalysisPanel } from "@/components/students/vark-analysis-panel"
import { NameAnalysisPanel } from "@/components/students/name-analysis-panel"
import { ZodiacAnalysisPanel } from "@/components/students/zodiac-analysis-panel"
import { AnalysisHistoryDialog } from "@/components/students/analysis-history-dialog"
import { AnalysisHistoryDetailDialog } from "@/components/students/analysis-history-detail-dialog"
import { getStudentAnalysisData } from "@/lib/actions/student/analysis-tab"
import { getAnalysisHistory } from "@/lib/actions/student/analysis"
import type { AnalysisHistoryItem } from "@/components/students/analysis-history-dialog"
import type { StudentAnalysisData } from "@/lib/actions/student/analysis-tab"

export default function AnalysisTab({ studentId }: { studentId: string }) {
  const [subTab, setSubTab] = useState("saju")
  const [data, setData] = useState<StudentAnalysisData>({
    student: null,
    faceAnalysis: null,
    palmAnalysis: null,
    mbtiAnalysis: null,
    varkAnalysis: null,
    nameAnalysis: null,
    zodiacAnalysis: null,
    enabledProviders: [],
    visionProviders: [],
    lastUsedProvider: null,
    lastUsedModel: null,
    facePromptOptions: [],
    palmPromptOptions: [],
    mbtiPromptOptions: [],
    varkPromptOptions: [],
    namePromptOptions: [],
    zodiacPromptOptions: [],
  })
  const [loading, setLoading] = useState(true)

  // History dialog states
  const [showHistory, setShowHistory] = useState(false)
  const [showHistoryDetail, setShowHistoryDetail] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState<AnalysisHistoryItem[]>([])
  const [historyNote, setHistoryNote] = useState<string>()
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AnalysisHistoryItem | null>(null)

  // Tab titles for history
  const tabTitles: Record<string, string> = {
    saju: "사주",
    face: "관상",
    palm: "손금",
    mbti: "MBTI",
    vark: "학습유형",
    name: "이름",
    zodiac: "별자리",
  }

  // Fetch history when dialog opens
  useEffect(() => {
    if (showHistory) {
      const loadHistory = async () => {
        setHistoryLoading(true)
        try {
          const result = await getAnalysisHistory(
            studentId,
            subTab as 'saju' | 'face' | 'palm' | 'mbti' | 'vark' | 'name' | 'zodiac'
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
  }, [showHistory, studentId, subTab])

  // Handle view detail
  const handleViewDetail = useCallback((item: AnalysisHistoryItem) => {
    setSelectedHistoryItem(item)
    setShowHistory(false)
    setShowHistoryDetail(true)
  }, [])

  // Handle close detail
  const handleCloseDetail = useCallback(() => {
    setShowHistoryDetail(false)
    setSelectedHistoryItem(null)
  }, [])

  const refreshData = useCallback(async () => {
    try {
      const result = await getStudentAnalysisData(studentId)
      setData(result)
    } catch (error) {
      console.error("Failed to load analysis data:", error)
    }
  }, [studentId])

  // Fetch student and analysis data
  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await getStudentAnalysisData(studentId)
        setData(result)
      } catch (error) {
        console.error("Failed to load analysis data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [studentId])

  if (loading) {
    return (
      <div data-testid="analysis-loading" className="flex justify-center items-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data.student) {
    return (
      <div className="text-center py-8 text-gray-500">
        학생 정보를 불러올 수 없습니다.
      </div>
    )
  }

  // Get image URLs for analysis panels
  // 관상 분석: face 타입 이미지가 없으면 프로필 사진을 사용
  const faceImage = data.student.images?.find(img => img.type === 'face')
  const profileImage = data.student.images?.find(img => img.type === 'profile')
  const faceImageUrl = faceImage?.originalUrl || profileImage?.originalUrl || null
  const palmImageUrl = data.student.images?.find(img => img.type === 'palm')?.originalUrl || null

  return (
    <>
      <Tabs value={subTab} onValueChange={setSubTab} data-testid="analysis-sub-tabs">
        <div className="flex items-center justify-between mb-4 gap-2">
          <TabsList className="flex overflow-x-auto whitespace-nowrap flex-1 max-w-2xl">
            <TabsTrigger value="saju" data-testid="saju-tab" className="flex-shrink-0">
              사주
              {data.student?.sajuAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="face" data-testid="face-tab" className="flex-shrink-0">
              관상
              {data.faceAnalysis?.status === "complete" && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="palm" data-testid="palm-tab" className="flex-shrink-0">
              손금
              {data.palmAnalysis?.status === "complete" && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="mbti" data-testid="mbti-tab" className="flex-shrink-0">
              MBTI
              {data.mbtiAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="vark" data-testid="vark-tab" className="flex-shrink-0">
              학습유형
              {data.varkAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="name" data-testid="name-tab" className="flex-shrink-0">
              이름
              {data.nameAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="zodiac" data-testid="zodiac-tab" className="flex-shrink-0">
              별자리
              {data.zodiacAnalysis && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 flex-shrink-0"
            data-testid="history-button"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">이력 보기</span>
          </Button>
        </div>

        <TabsContent value="saju" className="mt-6">
          <SajuAnalysisPanel
            student={{
              id: data.student.id,
              name: data.student.name,
              birthDate: data.student.birthDate,
              birthTimeHour: data.student.birthTimeHour,
              birthTimeMinute: data.student.birthTimeMinute
            }}
            analysis={data.student.sajuAnalysis}
            enabledProviders={data.enabledProviders}
            onAnalysisComplete={refreshData}
            lastUsedProvider={data.lastUsedProvider}
            lastUsedModel={data.lastUsedModel}
          />
        </TabsContent>

        <TabsContent value="face" className="mt-6">
          <FaceAnalysisPanel
            studentId={studentId}
            analysis={data.faceAnalysis}
            faceImageUrl={faceImageUrl}
            enabledProviders={data.enabledProviders}
            visionProviders={data.visionProviders}
            promptOptions={data.facePromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="palm" className="mt-6">
          <PalmAnalysisPanel
            studentId={studentId}
            analysis={data.palmAnalysis}
            palmImageUrl={palmImageUrl}
            enabledProviders={data.enabledProviders}
            visionProviders={data.visionProviders}
            promptOptions={data.palmPromptOptions}
          />
        </TabsContent>

        <TabsContent value="mbti" className="mt-6">
          <MbtiAnalysisPanel
            studentId={studentId}
            studentName={data.student.name}
            analysis={data.mbtiAnalysis}
            enabledProviders={data.enabledProviders}
            promptOptions={data.mbtiPromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="vark" className="mt-6">
          <VarkAnalysisPanel
            studentId={studentId}
            studentName={data.student.name}
            analysis={data.varkAnalysis}
            enabledProviders={data.enabledProviders}
            promptOptions={data.varkPromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="name" className="mt-6">
          <NameAnalysisPanel
            student={{
              id: data.student.id,
              name: data.student.name,
              nameHanja: data.student.nameHanja,
            }}
            analysis={data.nameAnalysis}
            enabledProviders={data.enabledProviders}
            promptOptions={data.namePromptOptions}
            onDataChange={refreshData}
          />
        </TabsContent>

        <TabsContent value="zodiac" className="mt-6">
          <ZodiacAnalysisPanel
            studentId={studentId}
            analysis={data.zodiacAnalysis}
            enabledProviders={data.enabledProviders}
            promptOptions={data.zodiacPromptOptions}
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
