"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"

type MbtiDirectInputProps = {
  studentId: string
  studentName: string
  existingData?: {
    mbtiType: string
    percentages: {
      E: number; I: number
      S: number; N: number
      T: number; F: number
      J: number; P: number
    }
  }
  onSave: (data: {
    mbtiType: string
    percentages: {
      E: number; I: number
      S: number; N: number
      T: number; F: number
      J: number; P: number
    }
  }) => Promise<void>
  onCancel: () => void
  isSaving?: boolean
}

const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ"
]

export function MbtiDirectInputModal({
  studentId,
  studentName,
  existingData,
  onSave,
  onCancel,
  isSaving: isSavingProp = false
}: MbtiDirectInputProps) {
  const [selectedType, setSelectedType] = useState(existingData?.mbtiType || "")
  const [percentages, setPercentages] = useState(existingData?.percentages || {
    E: 50, I: 50,
    S: 50, N: 50,
    T: 50, F: 50,
    J: 50, P: 50
  })
  const [isSaving, setIsSaving] = useState(false)

  // MBTI 유형 선택 시 자동으로 백분율 설정
  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    // 각 차원의 첫 글자에 따라 백분율 설정 (70:30)
    const newPercentages = { ...percentages }

    if (type.includes("E")) {
      newPercentages.E = 70
      newPercentages.I = 30
    } else {
      newPercentages.E = 30
      newPercentages.I = 70
    }

    if (type.includes("S")) {
      newPercentages.S = 70
      newPercentages.N = 30
    } else {
      newPercentages.S = 30
      newPercentages.N = 70
    }

    if (type.includes("T")) {
      newPercentages.T = 70
      newPercentages.F = 30
    } else {
      newPercentages.T = 30
      newPercentages.F = 70
    }

    if (type.includes("J")) {
      newPercentages.J = 70
      newPercentages.P = 30
    } else {
      newPercentages.J = 30
      newPercentages.P = 70
    }

    setPercentages(newPercentages)
  }

  const handleSave = async () => {
    if (!selectedType) {
      alert("MBTI 유형을 선택해주세요.")
      return
    }

    setIsSaving(true)
    try {
      await onSave({ mbtiType: selectedType, percentages })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">MBTI 직접 입력</h3>
            <p className="text-sm text-gray-500">{studentName} 학생의 MBTI 유형</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* MBTI 유형 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              MBTI 유형 선택 *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {MBTI_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className={`
                    py-2 px-3 rounded-lg border-2 font-medium text-sm transition-all
                    ${selectedType === type
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 차원별 백분율 조정 */}
          {selectedType && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700">차원별 백분율 조정</h4>

              {/* E / I */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">외향 (E)</span>
                  <span className="font-medium">{percentages.E}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentages.E}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setPercentages({ ...percentages, E: val, I: 100 - val })
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">내향 (I)</span>
                  <span className="font-medium">{percentages.I}%</span>
                </div>
              </div>

              {/* S / N */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">감각 (S)</span>
                  <span className="font-medium">{percentages.S}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentages.S}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setPercentages({ ...percentages, S: val, N: 100 - val })
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">직관 (N)</span>
                  <span className="font-medium">{percentages.N}%</span>
                </div>
              </div>

              {/* T / F */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">사고 (T)</span>
                  <span className="font-medium">{percentages.T}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentages.T}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setPercentages({ ...percentages, T: val, F: 100 - val })
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">감정 (F)</span>
                  <span className="font-medium">{percentages.F}%</span>
                </div>
              </div>

              {/* J / P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">판단 (J)</span>
                  <span className="font-medium">{percentages.J}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentages.J}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setPercentages({ ...percentages, J: val, P: 100 - val })
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">인식 (P)</span>
                  <span className="font-medium">{percentages.P}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            💡 <strong>팁:</strong> 설문 없이 이미 알고 있는 MBTI 유형을 빠르게 입력할 수 있습니다.
            백분율은 선택사항이며, 유형에 따라 자동으로 설정됩니다.
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving || isSavingProp}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedType || isSaving || isSavingProp}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="mbti-save-button"
          >
            {isSaving || isSavingProp ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                저장 중...
              </>
            ) : "저장"}
          </button>
        </div>
      </div>
    </div>
  )
}
