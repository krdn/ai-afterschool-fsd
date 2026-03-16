"use client"

import { useState, useTransition } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createPresetAction,
  updatePresetAction,
  deletePresetAction,
} from "@/lib/actions/admin/analysis-prompts"
import type { AnalysisType, AnalysisPromptPresetData } from '@/features/analysis'

type Props = {
  initialPresets: Record<AnalysisType, AnalysisPromptPresetData[]>
}

type EditingPreset = {
  id?: string
  analysisType: AnalysisType
  promptKey: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string
  promptTemplate: string
  isBuiltIn: boolean
  sortOrder: number
}

function emptyPreset(analysisType: AnalysisType): EditingPreset {
  return {
    analysisType,
    promptKey: "",
    name: "",
    shortDescription: "",
    target: "",
    levels: "★★★☆☆",
    purpose: "",
    recommendedTiming: "",
    tags: "",
    promptTemplate: "",
    isBuiltIn: false,
    sortOrder: 0,
  }
}

function toEditing(p: AnalysisPromptPresetData): EditingPreset {
  return {
    id: p.id,
    analysisType: p.analysisType,
    promptKey: p.promptKey,
    name: p.name,
    shortDescription: p.shortDescription,
    target: p.target,
    levels: p.levels,
    purpose: p.purpose,
    recommendedTiming: p.recommendedTiming,
    tags: p.tags.join(", "),
    promptTemplate: p.promptTemplate,
    isBuiltIn: p.isBuiltIn,
    sortOrder: p.sortOrder,
  }
}

// 플레이스홀더 안내 메시지
const placeholderGuides: Record<AnalysisType, string> = {
  saju: "사용 가능한 플레이스홀더: {학생정보}, {사주데이터}",
  face: "사용 가능한 플레이스홀더: {학생정보}, {분석요청사항}",
  palm: "사용 가능한 플레이스홀더: {학생정보}, {손종류}, {분석요청사항}",
  mbti: "사용 가능한 플레이스홀더: {학생정보}, {MBTI유형}, {MBTI비율}",
  vark: "사용 가능한 플레이스홀더: {학생정보}, {VARK유형}, {VARK비율}",
  name: "사용 가능한 플레이스홀더: {학생정보}, {이름}, {한자}",
  zodiac: "사용 가능한 플레이스홀더: {학생정보}, {별자리}, {원소}",
  grade_strength: "사용 가능한 플레이스홀더: {{DATA}} (통계 분석 결과가 자동 삽입됩니다)",
  grade_gap: "사용 가능한 플레이스홀더: {{DATA}} (과목별 성적/목표 데이터가 자동 삽입됩니다)",
  grade_plan: "사용 가능한 플레이스홀더: {{DATA}} (강점/약점/학습스타일 데이터가 자동 삽입됩니다)",
  grade_coaching: "사용 가능한 플레이스홀더: {{DATA}} (3개 분석 결과가 자동 삽입됩니다)",
}

