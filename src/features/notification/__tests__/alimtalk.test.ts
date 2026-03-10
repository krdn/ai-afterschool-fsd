import { describe, it, expect } from 'vitest'
import { buildAlimtalkFormData } from '../services/alimtalk'
import type { AlimtalkReceiver } from '../types'

describe('알림톡 발송 서비스', () => {
  describe('buildAlimtalkFormData', () => {
    it('수신자를 _1, _2 인덱스 패턴으로 변환해야 한다', () => {
      const receivers: AlimtalkReceiver[] = [
        {
          phone: '01011111111',
          subject: '제목1',
          message: '내용1',
          name: '김부모',
        },
        {
          phone: '01022222222',
          subject: '제목2',
          message: '내용2',
          name: '이부모',
        },
      ]

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '0311234567',
        receivers,
      })

      expect(result['receiver_1']).toBe('01011111111')
      expect(result['subject_1']).toBe('제목1')
      expect(result['message_1']).toBe('내용1')
      expect(result['recvname_1']).toBe('김부모')
      expect(result['receiver_2']).toBe('01022222222')
      expect(result['subject_2']).toBe('제목2')
      expect(result['message_2']).toBe('내용2')
      expect(result['recvname_2']).toBe('이부모')
    })

    it('failover가 true이면 failover=Y와 대체 메시지를 포함해야 한다', () => {
      const receivers: AlimtalkReceiver[] = [
        {
          phone: '01011111111',
          subject: '제목',
          message: '알림톡 내용',
          fallbackMessage: 'SMS 대체 내용',
          fallbackSubject: 'SMS 제목',
        },
      ]

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '0311234567',
        receivers,
        failover: true,
      })

      expect(result['failover']).toBe('Y')
      expect(result['fmessage_1']).toBe('SMS 대체 내용')
      expect(result['fsubject_1']).toBe('SMS 제목')
    })

    it('senderkey, tpl_code, sender를 포함해야 한다', () => {
      const result = buildAlimtalkFormData({
        senderKey: 'my-sender-key',
        templateCode: 'MY_TPL',
        sender: '0311234567',
        receivers: [
          { phone: '01011111111', subject: '제목', message: '내용' },
        ],
      })

      expect(result['senderkey']).toBe('my-sender-key')
      expect(result['tpl_code']).toBe('MY_TPL')
      expect(result['sender']).toBe('0311234567')
    })

    it('500명 초과 수신자는 무시해야 한다', () => {
      const receivers: AlimtalkReceiver[] = Array.from(
        { length: 501 },
        (_, i) => ({
          phone: `010${String(i).padStart(8, '0')}`,
          subject: `제목${i}`,
          message: `내용${i}`,
        })
      )

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '031',
        receivers,
      })

      expect(result['receiver_500']).toBeDefined()
      expect(result['receiver_501']).toBeUndefined()
    })
  })
})
