"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

type Teacher = {
  id: string
  name: string
  email: string
  role: string
  teamId: string | null
  team: { name: string } | null
}

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR: "원장",
  TEAM_LEADER: "팀장",
  MANAGER: "매니저",
  TEACHER: "선생님",
}

const ROLE_COLORS: Record<string, string> = {
  DIRECTOR: "bg-red-100 text-red-700",
  TEAM_LEADER: "bg-orange-100 text-orange-700",
  MANAGER: "bg-blue-100 text-blue-700",
  TEACHER: "bg-green-100 text-green-700",
}

export function DevUserSwitcher({ currentUserId }: { currentUserId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // 사용자 목록 로드
  useEffect(() => {
    if (isOpen && teachers.length === 0) {
      setLoading(true)
      fetch("/api/dev/switch-user")
        .then((r) => r.json())
        .then((data) => setTeachers(data.teachers || []))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, teachers.length])

  const handleSwitch = async (userId: string) => {
    if (userId === currentUserId) return
    setSwitching(true)
    try {
      const res = await fetch("/api/dev/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setIsOpen(false)
        router.refresh()
        // 전체 페이지 리로드로 서버 컴포넌트/레이아웃까지 갱신
        window.location.reload()
      }
    } catch (e) {
      console.error("Switch failed:", e)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50">
      {/* 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm shadow-lg flex items-center justify-center transition-transform hover:scale-110"
        title="DEV: 사용자 전환"
      >
        DEV
      </button>

      {/* 패널 */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-white rounded-lg shadow-2xl border border-yellow-300 overflow-hidden">
          <div className="bg-yellow-400 px-3 py-2">
            <p className="text-xs font-bold text-yellow-900">
              개발 전용 - 사용자 전환
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">
                로딩 중...
              </div>
            ) : (
              teachers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSwitch(t.id)}
                  disabled={switching || t.id === currentUserId}
                  className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors ${
                    t.id === currentUserId
                      ? "bg-yellow-50"
                      : "hover:bg-gray-50"
                  } ${switching ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {t.name}
                        </span>
                        {t.id === currentUserId && (
                          <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">
                            현재
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {t.email}
                        {t.team ? ` · ${t.team.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                        ROLE_COLORS[t.role] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ROLE_LABELS[t.role] || t.role}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
