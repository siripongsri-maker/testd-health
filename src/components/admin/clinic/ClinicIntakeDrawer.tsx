import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ClipboardCheck, AlertTriangle, History, Stethoscope } from 'lucide-react';

const VISIT_REASONS = [
  { value: 'hiv_test', th: 'ตรวจ HIV', en: 'HIV Test', icon: '🩸' },
  { value: 'sti_test', th: 'ตรวจ STI', en: 'STI Test', icon: '🔬' },
  { value: 'self_test_support', th: 'ช่วยเหลือ Self-test', en: 'Self-test Support', icon: '📦' },
  { value: 'prep', th: 'PrEP', en: 'PrEP', icon: '💊' },
  { value: 'pep', th: 'PEP', en: 'PEP', icon: '⚡' },
  { value: 'harm_reduction_counseling', th: 'คำปรึกษาลดอันตราย', en: 'HR Counseling', icon: '💬' },
  { value: 'mental_health', th: 'สุขภาพจิต', en: 'Mental Health', icon: '🧠' },
  { value: 'recovery', th: 'ฟื้นฟูหลังใช้สาร', en: 'Post-use Recovery', icon: '🌿' },
  { value: 'general_counseling', th: 'ให้คำปรึกษาทั่วไป', en: 'General Counseling', icon: '🗣️' },
  { value: 'followup', th: 'ติดตามผล', en: 'Follow-up', icon: '📅' },
];

const PATHWAYS = [
  { value: 'counseling_first', th: 'ให้คำปรึกษาก่อน', en: 'Counseling First' },
  { value: 'clinic_consultation', th: 'ปรึกษาคลินิก', en: 'Clinic Consultation' },
  { value: 'hiv_sti_testing', th: 'ตรวจ HIV/STI', en: 'HIV/STI Testing' },
  { value: 'mental_health_support', th: 'สนับสนุนสุขภาพจิต', en: 'Mental Health Support' },
  { value: 'hr_education', th: 'ให้ความรู้ลดอันตราย', en: 'HR Education' },
  { value: 'callback_followup', th: 'ติดต่อกลับ/ติดตามผล', en: 'Callback/Follow-up' },
  { value: 'urgent_escalation', th: 'ส่งต่อเร่งด่วน', en: 'Urgent Escalation' },
];

interface WalkinRecord {
  id: string;
  participant_name: string | null;
  anonymous_id: string | null;
  age_range: string | null;
  gender_identity: string | null;
  community_context: string | null;
  source: string;
  reason_for_visit: string[];
  urgency_level: string;
  queue_status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  walkin: WalkinRecord | null;
  branchId: string;
  onUpdated: () => void;
}

