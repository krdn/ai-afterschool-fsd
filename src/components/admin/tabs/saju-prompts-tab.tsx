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
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  createPresetAction,
  updatePresetAction,
  deletePresetAction,
} from "@/lib/actions/admin/saju-prompts"
import type { SajuPromptPresetData } from '@/features/analysis'

type Props = {
  initialPresets: SajuPromptPresetData[]
}

type EditingPreset = {
  id?: string
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

function emptyPreset(): EditingPreset {
  return {
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

function toEditing(p: SajuPromptPresetData): EditingPreset {
  return {
    id: p.id,
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

export function SajuPromptsTab({ initialPresets }: Props) {
  const [presets, setPresets] = useState(initialPresets)
  const [editing, setEditing] = useState<EditingPreset | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
          setPresets((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          )
        } else {
          // 생성
          if (!editing.promptKey.trim()) {
            setError("프롬프트 키를 입력해주세요.")
            return
          }
          const created = await createPresetAction({
            promptKey: editing.promptKey.trim(),
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
          setPresets((prev) => [...prev, created])
        }
        setEditing(null)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "저장에 실패했습니다."
        )
      }
    })
  }

  const handleDelete = (preset: SajuPromptPresetData) => {
    if (preset.isBuiltIn) {
      if (!confirm(`"${preset.name}"은(는) 내장 프롬프트입니다. 비활성 처리할까요?`)) return
    } else {
      if (!confirm(`"${preset.name}" 프롬프트를 삭제할까요?`)) return
    }
    startTransition(async () => {
      try {
        await deletePresetAction(preset.id)
        if (preset.isBuiltIn) {
          setPresets((prev) =>
            prev.map((p) =>
              p.id === preset.id ? { ...p, isActive: false } : p
            )
          )
        } else {
          setPresets((prev) => prev.filter((p) => p.id !== preset.id))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "삭제에 실패했습니다.")
      }
    })
  }

  const handleToggleActive = (preset: SajuPromptPresetData) => {
    startTransition(async () => {
      try {
        const updated = await updatePresetAction(preset.id, {
          isActive: !preset.isActive,
        })
        setPresets((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : "상태 변경에 실패했습니다.")
      }
    })
  }

  // 편집 폼
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editing.id ? "프롬프트 수정" : "새 프롬프트 추가"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(null)}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {/* 프롬프트 키 (생성 시만 편집 가능) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              프롬프트 키 (slug)
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-gray-100"
              placeholder="예: custom-math-strategy"
              value={editing.promptKey}
              onChange={(e) =>
                setEditing({ ...editing, promptKey: e.target.value })
              }
              disabled={!!editing.id || isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              표시 이름
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="예: 수학 특화 공략법"
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-600">
              짧은 설명
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.shortDescription}
              onChange={(e) =>
                setEditing({ ...editing, shortDescription: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              상담 대상
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.target}
              onChange={(e) =>
                setEditing({ ...editing, target: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              분석 깊이
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.levels}
              onChange={(e) =>
                setEditing({ ...editing, levels: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-gray-600">
              핵심 목적
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.purpose}
              onChange={(e) =>
                setEditing({ ...editing, purpose: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              추천 시기
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.recommendedTiming}
              onChange={(e) =>
                setEditing({ ...editing, recommendedTiming: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              태그 (쉼표 구분)
            </label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="학습, 수학, 전략"
              value={editing.tags}
              onChange={(e) =>
                setEditing({ ...editing, tags: e.target.value })
              }
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              정렬 순서
            </label>
            <input
              type="number"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={editing.sortOrder}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  sortOrder: parseInt(e.target.value) || 0,
                })
              }
              disabled={isPending}
            />
          </div>
        </div>

        {/* TODO(human): 프롬프트 템플릿 편집기 - 변수 치환 가이드 및 미리보기 기능 */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">
            프롬프트 템플릿
          </label>
          <p className="text-[10px] text-gray-400">
            사용 가능한 변수: {"{학생정보}"}, {"{사주데이터}"} — 실행 시 자동 치환됩니다.
          </p>
          <Textarea
            value={editing.promptTemplate}
            onChange={(e) =>
              setEditing({ ...editing, promptTemplate: e.target.value })
            }
            disabled={isPending}
            rows={12}
            className="text-sm font-mono resize-y"
            placeholder={`역할:\n당신은 사주명리학 전문가입니다.\n...\n\n[학생 정보]\n{학생정보}\n\n[사주 데이터]\n{사주데이터}\n\n분석 항목:\n1. ...\n2. ...`}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(null)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            <Save className="h-4 w-4 mr-1" />
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    )
  }

  // 목록 뷰
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">사주 분석 프롬프트 관리</h3>
          <p className="text-xs text-gray-500">
            프롬프트를 추가/수정하여 사주 분석의 관점과 깊이를 커스터마이징합니다.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditing(emptyPreset())}
          disabled={isPending}
        >
          <Plus className="h-4 w-4 mr-1" />
          새 프롬프트
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {presets.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-gray-500 text-sm">
          등록된 프롬프트가 없습니다. &quot;새 프롬프트&quot;를 눌러 추가해보세요.
        </div>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {presets.map((preset) => {
              const isExpanded = expandedId === preset.id
              return (
                <div
                  key={preset.id}
                  className={`rounded-lg border ${
                    preset.isActive
                      ? "border-gray-200"
                      : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  {/* 헤더 */}
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-2 text-left"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : preset.id)
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium text-sm">
                        {preset.name}
                      </span>
                      {preset.isBuiltIn && (
                        <Lock className="h-3 w-3 text-gray-400" />
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {preset.promptKey}
                      </Badge>
                      {!preset.isActive && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          비활성
                        </Badge>
                      )}
                    </button>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleActive(preset)}
                        disabled={isPending}
                        title={preset.isActive ? "비활성 처리" : "활성 처리"}
                      >
                        {preset.isActive ? (
                          <Eye className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditing(toEditing(preset))}
                        disabled={isPending}
                        title="수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(preset)}
                        disabled={isPending}
                        title={preset.isBuiltIn ? "비활성 처리" : "삭제"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 상세 */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 space-y-3">
                      <p className="text-xs text-gray-600">
                        {preset.shortDescription}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">대상:</span>{" "}
                          <span className="text-gray-600">{preset.target}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">깊이:</span>{" "}
                          <span className="text-gray-600">{preset.levels}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400">목적:</span>{" "}
                          <span className="text-gray-600">{preset.purpose}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">추천시기:</span>{" "}
                          <span className="text-gray-600">
                            {preset.recommendedTiming}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">정렬:</span>{" "}
                          <span className="text-gray-600">
                            {preset.sortOrder}
                          </span>
                        </div>
                      </div>
                      {preset.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {preset.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="rounded-md bg-gray-50 border p-3">
                        <p className="text-[10px] text-gray-400 mb-1">
                          프롬프트 템플릿 (미리보기)
                        </p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-[200px] overflow-y-auto font-mono">
                          {preset.promptTemplate.slice(0, 500)}
                          {preset.promptTemplate.length > 500 ? "..." : ""}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
