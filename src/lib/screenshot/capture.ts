import { domToBlob } from 'modern-screenshot'

/**
 * 스크린샷 캡처 유틸리티
 *
 * modern-screenshot 라이브러리를 사용하여 DOM 요소를 캡처합니다.
 * - 전체 화면 캡처
 * - 특정 요소 캡처
 * - Blob 형태로 반환 (MinIO 업로드용)
 */

export interface ScreenshotOptions {
  /** 이미지 타입 (기본: image/png) */
  type?: 'image/png' | 'image/jpeg' | 'image/webp'
  /** 이미지 품질 (0-1, JPEG/WebP에만 적용) */
  quality?: number
  /** 배경색 (투명 배경 요소용) */
  backgroundColor?: string
  /** 특정 요소 필터링 함수 (true 반환 시 포함) */
  filter?: (el: Node) => boolean
  /** CORS 모드 */
  cors?: 'anonymous' | 'use-credentials' | false
}

const DEFAULT_OPTIONS: ScreenshotOptions = {
  type: 'image/png',
  quality: 0.9,
  cors: 'anonymous',
}

/**
 * 전체 화면 스크린샷 캡처
 * @param options - 캡처 옵션
 * @returns PNG Blob
 * @throws 캡처 실패 시 에러
 */
export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<Blob> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  try {
    const blob = await domToBlob(document.body, {
      type: mergedOptions.type,
      quality: mergedOptions.quality,
      backgroundColor: mergedOptions.backgroundColor,
      filter: mergedOptions.filter || null,
    })

    if (!blob) {
      throw new Error('스크린샷 캡처에 실패했습니다.')
    }

    return blob
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        throw new Error(
          '외부 이미지 로드에 실패했습니다. CORS 설정을 확인하거나 exclude 옵션으로 해당 이미지를 제외해주세요.'
        )
      }
      throw new Error(`스크린샷 캡처 중 오류가 발생했습니다: ${error.message}`)
    }
    throw new Error('스크린샷 캡처 중 알 수 없는 오류가 발생했습니다.')
  }
}

/**
 * 특정 요소 스크린샷 캡처
 * @param selector - CSS 선택자
 * @param options - 캡처 옵션
 * @returns PNG Blob
 * @throws 요소를 찾을 수 없거나 캡처 실패 시 에러
 */
export async function captureElement(
  selector: string,
  options: ScreenshotOptions = {}
): Promise<Blob> {
  const element = document.querySelector(selector)

  if (!element) {
    throw new Error(`선택자 "${selector}"에 해당하는 요소를 찾을 수 없습니다.`)
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }

  try {
    const blob = await domToBlob(element as HTMLElement, {
      type: mergedOptions.type,
      quality: mergedOptions.quality,
      backgroundColor: mergedOptions.backgroundColor,
      filter: mergedOptions.filter || null,
    })

    if (!blob) {
      throw new Error('요소 캡처에 실패했습니다.')
    }

    return blob
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('CORS')) {
        throw new Error(
          '외부 이미지 로드에 실패했습니다. CORS 설정을 확인하거나 exclude 옵션으로 해당 이미지를 제외해주세요.'
        )
      }
      throw new Error(`요소 캡처 중 오류가 발생했습니다: ${error.message}`)
    }
    throw new Error('요소 캡처 중 알 수 없는 오류가 발생했습니다.')
  }
}

/**
 * Blob을 File 객체로 변환
 * @param blob - Blob 객체
 * @param filename - 파일명
 * @returns File 객체
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type })
}

/**
 * Blob을 Base64 Data URL로 변환
 * @param blob - Blob 객체
 * @returns Base64 Data URL
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
