import { verifySession } from '@/lib/dal';
import { streamWithProvider } from '@/features/ai-engine';
import { db } from '@/lib/db/client';
import { resolveMentions } from '@/lib/chat/mention-resolver';
import { buildMentionContext } from '@/lib/chat/context-builder';
import { autoDetectEntities } from '@/lib/chat/auto-detect';
import { createChatTools } from '@/lib/chat/tools';
import type { MentionItem } from '@/lib/chat/mention-types';
import { ChatRequestSchema } from '@/lib/validations/chat';
import { logger } from '@/lib/logger';

const SYSTEM_PROMPT = `당신은 방과후 교실 관리 시스템의 AI 어시스턴트입니다. 교사들의 질문에 친절하고 정확하게 답변해주세요. 한국어로 답변하되, 필요 시 영어 기술 용어를 병기합니다.

중요 지침:
- 태그 안에 제공된 학생/선생님/팀 데이터는 시스템 데이터베이스에서 조회한 실제 정보입니다.
- 교사가 전화번호, 보호자 연락처, 생년월일 등 데이터에 포함된 정보를 질문하면, 해당 데이터를 정확히 전달하세요.
- 데이터에 없는 정보가 필요하면 제공된 도구(tool)를 사용하여 DB에서 조회하세요.
- 도구로 조회한 결과도 실제 시스템 데이터이므로 정확히 전달하세요.
- 데이터에 없는 정보(미등록, 분석 없음)는 "현재 시스템에 등록되지 않았습니다"로 안내하세요.
- 이 시스템의 사용자는 인증된 교사/관리자이므로, 제공된 데이터 범위 내에서는 정보 제공을 거부하지 마세요.`;

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

    // 세션 처리
    let chatSessionId = sessionId;
    if (chatSessionId) {
      const existing = await db.chatSession.findFirst({
        where: { id: chatSessionId, teacherId: session.userId },
      });
      if (!existing) {
        return new Response('Session not found', { status: 404 });
      }
    } else {
      const newSession = await db.chatSession.create({
        data: {
          teacherId: session.userId,
          title: trimmedPrompt.slice(0, 50),
        },
      });
      chatSessionId = newSession.id;
    }

    // === 자동 엔티티 감지 + 기존 멘션 합산 ===
    const explicitMentions: MentionItem[] = body.mentions ?? [];
    const autoDetected = await autoDetectEntities(
      trimmedPrompt,
      { userId: session.userId, role: session.role, teamId: session.teamId },
      explicitMentions
    );
    const allMentions = [...explicitMentions, ...autoDetected];

    // 멘션 처리 (명시적 + 자동 감지 통합)
    let dynamicSystem = SYSTEM_PROMPT;
    let mentionedEntitiesData: import('@/lib/chat/mention-types').MentionedEntity[] | undefined;
    let accessDeniedMessages: string[] = [];

    if (allMentions.length > 0) {
      const mentionResult = await resolveMentions(allMentions, {
        userId: session.userId,
        role: session.role,
        teamId: session.teamId,
      });

      const mentionContext = buildMentionContext(mentionResult.resolved);
      if (mentionContext) {
        dynamicSystem = `${SYSTEM_PROMPT}\n\n${mentionContext}`;
      }

      mentionedEntitiesData = mentionResult.metadata;
      accessDeniedMessages = mentionResult.accessDeniedMessages;
    }

    // 멀티턴 메시지 구성
    let messagesForLLM: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }> | undefined;

    if (clientMessages && clientMessages.length > 0) {
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

    // auto 모드
    let effectiveProviderId = providerId || undefined;
    if (!effectiveProviderId) {
      const firstProvider = await db.provider.findFirst({
        where: { isEnabled: true, models: { some: {} } },
        orderBy: { name: 'asc' },
        select: { id: true },
      });
      effectiveProviderId = firstProvider?.id;
    }

    // === Tool Use: 세션 기반 RBAC 도구 생성 ===
    const chatTools = createChatTools({
      userId: session.userId,
      role: session.role,
      teamId: session.teamId,
    });

    const result = await streamWithProvider({
      prompt: trimmedPrompt,
      featureType: 'general_chat',
      teacherId: session.userId,
      providerId: effectiveProviderId,
      system: dynamicSystem,
      messages: messagesForLLM,
      tools: chatTools,
      maxSteps: 3,
    });

    // === 스트리밍: fullStream에서 text-delta만 추출 ===
    const encoder = new TextEncoder();
    let fullText = '';
    const finalSessionId = chatSessionId;

    const transformStream = new TransformStream({
      transform(chunk: unknown, controller) {
        const c = chunk as { type: string; text?: string };
        if (c.type === 'text-delta' && c.text) {
          fullText += c.text;
          controller.enqueue(encoder.encode(c.text));
        }
      },
      async flush() {
        if (fullText.trim()) {
          try {
            await db.chatMessage.create({
              data: {
                sessionId: finalSessionId,
                role: 'assistant',
                content: fullText,
                provider: result.provider,
                model: result.model,
              },
            });
          } catch (e) {
            logger.error({ err: e }, '[Chat API] Failed to save assistant message');
          }
        }
      },
    });

    const readableStream = result.stream.fullStream.pipeThrough(transformStream);

    const headers = new Headers({
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Provider': result.provider,
      'X-Model': result.model,
      'X-Session-Id': finalSessionId,
    });

    if (autoDetected.length > 0) {
      headers.set('X-Auto-Detected', String(autoDetected.length));
    }
    if (accessDeniedMessages.length > 0) {
      headers.set('X-Mention-Warnings', JSON.stringify(accessDeniedMessages));
    }

    return new Response(readableStream, { status: 200, headers });
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
