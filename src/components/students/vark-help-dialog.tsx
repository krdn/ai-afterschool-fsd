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
import { getVarkPromptOptions as getPromptOptions } from "@/features/ai-engine/prompts"

export function VarkHelpDialog() {
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
          <DialogTitle>VARK 학습유형 프롬프트 가이드</DialogTitle>
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

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">사용 팁</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>VARK 설문을 먼저 완료해야 AI 해석을 사용할 수 있습니다</li>
                <li>프롬프트를 선택하여 학습 계획, 과목별 전략 등 다양한 분석이 가능합니다</li>
                <li>학기 초에 검사하고 학기 말에 재검사하면 변화를 비교할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
