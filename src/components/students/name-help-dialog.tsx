"use client"

import { HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getNamePromptOptions as getPromptOptions } from "@/features/ai-engine/prompts"

export function NameHelpDialog() {
  const prompts = getPromptOptions()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-gray-500">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">도움말</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>이름풀이 프롬프트 가이드</DialogTitle>
          <DialogDescription>
            각 프롬프트의 목적과 활용 시기를 확인하세요
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          <div className="space-y-4 pr-2">
            {prompts.map((p) => (
              <div key={p.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.id === "default" && (
                    <Badge variant="secondary" className="text-xs">기본</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-600">{p.shortDescription}</p>
                <div className="grid grid-cols-[60px_1fr] gap-y-1 gap-x-2 text-xs">
                  <span className="text-gray-400">대상</span>
                  <span className="text-gray-600">{p.target}</span>
                  <span className="text-gray-400">목적</span>
                  <span className="text-gray-600">{p.purpose}</span>
                  <span className="text-gray-400">추천시기</span>
                  <span className="text-gray-600">{p.recommendedTiming}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">사용 팁</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>한자 수리 분석은 학생 정보에서 한자를 먼저 선택해야 합니다</li>
                <li>한글 이름풀이는 한자 선택 없이도 바로 실행할 수 있습니다</li>
                <li>프롬프트를 바꾸면 음운학, 수리/오행 등 다양한 관점으로 해석됩니다</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
