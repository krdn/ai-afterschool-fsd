/**
 * 한국어 폰트 설정
 *
 * @react-pdf/renderer의 Font.register()를 호출합니다.
 * 이 모듈을 import하면 폰트가 자동 등록됩니다.
 */

import { Font } from "@react-pdf/renderer"

// 한국어 폰트 등록 (TTF 포맷 필수)
Font.register({
  family: "Noto Sans KR",
  src: "/fonts/NotoSansKR-Regular.ttf",
})

Font.register({
  family: "Noto Sans KR",
  src: "/fonts/NotoSansKR-Bold.ttf",
  fontWeight: "bold",
})

// 폰트 상수
export const fonts = {
  sans: "Noto Sans KR",
}

export const fontWeights = {
  normal: 400,
  bold: 700,
}
