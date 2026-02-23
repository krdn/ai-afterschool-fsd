/**
 * PDF 생성 유틸리티
 *
 * React PDF 컴포넌트를 Buffer/File로 렌더링하는 헬퍼 함수들입니다.
 */

import { renderToBuffer, renderToFile } from "@react-pdf/renderer"
import type { DocumentProps } from "@react-pdf/renderer"
import fs from "fs/promises"
import path from "path"

/**
 * React PDF 컴포넌트를 Buffer로 렌더링 (스트리밍 응답용)
 */
export async function pdfToBuffer(
  component: React.ReactElement<DocumentProps>
): Promise<Buffer> {
  return await renderToBuffer(component)
}

/**
 * React PDF 컴포넌트를 파일로 렌더링 (캐싱/저장용)
 */
export async function pdfToFile(
  component: React.ReactElement<DocumentProps>,
  outputPath: string
): Promise<void> {
  const dir = path.dirname(outputPath)
  await fs.mkdir(dir, { recursive: true })
  await renderToFile(component, outputPath)
}

/**
 * 보고서 파일명 생성
 */
export function generateReportFilename(
  studentId: string,
  studentName: string,
  timestamp: number = Date.now()
): string {
  const sanitizedName = studentName.replace(/[^a-zA-Z0-9가-힣]/g, "_")
  return `report-${studentId}-${sanitizedName}-${timestamp}.pdf`
}

/**
 * PDF 저장 경로 (환경변수 또는 기본값)
 */
export function getPdfStoragePath(): string {
  return process.env.PDF_STORAGE_PATH || "./public/reports"
}
