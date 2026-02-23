import { notFound } from "next/navigation"
import { getChatSessions, getChatSession } from "@/lib/actions/chat/sessions"
import { ChatPage } from "@/components/chat/chat-page"
import type { MentionedEntity } from "@/lib/chat/mention-types"

type Props = {
  params: Promise<{ sessionId: string }>
}

export default async function ChatSessionPage({ params }: Props) {
  const { sessionId } = await params
  const [sessions, chatSession] = await Promise.all([
    getChatSessions(),
    getChatSession(sessionId),
  ])

  if (!chatSession) {
    notFound()
  }

  const messages = chatSession.messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    provider: m.provider,
    model: m.model,
    mentionedEntities: m.mentionedEntities as MentionedEntity[] | null,
  }))

  return (
    <ChatPage
      initialSessions={sessions}
      sessionId={sessionId}
      initialMessages={messages}
    />
  )
}
