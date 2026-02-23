import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PDFStorage, StoredPDFMetadata } from './storage-interface'

/**
 * S3-compatible PDF storage (MinIO, AWS S3, etc.)
 *
 * Stores PDFs in an S3-compatible object storage.
 * Suitable for production deployment with MinIO or AWS S3.
 */
export class S3PDFStorage implements PDFStorage {
  private client: S3Client
  private bucket: string
  private region: string

  constructor(config: {
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
  }) {
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
    this.region = config.region
  }

  async upload(filename: string, buffer: Buffer): Promise<StoredPDFMetadata> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: buffer,
      ContentType: 'application/pdf',
    })

    await this.client.send(command)

    return {
      filename,
      size: buffer.length,
      contentType: 'application/pdf',
      uploadedAt: new Date(),
    }
  }

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

  async getPresignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    })

    return await getSignedUrl(this.client, command, { expiresIn })
  }

  async delete(filename: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    })

    await this.client.send(command)
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      })
      await this.client.send(command)
      return true
    } catch (error: unknown) {
      const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        return false
      }
      throw error
    }
  }

  async list(): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: '',
    })

    const response = await this.client.send(command)
    return (response.Contents || [])
      .map(obj => obj.Key || '')
      .filter(key => key.endsWith('.pdf'))
  }
}
