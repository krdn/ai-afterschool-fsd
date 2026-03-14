export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    // Agent 시스템 초기화
    try {
      const { agentRegistry } = await import('@/features/agents/core/registry');
      await agentRegistry.initialize();
    } catch (error) {
      console.warn('Agent registry initialization skipped:', error);
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
