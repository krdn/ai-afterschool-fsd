import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * S3-compatible Image Storage (MinIO, AWS S3, etc.)
 *
 * Stores images in an S3-compatible object storage.
 * Suitable for production deployment with MinIO or AWS S3.
 * Based on S3PDFStorage pattern but optimized for image uploads.
 */

export interface ImageStorageConfig {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export interface StoredImageMetadata {
  filename: string
  size: number
  contentType: string
  uploadedAt: Date
  url: string
}

export class S3ImageStorage {
  private client: S3Client
  private bucket: string
  private endpoint: string

  constructor(config: ImageStorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Force path-style addressing for MinIO compatibility
      forcePathStyle: true,
    })
    this.bucket = config.bucket
    this.endpoint = config.endpoint
  }

  /**
   * 이미지 Blob을 S3에 업로드
   * @param blob - 이미지 Blob
   * @param filename - 파일명 (확장자 포함)
   * @returns 업로드된 이미지 메타데이터
   */
  async uploadImage(blob: Blob, filename: string): Promise<StoredImageMetadata> {
    // Blob을 Buffer로 변환
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: buffer,
      ContentType: blob.type || 'image/png',
    })

    await this.client.send(command)

    return {
      filename,
      size: buffer.length,
      contentType: blob.type || 'image/png',
      uploadedAt: new Date(),
      url: this.getImageUrl(filename),
    }
  }

  /**
   * Buffer를 직접 S3에 업로드
   * @param buffer - 이미지 Buffer
   * @param filename - 파일명
   * @param contentType - MIME 타입
   * @returns 업로드된 이미지 메타데이터
   */
  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    contentType: string = 'image/png'
  ): Promise<StoredImageMetadata> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    })

    await this.client.send(command)

    return {
      filename,
      size: buffer.length,
      contentType,
      uploadedAt: new Date(),
      url: this.getImageUrl(filename),
    }
  }

  /**
   * 공개 URL 생성
   * @param filename - 파일명
   * @returns 공개 접근 가능한 URL
   */
  getImageUrl(filename: string): string {
    // MinIO path-style URL
    return `${this.endpoint}/${this.bucket}/${filename}`
  }

  /**
   * Presigned URL 생성 (임시 접근)
   * @param filename - 파일명
   * @param expiresIn - 만료 시간(초), 기본 1시간
   * @returns Presigned URL
   */
  async getPresignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  /**
   * 이미지 다운로드
   * @param filename - 파일명
   * @returns 이미지 Buffer
   */
  async download(filename: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    })

    const response = await this.client.send(command)

    if (!response.Body) {
      throw new Error('Empty response body from S3')
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
     
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  /**
   * 이미지 삭제
   * @param filename - 파일명
   */
  async delete(filename: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    })

    await this.client.send(command)
  }

  /**
   * 이미지 존재 여부 확인
   * @param filename - 파일명
   * @returns 존재 여부
   */
  async exists(filename: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      })
      await this.client.send(command)
      return true
    } catch (error: unknown) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (s3Error.name === 'NotFound' || s3Error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }
}

/**
 * 환경 변수에서 이미지 스토리지 설정 로드
 * @returns ImageStorageConfig
 * @throws 필수 환경 변수 누락 시 에러
 */
export function loadImageStorageConfig(): ImageStorageConfig {
  const endpoint = process.env.MINIO_ENDPOINT
  const bucket = process.env.MINIO_IMAGE_BUCKET || process.env.MINIO_BUCKET
  const accessKeyId = process.env.MINIO_ACCESS_KEY
  const secretAccessKey = process.env.MINIO_SECRET_KEY
  const region = process.env.MINIO_REGION || 'us-east-1'

  if (!endpoint) {
    throw new Error('MINIO_ENDPOINT 환경 변수가 설정되지 않았습니다.')
  }
  if (!bucket) {
    throw new Error('MINIO_BUCKET 또는 MINIO_IMAGE_BUCKET 환경 변수가 설정되지 않았습니다.')
  }
  if (!accessKeyId) {
    throw new Error('MINIO_ACCESS_KEY 환경 변수가 설정되지 않았습니다.')
  }
  if (!secretAccessKey) {
    throw new Error('MINIO_SECRET_KEY 환경 변수가 설정되지 않았습니다.')
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
  }
}

// 싱글톤 인스턴스 (지연 초기화)
let imageStorageInstance: S3ImageStorage | null = null

/**
 * 이미지 스토리지 싱글톤 인스턴스 가져오기
 * @returns S3ImageStorage 인스턴스
 */
export function getImageStorage(): S3ImageStorage {
  if (!imageStorageInstance) {
    const config = loadImageStorageConfig()
    imageStorageInstance = new S3ImageStorage(config)
  }
  return imageStorageInstance
}

// 기본 export: 싱글톤 인스턴스
export const imageStorage = {
  uploadImage: (blob: Blob, filename: string) => getImageStorage().uploadImage(blob, filename),
  uploadBuffer: (buffer: Buffer, filename: string, contentType?: string) =>
    getImageStorage().uploadBuffer(buffer, filename, contentType),
  getImageUrl: (filename: string) => getImageStorage().getImageUrl(filename),
  getPresignedUrl: (filename: string, expiresIn?: number) =>
    getImageStorage().getPresignedUrl(filename, expiresIn),
  download: (filename: string) => getImageStorage().download(filename),
  delete: (filename: string) => getImageStorage().delete(filename),
  exists: (filename: string) => getImageStorage().exists(filename),
}
