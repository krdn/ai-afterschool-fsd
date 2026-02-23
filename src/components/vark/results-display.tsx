"use client"

import descriptions from "@/data/vark/descriptions.json"
import ReactMarkdown from "react-markdown"

type VarkAnalysisData = {
  varkType: string
  scores: Record<string, number>
  percentages: Record<string, number>
  interpretation: string | null
  calculatedAt: Date | string
}

const typeColors: Record<string, { bg: string; text: string; bar: string; badge: string }> = {
  V: { bg: "bg-blue-50", text: "text-blue-800", bar: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  A: { bg: "bg-green-50", text: "text-green-800", bar: "bg-green-500", badge: "bg-green-100 text-green-800" },
  R: { bg: "bg-amber-50", text: "text-amber-800", bar: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  K: { bg: "bg-rose-50", text: "text-rose-800", bar: "bg-rose-500", badge: "bg-rose-100 text-rose-800" },
}

export function VarkResultsDisplay({ analysis }: { analysis: VarkAnalysisData }) {
  const { varkType, percentages, interpretation } = analysis
  const primaryTypes = varkType.split("") as Array<keyof typeof descriptions>

  return (
    <div className="space-y-6">
      {/* 우세 유형 카드 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-6 py-4 rounded-2xl">
          <span className="text-4xl font-bold tracking-wider">{varkType}</span>
          <span className="text-lg font-medium">
            {primaryTypes.map(t => descriptions[t]?.name.split(" ")[0]).join(" + ")}
          </span>
        </div>
        <p className="text-gray-600 mt-3 max-w-lg mx-auto">
          {primaryTypes.length === 1
            ? descriptions[primaryTypes[0]]?.summary
            : `${primaryTypes.map(t => descriptions[t]?.name).join("과 ")} 특성을 고루 갖춘 복합 학습 유형입니다.`}
        </p>
      </div>

      {/* 4축 백분율 그래프 */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 mb-3">유형별 비율</h3>
        {(["V", "A", "R", "K"] as const).map((type) => {
          const pct = percentages[type] ?? 0
          const colors = typeColors[type]
          const isDominant = varkType.includes(type)
          return (
            <div key={type} className="flex items-center gap-3">
              <span className={`w-20 text-sm font-medium ${colors.text}`}>
                {descriptions[type].name.split(" ")[0]}
              </span>
              <div className="flex-1 bg-gray-200 rounded-full h-5 relative">
                <div
                  className={`${colors.bar} h-5 rounded-full transition-all duration-500 ${isDominant ? "opacity-100" : "opacity-60"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`w-12 text-right text-sm font-semibold ${isDominant ? colors.text : "text-gray-500"}`}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>

      {/* 우세 유형별 상세 정보 */}
      {primaryTypes.map((type) => {
        const desc = descriptions[type]
        const colors = typeColors[type]
        if (!desc) return null

        return (
          <div key={type} className={`${colors.bg} rounded-lg p-4 space-y-4`}>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.badge}`}>
                {desc.name}
              </span>
            </div>

            {/* 강점 */}
            <div>
              <h4 className={`font-semibold ${colors.text} mb-2`}>강점</h4>
              <ul className="space-y-1">
                {desc.strengths.map((s, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${colors.text}`}>
                    <span className="mt-0.5">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 주의점 */}
            <div>
              <h4 className={`font-semibold ${colors.text} mb-2`}>주의할 점</h4>
              <ul className="space-y-1">
                {desc.weaknesses.map((w, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${colors.text}`}>
                    <span className="mt-0.5">-</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 학습 팁 */}
            <div>
              <h4 className={`font-semibold ${colors.text} mb-2`}>학습 팁</h4>
              <ul className="space-y-1">
                {desc.studyTips.map((t, i) => (
                  <li key={i} className={`flex items-start gap-2 text-sm ${colors.text}`}>
                    <span className="mt-0.5">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 추천 직업 */}
            <div>
              <h4 className={`font-semibold ${colors.text} mb-2`}>관련 직업</h4>
              <div className="flex flex-wrap gap-2">
                {desc.careers.map((c, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs ${colors.badge}`}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* LLM 해석 결과 */}
      {interpretation && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{interpretation}</ReactMarkdown>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        VARK는 교육학적 학습 선호도 검사입니다. 참고용으로 활용해주세요.
      </p>
      <p className="text-xs text-gray-400 text-center">
        검사일: {new Date(analysis.calculatedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  )
}
