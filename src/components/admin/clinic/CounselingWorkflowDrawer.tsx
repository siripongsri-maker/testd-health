import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, HeartHandshake, Brain, AlertTriangle, CheckCircle } from 'lucide-react';

const SESSION_TYPES = [
  { value: 'harm_reduction_counseling', th: 'คำปรึกษาลดอันตราย', en: 'HR Counseling' },
  { value: 'emotional_support', th: 'สนับสนุนอารมณ์', en: 'Emotional Support' },
  { value: 'mental_health_brief', th: 'สุขภาพจิตเบื้องต้น', en: 'Brief MH Support' },
  { value: 'sexual_health', th: 'สุขภาพทางเพศ', en: 'Sexual Health' },
  { value: 'recovery_checkin', th: 'เช็กอินฟื้นฟู', en: 'Recovery Check-in' },
  { value: 'followup', th: 'ให้คำปรึกษาติดตาม', en: 'Follow-up Session' },
];

const FOCUS_AREAS = [
  { value: 'safer_use', th: 'วางแผนการใช้สารที่ปลอดภัยขึ้น', en: 'Safer Use Planning' },
  { value: 'hiv_sti_prevention', th: 'ป้องกัน HIV / STI', en: 'HIV/STI Prevention' },
  { value: 'prep_pep_info', th: 'ข้อมูล PrEP / PEP', en: 'PrEP/PEP Info' },
  { value: 'overdose_awareness', th: 'ตระหนักรู้เรื่อง OD', en: 'Overdose Awareness' },
  { value: 'difficult_emotions', th: 'อารมณ์ที่ยากลำบาก', en: 'Difficult Emotions' },
  { value: 'relationship_consent', th: 'ความสัมพันธ์/ความยินยอม', en: 'Relationship/Consent' },
  { value: 'violence_coercion', th: 'ความรุนแรง/การบังคับ', en: 'Violence/Coercion' },
  { value: 'post_use_crash', th: 'อาการหลังใช้สาร', en: 'Post-use Crash' },
  { value: 'sleep_rest', th: 'การนอนหลับ/พักผ่อน', en: 'Sleep/Rest/Recovery' },
  { value: 'referral_support', th: 'สนับสนุนการส่งต่อ', en: 'Referral Support' },
];

const ACTIONS = [
  { value: 'book_clinic', th: 'จองบริการคลินิก', en: 'Book Clinic Service' },
  { value: 'refer_hiv_test', th: 'ส่งตรวจ HIV', en: 'Refer to HIV Test' },
  { value: 'refer_sti_test', th: 'ส่งตรวจ STI', en: 'Refer to STI Test' },
  { value: 'start_recovery_followup', th: 'เริ่มติดตามฟื้นฟู', en: 'Start Recovery Follow-up' },
  { value: 'schedule_callback', th: 'นัดติดต่อกลับ', en: 'Schedule Callback' },
  { value: 'mh_referral', th: 'ส่งต่อสุขภาพจิต', en: 'MH Referral' },
  { value: 'swing_internal', th: 'ส่งต่อภายใน SWING', en: 'SWING Internal Referral' },
  { value: 'external_emergency', th: 'ส่งต่อฉุกเฉินภายนอก', en: 'External Emergency Referral' },
];

const FOLLOWUP_OPTIONS = [
  { value: 'none', th: 'ไม่ต้องติดตาม', en: 'No Follow-up' },
  { value: '24h', th: 'ติดตาม 24 ชั่วโมง', en: '24h Follow-up' },
  { value: '7d', th: 'ติดตาม 7 วัน', en: '7-day Follow-up' },
  { value: 'return_visit', th: 'นัดมาใหม่', en: 'Return Visit' },
  { value: 'mh_followup', th: 'ติดตามสุขภาพจิต', en: 'MH Follow-up' },
  { value: 'staff_callback', th: 'เจ้าหน้าที่โทรกลับ', en: 'Staff Callback' },
];

const OUTCOMES = [
  { value: 'completed', th: 'เสร็จสมบูรณ์', en: 'Completed' },
  { value: 'referred', th: 'ส่งต่อแล้ว', en: 'Referred' },
  { value: 'followup_scheduled', th: 'นัดติดตามแล้ว', en: 'Follow-up Scheduled' },
  { value: 'urgent_escalation', th: 'ส่งต่อเร่งด่วน', en: 'Urgent Escalation' },
  { value: 'declined', th: 'ปฏิเสธบริการ', en: 'Declined Service' },
  { value: 'incomplete', th: 'ไม่สมบูรณ์/มาใหม่', en: 'Incomplete/Revisit' },
];

interface SessionRecord {
  id: string;
  participant_name: string | null;
  session_type: string;
  session_status: string;
  intake_reason: string[];
  intake_urgency: string;
  focus_areas: string[];
  guidance_notes: string | null;
  action_plan: any[];
  followup_plan: string;
  session_outcome: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  session: SessionRecord | null;
  branchId: string;
  onUpdated: () => void;
}

