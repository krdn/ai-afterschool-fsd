/**
 * 시드 데이터: 주요 한국 대학 기본 정보
 *
 * 공공 API 키가 활성화되기 전, 또는 API 장애 시 대안으로 사용.
 * 데이터 출처: 대학알리미, 한국대학교육협의회 공개 정보 기반.
 */

import type { PublicUniversityInfo } from './types'

export const KOREAN_UNIVERSITIES: PublicUniversityInfo[] = [
  // === 서울 ===
  { schoolName: '서울대학교', schoolType: '대학', establishType: '국립', region: '서울', website: 'https://www.snu.ac.kr' },
  { schoolName: '연세대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.yonsei.ac.kr' },
  { schoolName: '고려대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.korea.ac.kr' },
  { schoolName: '성균관대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.skku.edu' },
  { schoolName: '한양대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.hanyang.ac.kr' },
  { schoolName: '중앙대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.cau.ac.kr' },
  { schoolName: '경희대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.khu.ac.kr' },
  { schoolName: '서강대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.sogang.ac.kr' },
  { schoolName: '이화여자대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.ewha.ac.kr' },
  { schoolName: '홍익대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.hongik.ac.kr' },
  { schoolName: '건국대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.konkuk.ac.kr' },
  { schoolName: '동국대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.dongguk.edu' },
  { schoolName: '숙명여자대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.sookmyung.ac.kr' },
  { schoolName: '국민대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.kookmin.ac.kr' },
  { schoolName: '숭실대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.ssu.ac.kr' },
  { schoolName: '세종대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.sejong.ac.kr' },
  { schoolName: '광운대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.kw.ac.kr' },
  { schoolName: '명지대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.mju.ac.kr' },
  { schoolName: '상명대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.smu.ac.kr' },
  { schoolName: '서울시립대학교', schoolType: '대학', establishType: '공립', region: '서울', website: 'https://www.uos.ac.kr' },
  { schoolName: '한국외국어대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.hufs.ac.kr' },
  { schoolName: '한성대학교', schoolType: '대학', establishType: '사립', region: '서울', website: 'https://www.hansung.ac.kr' },
  { schoolName: '서울과학기술대학교', schoolType: '대학', establishType: '국립', region: '서울', website: 'https://www.seoultech.ac.kr' },
  // === 교육대 ===
  { schoolName: '서울교육대학교', schoolType: '교육대학', establishType: '국립', region: '서울', website: 'https://www.snue.ac.kr' },
  // === 경기 ===
  { schoolName: '아주대학교', schoolType: '대학', establishType: '사립', region: '경기', website: 'https://www.ajou.ac.kr' },
  { schoolName: '인하대학교', schoolType: '대학', establishType: '사립', region: '인천', website: 'https://www.inha.ac.kr' },
  { schoolName: '가천대학교', schoolType: '대학', establishType: '사립', region: '경기', website: 'https://www.gachon.ac.kr' },
  { schoolName: '경기대학교', schoolType: '대학', establishType: '사립', region: '경기', website: 'https://www.kyonggi.ac.kr' },
  { schoolName: '단국대학교', schoolType: '대학', establishType: '사립', region: '경기', website: 'https://www.dankook.ac.kr' },
  // === 과학기술특성화 ===
  { schoolName: 'KAIST', schoolType: '대학', establishType: '국립', region: '대전', website: 'https://www.kaist.ac.kr', schoolCode: 'KAIST' },
  { schoolName: 'POSTECH', schoolType: '대학', establishType: '사립', region: '경북', website: 'https://www.postech.ac.kr', schoolCode: 'POSTECH' },
  { schoolName: 'GIST', schoolType: '대학', establishType: '국립', region: '광주', website: 'https://www.gist.ac.kr', schoolCode: 'GIST' },
  { schoolName: 'DGIST', schoolType: '대학', establishType: '국립', region: '대구', website: 'https://www.dgist.ac.kr', schoolCode: 'DGIST' },
  { schoolName: 'UNIST', schoolType: '대학', establishType: '국립', region: '울산', website: 'https://www.unist.ac.kr', schoolCode: 'UNIST' },
  // === 지방 거점 국립대 ===
  { schoolName: '부산대학교', schoolType: '대학', establishType: '국립', region: '부산', website: 'https://www.pusan.ac.kr' },
  { schoolName: '경북대학교', schoolType: '대학', establishType: '국립', region: '대구', website: 'https://www.knu.ac.kr' },
  { schoolName: '전남대학교', schoolType: '대학', establishType: '국립', region: '광주', website: 'https://www.jnu.ac.kr' },
  { schoolName: '전북대학교', schoolType: '대학', establishType: '국립', region: '전북', website: 'https://www.jbnu.ac.kr' },
  { schoolName: '충남대학교', schoolType: '대학', establishType: '국립', region: '대전', website: 'https://www.cnu.ac.kr' },
  { schoolName: '충북대학교', schoolType: '대학', establishType: '국립', region: '충북', website: 'https://www.cbnu.ac.kr' },
  { schoolName: '강원대학교', schoolType: '대학', establishType: '국립', region: '강원', website: 'https://www.kangwon.ac.kr' },
  { schoolName: '제주대학교', schoolType: '대학', establishType: '국립', region: '제주', website: 'https://www.jejunu.ac.kr' },
  // === 주요 사립대 (지방) ===
  { schoolName: '부경대학교', schoolType: '대학', establishType: '국립', region: '부산', website: 'https://www.pknu.ac.kr' },
  { schoolName: '동아대학교', schoolType: '대학', establishType: '사립', region: '부산', website: 'https://www.donga.ac.kr' },
  { schoolName: '영남대학교', schoolType: '대학', establishType: '사립', region: '경북', website: 'https://www.yu.ac.kr' },
  { schoolName: '울산대학교', schoolType: '대학', establishType: '사립', region: '울산', website: 'https://www.ulsan.ac.kr' },
  // === 의약계열 ===
  { schoolName: '가톨릭대학교', schoolType: '대학', establishType: '사립', region: '경기', website: 'https://www.catholic.ac.kr' },
  { schoolName: '연세대학교(원주)', schoolType: '대학', establishType: '사립', region: '강원', website: 'https://www.yonsei.ac.kr/wj' },
  { schoolName: '고려대학교(세종)', schoolType: '대학', establishType: '사립', region: '세종', website: 'https://sejong.korea.ac.kr' },
]

