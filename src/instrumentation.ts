export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 서버 시작 시 필수 환경변수 검증
    const { checkEnv } = await import("@/lib/env-check");
    checkEnv();

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
