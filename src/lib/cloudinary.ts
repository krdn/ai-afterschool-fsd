import "server-only"
import { v2 as cloudinary } from "cloudinary"

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

const isCloudinaryConfigured = !!(cloudName && apiKey && apiSecret)

if (!isCloudinaryConfigured) {
  console.warn(
    "[cloudinary] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET 중 일부가 미설정입니다. 이미지 업로드 기능이 비활성화됩니다."
  )
}

const resolvedCloudName = cloudName || "not-configured"
const resolvedApiKey = apiKey || "not-configured"
const resolvedApiSecret = apiSecret || "not-configured"

cloudinary.config({
  cloud_name: resolvedCloudName,
  api_key: resolvedApiKey,
  api_secret: resolvedApiSecret,
  secure: true,
})

const SQUARE_SIZE = 512
const SQUARE_TRANSFORMATION = `c_fill,g_auto,h_${SQUARE_SIZE},w_${SQUARE_SIZE}`

export { cloudinary, isCloudinaryConfigured }

export function getSquareTransformation(): string {
  return SQUARE_TRANSFORMATION
}

export function buildResizedImageUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        crop: "fill",
        gravity: "auto",
      },
    ],
  })
}

export type UploadSignatureParams = Record<string, string | number>

export function createUploadSignature(
  paramsToSign: UploadSignatureParams
): {
  signature: string
  apiKey: string
  cloudName: string
} {
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    resolvedApiSecret
  )

  return {
    signature,
    apiKey: resolvedApiKey,
    cloudName: resolvedCloudName,
  }
}
