import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReAuthDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  actionLabel?: string;
}

/** Force re-authentication before high-risk admin actions */
export function ReAuthDialog({ open, onConfirm, onCancel, actionLabel }: ReAuthDialogProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { language } = useLanguage();
  const th = language === 'th';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user');

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        setError(th ? 'รหัสผ่านไม่ถูกต้อง' : 'Incorrect password');
        setLoading(false);
        return;
      }

      setPassword('');
      onConfirm();
    } catch {
      setError(th ? 'เกิดข้อผิดพลาด' : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>{th ? 'ยืนยันตัวตนอีกครั้ง' : 'Re-authenticate'}</DialogTitle>
              <DialogDescription>
                {th
                  ? `กรุณากรอกรหัสผ่านเพื่อดำเนินการ${actionLabel ? `: ${actionLabel}` : ''}`
                  : `Enter your password to proceed${actionLabel ? `: ${actionLabel}` : ''}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="reauth-pw">{th ? 'รหัสผ่าน' : 'Password'}</Label>
            <Input
              id="reauth-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              {th ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button type="submit" variant="destructive" disabled={!password || loading}>
              {loading ? (th ? 'กำลังตรวจสอบ...' : 'Verifying...') : (th ? 'ยืนยัน' : 'Confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
