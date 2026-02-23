/**
 * 배포 불일치 에러 감지 및 자동 새로고침
 *
 * 새 배포 후 브라우저가 이전 빌드의 JS를 캐시하고 있으면
 * Server Action 호출 시 "Failed to find Server Action" 에러가 발생합니다.
 * 이 모듈은 해당 에러를 감지하고 자동으로 페이지를 새로고침합니다.
 */

import { toast } from 'sonner';

let reloadScheduled = false;

/**
 * 에러가 배포 불일치로 인한 것인지 판단
 */
export function isStaleDeploymentError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message + (('digest' in error && typeof (error as Record<string, unknown>).digest === 'string') ? (error as Record<string, unknown>).digest : '')
      : String(error);

  return message.includes('older or newer deployment') ||
    message.includes('Failed to find Server Action');
}

/**
 * 배포 불일치 에러 감지 시 toast 안내 후 자동 새로고침
 *
 * @returns 배포 불일치 에러였으면 true, 아니면 false
 */
export function handleStaleDeploymentError(error: unknown): boolean {
  if (!isStaleDeploymentError(error)) return false;

  if (reloadScheduled) return true;
  reloadScheduled = true;

  toast.info('새 버전이 배포되었습니다. 페이지를 새로고침합니다.', {
    duration: 2000,
  });

  setTimeout(() => {
    window.location.reload();
  }, 1500);

  return true;
}
