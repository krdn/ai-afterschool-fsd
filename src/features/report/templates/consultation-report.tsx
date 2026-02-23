import { Document, Page } from "@react-pdf/renderer"
import { Header } from "./sections/header"
import { StudentInfo } from "./sections/student-info"
import { AnalysisResults } from "./sections/analysis-results"
import { AIRecommendations } from "./sections/ai-recommendations"
import { Footer } from "./sections/footer"
import { styles } from "../styles"
import type { ConsultationReportData } from "../types"

export function ConsultationReport({
  student,
  analyses,
  personalitySummary,
  generatedAt,
}: ConsultationReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header generatedAt={generatedAt} />
        <StudentInfo {...student} />
        <AnalysisResults {...analyses} />
        <AIRecommendations personalitySummary={personalitySummary} />
        <Footer generatedAt={generatedAt} pageNumber={1} totalPages={1} />
      </Page>
    </Document>
  )
}
