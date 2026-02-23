"use server";

// crud.ts와 detail.ts에 중복 export가 있으므로 개별 파일에서 직접 import 필요
// (deleteStudent, getStudents가 양쪽에 존재)
export * from "./analysis";
export * from "./zodiac-analysis";
export * from "./calculation-analysis";
export * from "./mbti-survey";
export * from "./vark-survey";
// name-interpretation.ts와 calculation-analysis.ts에 runNameAnalysis 중복
// export * from "./name-interpretation";
export * from "./ai-image-analysis";
export * from "./analysis-tab";
export * from "./images";
export * from "./personality-integration";
export * from "./grade";