export function AnalysisPromptsTab({ initialPresets }: Props) {
  const [activeType, setActiveType] = useState<AnalysisType>("saju")
  const [presets, setPresets] = useState(initialPresets)
  const [editing, setEditing] = useState<EditingPreset | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const currentPresets = presets[activeType]

  const handleSave = () => {
    if (!editing) return
    setError(null)

    startTransition(async () => {
      try {
        const tags = editing.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)

        if (editing.id) {
          // 수정
          const updated = await updatePresetAction(editing.id, {
            name: editing.name,
            shortDescription: editing.shortDescription,
            target: editing.target,
            levels: editing.levels,
            purpose: editing.purpose,
            recommendedTiming: editing.recommendedTiming,
            tags,
            promptTemplate: editing.promptTemplate,
            sortOrder: editing.sortOrder,
          })

          setPresets((prev) => ({
            ...prev,
            [editing.analysisType]: prev[editing.analysisType].map((p) =>
              p.id === updated.id ? updated : p
            ),
          }))
        } else {
          // 생성
          const created = await createPresetAction({
            analysisType: editing.analysisType,
            promptKey: editing.promptKey,
            name: editing.name,
            shortDescription: editing.shortDescription,
            target: editing.target,
            levels: editing.levels,
            purpose: editing.purpose,
            recommendedTiming: editing.recommendedTiming,
            tags,
            promptTemplate: editing.promptTemplate,
            sortOrder: editing.sortOrder,
          })

          setPresets((prev) => ({
            ...prev,
            [editing.analysisType]: [...prev[editing.analysisType], created],
          }))
        }

        setEditing(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패")
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTargetId) return
    startTransition(async () => {
      try {
        await deletePresetAction(deleteTargetId)
        setPresets((prev) => ({
          ...prev,
          [activeType]: prev[activeType].filter((p) => p.id !== deleteTargetId),
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패")
      }
      setDeleteTargetId(null)
    })
  }

  const handleToggleActive = (preset: AnalysisPromptPresetData) => {
    startTransition(async () => {
      try {
        const updated = await updatePresetAction(preset.id, {
          isActive: !preset.isActive,
        })

        setPresets((prev) => ({
          ...prev,
          [activeType]: prev[activeType].map((p) => (p.id === updated.id ? updated : p)),
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "토글 실패")
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI 프롬프트 관리</h2>
          <p className="text-sm text-muted-foreground">
            사주/관상/손금/MBTI 분석 프롬프트를 커스터마이징하세요
          </p>
        </div>
        <Button
          onClick={() => setEditing(emptyPreset(activeType))}
          disabled={isPending || !!editing}
        >
          <Plus className="mr-2 h-4 w-4" />새 프롬프트 추가
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 서브탭: 분석 유형 선택 */}
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as AnalysisType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="saju">사주</TabsTrigger>
          <TabsTrigger value="face">관상</TabsTrigger>
          <TabsTrigger value="palm">손금</TabsTrigger>
          <TabsTrigger value="mbti">MBTI</TabsTrigger>
        </TabsList>

        {(["saju", "face", "palm", "mbti"] as const).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {/* 새 프롬프트 편집 폼 */}
            {editing && editing.analysisType === type && (
              <div className="rounded-lg border-2 border-primary bg-muted/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {editing.id ? "프롬프트 수정" : "새 프롬프트 생성"}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4">
                  {/* promptKey */}
                  <div>
                    <label className="text-sm font-medium">프롬프트 키 (고유 ID)</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.promptKey}
                      onChange={(e) =>
                        setEditing({ ...editing, promptKey: e.target.value })
                      }
                      disabled={!!editing.id}
                      placeholder="예: face-academic"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      영문 소문자, 숫자, 하이픈만 사용. 생성 후 변경 불가.
                    </p>
                  </div>

                  {/* name */}
                  <div>
                    <label className="text-sm font-medium">표시 이름</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      placeholder="예: 관상 기반 학업 적성 분석"
                    />
                  </div>

                  {/* shortDescription */}
                  <div>
                    <label className="text-sm font-medium">짧은 설명</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.shortDescription}
                      onChange={(e) =>
                        setEditing({ ...editing, shortDescription: e.target.value })
                      }
                      placeholder="한 줄 요약"
                    />
                  </div>

                  {/* target */}
                  <div>
                    <label className="text-sm font-medium">상담 대상</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.target}
                      onChange={(e) => setEditing({ ...editing, target: e.target.value })}
                      placeholder="예: 학업 지도가 필요한 학생"
                    />
                  </div>

                  {/* levels */}
                  <div>
                    <label className="text-sm font-medium">분석 깊이</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.levels}
                      onChange={(e) => setEditing({ ...editing, levels: e.target.value })}
                      placeholder="★★★☆☆"
                    />
                  </div>

                  {/* purpose */}
                  <div>
                    <label className="text-sm font-medium">핵심 목적</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.purpose}
                      onChange={(e) => setEditing({ ...editing, purpose: e.target.value })}
                      placeholder="이 프롬프트의 핵심 목적"
                    />
                  </div>

                  {/* recommendedTiming */}
                  <div>
                    <label className="text-sm font-medium">추천 시기</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.recommendedTiming}
                      onChange={(e) =>
                        setEditing({ ...editing, recommendedTiming: e.target.value })
                      }
                      placeholder="언제 사용하면 좋은지"
                    />
                  </div>

                  {/* tags */}
                  <div>
                    <label className="text-sm font-medium">태그 (쉼표 구분)</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.tags}
                      onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                      placeholder="학업, 진로, 성격"
                    />
                  </div>

                  {/* promptTemplate */}
                  <div>
                    <label className="text-sm font-medium">프롬프트 템플릿</label>
                    <Textarea
                      className="mt-1 min-h-[300px] font-mono text-sm"
                      value={editing.promptTemplate}
                      onChange={(e) =>
                        setEditing({ ...editing, promptTemplate: e.target.value })
                      }
                      placeholder="AI에게 전달될 프롬프트 내용"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {placeholderGuides[type]}
                    </p>
                  </div>

                  {/* sortOrder */}
                  <div>
                    <label className="text-sm font-medium">정렬 순서</label>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editing.sortOrder}
                      onChange={(e) =>
                        setEditing({ ...editing, sortOrder: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>
                    취소
                  </Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {isPending ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>
            )}

            {/* 프리셋 목록 */}
            <div className="space-y-3">
              {currentPresets.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  등록된 프롬프트가 없습니다.
                </p>
              )}

              {currentPresets.map((preset) => (
                <div key={preset.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{preset.name}</h4>
                        {preset.isBuiltIn && (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" />
                            내장
                          </Badge>
                        )}
                        <Badge variant={preset.isActive ? "default" : "secondary"}>
                          {preset.isActive ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {preset.shortDescription}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-muted-foreground">
                          대상: {preset.target}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          깊이: {preset.levels}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          추천: {preset.recommendedTiming}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpandedId(expandedId === preset.id ? null : preset.id)
                        }
                      >
                        {expandedId === preset.id ? (
                          <>
                            <EyeOff className="mr-1 h-4 w-4" />
                            숨기기
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1 h-4 w-4" />
                            상세
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(preset)}
                        disabled={isPending}
                      >
                        {preset.isActive ? "비활성화" : "활성화"}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(toEditing(preset))}
                        disabled={isPending || !!editing}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {!preset.isBuiltIn && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTargetId(preset.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 확장된 상세 정보 */}
                  {expandedId === preset.id && (
                    <div className="space-y-3 border-t pt-3">
                      <div>
                        <p className="text-sm font-medium">핵심 목적</p>
                        <p className="text-sm text-muted-foreground">{preset.purpose}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">태그</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {preset.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium">프롬프트 템플릿</p>
                        <ScrollArea className="h-[200px] mt-1">
                          <pre className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">
                            {preset.promptTemplate}
                          </pre>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="프롬프트 삭제"
        description="정말 삭제하시겠습니까? 내장 프롬프트는 비활성화됩니다."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        loading={isPending}
      />
    </div>
  )
}
