import { PDFStorage } from './storage-interface'
import { LocalPDFStorage } from './local-storage'
import { S3PDFStorage } from './s3-storage'

/**
 * Create PDF storage instance based on environment configuration
 *
 * Environment variables:
 * - PDF_STORAGE_TYPE: 'local' | 's3' (default: 'local')
 * - PDF_STORAGE_PATH: Base path for local storage (default: './public/reports')
 * - MINIO_ENDPOINT: S3 endpoint (e.g., 'minio:9000')
 * - MINIO_REGION: S3 region (default: 'us-east-1')
 * - MINIO_ACCESS_KEY: S3 access key
 * - MINIO_SECRET_KEY: S3 secret key
 * - MINIO_BUCKET: S3 bucket name (default: 'reports')
 */
export function createPDFStorage(): PDFStorage {
  const storageType = process.env.PDF_STORAGE_TYPE || 'local'

  switch (storageType) {
    case 's3':
      // Validate required S3 environment variables
      const endpoint = process.env.MINIO_ENDPOINT
      const region = process.env.MINIO_REGION || 'us-east-1'
      const accessKey = process.env.MINIO_ACCESS_KEY
      const secretKey = process.env.MINIO_SECRET_KEY
      const bucket = process.env.MINIO_BUCKET || 'reports'

      if (!endpoint || !accessKey || !secretKey) {
        throw new Error(
          'Missing required S3 environment variables. ' +
          'Required: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY'
        )
      }

      return new S3PDFStorage({
        endpoint: `http://${endpoint}`,
        region,
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
        bucket,
      })

    case 'local':
    default:
      const storagePath = process.env.PDF_STORAGE_PATH || './public/reports'
      return new LocalPDFStorage(storagePath)
  }
}

/**
 * Get storage type for display/debugging
 */
export function getStorageType(): string {
  return process.env.PDF_STORAGE_TYPE || 'local'
}
