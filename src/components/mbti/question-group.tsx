import { QuestionItem } from "./question-item"

type Question = {
  id: number
  text: string
  description?: string
  dimension: string
  pole: string
}

type Props = {
  dimensionLabel: string
  questions: Question[]
  focusedQuestionId: number | null
  unansweredIds?: Set<number>
}

export function QuestionGroup({ dimensionLabel, questions, focusedQuestionId, unansweredIds }: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold sticky top-24 bg-white/95 backdrop-blur py-2 border-b z-0">
        {dimensionLabel}
      </h3>
      {questions.map(q => (
        <QuestionItem
          key={q.id}
          questionId={q.id}
          questionText={q.text}
          description={q.description}
          isFocused={focusedQuestionId === q.id}
          hasError={unansweredIds?.has(q.id)}
        />
      ))}
    </section>
  )
}
