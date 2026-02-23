import { View, Text } from "@react-pdf/renderer"
import { styles } from "../../styles"
import type { AnalysesData } from "../../types"

type AnalysisResultsProps = AnalysesData

export function AnalysisResults({
  saju,
  name,
  mbti,
  face,
  palm,
}: AnalysisResultsProps) {
  const hasMbti = !!mbti
  const hasSaju = !!saju?.calculatedAt
  const hasName = !!name?.calculatedAt
  const hasFace = face?.status === "complete" && !!face.result
  const hasPalm = palm?.status === "complete" && !!palm.result
  const hasAnyAnalysis = hasMbti || hasSaju || hasName || hasFace || hasPalm

  const formatResult = (result: unknown): string => {
    if (typeof result === "string") {
      return result
    }
    try {
      return JSON.stringify(result, null, 2)
    } catch {
      return "분석 결과를 표시할 수 없습니다."
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>성향 분석 결과</Text>

      {/* MBTI 분석 */}
      {hasMbti && mbti && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>MBTI 성격 유형</Text>
          <View style={styles.tag}>
            <Text>{mbti.mbtiType}</Text>
          </View>
          {mbti.percentages && (
            <View style={styles.mb8}>
              <Text style={styles.label}>
                E: {mbti.percentages.EI?.toFixed(0) || 50}% | I:{" "}
                {100 - (mbti.percentages.EI || 50)}%
              </Text>
              <Text style={styles.label}>
                S: {mbti.percentages.SN?.toFixed(0) || 50}% | N:{" "}
                {100 - (mbti.percentages.SN || 50)}%
              </Text>
              <Text style={styles.label}>
                T: {mbti.percentages.TF?.toFixed(0) || 50}% | F:{" "}
                {100 - (mbti.percentages.TF || 50)}%
              </Text>
              <Text style={styles.label}>
                J: {mbti.percentages.JP?.toFixed(0) || 50}% | P:{" "}
                {100 - (mbti.percentages.JP || 50)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 사주팔자 분석 */}
      {hasSaju && saju && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>사주팔자 분석</Text>
          {saju.interpretation && (
            <Text style={styles.content}>{saju.interpretation}</Text>
          )}
        </View>
      )}

      {/* 성명학 분석 */}
      {hasName && name && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>성명학 분석</Text>
          {name.interpretation && (
            <Text style={styles.content}>{name.interpretation}</Text>
          )}
        </View>
      )}

      {/* 관상 분석 */}
      {hasFace && face && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>관상 분석</Text>
          <Text style={styles.label}>(참고용 엔터테인먼트 해석)</Text>
          <Text style={styles.content}>{formatResult(face.result)}</Text>
        </View>
      )}

      {/* 손금 분석 */}
      {hasPalm && palm && (
        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>손금 분석</Text>
          <Text style={styles.label}>(참고용 엔터테인먼트 해석)</Text>
          <Text style={styles.content}>{formatResult(palm.result)}</Text>
        </View>
      )}

      {/* 분석 없음 안내 */}
      {!hasAnyAnalysis && (
        <View style={styles.subsection}>
          <Text style={styles.content}>
            아직 완료된 성향 분석이 없습니다.
          </Text>
        </View>
      )}
    </View>
  )
}
