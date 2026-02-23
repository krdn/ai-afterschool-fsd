import { NextResponse } from 'next/server';
import { testProviderConnection } from '@/features/ai-engine';
import type { ProviderName } from '@/features/ai-engine';
import { verifySession } from '@/lib/dal';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await verifySession();

    if (session.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { provider, apiKey } = await request.json() as {
      provider: ProviderName;
      apiKey?: string;
    };

    const result = await testProviderConnection(provider, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Request parsing failed'
    }, { status: 400 });
  }
}
