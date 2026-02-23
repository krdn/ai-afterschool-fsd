'use client';

/**
 * Global Error Boundary
 *
 * Catches unhandled errors in the Client Component tree.
 * Renders a fallback UI and reports errors to Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling#global-error
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Capture exception with Sentry
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4" data-testid="server-error-page">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
              일시적인 문제가 발생했어요
            </h1>
            <p className="mb-4 text-center text-gray-600">
              페이지를 불러오는 중 문제가 발생했어요.
            </p>

            <div className="mb-6 p-3 rounded-lg bg-gray-50 text-sm text-gray-600">
              <p className="font-medium mb-2">이렇게 해보세요:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>페이지를 새로고침 해보세요</li>
                <li>인터넷 연결을 확인해보세요</li>
                <li>잠시 후 다시 시도해보세요</li>
              </ul>
              {error.digest && (
                <p className="mt-3 text-xs text-gray-400">
                  문의 시 참고 코드: {error.digest}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => window.location.href = '/students'}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                학생 목록으로 가기
              </button>
            </div>

            <div className="mt-6 border-t pt-4">
              <p className="text-center text-sm text-gray-500">
                문제가 계속되면 관리자에게 문의해 주세요.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
