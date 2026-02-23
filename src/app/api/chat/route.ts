import { verifySession } from '@/lib/dal';
import { streamWithProvider } from '@/features/ai-engine';
import { db } from '@/lib/db/client';
import { resolveMentions } from '@/lib/chat/mention-resolver';
import { buildMentionContext } from '@/lib/chat/context-builder';
import type { MentionItem } from '@/lib/chat/mention-types';
import { ChatRequestSchema } from '@/lib/validations/chat';
import { logger } from '@/lib/logger';

const SYSTEM_PROMPT =
  '당신은 방과후 교실 관리 시스템의 AI 어시스턴트입니다. 교사들의 질문에 친절하고 정확하게 답변해주세요. 한국어로 답변하되, 필요 시 영어 기술 용어를 병기합니다.';

// 멀티턴 컨텍스트: 최근 N개 메시지만 전송
const MAX_CONTEXT_MESSAGES = 20;

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session.isAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0].message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = { ...parsed.data, mentions: parsed.data.mentions as MentionItem[] | undefined };
    const { prompt, providerId, sessionId, messages: clientMessages } = body;

    const trimmedPrompt = prompt.trim();

    // 세션 처리: 기존 세션이면 권한 확인, 없으면 새로 생성
    let chatSessionId = sessionId;
    if (chatSessionId) {
      const existing = await db.chatSession.findFirst({
        where: { id: chatSessionId, teacherId: session.userId },
      });
      if (!existing) {
        return new Response('Session not found', { status: 404 });
      }
    } else {
      // 새 세션 생성 — 제목은 첫 질문의 앞 50자
      const newSession = await db.chatSession.create({
        data: {
          teacherId: session.userId,
          title: trimmedPrompt.slice(0, 50),
        },
      });
      chatSessionId = newSession.id;
    }

    // 멘션 처리
    let dynamicSystem = SYSTEM_PROMPT;
    let mentionedEntitiesData: import('@/lib/chat/mention-types').MentionedEntity[] | undefined;
    let accessDeniedMessages: string[] = [];

    if (body.mentions && body.mentions.length > 0) {
      const mentionResult = await resolveMentions(body.mentions, {
        userId: session.userId,
        role: session.role,
        teamId: session.teamId,
      });

      // 멘션 컨텍스트를 system prompt에 추가
      const mentionContext = buildMentionContext(mentionResult.resolved);
      if (mentionContext) {
        dynamicSystem = `${SYSTEM_PROMPT}\n\n${mentionContext}`;
      }

      // 메타데이터 저장용
      mentionedEntitiesData = mentionResult.metadata;
      accessDeniedMessages = mentionResult.accessDeniedMessages;
    }

    // 멀티턴 메시지 구성
    let messagesForLLM: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> | undefined;

    if (clientMessages && clientMessages.length > 0) {
      // 클라이언트가 보낸 메시지 히스토리 + 현재 질문
      const contextMessages = clientMessages.slice(-MAX_CONTEXT_MESSAGES);
      messagesForLLM = [
        ...contextMessages,
        { role: 'user' as const, content: trimmedPrompt },
      ];
    }

    // user 메시지 DB 저장
    await db.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'user',
        content: trimmedPrompt,
        mentionedEntities: mentionedEntitiesData
          ? (mentionedEntitiesData as import('@/lib/db').Prisma.InputJsonValue)
          : undefined,
      },
    });

    // 세션 updatedAt 갱신
    await db.chatSession.update({
      where: { id: chatSessionId },
      data: { updatedAt: new Date() },
    });

    // providerId가 없으면(auto 모드) 첫 번째 활성 provider를 fallback으로 사용
    let effectiveProviderId = providerId || undefined;
    if (!effectiveProviderId) {
      const firstProvider = await db.provider.findFirst({
        where: { isEnabled: true, models: { some: {} } },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      effectiveProviderId = firstProvider?.id;
    }

    const result = await streamWithProvider({
      prompt: trimmedPrompt,
      featureType: 'general_chat',
      teacherId: session.userId,
      providerId: effectiveProviderId,
      system: dynamicSystem,
      messages: messagesForLLM,
    });

    // 스트리밍 응답을 읽으면서 전체 텍스트를 수집하여 DB에 저장
    const originalStream = result.stream.toTextStreamResponse();
    const [stream1, stream2] = originalStream.body!.tee();

    // 백그라운드에서 전체 응답을 수집하여 DB에 저장
    const saveResponseToDb = async () => {
      const reader = stream2.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
        if (fullText.trim()) {
          await db.chatMessage.create({
            data: {
              sessionId: chatSessionId!,
              role: 'assistant',
              content: fullText,
              provider: result.provider,
              model: result.model,
            },
          });
        }
      } catch {
        // 스트리밍 중단 시 부분 텍스트라도 저장
        if (fullText.trim()) {
          await db.chatMessage.create({
            data: {
              sessionId: chatSessionId!,
              role: 'assistant',
              content: fullText,
              provider: result.provider,
              model: result.model,
            },
          });
        }
      }
    };

    // fire-and-forget: DB 저장은 스트리밍과 병렬로 실행
    saveResponseToDb();

    const headers = new Headers(originalStream.headers);
    headers.set('X-Provider', result.provider);
    headers.set('X-Model', result.model);
    headers.set('X-Session-Id', chatSessionId!);

    if (accessDeniedMessages.length > 0) {
      headers.set('X-Mention-Warnings', JSON.stringify(accessDeniedMessages));
    }

    return new Response(stream1, {
      status: originalStream.status,
      headers,
    });
  } catch (error) {
    logger.error({ err: error }, '[Chat API] Error');
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
