"use client"

type DimensionBarProps = {
  leftLabel: string
  rightLabel: string
  leftPercent: number
  rightPercent: number
  leftCode: string  // E, S, T, J
  rightCode: string // I, N, F, P
  dominant: "left" | "right"
}

export function DimensionBar({
  leftLabel,
  rightLabel,
  leftPercent,
  rightPercent,
  leftCode,
  rightCode,
  dominant
}: DimensionBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={dominant === "left" ? "font-bold text-primary" : "text-muted-foreground"}>
          {leftCode} {leftLabel}
        </span>
        <span className={dominant === "right" ? "font-bold text-primary" : "text-muted-foreground"}>
          {rightLabel} {rightCode}
        </span>
      </div>
      <div className="flex h-6 rounded-full overflow-hidden bg-muted">
        <div
          className={`flex items-center justify-end pr-2 text-xs font-medium transition-all ${
            dominant === "left" ? "bg-blue-500 text-white" : "bg-muted text-foreground"
          }`}
          style={{ width: `${leftPercent}%` }}
        >
          {leftPercent}%
        </div>
        <div
          className={`flex items-center justify-start pl-2 text-xs font-medium transition-all ${
            dominant === "right" ? "bg-blue-500 text-white" : "bg-muted text-foreground"
          }`}
          style={{ width: `${rightPercent}%` }}
        >
          {rightPercent}%
        </div>
      </div>
    </div>
  )
}
