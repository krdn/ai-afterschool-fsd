'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface SessionTimerProps {
  /** IN_PROGRESS 전환 시점 (예약의 updatedAt 또는 sessionDate) */
  startTime: Date
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function SessionTimer({ startTime }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startTime).getTime()

    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      setElapsed(diff)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  return (
    <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
      <Clock className="size-4" />
      <span>{formatElapsed(elapsed)}</span>
    </div>
  )
}
