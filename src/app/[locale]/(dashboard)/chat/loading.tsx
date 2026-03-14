import { Loader2 } from "lucide-react"

export default function ChatLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">AI 채팅을 준비하는 중...</p>
      </div>
    </div>
  )
}