export default function CounselingWorkflowDrawer({ open, onClose, session, branchId, onUpdated }: Props) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState('harm_reduction_counseling');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [followup, setFollowup] = useState('none');
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    if (session) {
      setSessionType(session.session_type);
      setFocusAreas(session.focus_areas || []);
      setNotes(session.guidance_notes || '');
      setActions((session.action_plan || []).map((a: any) => typeof a === 'string' ? a : a.action));
      setFollowup(session.followup_plan || 'none');
      setOutcome(session.session_outcome || '');
    }
  }, [session]);

  const toggleFocus = (f: string) => setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  const toggleAction = (a: string) => setActions(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const isCompleting = !!outcome;
      const updates: any = {
        session_type: sessionType,
        focus_areas: focusAreas,
        guidance_notes: notes,
        action_plan: actions.map(a => ({ action: a, created_at: new Date().toISOString() })),
        followup_plan: followup,
        updated_at: new Date().toISOString(),
      };

      if (isCompleting) {
        updates.session_outcome = outcome;
        updates.session_status = outcome === 'incomplete' ? 'paused' : 'completed';
        updates.completed_at = outcome === 'incomplete' ? null : new Date().toISOString();
      }

      const { error } = await supabase.from('counseling_sessions').update(updates).eq('id', session.id);
      if (error) throw error;

      // Create service event for completed session
      if (isCompleting && outcome !== 'incomplete') {
        await supabase.from('service_events').insert({
          event_type: 'counseling_session_completed',
          service_date: new Date().toISOString().split('T')[0],
          branch_id: branchId,
          service_category: sessionType,
          service_status: 'completed',
        } as any);

        // Create follow-up if needed
        if (followup !== 'none') {
          const daysMap: Record<string, number> = { '24h': 1, '7d': 7, 'return_visit': 14, 'mh_followup': 7, 'staff_callback': 3 };
          const days = daysMap[followup] || 7;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + days);
          await supabase.from('followup_events').insert({
            followup_type: followup,
            source_type: 'counseling_session',
            scheduled_at: dueDate.toISOString(),
            status: 'pending',
          } as any);
        }
      }

      toast.success(isEn ? (isCompleting ? 'Session completed' : 'Session saved') : (isCompleting ? 'ปิดเซสชันแล้ว' : 'บันทึกแล้ว'));
      onUpdated();
      if (isCompleting) onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const isUrgent = session.intake_urgency === 'urgent' || session.intake_urgency === 'crisis';

  // Guidance prompts
  const GUIDANCE = [
    { th: 'วันนี้อะไรนำคุณมา', en: 'What brings you in today?' },
    { th: 'อะไรรู้สึกเร่งด่วนที่สุด', en: 'What feels most urgent?' },
    { th: 'การสนับสนุนแบบไหนที่รู้สึกยอมรับได้', en: 'What support feels acceptable right now?' },
    { th: 'วันนี้สามารถตกลงขั้นตอนถัดไปอะไรได้', en: 'What next step can be agreed today?' },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" />
            {isEn ? 'Counseling Workflow' : 'ระบบให้คำปรึกษา'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* A: Session Header */}
          <Card className={`p-4 space-y-2 ${isUrgent ? 'border-destructive/50 bg-destructive/5' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{session.participant_name || (isEn ? 'Anonymous' : 'ไม่ระบุตัวตน')}</span>
              <Badge variant={isUrgent ? 'destructive' : 'secondary'}>
                {session.intake_urgency === 'crisis' ? '🔴 Crisis' : session.intake_urgency === 'urgent' ? '🟠 Urgent' : session.intake_urgency === 'elevated' ? '🟡 Elevated' : '🟢 Normal'}
              </Badge>
            </div>
            {isUrgent && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {isEn ? 'Urgent pathway — prioritize safety assessment' : 'เส้นทางเร่งด่วน — ให้ความสำคัญกับการประเมินความปลอดภัย'}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {(session.intake_reason || []).map(r => {
                const def = FOCUS_AREAS.find(f => f.value === r) || { th: r, en: r };
                return <Badge key={r} variant="outline" className="text-xs">{isEn ? def.en : def.th}</Badge>;
              })}
            </div>
          </Card>

          {/* Session type */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Session Type' : 'ประเภทเซสชัน'}</Label>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSION_TYPES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{isEn ? s.en : s.th}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* B: Focus Areas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              {isEn ? 'Focus Areas' : 'ประเด็นที่โฟกัส'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREAS.map(f => (
                <Badge
                  key={f.value}
                  variant={focusAreas.includes(f.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleFocus(f.value)}
                >
                  {isEn ? f.en : f.th}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* C: Guidance Panel */}
          <Card className="p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isEn ? 'Session Guidance' : 'แนวทางเซสชัน'}
            </p>
            {GUIDANCE.map((g, i) => (
              <p key={i} className="text-sm text-foreground/80">• {isEn ? g.en : g.th}</p>
            ))}
          </Card>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Session Notes' : 'บันทึกเซสชัน'}</Label>
            <Textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={isEn ? 'Notes from this session…' : 'บันทึกจากเซสชันนี้…'}
            />
          </div>

          <Separator />

          {/* D: Action Plan */}
          <div className="space-y-2">
            <Label>{isEn ? 'Action Plan' : 'แผนปฏิบัติ'}</Label>
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map(a => (
                <Badge
                  key={a.value}
                  variant={actions.includes(a.value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${a.value === 'external_emergency' ? 'border-destructive text-destructive' : ''}`}
                  onClick={() => toggleAction(a.value)}
                >
                  {isEn ? a.en : a.th}
                </Badge>
              ))}
            </div>
          </div>

          {/* E: Follow-up Plan */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Follow-up Plan' : 'แผนติดตาม'}</Label>
            <Select value={followup} onValueChange={setFollowup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FOLLOWUP_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{isEn ? f.en : f.th}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* F: Session Outcome */}
          <div className="space-y-2">
            <Label>{isEn ? 'Session Outcome' : 'ผลลัพธ์เซสชัน'}</Label>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map(o => (
                <Badge
                  key={o.value}
                  variant={outcome === o.value ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${o.value === 'urgent_escalation' ? 'border-destructive' : ''}`}
                  onClick={() => setOutcome(prev => prev === o.value ? '' : o.value)}
                >
                  {isEn ? o.en : o.th}
                </Badge>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={loading} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEn ? 'Save Draft' : 'บันทึกร่าง'}
            </Button>
            {outcome && (
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                {isEn ? 'Complete Session' : 'ปิดเซสชัน'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
