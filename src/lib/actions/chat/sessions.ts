'use server';

import { db } from '@/lib/db/client';
import { verifySession } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export type ChatSessionSummary = {
  id: string;
  title: string | null;
  updatedAt: Date;
  messageCount: number;
};

export type ChatSessionDetail = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    provider: string | null;
    model: string | null;
    createdAt: Date;
    mentionedEntities: unknown;
  }>;
};

/**
 * 현재 교사의 채팅 세션 목록을 반환합니다.
 */
export async function getChatSessions(): Promise<ChatSessionSummary[]> {
  const session = await verifySession();

  const sessions = await db.chatSession.findMany({
    where: { teacherId: session.userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { messages: true } },
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    updatedAt: s.updatedAt,
    messageCount: s._count.messages,
  }));
}

/**
 * 세션 + 메시지를 조회합니다 (권한 확인 포함).
 */
export async function getChatSession(
  sessionId: string
): Promise<ChatSessionDetail | null> {
  const session = await verifySession();

  const chatSession = await db.chatSession.findFirst({
    where: {
      id: sessionId,
      teacherId: session.userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          provider: true,
          model: true,
          createdAt: true,
          mentionedEntities: true,
        },
      },
    },
  });

  return chatSession;
}

/**
 * 채팅 세션을 삭제합니다.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const session = await verifySession();

  await db.chatSession.deleteMany({
    where: {
      id: sessionId,
      teacherId: session.userId,
    },
  });

  revalidatePath('/chat');
}
