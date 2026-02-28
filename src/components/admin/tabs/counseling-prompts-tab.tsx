"use client"

import { useState, useTransition } from "react"
import {
  Plus, Pencil, Trash2, Save, X, Eye, EyeOff, Lock, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createCounselingPresetAction,
  updateCounselingPresetAction,
  deleteCounselingPresetAction,
} from "@/lib/actions/counseling/prompt-presets"
import type {
  CounselingPromptPresetData,
  CounselingPromptType,
} from "@/features/counseling/repositories/prompt-preset-types"
import {
  TEMPLATE_VARIABLES,
  PROMPT_TYPE_LABELS,
} from "@/features/counseling/repositories/prompt-preset-types"

type Props = {
  initialPresets: Record<CounselingPromptType, CounselingPromptPresetData[]>
}

type EditingPreset = {
  id?: string
  promptType: CounselingPromptType
  name: string
  description: string
  promptTemplate: string
  systemPrompt: string
  maxOutputTokens: number
  temperature: number
  isBuiltIn: boolean
  sortOrder: number
}

const PROMPT_TYPES: CounselingPromptType[] = [
  "analysis_report", "scenario", "parent_summary", "counseling_summary", "personality_summary",
]

function emptyPreset(promptType: CounselingPromptType): EditingPreset {
  return {
    promptType, name: "", description: "", promptTemplate: "",
    systemPrompt: "", maxOutputTokens: 1000, temperature: 0.3,
    isBuiltIn: false, sortOrder: 0,
  }
}

function toEditing(p: CounselingPromptPresetData): EditingPreset {
  return {
    id: p.id, promptType: p.promptType, name: p.name,
    description: p.description, promptTemplate: p.promptTemplate,
    systemPrompt: p.systemPrompt ?? "", maxOutputTokens: p.maxOutputTokens,
    temperature: p.temperature, isBuiltIn: p.isBuiltIn, sortOrder: p.sortOrder,
  }
}

