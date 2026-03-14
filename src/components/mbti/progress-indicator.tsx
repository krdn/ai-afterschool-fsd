
type Props = {
  responses: Record<string, number>
  total: number
}

export function ProgressIndicator({ responses, total }: Props) {
  const answered = Object.keys(responses || {}).length
  const percentage = Math.round((answered / total) * 100)

  return (
    <div className="sticky top-0 bg-card/95 backdrop-blur z-10 py-4 border-b">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium">진행률</span>
        <span>{answered}/{total} ({percentage}%)</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
