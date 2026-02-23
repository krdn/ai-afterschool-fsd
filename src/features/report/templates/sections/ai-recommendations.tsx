import { View, Text } from "@react-pdf/renderer"
import { styles } from "../../styles"
import type { PersonalitySummaryData, LearningStrategy, CareerGuidance } from "../../types"

interface AIRecommendationsProps {
  personalitySummary: PersonalitySummaryData | null
}

export function AIRecommendations({
  personalitySummary,
}: AIRecommendationsProps) {
  if (!personalitySummary || personalitySummary.status === "none") {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 맞춤형 제안</Text>
        <Text style={styles.content}>
          AI 제안을 생성하려면 최소 3개 이상의 성향 분석이 필요합니다.
        </Text>
      </View>
    )
  }

  if (personalitySummary.status === "pending") {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 맞춤형 제안</Text>
        <Text style={styles.content}>AI 제안 생성 중입니다...</Text>
      </View>
    )
  }

  const learningStrategy = personalitySummary.learningStrategy as LearningStrategy | undefined
  const careerGuidance = personalitySummary.careerGuidance as CareerGuidance | undefined

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>AI 맞춤형 제안</Text>

      {/* 성향 요약 */}
      {personalitySummary.coreTraits && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>성향 요약</Text>
          <Text style={styles.content}>{personalitySummary.coreTraits}</Text>
        </View>
      )}

      {/* 학습 전략 */}
      {learningStrategy && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>학습 전략 가이드</Text>
          {learningStrategy.summary && (
            <Text style={styles.content}>{learningStrategy.summary}</Text>
          )}
          {learningStrategy.learningStyle && (
            <View style={styles.mb8}>
              <Text style={styles.label}>학습 스타일</Text>
              <Text style={styles.content}>
                {learningStrategy.learningStyle}
              </Text>
            </View>
          )}
          {learningStrategy.subjectApproaches &&
            learningStrategy.subjectApproaches.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.label}>과목별 접근법</Text>
                {learningStrategy.subjectApproaches.map((item, idx) => (
                  <View key={idx} style={styles.mb4}>
                    <Text style={styles.subsectionTitle}>
                      • {item.subject}
                    </Text>
                    <Text style={styles.content}>{item.approach}</Text>
                  </View>
                ))}
              </View>
            )}
        </View>
      )}

      {/* 진로 가이드 */}
      {careerGuidance && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>진로 가이드</Text>
          {careerGuidance.summary && (
            <Text style={styles.content}>{careerGuidance.summary}</Text>
          )}
          {careerGuidance.recommendedMajors &&
            careerGuidance.recommendedMajors.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.label}>추천 학과</Text>
                {careerGuidance.recommendedMajors.map((item, idx) => (
                  <View key={idx} style={styles.mb4}>
                    <Text style={styles.subsectionTitle}>
                      • {item.major}
                    </Text>
                    <Text style={styles.content}>{item.reason}</Text>
                  </View>
                ))}
              </View>
            )}
          {careerGuidance.recommendedCareers &&
            careerGuidance.recommendedCareers.length > 0 && (
              <View style={styles.mb8}>
                <Text style={styles.label}>추천 직업</Text>
                {careerGuidance.recommendedCareers.map((item, idx) => (
                  <View key={idx} style={styles.mb4}>
                    <Text style={styles.subsectionTitle}>
                      • {item.career}
                    </Text>
                    <Text style={styles.content}>{item.reason}</Text>
                  </View>
                ))}
              </View>
            )}
        </View>
      )}
    </View>
  )
}
