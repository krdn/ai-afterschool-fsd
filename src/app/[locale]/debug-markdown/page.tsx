"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"
import rehypeHighlight from "rehype-highlight"
import { useState, useEffect } from "react"

// HTML entity 디코딩 함수
function decodeHtmlEntities(text: string): string {
  if (typeof window === 'undefined') return text
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

export default function DebugMarkdownPage() {
  const [mounted, setMounted] = useState(false)
  const [decodedContent, setDecodedContent] = useState("")

  // 사용자가 제공한 스크린샷의 실제 텍스트를 시뮬레이션
  const problematicContent = `# 사주 분석 및 조언

## 1. 일주 분석: 일간(日干)의 특성과 기본 성격

**일간**: 병신
- **특성**: 일간은 경진(庚金)입니다. 경진은 강하고 확고한 성질을 가지고 있으며, 과학적인 연구나 도전적인 활동에 적합합니다.
- **기본 성격**: 이 학생은 높은 목표를 세우는 능력과 함께 추진력을 가집니다. 또한 그들은 책임감이 강하며, 자신의 길을 찾는데 열정적이기 때문에 주어진 과제에 심도 있게 접근할 수 있습니다

## 2. 오행 균형: 강한 오행과 부족한 오행, 그에 따른 성향
- **강한 오행**: 금(金) 3
- **부족한 오행**: 수(水) 0

**성향**: 금이 지나치게 많은 이 사주는 학생에게 분석적인 능력과 집중력을 제공하지만, 감정적이고 창의적인 부분에서 부족할 수 있습니다. 이러한 특성을 균형있게 발휘하기 위해 다양한 활동을

## 3. 심성 해석: 심성 관계가 나타내는 대인관계 및 적성
- **심성**: 정제, 정제, 편인

**대인관계 및 적성**: 정제(正財)는 학생이 부모나 교사와의 긍정적인 관계를 유지하며, 책임감 있는 행동을 보일 가능성이 높습니다. 반면에 편인(偏印)은 창조적이고 독특한 성격을 나타낸다.`

  useEffect(() => {
    setMounted(true)
    setDecodedContent(decodeHtmlEntities(problematicContent))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 문자 단위 분석
  const analyzeChars = (text: string) => {
    const lines = text.split('\n')
    return lines.map((line, idx) => ({
      lineNum: idx + 1,
      content: line,
      length: line.length,
      startsWithHash: line.startsWith('#'),
      charCodes: line.slice(0, 10).split('').map(c => c.charCodeAt(0))
    }))
  }

  const originalAnalysis = analyzeChars(problematicContent)
  const decodedAnalysis = mounted ? analyzeChars(decodedContent) : []

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-8">세밀한 Markdown 디버깅</h1>
      
      {/* 섹션 1: 원본 데이터 분석 */}
      <section className="border-2 border-red-500 rounded p-6 bg-red-50">
        <h2 className="text-xl font-bold mb-4 text-red-700">1. 원본 데이터 분석</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">원본 텍스트 (JSON):</h3>
            <pre className="bg-white p-4 rounded text-xs overflow-auto border">
              {JSON.stringify(problematicContent)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">줄 단위 분석:</h3>
            <table className="w-full text-sm bg-white rounded border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Line</th>
                  <th className="p-2 border">Content</th>
                  <th className="p-2 border"># 시작?</th>
                  <th className="p-2 border">Char Codes (앞 10개)</th>
                </tr>
              </thead>
              <tbody>
                {originalAnalysis.map((line) => (
                  <tr key={line.lineNum} className={line.startsWithHash ? "bg-yellow-100" : ""}>
                    <td className="p-2 border text-center">{line.lineNum}</td>
                    <td className="p-2 border font-mono text-xs">{line.content || "(빈 줄)"}</td>
                    <td className="p-2 border text-center">{line.startsWithHash ? "✅" : "❌"}</td>
                    <td className="p-2 border text-xs">{line.charCodes.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 섹션 2: 디코딩 후 분석 */}
      {mounted && (
        <section className="border-2 border-blue-500 rounded p-6 bg-blue-50">
          <h2 className="text-xl font-bold mb-4 text-blue-700">2. 디코딩 후 분석</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">디코딩된 텍스트 (JSON):</h3>
              <pre className="bg-white p-4 rounded text-xs overflow-auto border">
                {JSON.stringify(decodedContent)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">줄 단위 분석:</h3>
              <table className="w-full text-sm bg-white rounded border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Line</th>
                    <th className="p-2 border">Content</th>
                    <th className="p-2 border"># 시작?</th>
                    <th className="p-2 border">Char Codes (앞 10개)</th>
                  </tr>
                </thead>
                <tbody>
                  {decodedAnalysis.map((line) => (
                    <tr key={line.lineNum} className={line.startsWithHash ? "bg-green-100" : ""}>
                      <td className="p-2 border text-center">{line.lineNum}</td>
                      <td className="p-2 border font-mono text-xs">{line.content || "(빈 줄)"}</td>
                      <td className="p-2 border text-center">{line.startsWithHash ? "✅" : "❌"}</td>
                      <td className="p-2 border text-xs">{line.charCodes.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 섹션 3: 렌더링 결과 비교 */}
      <section className="border-2 border-green-500 rounded p-6 bg-green-50">
        <h2 className="text-xl font-bold mb-4 text-green-700">3. 렌더링 결과 비교</h2>
        
        <div className="grid grid-cols-2 gap-6">
          {/* 왼쪽: 원본으로 렌더링 */}
          <div className="border-2 border-red-300 rounded p-4 bg-white">
            <h3 className="font-bold mb-3 text-red-600">A. 원본 그대로 렌더링</h3>
            <div className="border p-4 rounded bg-gray-50">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
              >
                {problematicContent}
              </ReactMarkdown>
            </div>
          </div>

          {/* 오른쪽: 디코딩 후 렌더링 */}
          <div className="border-2 border-blue-300 rounded p-4 bg-white">
            <h3 className="font-bold mb-3 text-blue-600">B. 디코딩 후 렌더링</h3>
            <div className="border p-4 rounded bg-gray-50">
              {mounted && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                >
                  {decodedContent}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 섹션 4: 실제 DOM 확인 */}
      <section className="border-2 border-purple-500 rounded p-6 bg-purple-50">
        <h2 className="text-xl font-bold mb-4 text-purple-700">4. HTML 출력 비교</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">A의 HTML:</h3>
            <pre className="bg-gray-800 text-green-400 p-4 rounded text-xs overflow-auto h-64">
              {`<div class="prose">
  <!-- 원본 마크다운으로 생성된 HTML -->
</div>`}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">B의 HTML:</h3>
            <pre className="bg-gray-800 text-blue-400 p-4 rounded text-xs overflow-auto h-64">
              {mounted ? (
                (() => {
                  const div = document.createElement('div')
                  // 실제로 ReactMarkdown이 생성한 HTML을 보여줄 수 없으므로 설명만
                  return "디코딩 후 렌더링된 HTML이 여기에 표시됩니다"
                })()
              ) : "로딩중..."}
            </pre>
          </div>
        </div>
      </section>

      {/* 섹션 5: HTML Entity 테스트 */}
      <section className="border-2 border-orange-500 rounded p-6 bg-orange-50">
        <h2 className="text-xl font-bold mb-4 text-orange-700">5. HTML Entity 변환 테스트</h2>
        
        <table className="w-full text-sm bg-white rounded border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">원본</th>
              <th className="p-2 border">예상 결과</th>
              <th className="p-2 border">변환 결과</th>
            </tr>
          </thead>
          <tbody>
            {[
              { original: "&#35;", expected: "#", description: "Hash" },
              { original: "&#42;", expected: "*", description: "Asterisk" },
              { original: "&#35;&#35;", expected: "##", description: "Double Hash" },
              { original: "&#42;&#42;bold&#42;&#42;", expected: "**bold**", description: "Bold Markdown" },
              { original: "&lt;p&gt;", expected: "<p>", description: "HTML Tag" },
              { original: "&amp;", expected: "&", description: "Ampersand" },
            ].map((test, idx) => (
              <tr key={idx}>
                <td className="p-2 border font-mono text-xs">{test.original}</td>
                <td className="p-2 border font-mono text-xs">{test.expected}</td>
                <td className="p-2 border font-mono text-xs">
                  {mounted ? decodeHtmlEntities(test.original) : "..."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
