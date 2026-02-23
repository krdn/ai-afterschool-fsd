"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PromptPreviewDialog } from "./prompt-preview-dialog"
/** 범용 프롬프트 메타 타입 (사주/관상/손금/MBTI 공통) */
export type GenericPromptMeta = {
  id: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
}

type Props = {
  selectedPromptId: string
  onPromptChange: (id: string) => void
  promptOptions: GenericPromptMeta[]
  disabled?: boolean
  showInfoCard?: boolean
}

export function PromptSelector({
  selectedPromptId,
  onPromptChange,
  promptOptions,
  disabled = false,
  showInfoCard = false,
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const selectedMeta = promptOptions.find((p) => p.id === selectedPromptId) ?? null
  const showInfo = selectedPromptId !== "default"

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 whitespace-nowrap">프롬프트:</label>
        <Select
          value={selectedPromptId}
          onValueChange={onPromptChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {promptOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showInfo && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPreviewOpen(true)}
            disabled={disabled}
          >
            <Info className="h-4 w-4 text-gray-500" />
          </Button>
        )}
        <PromptPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          prompt={selectedMeta}
        />
      </div>

      {showInfoCard && selectedMeta && selectedMeta.id !== "default" && (
        <div className="rounded-md border border-purple-100 bg-purple-50/50 px-3 py-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-purple-700">{selectedMeta.name}</span>
            <div className="flex gap-1">
              {selectedMeta.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 border-purple-200 text-purple-600">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-gray-600">{selectedMeta.shortDescription}</p>
          <div className="flex gap-4 text-gray-500">
            <span>대상: {selectedMeta.target}</span>
            <span>추천: {selectedMeta.recommendedTiming}</span>
          </div>
        </div>
      )}
    </div>
  )
}
