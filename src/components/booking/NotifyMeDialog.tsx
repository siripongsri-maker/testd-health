import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/hooks/useAnalytics';

interface NotifyMeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
}

export function NotifyMeDialog({ open, onOpenChange, branchId, branchName }: NotifyMeDialogProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEn = language === 'en';

  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const cleanEmail = email.trim();
    const cleanPhone = phone.replace(/[-\s]/g, '').trim();

    if (!cleanEmail && !cleanPhone) {
      toast.error(isEn ? 'Please enter an email or phone number' : 'กรุณากรอกอีเมลหรือเบอร์โทรศัพท์');
      return;
    }
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error(isEn ? 'Please enter a valid email' : 'อีเมลไม่ถูกต้อง');
      return;
    }
    if (cleanPhone && !/^[0+]\d{8,13}$/.test(cleanPhone)) {
      toast.error(isEn ? 'Please enter a valid phone number' : 'เบอร์โทรไม่ถูกต้อง');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('branch_interest_signups').insert({
      branch_id: branchId,
      contact_email: cleanEmail || null,
      contact_phone: cleanPhone || null,
      language,
      user_id: user?.id || null,
    });
    setSubmitting(false);

    if (error) {
      console.error('Notify me error:', error);
      toast.error(isEn ? 'Could not save. Please try again.' : 'ไม่สามารถบันทึกได้ กรุณาลองอีกครั้ง');
      return;
    }

    trackEvent('branch_notify_signup', { branch_id: branchId, branch_name: branchName });
    toast.success(isEn
      ? `We'll notify you when ${branchName} opens!`
      : `เราจะแจ้งเตือนคุณเมื่อ${branchName}เปิดให้บริการ!`);
    setPhone('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {isEn ? 'Notify me when it opens' : 'สนใจรับแจ้งเตือน'}
          </DialogTitle>
          <DialogDescription>
            {isEn
              ? `Be the first to know when ${branchName} opens for booking.`
              : `รับแจ้งเตือนทันทีที่ ${branchName} เปิดให้จอง`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="notify-email">{isEn ? 'Email' : 'อีเมล'}</Label>
            <Input
              id="notify-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="text-center text-xs text-muted-foreground">
            {isEn ? '— or —' : '— หรือ —'}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notify-phone">{isEn ? 'Phone' : 'เบอร์โทรศัพท์'}</Label>
            <Input
              id="notify-phone"
              type="tel"
              placeholder="0812345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            🔒 {isEn
              ? 'We only use this to notify you about this branch opening.'
              : 'ข้อมูลของคุณจะใช้เพียงเพื่อแจ้งเตือนเกี่ยวกับการเปิดสาขาเท่านั้น'}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {isEn ? 'Cancel' : 'ยกเลิก'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEn ? 'Notify me' : 'แจ้งเตือนฉัน'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
