// 타입
export type {
  StudentReportData,
  SajuAnalysis,
  NameAnalysis,
  MbtiAnalysis,
  FaceAnalysis,
  PalmAnalysis,
  AnalysesData,
  LearningStrategy,
  CareerGuidance,
  PersonalitySummaryData,
  ConsultationReportData,
  ColorPalette,
} from "./types"

// PDF 생성 유틸리티
export {
  pdfToBuffer,
  pdfToFile,
  generateReportFilename,
  getPdfStoragePath,
} from "./generator"

// 스타일 & 색상
export { styles, colors } from "./styles"

// 폰트
export { fonts, fontWeights } from "./fonts"

// 템플릿 컴포넌트
export { ConsultationReport } from "./templates/consultation-report"
export { Header } from "./templates/sections/header"
export { StudentInfo } from "./templates/sections/student-info"
export { AnalysisResults } from "./templates/sections/analysis-results"
export { AIRecommendations } from "./templates/sections/ai-recommendations"
export { Footer } from "./templates/sections/footer"
