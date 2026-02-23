"use server"

import { runNameAnalysis } from "@/lib/actions/student/calculation-analysis"

export async function runNameAnalysisAction(studentId: string) {
  return runNameAnalysis(studentId)
}