export default function ClinicIntakeDrawer({ open, onClose, walkin, branchId, onUpdated }: Props) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [pathways, setPathways] = useState<string[]>([]);
  const [intakeNotes, setIntakeNotes] = useState('');
  const [intakeAnswers, setIntakeAnswers] = useState({
    most_useful_today: '',
    substance_concern: '',
    sexual_health_concern: '',
    emotional_distress: '',
    urgent_symptoms: '',
    referral_needed: '',
  });

  useEffect(() => {
    if (walkin) {
      setReasons(walkin.reason_for_visit || []);
      setPathways([]);
      setIntakeNotes('');
      setIntakeAnswers({ most_useful_today: '', substance_concern: '', sexual_health_concern: '', emotional_distress: '', urgent_symptoms: '', referral_needed: '' });
    }
  }, [walkin]);

  const toggleReason = (r: string) => setReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  const togglePathway = (p: string) => setPathways(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleStartIntake = async () => {
    if (!walkin) return;
    setLoading(true);
    try {
      // Update walkin status
      await supabase.from('clinic_walkins').update({
        queue_status: 'in_intake',
        intake_started_at: new Date().toISOString(),
        reason_for_visit: reasons,
        updated_at: new Date().toISOString(),
      } as any).eq('id', walkin.id);

      // Create counseling session
      const { data: session, error } = await supabase.from('counseling_sessions').insert({
        branch_id: branchId,
        participant_name: walkin.participant_name || walkin.anonymous_id,
        session_type: pathways.includes('counseling_first') ? 'harm_reduction_counseling' : 'clinic_intake',
        session_status: 'in_progress',
        intake_reason: reasons,
        intake_urgency: walkin.urgency_level,
        intake_notes: intakeNotes,
        intake_questions: intakeAnswers,
      } as any).select('id').single();

      if (error) throw error;

      // Link session
      await supabase.from('clinic_walkins').update({
        session_id: session.id,
        queue_status: pathways.includes('urgent_escalation') ? 'urgent' : 'in_intake',
      } as any).eq('id', walkin.id);

      // Create service event
      await supabase.from('service_events').insert({
        event_type: 'clinic_intake_started',
        service_date: new Date().toISOString().split('T')[0],
        branch_id: branchId,
        service_category: reasons[0] || 'general_counseling',
        urgency_level: walkin.urgency_level,
        service_status: 'in_progress',
      } as any);

      toast.success(isEn ? 'Intake started' : 'เริ่มรับเข้าแล้ว');
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!walkin) return null;

  const INTAKE_QUESTIONS = [
    { key: 'most_useful_today', th: 'วันนี้ต้องการการสนับสนุนแบบไหนมากที่สุด', en: 'What support is most useful today?' },
    { key: 'substance_concern', th: 'มีความกังวลเกี่ยวกับการใช้สารหรือไม่', en: 'Any substance-related concern?' },
    { key: 'sexual_health_concern', th: 'มีความกังวลเรื่องสุขภาพทางเพศหรือไม่', en: 'Any sexual health concern?' },
    { key: 'emotional_distress', th: 'มีความเครียดทางอารมณ์หรือไม่', en: 'Any emotional distress today?' },
    { key: 'urgent_symptoms', th: 'มีอาการเร่งด่วนหรือไม่', en: 'Any urgent symptoms?' },
    { key: 'referral_needed', th: 'ต้องการส่งต่อวันนี้หรือไม่', en: 'Referral needed today?' },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            {isEn ? 'Clinic Intake' : 'รับเข้าบริการ'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Section A: Visit Summary */}
          <Card className="p-4 space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              {isEn ? 'Visit Summary' : 'สรุปการเข้าเยี่ยม'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">{isEn ? 'ID:' : 'รหัส:'}</span> <span className="font-mono font-semibold text-foreground">{walkin.anonymous_id || '—'}</span></div>
              <div><span className="text-muted-foreground">{isEn ? 'Name:' : 'ชื่อ:'}</span> <span className="text-foreground">{walkin.participant_name || (isEn ? 'Anonymous' : 'ไม่ระบุตัวตน')}</span></div>
              <div><span className="text-muted-foreground">{isEn ? 'Age:' : 'อายุ:'}</span> <span className="text-foreground">{walkin.age_range || '—'}</span></div>
              <div><span className="text-muted-foreground">{isEn ? 'Gender:' : 'เพศ:'}</span> <span className="text-foreground">{walkin.gender_identity || '—'}</span></div>
              <div><span className="text-muted-foreground">{isEn ? 'Source:' : 'แหล่ง:'}</span> <span className="text-foreground">{walkin.source}</span></div>
              <div><span className="text-muted-foreground">{isEn ? 'Context:' : 'บริบท:'}</span> <span className="text-foreground">{walkin.community_context || '—'}</span></div>
            </div>
            {walkin.urgency_level === 'urgent' || walkin.urgency_level === 'crisis' ? (
              <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                {isEn ? `Urgency: ${walkin.urgency_level.toUpperCase()}` : `ความเร่งด่วน: ${walkin.urgency_level === 'crisis' ? 'วิกฤต' : 'เร่งด่วน'}`}
              </div>
            ) : null}
          </Card>

          <Separator />

          {/* Section B: Reason for Visit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              {isEn ? 'Reason for Visit' : 'เหตุผลที่มา'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {VISIT_REASONS.map(r => (
                <Badge
                  key={r.value}
                  variant={reasons.includes(r.value) ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors text-sm"
                  onClick={() => toggleReason(r.value)}
                >
                  {r.icon} {isEn ? r.en : r.th}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section C: Intake Questions */}
          <div className="space-y-3">
            <Label>{isEn ? 'Key Intake Questions' : 'คำถามสำคัญ'}</Label>
            {INTAKE_QUESTIONS.map(q => (
              <div key={q.key} className="space-y-1">
                <p className="text-xs text-muted-foreground">{isEn ? q.en : q.th}</p>
                <Textarea
                  rows={1}
                  className="text-sm min-h-[36px]"
                  value={(intakeAnswers as any)[q.key]}
                  onChange={e => setIntakeAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                  placeholder={isEn ? 'Brief note…' : 'บันทึกสั้นๆ…'}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Section D: Pathway Assignment */}
          <div className="space-y-2">
            <Label>{isEn ? 'Assign Service Pathway' : 'กำหนดเส้นทางบริการ'}</Label>
            <div className="flex flex-wrap gap-2">
              {PATHWAYS.map(p => (
                <Badge
                  key={p.value}
                  variant={pathways.includes(p.value) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${p.value === 'urgent_escalation' ? 'border-destructive text-destructive' : ''}`}
                  onClick={() => togglePathway(p.value)}
                >
                  {isEn ? p.en : p.th}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section E: Notes */}
          <div className="space-y-1.5">
            <Label>{isEn ? 'Intake Notes' : 'บันทึกการรับเข้า'}</Label>
            <Textarea
              rows={3}
              value={intakeNotes}
              onChange={e => setIntakeNotes(e.target.value)}
              placeholder={isEn ? 'Brief notes about this visit…' : 'บันทึกสั้นๆ เกี่ยวกับการเยี่ยมนี้…'}
            />
          </div>

          <Button onClick={handleStartIntake} disabled={loading || reasons.length === 0} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEn ? 'Confirm Intake & Assign Pathway' : 'ยืนยันรับเข้าและกำหนดเส้นทาง'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
