# 알리고 알림톡 — 학부모 성적 리포트 발송

## 개요

기존 `sendParentReportAction`의 TODO를 알리고 API로 구현.
성적 리포트 발송만 (카카오 알림톡 + SMS 대체발송).

## 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 대행사 | 알리고 | 최저가(6.5원/건), Node.js 예제 제공 |
| 알림 범위 | 성적 리포트만 (Phase A) | 최소 구현 후 점진 확장 |
| HTTP 클라이언트 | fetch (내장) | 의존성 0, Next.js 15와 자연스러움 |
| 발송 이력 | 기존 ParentGradeReport 확장 | YAGNI, 스키마 변경 최소 |

## 아키텍처

```
sendParentReportAction('kakao' | 'sms')
  → notification feature service
    → aligo-client.ts (fetch + URLSearchParams)
      → kakaoapi.aligo.in (알림톡)
      → apis.aligo.in (SMS)
  → ParentGradeReport 업데이트 (sentAt, sentMethod, aligoMid, sendStatus)
```

## 파일 구조

```
src/features/notification/
├── services/
│   ├── aligo-client.ts      ← API 클라이언트 (인증, fetch, 에러 처리)
│   ├── alimtalk.ts          ← 알림톡 발송 (sendAlimtalk, sendToParent)
│   └── sms.ts               ← SMS 발송 (sendSms)
├── types.ts                 ← AligoResponse, SendParams 등
├── constants.ts             ← 에러 코드 매핑, 템플릿 코드
└── index.ts                 ← re-export
```

## 데이터 흐름

1. 교사가 리포트 발송 클릭 → `sendParentReportAction(reportId, 'kakao')`
2. Server Action:
   - `getCurrentTeacher()` 인증
   - `ParentGradeReport` 조회 → `parentId` → `Parent.phone` 확인
   - `notification/alimtalk.sendToParent()` 호출
3. 알리고 클라이언트:
   - 환경변수에서 `ALIGO_API_KEY`, `ALIGO_USER_ID` 주입
   - `URLSearchParams`로 form data 구성
   - `failover=Y`로 SMS 대체발송 포함
   - `testMode` 환경변수 반영
4. 결과 처리:
   - 성공: `ParentGradeReport` 필드 업데이트
   - 실패: 에러 로깅 + `fail()` 반환

## 스키마 변경

```prisma
model ParentGradeReport {
  // 기존 필드 유지
  sentAt        DateTime?
  sentMethod    String?
  // 추가 필드
  sendStatus    String?       // 'pending' | 'sent' | 'delivered' | 'failed'
  aligoMid      String?       // 알리고 메시지 ID (결과 조회용)
}
```

## 환경변수

```bash
ALIGO_API_KEY=           # 알리고 API Key
ALIGO_USER_ID=           # 알리고 사용자 ID
ALIGO_SENDER_KEY=        # 카카오채널 발신프로필 키
ALIGO_SENDER_NUMBER=     # SMS 발신번호
ALIGO_TEST_MODE=Y        # 개발 중 테스트 모드
```

## 알리고 API 스펙

- **알림톡 호스트**: `https://kakaoapi.aligo.in`
- **SMS 호스트**: `https://apis.aligo.in`
- **인증**: `apikey` + `userid` (모든 요청에 포함)
- **형식**: POST + `application/x-www-form-urlencoded`
- **알림톡 발송**: `/akv10/alimtalk/send/` (최대 500명, `receiver_1`~`receiver_500` 패턴)
- **대체발송**: `failover=Y` → 알림톡 실패 시 SMS 자동 전환
- **테스트 모드**: `testMode=Y` (실제 발송 없이 API 검증)

### 응답 형식

```json
{
  "code": 0,
  "message": "성공적으로 전송요청 하였습니다.",
  "info": {
    "type": "AT",
    "mid": "KAKAO_20260310_xxxxx",
    "current": 15000,
    "unit": 8,
    "total": 80,
    "scnt": 10,
    "fcnt": 0
  }
}
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 학부모 전화번호 없음 | `fail('학부모 연락처가 등록되지 않았습니다.')` |
| 알리고 API 오류 (code < 0) | 로깅 + `fail()` + `sendStatus='failed'` |
| 알림톡 실패 → SMS 대체 | `failover=Y`로 자동 처리 (알리고 측) |
| 환경변수 미설정 | 발송 시 `fail('알림 서비스가 설정되지 않았습니다.')` |

## 테스트 전략

- `aligo-client.ts` 단위 테스트: fetch mock으로 요청 형식/에러 처리 검증
- `alimtalk.ts` 단위 테스트: 템플릿 변수 치환, 수신자 매핑 검증
- 통합: `testMode=Y`로 실제 API 호출 없이 플로우 검증

## 향후 확장 (지금 구현 안 함)

- Phase B: 상담 예약 확인 알림
- Phase C: 리마인더, 출결 알림
- `NotificationLog` 범용 모델 도입
- 발송 결과 비동기 조회 배치
