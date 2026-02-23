"use client"

import { StudentImageType } from "@/components/students/student-image-uploader"

type StudentImageTab = {
  type: StudentImageType
  label: string
  description: string
}

type StudentImagePreview = {
  resizedUrl?: string | null
  originalUrl?: string | null
}

type StudentImageTabsProps = {
  value: StudentImageType
  onChange: (value: StudentImageType) => void
  images?: Partial<Record<StudentImageType, StudentImagePreview>>
}

const tabs: StudentImageTab[] = [
  { type: "profile", label: "프로필", description: "학생 프로필 사진" },
  { type: "face", label: "관상", description: "얼굴 분석용 사진" },
  { type: "palm", label: "손금", description: "손바닥 분석용 사진" },
]

export function StudentImageTabs({ value, onChange, images }: StudentImageTabsProps) {
  const current = images?.[value]
  const imageUrl = current?.resizedUrl || current?.originalUrl || null
  const linkUrl = current?.originalUrl || imageUrl || ""
  const activeTab = tabs.find((tab) => tab.type === value) || tabs[0]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.type === value
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => onChange(tab.type)}
              className={
                isActive
                  ? "rounded-full bg-gray-900 px-4 py-2 text-sm text-white"
                  : "rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-gray-400"
              }
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {imageUrl ? (
            <a
              href={linkUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative h-40 w-40 shrink-0 overflow-hidden rounded-lg border border-gray-100"
            >
              <img
                src={imageUrl}
                alt={`${activeTab.label} 이미지`}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs text-white transition group-hover:bg-black/40">
                클릭해서 확대
              </div>
            </a>
          ) : (
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-xs text-gray-500">
              <span>이미지 없음</span>
              <span className="mt-1 text-gray-400">업로드로 추가하세요</span>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              {activeTab.description}
            </p>
            <p className="text-xs text-gray-500">
              탭을 눌러 유형별 이미지를 확인할 수 있어요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
