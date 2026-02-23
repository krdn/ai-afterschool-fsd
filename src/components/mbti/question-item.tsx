"use client"

import { useFormContext } from "react-hook-form"
import { cn } from "@/lib/utils"

type Props = {
  questionId: number
  questionText: string
  description?: string
  isFocused: boolean
  hasError?: boolean
}

export function QuestionItem({ questionId, questionText, description, isFocused, hasError }: Props) {
  const { watch, setValue, formState } = useFormContext()
  const responses = watch("responses")
  const answered = responses?.[questionId] !== undefined
  const showError = (formState.isSubmitted && !answered) || hasError

  return (
    <div
      id={`question-${questionId}`}
      className={cn(
        "p-4 rounded-lg border transition-colors",
        showError && "border-red-500 bg-red-50",
        isFocused && "ring-2 ring-blue-500",
        !showError && !isFocused && "border-gray-200"
      )}
    >
      <p className="mb-1 font-medium">{questionId}. {questionText}</p>
      {description && (
        <p className="text-sm text-gray-500 mb-3">{description}</p>
      )}
      {showError && (
        <p className="text-sm text-red-600 mb-2">이 문항에 답해주세요.</p>
      )}
      <div className="flex gap-3 items-center">
        <span className="text-sm text-gray-500">매우 아니다</span>
        {[1, 2, 3, 4, 5].map(value => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name={`q-${questionId}`}
              value={value}
              checked={responses?.[questionId] === value}
              onChange={() => setValue(`responses.${questionId}`, value, { shouldDirty: true })}
              className="sr-only peer"
            />
            <div className={cn(
              "w-10 h-10 flex items-center justify-center rounded-full border-2",
              "peer-checked:border-blue-600 peer-checked:bg-blue-100 peer-checked:font-bold",
              "hover:border-blue-400 transition-colors"
            )}>
              {value}
            </div>
          </label>
        ))}
        <span className="text-sm text-gray-500">매우 그렇다</span>
      </div>
    </div>
  )
}
