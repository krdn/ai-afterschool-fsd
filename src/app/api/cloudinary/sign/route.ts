import { NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/session"
import { createUploadSignature, isCloudinaryConfigured } from "@/lib/cloudinary"

const FolderPattern =
  /^(?:students\/(?:drafts\/[a-zA-Z0-9-_]+|[a-zA-Z0-9-_]+)|teachers\/(?:new|[a-zA-Z0-9-_]+))\/(profile|face|palm)$/

const ParamsToSignSchema = z
  .object({
    folder: z
      .string()
      .regex(FolderPattern, "Folder must match students/{id}/type or teachers/{id}/type"),
    timestamp: z.preprocess(
      (value) => {
        if (typeof value === "string" && value.trim() !== "") {
          return Number(value)
        }

        return value
      },
      z.number().int().positive()
    ),
  })
  .catchall(z.union([z.string(), z.number()]))

const SignRequestSchema = z.object({
  paramsToSign: ParamsToSignSchema,
})

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()

  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isCloudinaryConfigured) {
    return NextResponse.json(
      { error: "이미지 업로드 서비스가 설정되지 않았습니다" },
      { status: 503 }
    )
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = SignRequestSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { paramsToSign } = parsed.data
  const signature = createUploadSignature(paramsToSign)

  return NextResponse.json({
    ...signature,
    timestamp: paramsToSign.timestamp,
  })
}
