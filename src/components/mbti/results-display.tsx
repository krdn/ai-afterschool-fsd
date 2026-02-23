"use client"

import { DimensionBar } from "./dimension-bar"
import descriptions from "@/data/mbti/descriptions.json"

type MbtiAnalysisData = {
  mbtiType: string
  percentages: {
    E: number; I: number
    S: number; N: number
    T: number; F: number
    J: number; P: number
  }
  calculatedAt: Date | string
}

export function MbtiResultsDisplay({ analysis }: { analysis: MbtiAnalysisData }) {
  const { mbtiType, percentages } = analysis
  const typeInfo = descriptions[mbtiType as keyof typeof descriptions]

  if (!typeInfo) {
    return <p className="text-red-500">유형 정보를 찾을 수 없습니다: {mbtiType}</p>
  }

  return (
    <div className="space-y-6">
      <div data-testid="mbti-result-card" className="text-center">
        <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4 rounded-2xl">
          <span className="text-4xl font-bold tracking-wider">{mbtiType}</span>
          <span className="text-lg font-medium">{typeInfo.name}</span>
        </div>
        <p data-testid="mbti-description" className="text-gray-600 mt-3 max-w-lg mx-auto">{typeInfo.summary}</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-700 mb-3">차원별 성향</h3>
        <DimensionBar
          leftLabel="외향"
          rightLabel="내향"
          leftCode="E"
          rightCode="I"
          leftPercent={percentages.E}
          rightPercent={percentages.I}
          dominant={percentages.E > percentages.I ? "left" : "right"}
        />
        <DimensionBar
          leftLabel="감각"
          rightLabel="직관"
          leftCode="S"
          rightCode="N"
          leftPercent={percentages.S}
          rightPercent={percentages.N}
          dominant={percentages.S > percentages.N ? "left" : "right"}
        />
        <DimensionBar
          leftLabel="사고"
          rightLabel="감정"
          leftCode="T"
          rightCode="F"
          leftPercent={percentages.T}
          rightPercent={percentages.F}
          dominant={percentages.T > percentages.F ? "left" : "right"}
        />
        <DimensionBar
          leftLabel="판단"
          rightLabel="인식"
          leftCode="J"
          rightCode="P"
          leftPercent={percentages.J}
          rightPercent={percentages.P}
          dominant={percentages.J > percentages.P ? "left" : "right"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div data-testid="mbti-strengths" className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">강점</h3>
          <ul className="space-y-2">
            {typeInfo.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-green-700">
                <span className="text-green-500 mt-0.5">+</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        <div data-testid="mbti-weaknesses" className="bg-amber-50 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-3">약점</h3>
          <ul className="space-y-2">
            {typeInfo.weaknesses.map((weakness, i) => (
              <li key={i} className="flex items-start gap-2 text-amber-700">
                <span className="text-amber-500 mt-0.5">-</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div data-testid="learning-style" className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">추천 학습 방식</h3>
        <p className="text-blue-700">{typeInfo.learningStyle}</p>
      </div>

      <div className="bg-purple-50 rounded-lg p-4">
        <h3 className="font-semibold text-purple-800 mb-3">추천 직업/학과</h3>
        <div className="flex flex-wrap gap-2">
          {typeInfo.careers.map((career, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
            >
              {career}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">같은 유형의 유명인</h3>
        <div className="flex flex-wrap gap-2">
          {typeInfo.famousPeople.map((person, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-sm"
            >
              {person}
            </span>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        참고용 성향 검사 결과입니다. 전문적인 심리 평가는 자격을 갖춘 전문가와 상담하세요.
      </p>

      <p className="text-xs text-gray-400 text-center">
        분석일: {new Date(analysis.calculatedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  )
}
