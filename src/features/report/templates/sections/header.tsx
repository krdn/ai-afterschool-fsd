import { View, Text } from "@react-pdf/renderer"
import { styles } from "../../styles"

interface HeaderProps {
  generatedAt: Date
}

export function Header({ generatedAt }: HeaderProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <View fixed>
      <Text style={styles.title}>AI 입시 상담 종합 보고서</Text>
      <Text style={styles.subtitle}>
        학생 성향 분석 및 맞춤형 학습/진로 가이드
      </Text>
      <View style={{ marginTop: 20 }}>
        <Text style={styles.label}>생성일시</Text>
        <Text style={styles.value}>{formatDate(generatedAt)}</Text>
      </View>
    </View>
  )
}
