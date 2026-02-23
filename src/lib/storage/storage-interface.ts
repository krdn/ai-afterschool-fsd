/**
 * PDF Storage Interface
 *
 * Abstracts PDF storage operations to support multiple backends:
 * - Local filesystem (development)
 * - S3-compatible storage like MinIO (production)
 *
 * All operations should be atomic and handle errors appropriately.
 */

export interface StoredPDFMetadata {
  filename: string
  size: number
  contentType: string
  uploadedAt: Date
}

export interface PDFStorage {
  /**
   * Upload PDF buffer to storage
   * @param filename - Unique filename for the PDF
   * @param buffer - PDF file content as buffer
   * @returns metadata about the stored file
   */
  upload(filename: string, buffer: Buffer): Promise<StoredPDFMetadata>

  /**
   * Download PDF from storage
   * @param filename - Name of the file to download
   * @returns file content as buffer
   */
  download(filename: string): Promise<Buffer>

  /**
   * Get a presigned URL for direct download
   * @param filename - Name of the file
   * @param expiresIn - URL expiration time in seconds (default: 3600)
   * @returns presigned URL string
   */
  getPresignedUrl(filename: string, expiresIn?: number): Promise<string>

  /**
   * Delete PDF from storage
   * @param filename - Name of the file to delete
   */
  delete(filename: string): Promise<void>

  /**
   * Check if a file exists in storage
   * @param filename - Name of the file to check
   * @returns true if file exists
   */
  exists(filename: string): Promise<boolean>

  /**
   * List all PDFs in storage (optional, for admin/debug)
   * @returns list of filenames
   */
  list?(): Promise<string[]>
}
