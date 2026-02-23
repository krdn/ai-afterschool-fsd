import { getChatSessions } from "@/lib/actions/chat/sessions"
import { ChatPage } from "@/components/chat/chat-page"
import type { MentionItem } from "@/lib/chat/mention-types"

type Props = {
  searchParams: Promise<{ q?: string; mentions?: string }>
}

export default async function NewChatPage({ searchParams }: Props) {
  const [sessions, params] = await Promise.all([
    getChatSessions(),
    searchParams,
  ])

  let initialMentions: MentionItem[] | undefined
  if (params.mentions) {
    try {
      const parsed = JSON.parse(params.mentions)
      if (Array.isArray(parsed) && parsed.every(
        (m): m is MentionItem => typeof m === 'object' && m !== null && 'type' in m && 'id' in m
      )) {
        initialMentions = parsed
      }
    } catch {
      // 파싱 실패 시 무시 — 멘션 없이 전송
    }
  }

  return (
    <ChatPage
      initialSessions={sessions}
      initialQuery={params.q}
      initialMentions={initialMentions}
    />
  )
}
