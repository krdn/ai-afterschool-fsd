import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI AfterSchool",
  description: "AI 기반 방과후 학생 관리 시스템",
};

/**
 * Root Layout
 *
 * Next.js App Router에서 root layout은 필수입니다.
 * 실제 스타일링과 Provider는 [locale]/layout.tsx에서 처리합니다.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
