"use client"

import { useMemo } from "react"
import {
  getHanjaCandidates,
  getStrokeCount,
  getStrokeInfo,
  selectionsToHanjaName,
  type HanjaSelection,
} from "@/features/analysis/name"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type HanjaPickerProps = {
  name: string
  value: HanjaSelection[]
  onChange: (value: HanjaSelection[]) => void
}

const EMPTY_VALUE = "__none__"

export function HanjaPicker({ name, value, onChange }: HanjaPickerProps) {
  const syllables = useMemo(() => Array.from(name.trim()), [name])
  const hanjaName = selectionsToHanjaName(value)

  const totalStrokes = value.reduce((sum, selection) => {
    if (!selection.hanja) return sum
    return sum + (getStrokeCount(selection.hanja) ?? 0)
  }, 0)

  return (
    <div className="space-y-3 rounded-md border border-dashed border-gray-200 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">한자 선택</p>
          <p className="text-xs text-gray-500">
            성명학 계산을 위해 이름 한자를 선택하세요.
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {hanjaName ? `선택 한자: ${hanjaName}` : "아직 선택되지 않았어요."}
          {hanjaName ? ` · 총 ${totalStrokes}획` : ""}
        </div>
      </div>

      {syllables.length === 0 ? (
        <p className="text-sm text-gray-500">
          이름을 입력하면 한자 후보가 표시됩니다.
        </p>
      ) : (
        <div className="space-y-3">
          {syllables.map((syllable, index) => {
            const selection = value[index]
            const candidates = getHanjaCandidates(syllable)
            const selectedValue = selection?.hanja ?? EMPTY_VALUE
            const selectedInfo = selection?.hanja
              ? getStrokeInfo(selection.hanja)
              : null

            return (
              <div
                key={`${syllable}-${index}`}
                className="grid gap-2 sm:grid-cols-[60px_1fr_120px] sm:items-center"
              >
                <Label className="text-sm font-medium text-gray-600">
                  {syllable}
                </Label>
                <Select
                  value={selectedValue}
                  onValueChange={(nextValue) => {
                    const nextSelections = value.map((entry, entryIndex) => {
                      if (entryIndex !== index) return entry
                      return {
                        syllable: entry.syllable,
                        hanja: nextValue === EMPTY_VALUE ? null : nextValue,
                      }
                    })
                    onChange(nextSelections)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="한자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_VALUE}>선택 안함</SelectItem>
                    {candidates.map((candidate) => (
                      <SelectItem key={candidate.hanja} value={candidate.hanja}>
                        {candidate.hanja} · {candidate.meaning} · {candidate.strokes}획
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-gray-500">
                  {selectedInfo
                    ? selectedInfo.estimated
                      ? `~${selectedInfo.strokes}획`
                      : `획수 ${selectedInfo.strokes}`
                    : "획수 정보 없음"}
                </div>
                {candidates.length === 0 ? (
                  <p className="text-xs text-amber-600 sm:col-span-3">
                    등록된 한자 후보가 없어 기본 한글로 저장됩니다.
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
