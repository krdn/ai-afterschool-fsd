import sharp from 'sharp'

/**
 * 이미지 블러 감지 (Sharp 기반)
 * Laplacian variance 방식으로 흐림 정도 계산
 */
export async function detectBlur(imageBuffer: Buffer): Promise<{
  isBlurry: boolean
  score: number
}> {
  try {
    const { data, info } = await sharp(imageBuffer)
      .greyscale()
      .resize(300, 300, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    // 엣지 검출 - 인접 픽셀 간 차이 계산
    let totalVariance = 0
    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i] - data[i - 1])
      totalVariance += diff
    }

    const avgVariance = totalVariance / data.length
    const threshold = 10 // 튜닝 필요

    return {
      isBlurry: avgVariance < threshold,
      score: avgVariance
    }
  } catch (error) {
    console.error('Blur detection error:', error)
    return { isBlurry: false, score: 100 } // 에러 시 통과
  }
}

/**
 * 이미지 기본 검증 (크기, 포맷)
 */
export async function validateImageBasic(imageBuffer: Buffer): Promise<{
  valid: boolean
  reason?: string
  metadata?: { width: number; height: number; format: string }
}> {
  try {
    const metadata = await sharp(imageBuffer).metadata()

    if (!metadata.width || !metadata.height) {
      return { valid: false, reason: '이미지 메타데이터를 읽을 수 없습니다.' }
    }

    if (metadata.width < 200 || metadata.height < 200) {
      return { valid: false, reason: '이미지 크기가 너무 작습니다. 최소 200x200 픽셀이 필요합니다.' }
    }

    return {
      valid: true,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown'
      }
    }
  } catch (error) {
    return { valid: false, reason: '이미지 포맷을 확인할 수 없습니다.' }
  }
}

/**
 * 이미지 전체 검증 (기본 + 블러)
 */
export async function validateImage(imageBuffer: Buffer): Promise<{
  valid: boolean
  reason?: string
  metadata?: { width: number; height: number; format: string }
  blurInfo?: { isBlurry: boolean; score: number }
}> {
  // 기본 검증
  const basicValidation = await validateImageBasic(imageBuffer)
  if (!basicValidation.valid) {
    return basicValidation
  }

  // 블러 검증
  const blurResult = await detectBlur(imageBuffer)

  if (blurResult.isBlurry) {
    return {
      valid: false,
      reason: '이미지가 너무 흐릿합니다. 더 선명한 사진을 업로드해주세요.',
      metadata: basicValidation.metadata,
      blurInfo: blurResult
    }
  }

  return {
    valid: true,
    metadata: basicValidation.metadata,
    blurInfo: blurResult
  }
}
