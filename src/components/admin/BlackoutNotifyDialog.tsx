import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BellRing, Loader2, Mail, MessageSquare, Smartphone } from 'lucide-react';

interface Props {
  blackout: {
    id: string;
    title: string;
    reason: string | null;
    start_at: string;
    end_at: string;
    scope: string;
    applies_to_branch_ids: string[] | null;
  };
}

interface Preview {
  total: number;
  with_email: number;
  with_phone: number;
  with_account: number;
  by_branch: Record<string, number>;
}

function bkkDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(iso));
}

export default function BlackoutNotifyDialog({ blackout }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [channels, setChannels] = useState({ email: true, sms: true, inapp: true });

  const date = bkkDate(blackout.start_at);
  const branchIds = blackout.scope === 'branch' ? blackout.applies_to_branch_ids : null;

  const payload = (dryRun: boolean) => ({
    date,
    branch_ids: branchIds,
    title: blackout.title,
    reason: blackout.reason || '',
    channels,
    dry_run: dryRun,
  });

  const loadPreview = async () => {
    setOpen(true);
    setLoading(true);
    setPreview(null);
    const { data, error } = await supabase.functions.invoke('notify-blackout-closure', { body: payload(true) });
    setLoading(false);
    if (error) {
      toast.error('ไม่สามารถโหลดรายชื่อผู้จองได้');
      return;
    }
    setPreview(data as Preview);
  };

  const send = async () => {
    if (!preview?.total) return;
    if (!confirm(`ยืนยันส่งแจ้งเตือนถึงผู้จอง ${preview.total} รายในวันที่ ${date}?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('notify-blackout-closure', { body: payload(false) });
    setSending(false);
    if (error) {
      toast.error('ส่งแจ้งเตือนไม่สำเร็จ');
      return;
    }
    const r = data as { email: number; sms: number; inapp: number; failed: unknown[] };
    toast.success(`ส่งแล้ว — อีเมล ${r.email} • SMS ${r.sms} • แจ้งเตือนในระบบ ${r.inapp}${r.failed?.length ? ` (ล้มเหลว ${r.failed.length})` : ''}`);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-amber-600"
        title="แจ้งเตือนผู้จองให้ย้ายวัน"
        onClick={loadPreview}
      >
        <BellRing className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>แจ้งเตือนผู้จองในวันปิดทำการ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <p className="font-medium">{blackout.title}</p>
              <p className="text-xs text-muted-foreground">วันที่ {date} (เวลาไทย)</p>
              {blackout.reason && <p className="text-xs text-muted-foreground mt-1">{blackout.reason}</p>}
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังตรวจสอบรายชื่อผู้จอง...
              </div>
            ) : preview ? (
              <div className="space-y-2">
                <p className="font-semibold">พบนัดหมายที่ยังใช้งานอยู่ {preview.total} ราย</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border p-2 text-center">
                    <Mail className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    อีเมล {preview.with_email}
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    SMS {preview.with_phone}
                  </div>
                  <div className="rounded-lg border p-2 text-center">
                    <Smartphone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    ในระบบ {preview.with_account}
                  </div>
                </div>
                {Object.keys(preview.by_branch || {}).length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {Object.entries(preview.by_branch).map(([name, n]) => (
                      <li key={name}>• {name}: {n} ราย</li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2 pt-2">
                  {([
                    ['email', 'ส่งอีเมล'],
                    ['sms', 'ส่ง SMS'],
                    ['inapp', 'แจ้งเตือนในเว็บไซต์'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm font-normal">{label}</Label>
                      <Switch
                        checked={channels[key]}
                        onCheckedChange={(v) => setChannels((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ทุกข้อความจะแนบลิงก์ให้ย้ายวันนัดหมายอัตโนมัติ (ผู้จองแบบไม่ล็อกอินจะได้ลิงก์เฉพาะบุคคล)
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">ไม่พบข้อมูล</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ปิด</Button>
            <Button
              onClick={send}
              disabled={sending || loading || !preview?.total || (!channels.email && !channels.sms && !channels.inapp)}
            >
              {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              ส่งแจ้งเตือน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
