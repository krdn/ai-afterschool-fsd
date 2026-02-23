/**
 * PDF 스타일시트 정의
 */

import { StyleSheet } from "@react-pdf/renderer"
import { fonts } from "./fonts"
import type { ColorPalette } from "./types"

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 1.5,
    backgroundColor: "#FFFFFF",
  },

  // 헤더
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 30,
  },

  // 섹션
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1F2937",
    borderBottom: "2 solid #3B82F6",
    paddingBottom: 6,
  },
  subsection: {
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#374151",
  },

  // 콘텐츠
  content: {
    fontSize: 10,
    lineHeight: 1.6,
    color: "#4B5563",
    textAlign: "justify",
  },
  label: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    color: "#1F2937",
    marginBottom: 8,
  },

  // 테이블
  table: {
    width: "100%",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #E5E7EB",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 9,
  },
  tableHeader: {
    backgroundColor: "#F9FAFB",
    fontWeight: "bold",
    color: "#374151",
  },

  // 태그/배지
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#DBEAFE",
    color: "#1E40AF",
    borderRadius: 3,
    fontSize: 8,
    marginRight: 4,
    marginBottom: 4,
  },

  // 푸터
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
    borderTop: "1 solid #E5E7EB",
    paddingTop: 10,
  },

  // 유틸리티
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" },
})

// 색상 팔레트
export const colors: ColorPalette = {
  primary: "#3B82F6",
  gray: {
    "50": "#F9FAFB",
    "100": "#F3F4F6",
    "200": "#E5E7EB",
    "300": "#D1D5DB",
    "400": "#9CA3AF",
    "500": "#6B7280",
    "600": "#4B5563",
    "700": "#374151",
    "800": "#1F2937",
    "900": "#111827",
  },
}