/**
 * 시드 데이터에서 대학 검색
 */
export function searchSeedUniversities(query: string): PublicUniversityInfo[] {
  const q = query.toLowerCase()
  return KOREAN_UNIVERSITIES.filter(u =>
    u.schoolName.toLowerCase().includes(q) ||
    u.schoolCode?.toLowerCase().includes(q) ||
    u.region.includes(query)
  )
}

/**
 * 시드 데이터에서 지역별 대학 조회
 */
export function getSeedUniversitiesByRegion(region: string): PublicUniversityInfo[] {
  return KOREAN_UNIVERSITIES.filter(u => u.region === region)
}

/**
 * 시드 데이터 전체 통계
 */
export function getSeedStats() {
  const regions = [...new Set(KOREAN_UNIVERSITIES.map(u => u.region))]
  const byRegion = regions.map(r => ({
    region: r,
    count: KOREAN_UNIVERSITIES.filter(u => u.region === r).length,
  })).sort((a, b) => b.count - a.count)

  return {
    total: KOREAN_UNIVERSITIES.length,
    byRegion,
    byType: {
      national: KOREAN_UNIVERSITIES.filter(u => u.establishType === '국립').length,
      private: KOREAN_UNIVERSITIES.filter(u => u.establishType === '사립').length,
      public: KOREAN_UNIVERSITIES.filter(u => u.establishType === '공립').length,
    },
  }
}
