import { View, Text } from "@react-pdf/renderer"
import { styles } from "../../styles"
import type { StudentReportData } from "../../types"

type StudentInfoProps = StudentReportData

export function StudentInfo({
  name,
  birthDate,
  school,
  grade,
  targetUniversity,
  targetMajor,
  bloodType,
}: StudentInfoProps) {
  const formatBirthDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const gradeNames: Record<number, string> = {
    1: "중1",
    2: "중2",
    3: "중3",
    4: "고1",
    5: "고2",
    6: "고3",
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>학생 기본 정보</Text>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <View style={styles.tableCell}>
            <Text>항목</Text>
          </View>
          <View style={styles.tableCell}>
            <Text>내용</Text>
          </View>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.tableCell}>
            <Text>이름</Text>
          </View>
          <View style={styles.tableCell}>
            <Text>{name}</Text>
          </View>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.tableCell}>
            <Text>생년월일</Text>
          </View>
          <View style={styles.tableCell}>
            <Text>{formatBirthDate(birthDate)}</Text>
          </View>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.tableCell}>
            <Text>학교</Text>
          </View>
          <View style={styles.tableCell}>
            <Text>{school}</Text>
          </View>
        </View>

        <View style={styles.tableRow}>
          <View style={styles.tableCell}>
            <Text>학년</Text>
          </View>
          <View style={styles.tableCell}>
            <Text>{gradeNames[grade] || `${grade}학년`}</Text>
          </View>
        </View>

        {targetUniversity && (
          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text>목표 대학</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>{targetUniversity}</Text>
            </View>
          </View>
        )}

        {targetMajor && (
          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text>목표 학과</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>{targetMajor}</Text>
            </View>
          </View>
        )}

        {bloodType && (
          <View style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Text>혈액형</Text>
            </View>
            <View style={styles.tableCell}>
              <Text>{bloodType}형</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
