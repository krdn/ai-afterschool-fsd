import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import {
  checkOllamaHealth,
  testOllamaConnection,
  getOllamaModels,
} from '@/features/ai-engine';

/**
 * Ollama 상태 확인 엔드포인트 (DIRECTOR only)
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await checkOllamaHealth();

    return NextResponse.json({
      ...health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Ollama 연결 테스트 (POST)
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const testType = body.type || 'connection';

    if (testType === 'connection') {
      const result = await testOllamaConnection();
      return NextResponse.json(result);
    }

    if (testType === 'models') {
      const models = await getOllamaModels();
      return NextResponse.json({ models });
    }

    if (testType === 'full') {
      const health = await checkOllamaHealth();
      return NextResponse.json(health);
    }

    return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
