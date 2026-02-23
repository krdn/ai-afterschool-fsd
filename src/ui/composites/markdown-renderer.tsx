"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeHighlight from "rehype-highlight"
import type { Components } from "react-markdown"

// Highlight.js 테마 스타일 (GitHub 스타일)
import "highlight.js/styles/github.css"

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-gray-800 mt-5 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-gray-700 mt-3 mb-1">{children}</h4>
  ),
  p: ({ children }) => <p className="my-2 leading-7">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
  ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 border-l-4 border-purple-300 bg-purple-50/50 py-2 pr-3 rounded-r-md text-gray-700 italic">
      {children}
    </blockquote>
  ),
  // 코드 블록은 rehype-highlight가 처리하도록 변경
  code: ({ children }) => (
    <code className="px-1.5 py-0.5 bg-gray-100 text-pink-600 rounded text-xs font-mono">
      {children}
    </code>
  ),
  // pre 태그 스타일링 (코드 블록 컨테이너)
  pre: ({ children }) => <pre className="my-3 rounded-md overflow-x-auto">{children}</pre>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 border-b border-gray-200">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-gray-50/50">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-700">{children}</td>,
  hr: () => <hr className="my-4 border-gray-200" />,
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

type Props = {
  content: string
  className?: string
}

// HTML entity 디코딩 함수
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function stripMarkdownCodeBlock(content: string): string {
  // ```markdown 또는 ``` 로 시작하는 코드 블록 제거
  // 1. ```markdown 또는 ```로 시작하는지 확인
  const trimmed = content.trim()
  
  // ```markdown 또는 ``` 패턴으로 시작하는 경우
  if (trimmed.startsWith('```markdown') || trimmed.startsWith('```')) {
    // 첫 번째 줄 제거 (```markdown 또는 ```)
    const lines = trimmed.split('\n')
    lines.shift() // 첫 줄 제거
    
    // 마지막 줄이 ```로 끝나면 제거
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    
    return lines.join('\n').trim()
  }
  
  return content
}

export function MarkdownRenderer({ content, className = "" }: Props) {
  if (!content || typeof content !== "string") {
    return null
  }
  
  // HTML entity 디코딩 (&#35; → #, &#42; → * 등)
  let decodedContent = typeof window !== 'undefined' 
    ? decodeHtmlEntities(content)
    : content
  
  // markdown 코드 블록 래퍼 제거
  decodedContent = stripMarkdownCodeBlock(decodedContent)
  
  return (
    <div className={`markdown-rendered prose prose-sm max-w-none text-gray-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {decodedContent}
      </ReactMarkdown>
    </div>
  )
}
