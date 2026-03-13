import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';

const REASONS = [
  { value: 'hiv_test', th: 'ตรวจ HIV', en: 'HIV Test' },
  { value: 'sti_test', th: 'ตรวจ STI', en: 'STI Test' },
  { value: 'prep', th: 'PrEP', en: 'PrEP' },
  { value: 'pep', th: 'PEP', en: 'PEP' },
  { value: 'harm_reduction_counseling', th: 'คำปรึกษาลดอันตราย', en: 'HR Counseling' },
  { value: 'mental_health', th: 'สุขภาพจิต', en: 'Mental Health' },
  { value: 'recovery', th: 'ฟื้นฟู', en: 'Recovery' },
  { value: 'general', th: 'ทั่วไป', en: 'General' },
  { value: 'followup', th: 'ติดตามผล', en: 'Follow-up' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  branchId: string;
  onRegistered: () => void;
}

export default function QuickRegistrationDrawer({ open, onClose, branchId, onRegistered }: Props) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [gender, setGender] = useState('');
  const [context, setContext] = useState('');
  const [source, setSource] = useState('walk_in');
  const [reasons, setReasons] = useState<string[]>([]);
  const [urgency, setUrgency] = useState('normal');
  const [consent, setConsent] = useState(false);
  const [prefLang, setPrefLang] = useState('th');

  const toggleReason = (r: string) => {
    setReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleSubmit = async () => {
    if (!consent) {
      toast.error(isEn ? 'Consent required' : 'ต้องยืนยันความยินยอม');
      return;
    }
    setLoading(true);
    try {
      const anonId = `W-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('clinic_walkins').insert({
        branch_id: branchId,
        participant_name: name || null,
        anonymous_id: anonId,
        age_range: ageRange || null,
        gender_identity: gender || null,
        community_context: context || null,
        source,
        reason_for_visit: reasons,
        urgency_level: urgency,
        preferred_language: prefLang,
        consent_confirmed: consent,
        queue_status: 'waiting',
      } as any);
      if (error) throw error;
      toast.success(isEn ? `Registered: ${anonId}` : `ลงทะเบียนแล้ว: ${anonId}`);
      onRegistered();
      onClose();
      // Reset
      setName(''); setAgeRange(''); setGender(''); setContext(''); setReasons([]); setUrgency('normal'); setConsent(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {isEn ? 'Quick Registration' : 'ลงทะเบียนเร็ว'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Name / Anonymous ID' : 'ชื่อ / รหัสไม่ระบุตัวตน'}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={isEn ? 'Optional' : 'ไม่บังคับ'} />
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Age Range' : 'ช่วงอายุ'}</Label>
            <Select value={ageRange} onValueChange={setAgeRange}>
              <SelectTrigger><SelectValue placeholder={isEn ? 'Select' : 'เลือก'} /></SelectTrigger>
              <SelectContent>
                {['<18', '18-24', '25-34', '35-44', '45+'].map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
                <SelectItem value="prefer_not_to_say">{isEn ? 'Prefer not to say' : 'ไม่ระบุ'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Gender Identity' : 'เพศสภาพ'}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue placeholder={isEn ? 'Select' : 'เลือก'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{isEn ? 'Male' : 'ชาย'}</SelectItem>
                <SelectItem value="female">{isEn ? 'Female' : 'หญิง'}</SelectItem>
                <SelectItem value="non_binary">{isEn ? 'Non-binary' : 'Non-binary'}</SelectItem>
                <SelectItem value="trans_woman">{isEn ? 'Trans woman' : 'หญิงข้ามเพศ'}</SelectItem>
                <SelectItem value="trans_man">{isEn ? 'Trans man' : 'ชายข้ามเพศ'}</SelectItem>
                <SelectItem value="prefer_not_to_say">{isEn ? 'Prefer not to say' : 'ไม่ระบุ'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Community */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Community Context' : 'บริบทชุมชน'}</Label>
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger><SelectValue placeholder={isEn ? 'Optional' : 'ไม่บังคับ'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="msm">{isEn ? 'MSM' : 'ชายที่มีเพศสัมพันธ์กับชาย'}</SelectItem>
                <SelectItem value="msw">{isEn ? 'Sex Worker' : 'พนักงานบริการทางเพศ'}</SelectItem>
                <SelectItem value="trans">{isEn ? 'Transgender' : 'ข้ามเพศ'}</SelectItem>
                <SelectItem value="general">{isEn ? 'General Population' : 'ประชากรทั่วไป'}</SelectItem>
                <SelectItem value="prefer_not_to_say">{isEn ? 'Prefer not to say' : 'ไม่ระบุ'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Source' : 'แหล่งที่มา'}</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="walk_in">{isEn ? 'Walk-in' : 'เข้ามาเอง'}</SelectItem>
                <SelectItem value="booked">{isEn ? 'Booked' : 'นัดหมาย'}</SelectItem>
                <SelectItem value="online_referral">{isEn ? 'Online Referral' : 'ส่งต่อออนไลน์'}</SelectItem>
                <SelectItem value="callback">{isEn ? 'Callback Request' : 'ขอติดต่อกลับ'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{isEn ? 'Reason for Visit' : 'เหตุผลที่มา'}</Label>
            <div className="flex flex-wrap gap-2">
              {REASONS.map(r => (
                <Badge
                  key={r.value}
                  variant={reasons.includes(r.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleReason(r.value)}
                >
                  {isEn ? r.en : r.th}
                </Badge>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Urgency' : 'ความเร่งด่วน'}</Label>
            <div className="flex gap-2">
              {(['normal', 'elevated', 'urgent', 'crisis'] as const).map(u => (
                <Badge
                  key={u}
                  variant={urgency === u ? 'default' : 'outline'}
                  className={`cursor-pointer ${u === 'urgent' ? 'border-amber-500 text-amber-700 dark:text-amber-400' : u === 'crisis' ? 'border-destructive text-destructive' : ''}`}
                  onClick={() => setUrgency(u)}
                >
                  {u === 'normal' ? (isEn ? 'Normal' : 'ปกติ') :
                   u === 'elevated' ? (isEn ? 'Elevated' : 'สูงขึ้น') :
                   u === 'urgent' ? (isEn ? 'Urgent' : 'เร่งด่วน') :
                   (isEn ? 'Crisis' : 'วิกฤต')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Preferred Language' : 'ภาษาที่ต้องการ'}</Label>
            <Select value={prefLang} onValueChange={setPrefLang}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="th">ไทย</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="km">ខ្មែរ</SelectItem>
                <SelectItem value="my">မြန်မာ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Consent */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={consent} onCheckedChange={setConsent} />
            <span className="text-sm text-foreground">
              {isEn ? 'Consent confirmed for service' : 'ยืนยันความยินยอมรับบริการ'}
            </span>
          </div>

          <Button onClick={handleSubmit} disabled={loading || reasons.length === 0} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEn ? 'Register & Send to Queue' : 'ลงทะเบียนและเข้าคิว'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
