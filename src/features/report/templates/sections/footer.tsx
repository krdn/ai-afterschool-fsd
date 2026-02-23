import { View, Text } from "@react-pdf/renderer"
import { styles } from "../../styles"

interface FooterProps {
  generatedAt: Date
  pageNumber?: number
  totalPages?: number
}

export function Footer({
  generatedAt,
  pageNumber = 1,
  totalPages = 1,
}: FooterProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <View style={styles.footer} fixed>
      <Text>
        생성일: {formatDate(generatedAt)} | 페이지 {pageNumber} /{totalPages}
      </Text>
      <Text style={{ marginTop: 4 }}>
        ※ 본 보고서는 학생의 성향 분석을 기반으로 AI가 생성한 참고 자료입니다.
      </Text>
      <Text>
        ※ 최종적인 진로 결정은 학생과 학부모의 충분한 상담 후 결정해 주십시오.
      </Text>
    </View>
  )
}