export function CounselingPromptsTab({ initialPresets }: Props) {
  const [activeType, setActiveType] = useState<CounselingPromptType>("analysis_report")
  const [presets, setPresets] = useState(initialPresets)
  const [editing, setEditing] = useState<EditingPreset | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const currentPresets = presets[activeType]

  const handleSave = () => {
    if (!editing) return
    setError(null)

    startTransition(async () => {
      try {
        if (editing.id) {
          const result = await updateCounselingPresetAction(editing.id, {
            name: editing.name,
            description: editing.description,
            promptTemplate: editing.promptTemplate,
            systemPrompt: editing.systemPrompt || null,
            maxOutputTokens: editing.maxOutputTokens,
            temperature: editing.temperature,
            sortOrder: editing.sortOrder,
          })
          if (!result.success) { setError(result.error || "수정 실패"); return }

          setPresets((prev) => ({
            ...prev,
            [editing.promptType]: prev[editing.promptType].map((p) =>
              p.id === result.data.id ? result.data : p
            ),
          }))
        } else {
          const result = await createCounselingPresetAction({
            promptType: editing.promptType,
            name: editing.name,
            description: editing.description,
            promptTemplate: editing.promptTemplate,
            systemPrompt: editing.systemPrompt || undefined,
            maxOutputTokens: editing.maxOutputTokens,
            temperature: editing.temperature,
          })
          if (!result.success) { setError(result.error || "생성 실패"); return }

          setPresets((prev) => ({
            ...prev,
            [editing.promptType]: [...prev[editing.promptType], result.data],
          }))
        }
        setEditing(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "저장 실패")
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm("정말 삭제하시겠습니까? (내장 프롬프트는 비활성화됩니다)")) return
    startTransition(async () => {
      try {
        const result = await deleteCounselingPresetAction(id)
        if (!result.success) { setError(result.error || "삭제 실패"); return }
        setPresets((prev) => ({
          ...prev,
          [activeType]: prev[activeType].filter((p) => p.id !== id),
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제 실패")
      }
    })
  }

  const handleToggleActive = (preset: CounselingPromptPresetData) => {
    startTransition(async () => {
      try {
        const result = await updateCounselingPresetAction(preset.id, { isActive: !preset.isActive })
        if (!result.success) { setError(result.error || "토글 실패"); return }
        setPresets((prev) => ({
          ...prev,
          [activeType]: prev[activeType].map((p) => (p.id === result.data.id ? result.data : p)),
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
          <h2 className="text-2xl font-bold">상담 프롬프트 관리</h2>
          <p className="text-sm text-muted-foreground">
            상담 AI 파이프라인의 프롬프트를 커스터마이징하세요. {"{{변수}}"} 문법으로 동적 데이터를 삽입합니다.
          </p>
        </div>
        <Button
          onClick={() => setEditing(emptyPreset(activeType))}
          disabled={isPending || !!editing}
        >
          <Plus className="mr-2 h-4 w-4" />새 프리셋 추가
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <Tabs value={activeType} onValueChange={(v) => { setActiveType(v as CounselingPromptType); setEditing(null) }}>
        <TabsList className="grid w-full grid-cols-5">
          {PROMPT_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
              {PROMPT_TYPE_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {PROMPT_TYPES.map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {/* 변수 가이드 */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm">
              <Info className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">사용 가능한 변수</p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  {TEMPLATE_VARIABLES[type].map((v) => `{{${v}}}`).join(", ")}
                </p>
              </div>
            </div>

            {/* 편집 폼 */}
            {editing && editing.promptType === type && (
              <div className="rounded-lg border-2 border-primary bg-muted/30 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {editing.id ? "프리셋 수정" : "새 프리셋 생성"}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>프리셋 이름</Label>
                      <Input
                        className="mt-1"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="예: 기본 분석 보고서"
                        disabled={editing.isBuiltIn}
                      />
                    </div>
                    <div>
                      <Label>설명</Label>
                      <Input
                        className="mt-1"
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        placeholder="이 프리셋의 용도"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>시스템 프롬프트 (선택)</Label>
                    <Textarea
                      className="mt-1 min-h-[80px] font-mono text-sm"
                      value={editing.systemPrompt}
                      onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })}
                      placeholder="AI의 역할과 행동 지침 (비워두면 기본값 사용)"
                    />
                  </div>

                  <div>
                    <Label>프롬프트 템플릿</Label>
                    <Textarea
                      className="mt-1 min-h-[300px] font-mono text-sm"
                      value={editing.promptTemplate}
                      onChange={(e) => setEditing({ ...editing, promptTemplate: e.target.value })}
                      placeholder={`프롬프트 내용을 입력하세요.\n\n변수 사용 예: {{studentName}} 학생의 정보를 분석하여...`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>최대 출력 토큰</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={editing.maxOutputTokens}
                        onChange={(e) => setEditing({ ...editing, maxOutputTokens: Number(e.target.value) })}
                        min={100} max={4000} step={100}
                      />
                    </div>
                    <div>
                      <Label>Temperature</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={editing.temperature}
                        onChange={(e) => setEditing({ ...editing, temperature: Number(e.target.value) })}
                        min={0} max={1} step={0.1}
                      />
                    </div>
                    <div>
                      <Label>정렬 순서</Label>
                      <Input
                        type="number"
                        className="mt-1"
                        value={editing.sortOrder}
                        onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)}>취소</Button>
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
                  등록된 프리셋이 없습니다. 프리셋을 추가하면 기본 프롬프트 대신 사용됩니다.
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
                            <Lock className="h-3 w-3" />내장
                          </Badge>
                        )}
                        <Badge variant={preset.isActive ? "default" : "secondary"}>
                          {preset.isActive ? "활성" : "비활성"}
                        </Badge>
                      </div>
                      {preset.description && (
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>토큰: {preset.maxOutputTokens}</span>
                        <span>Temperature: {preset.temperature}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setExpandedId(expandedId === preset.id ? null : preset.id)}
                      >
                        {expandedId === preset.id ? (
                          <><EyeOff className="mr-1 h-4 w-4" />숨기기</>
                        ) : (
                          <><Eye className="mr-1 h-4 w-4" />상세</>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(preset)} disabled={isPending}>
                        {preset.isActive ? "비활성화" : "활성화"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(toEditing(preset))} disabled={isPending || !!editing}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!preset.isBuiltIn && (
                        <Button variant="outline" size="sm" onClick={() => handleDelete(preset.id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandedId === preset.id && (
                    <div className="space-y-3 border-t pt-3">
                      {preset.systemPrompt && (
                        <div>
                          <p className="text-sm font-medium">시스템 프롬프트</p>
                          <ScrollArea className="h-[100px] mt-1">
                            <pre className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">
                              {preset.systemPrompt}
                            </pre>
                          </ScrollArea>
                        </div>
                      )}
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
    </div>
  )
}
