import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, MailX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setStatus('already');
        } else if (data.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch {
        setStatus('error');
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result.success) {
        setStatus('success');
      } else if (result.reason === 'already_unsubscribed') {
        setStatus('already');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  const content: Record<Status, { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }> = {
    loading: {
      icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
      title: 'Verifying...',
      desc: 'กำลังตรวจสอบ...',
    },
    valid: {
      icon: <MailX className="w-8 h-8 text-amber-500" />,
      title: 'Unsubscribe from emails?',
      desc: 'คุณต้องการยกเลิกการรับอีเมลจาก testD หรือไม่?',
      action: (
        <Button onClick={handleUnsubscribe} disabled={processing} className="w-full rounded-full">
          {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Confirm Unsubscribe / ยืนยันยกเลิก
        </Button>
      ),
    },
    already: {
      icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
      title: 'Already unsubscribed',
      desc: 'คุณได้ยกเลิกการรับอีเมลแล้ว',
    },
    success: {
      icon: <CheckCircle2 className="w-8 h-8 text-green-500" />,
      title: 'Unsubscribed successfully',
      desc: 'ยกเลิกการรับอีเมลเรียบร้อยแล้ว',
    },
    invalid: {
      icon: <AlertCircle className="w-8 h-8 text-destructive" />,
      title: 'Invalid or expired link',
      desc: 'ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว',
    },
    error: {
      icon: <AlertCircle className="w-8 h-8 text-destructive" />,
      title: 'Something went wrong',
      desc: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
    },
  };

  const c = content[status];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">{c.icon}</div>
          <CardTitle className="text-xl">{c.title}</CardTitle>
          <CardDescription className="text-base">{c.desc}</CardDescription>
        </CardHeader>
        {c.action && <CardContent>{c.action}</CardContent>}
      </Card>
    </div>
  );
}
