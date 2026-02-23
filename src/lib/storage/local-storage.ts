import fs from 'fs/promises'
import path from 'path'
import { PDFStorage, StoredPDFMetadata } from './storage-interface'

/**
 * Local filesystem PDF storage
 *
 * Stores PDFs in the local filesystem. Suitable for development.
 * Files are stored relative to the project root or a configurable base path.
 */
export class LocalPDFStorage implements PDFStorage {
  private basePath: string

  constructor(basePath: string = './public/reports') {
    this.basePath = basePath
  }

  private getFullPath(filename: string): string {
    return path.join(process.cwd(), this.basePath, filename)
  }

  async upload(filename: string, buffer: Buffer): Promise<StoredPDFMetadata> {
    const fullPath = this.getFullPath(filename)

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    // Write file
    await fs.writeFile(fullPath, buffer)

    // Get file stats
    const stats = await fs.stat(fullPath)

    return {
      filename,
      size: stats.size,
      contentType: 'application/pdf',
      uploadedAt: stats.mtime,
    }
  }

  async download(filename: string): Promise<Buffer> {
    const fullPath = this.getFullPath(filename)
    return await fs.readFile(fullPath)
  }

  async getPresignedUrl(filename: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, return a direct URL path
    // Note: expiresIn is ignored for local storage
    return `/reports/${filename}`
  }

  async delete(filename: string): Promise<void> {
    const fullPath = this.getFullPath(filename)
    await fs.unlink(fullPath)
  }

  async exists(filename: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filename)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async list(): Promise<string[]> {
    const fullPath = this.getFullPath('')
    const entries = await fs.readdir(fullPath, { withFileTypes: true })
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.pdf'))
      .map(entry => entry.name)
  }
}
