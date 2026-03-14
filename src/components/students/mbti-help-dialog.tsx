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
import { getMbtiPromptOptions as getPromptOptions } from "@/features/ai-engine/prompts"

export function MbtiHelpDialog() {
  const prompts = getPromptOptions()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">도움말</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>MBTI 분석 프롬프트 가이드</DialogTitle>
          <DialogDescription>
            각 프롬프트의 MBTI 해석 관점과 활용 방법을 확인하세요
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
                <p className="text-xs text-muted-foreground">{p.shortDescription}</p>
                <div className="grid grid-cols-[60px_1fr] gap-y-1 gap-x-2 text-xs">
                  <span className="text-muted-foreground">대상</span>
                  <span className="text-muted-foreground">{p.target}</span>
                  <span className="text-muted-foreground">목적</span>
                  <span className="text-muted-foreground">{p.purpose}</span>
                  <span className="text-muted-foreground">추천시기</span>
                  <span className="text-muted-foreground">{p.recommendedTiming}</span>
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

            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">사용 팁</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>MBTI 유형이 먼저 입력/설문되어야 AI 해석 가능합니다</li>
                <li>프롬프트를 선택하여 다양한 관점으로 분석할 수 있습니다</li>
                <li>&quot;추가 요청&quot;으로 특정 관점을 요청할 수 있습니다</li>
                <li>분석 결과는 참고용이며 최종 판단은 본인의 가치관입니다</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
