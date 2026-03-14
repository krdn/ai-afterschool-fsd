'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Mail, MessageSquare, Phone, Check } from 'lucide-react';
import { toast } from 'sonner';
import { sendParentReportAction } from '@/lib/actions/student/parent-report';

interface ParentReportSendProps {
  reportId: string;
  studentName: string;
  onSent?: () => void;
}

type SendMethod = 'email' | 'kakao' | 'sms';

const SEND_METHODS: Array<{
  value: SendMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'email',
    label: '이메일',
    description: '학부모 이메일로 리포트를 발송합니다',
    icon: <Mail className="w-5 h-5" />,
  },
  {
    value: 'kakao',
    label: '카카오 알림톡',
    description: '카카오톡 알림톡으로 리포트 링크를 발송합니다',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    value: 'sms',
    label: 'SMS',
    description: '문자 메시지로 리포트 링크를 발송합니다',
    icon: <Phone className="w-5 h-5" />,
  },
];

export default function ParentReportSend({
  reportId,
  studentName,
  onSent,
}: ParentReportSendProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<SendMethod>('email');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendParentReportAction(reportId, method);
      if (result.success) {
        toast.success(`${studentName} 학생의 리포트가 발송되었습니다.`);
        setOpen(false);
        onSent?.();
      } else if (!result.success && 'error' in result) {
        toast.error(result.error);
      }
    } catch {
      toast.error('리포트 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="w-4 h-4 mr-2" />
          발송
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>리포트 발송</DialogTitle>
          <DialogDescription>
            {studentName} 학생의 학부모 리포트를 발송합니다.
            발송 방법을 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-2">
          {SEND_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`flex items-center w-full rounded-lg border p-4 cursor-pointer transition-colors text-left ${
                method === m.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border hover:bg-muted'
              }`}
              onClick={() => setMethod(m.value)}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">{m.icon}</div>
                <div>
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.description}
                  </p>
                </div>
              </div>
              {method === m.value && (
                <Check className="w-5 h-5 text-blue-600 shrink-0" />
              )}
            </button>
          ))}

          <p className="text-xs text-amber-600 mt-3 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
            * 현재 발송 기능은 준비 중입니다. 발송 기록만 저장됩니다.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sending}
          >
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                발송하기
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
