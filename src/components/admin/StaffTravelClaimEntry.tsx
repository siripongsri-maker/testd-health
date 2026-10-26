/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useState } from 'react';
import { Plus, Loader2, Save, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { staffTravelClaimSchema, travelClaimEligibility, travelClaimError, type TravelClaimCandidate } from '@/lib/staffTravelClaim';

const formatTime = (value: string | null) => value ? new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : 'ไม่มีเวลาบันทึก';

export default function StaffTravelClaimEntry({ onSaved }: { onSaved: () => void | Promise<void> }) {
  const { isAdmin, isModerator, isCounselor, loading: roleLoading } = useAdminRole();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [candidates, setCandidates] = useState<TravelClaimCandidate[]>([]);
  const [amount, setAmount] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<TravelClaimCandidate | null>(null);
  const [method, setMethod] = useState<'bank' | 'promptpay'>('bank');
  const [holder, setHolder] = useState('');
  const [bank, setBank] = useState('');
  const [number, setNumber] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const start = async () => {
    setOpen(true); setLoading(true); setSelected(null); setSearch(''); setHolder(''); setBank(''); setNumber(''); setReason(''); setMethod('bank'); setError('');
    const { data, error: loadError } = await supabase.rpc('staff_travel_claim_candidates');
    setLoading(false);
    if (loadError || !data || typeof data !== 'object' || Array.isArray(data)) {
      setCandidates([]); setRemaining(0); setError('โหลดแบบประเมินไม่สำเร็จ กรุณาปิดแล้วลองใหม่'); return;
    }
    const result = data as unknown as { candidates: TravelClaimCandidate[]; amount: number; quota_limit: number; quota_used: number };
    setCandidates(result.candidates); setAmount(result.amount); setRemaining(Math.max(0, result.quota_limit - result.quota_used));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !selected || selected.eligibility !== 'ready' || remaining === 0) return;
    const parsed = staffTravelClaimSchema.safeParse({ evaluation_id: selected.evaluation_id, payout_method: method, account_holder_name: holder, bank_name: bank, bank_account_no: number, promptpay_no: number, reason });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'กรุณาตรวจข้อมูล'); return; }
    setSaving(true); setError('');
    try {
      const { evaluation_id, ...payload } = parsed.data;
      const { error: saveError } = await supabase.rpc('staff_submit_travel_claim', { _evaluation_id: evaluation_id, _payload: payload });
      if (saveError) { setError(travelClaimError(saveError.code)); return; }
      toast({ title: 'บันทึกคำขอค่าเดินทางแล้ว', description: 'สถานะรออนุมัติ' });
      setOpen(false); setNumber(''); setHolder(''); setBank(''); setReason(''); setSelected(null);
      await onSaved();
    } catch { setError('บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'); }
    finally { setSaving(false); }
  };

  if (roleLoading || !(isAdmin || isModerator || isCounselor)) return null;
  const query = search.trim().toLowerCase();
  const filtered = candidates.filter(c => !query || [c.referral_code, c.evaluation_id, c.branch_name, c.phone_last4].some(v => v?.toLowerCase().includes(query)));

  return <>
    <Button size="sm" onClick={start}><Plus className="mr-1 h-4 w-4" />เพิ่มคำขอค่าเดินทาง</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) { setOpen(value); if (!value) { setNumber(''); setHolder(''); setBank(''); setReason(''); } } }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>กรอกคำขอค่าเดินทาง</DialogTitle><DialogDescription>จำนวนเงิน {amount.toLocaleString('th-TH')} บาท · โควตาคงเหลือ {remaining} รายการ</DialogDescription></DialogHeader>
        {loading ? <div className="flex justify-center py-10" role="status"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">กำลังโหลดแบบประเมิน</span></div> : <form onSubmit={save} className="space-y-4">
          <Label htmlFor="travel-search">เลือกผู้ทำแบบประเมินหลังคำปรึกษา</Label>
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="travel-search" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} maxLength={100} placeholder="รหัสนัด / เลขท้ายเบอร์ / สาขา" /></div>
          <div className="max-h-52 overflow-y-auto divide-y border rounded-md">
            {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">ไม่พบแบบประเมิน</p>}
            {filtered.map(c => <Button key={c.evaluation_id} type="button" variant={selected?.evaluation_id === c.evaluation_id ? 'secondary' : 'ghost'} className="h-auto w-full justify-start rounded-none px-3 py-3 text-left whitespace-normal" disabled={c.eligibility !== 'ready' || remaining === 0 || saving} onClick={() => { setSelected(c); setError(''); }}>
              <div className="w-full min-w-0 space-y-1"><div className="flex flex-wrap gap-2 items-center"><span className="font-medium break-all">{c.referral_code ?? c.evaluation_id.slice(0, 8)}</span><Badge variant="outline">{travelClaimEligibility[c.eligibility] ?? c.eligibility}</Badge></div>
                <div className="text-xs text-muted-foreground">{c.branch_name ?? 'ไม่ระบุสาขา'} · เบอร์ •••{c.phone_last4 || '—'}</div>
                <div className="text-xs text-muted-foreground">แบบประเมิน {formatTime(c.submitted_at)}</div></div>
            </Button>)}
          </div>
          {selected && <div className="border-l-2 border-primary pl-3 text-xs space-y-1"><p>รหัสนัด {selected.referral_code ?? '—'} · วันที่นัด {selected.appointment_date ?? '—'}</p><p>จบคำปรึกษา {formatTime(selected.counseling_completed_at)}</p><p>มาถึง {formatTime(selected.arrived_at)} · เช็กเอาต์ {formatTime(selected.checked_out_at)}</p></div>}
          <fieldset disabled={saving || !selected} className="space-y-4">
            <legend className="sr-only">ข้อมูลรับเงิน</legend>
            <div className="flex gap-2" role="group" aria-label="ช่องทางรับเงิน">
              <Button type="button" variant={method === 'bank' ? 'default' : 'outline'} aria-pressed={method === 'bank'} onClick={() => { setMethod('bank'); setNumber(''); }}>บัญชีธนาคาร</Button>
              <Button type="button" variant={method === 'promptpay' ? 'default' : 'outline'} aria-pressed={method === 'promptpay'} onClick={() => { setMethod('promptpay'); setNumber(''); }}>พร้อมเพย์</Button>
            </div>
            <div className="space-y-2"><Label htmlFor="travel-holder">ชื่อผู้ถือบัญชี</Label><Input id="travel-holder" value={holder} onChange={e => setHolder(e.target.value)} maxLength={120} autoComplete="off" required /></div>
            {method === 'bank' && <div className="space-y-2"><Label htmlFor="travel-bank">ธนาคาร</Label><Input id="travel-bank" value={bank} onChange={e => setBank(e.target.value)} maxLength={80} autoComplete="off" required /></div>}
            <div className="space-y-2"><Label htmlFor="travel-number">{method === 'bank' ? 'เลขบัญชี' : 'เลขพร้อมเพย์'}</Label><Input id="travel-number" type="password" inputMode="numeric" value={number} onChange={e => setNumber(e.target.value)} maxLength={method === 'bank' ? 20 : 13} autoComplete="new-password" required /></div>
            <div className="space-y-2"><Label htmlFor="travel-reason">เหตุผลในการกรอกแทนผู้รับบริการ</Label><Textarea id="travel-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={500} required /></div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => { setOpen(false); setNumber(''); setHolder(''); setBank(''); setReason(''); }}>ยกเลิก</Button><Button type="submit" disabled={!selected || saving || remaining === 0}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}บันทึกคำขอ</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
  </>;
}