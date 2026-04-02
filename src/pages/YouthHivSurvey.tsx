import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TOTAL_SECTIONS = 8;

type SurveyState = {
  consent?: string;
  role?: string;
  age?: string;
  region?: string;
  gender: string[];
  know_level?: string;
  prevention: string[];
  tested?: string;
  barrier: string[];
  school_hiv?: string;
  comfort?: string;
  taught?: string;
  teach_barrier: string[];
  platform: string[];
  use_ai?: string;
  stigma?: string;
  open_text: string;
};

const initialState: SurveyState = {
  gender: [], prevention: [], barrier: [], teach_barrier: [], platform: [],
  open_text: '',
};

// Reusable option button
function OptBtn({ selected, multi, children, onClick }: {
  selected: boolean; multi?: boolean; children: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-2.5 p-3 rounded-lg border text-left text-sm transition-all w-full",
        selected
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-card text-foreground hover:border-muted-foreground/40"
      )}
    >
      <span className={cn(
        "flex-shrink-0 mt-0.5 h-4 w-4 border-[1.5px] flex items-center justify-center",
        multi ? "rounded" : "rounded-full",
        selected ? "border-primary bg-primary" : "border-muted-foreground/40"
      )}>
        {selected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
      </span>
      <div className="flex-1">{children}</div>
    </button>
  );
}

// Role card
function RoleCard({ icon, label, selected, onClick }: {
  icon: string; label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border text-center transition-all",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-muted-foreground/40"
      )}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className={cn("text-xs font-medium", selected ? "text-primary" : "text-foreground")}>{label}</div>
    </button>
  );
}

export default function YouthHivSurvey() {
  const navigate = useNavigate();
  const [sec, setSec] = useState(0);
  const [state, setState] = useState<SurveyState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = useCallback((key: keyof SurveyState, val: string) => {
    setState(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleMulti = useCallback((key: keyof SurveyState, val: string) => {
    setState(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }, []);

  // Section validation
  const canNext = (): boolean => {
    switch (sec) {
      case 0: return state.consent === 'yes';
      case 1: return !!state.role;
      case 2: return !!state.age && !!state.region;
      case 3: return !!state.know_level;
      case 4: return !!state.tested;
      case 5: return isTeacherRole ? !!state.taught : !!state.school_hiv;
      case 6: return !!state.use_ai;
      case 7: return true;
      default: return false;
    }
  };

  const isTeacherRole = ['teacher', 'volunteer'].includes(state.role || '');

  const goNext = async () => {
    if (sec === 0 && state.consent !== 'yes') {
      setDone(true);
      return;
    }
    if (sec === 7) {
      await handleSubmit();
      return;
    }
    setSec(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setSec(prev => Math.max(0, prev - 1));
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem('anonymous_id') || crypto.randomUUID();
      const { error } = await supabase.from('youth_hiv_survey_responses' as any).insert({
        session_id: sessionId,
        consent: state.consent,
        role: state.role,
        age_group: state.age,
        region: state.region,
        gender_identities: state.gender,
        knowledge_level: state.know_level,
        prevention_methods: state.prevention,
        tested_12m: state.tested,
        barriers: state.barrier,
        school_hiv: state.school_hiv || null,
        comfort_talking: state.comfort || null,
        taught_hiv: state.taught || null,
        teach_barriers: state.teach_barrier,
        platforms: state.platform,
        use_ai_interest: state.use_ai,
        stigma_avoidance: state.stigma,
        open_feedback: state.open_text || null,
      });
      if (error) throw error;
      setDone(true);
      setSec(8);
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = Math.round((sec / TOTAL_SECTIONS) * 100);

  if (done && sec === 8) {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">ขอบคุณมากเลย! 🌿</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            คุณช่วยให้เราเข้าใจความต้องการจริงของเยาวชนไทย<br />
            ข้อมูลของคุณจะถูกนำไปพัฒนาบริการสุขภาพที่ดีขึ้น<br />
            ไม่ตัดสิน เข้าถึงง่าย และเป็นมิตรสำหรับทุกคน
          </p>
          <p className="text-sm font-medium text-primary">SWING Foundation · testBKK</p>
          <Button variant="outline" onClick={() => navigate('/surveys')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> กลับหน้าแบบสำรวจ
          </Button>
        </div>
        <BottomNav />
      </PageContainer>
    );
  }

  if (done && state.consent !== 'yes') {
    return (
      <PageContainer>
        <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
          <h2 className="text-lg font-medium text-muted-foreground">ขอบคุณที่สละเวลา</h2>
          <p className="text-sm text-muted-foreground">คุณสามารถกลับมาร่วมแบบสอบถามได้ทุกเมื่อ</p>
          <Button variant="outline" onClick={() => navigate('/surveys')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> กลับหน้าแบบสำรวจ
          </Button>
        </div>
        <BottomNav />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="max-w-lg mx-auto px-4 pb-24 pt-4 space-y-4">
        {/* Progress */}
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">ส่วนที่ {sec} จาก {TOTAL_SECTIONS}</p>
        </div>

        {/* SEC 0: CONSENT */}
        {sec === 0 && (
          <div className="space-y-4">
            <SectionHeader icon="👋" bg="bg-primary/10" title="ก่อนเริ่มต้น" sub="ใช้เวลาประมาณ 5–7 นาที" />
            <Card className="p-4 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <p><strong className="text-foreground">แบบสอบถามนี้คืออะไร?</strong><br />
                เราต้องการเข้าใจความรู้ ทัศนคติ และความต้องการด้านสุขภาพทางเพศของเยาวชนไทย เพื่อพัฒนาบริการที่ดีขึ้นสำหรับทุกคน</p>
              <p><strong className="text-foreground">ข้อมูลของคุณ:</strong> การตอบแบบสอบถามนี้เป็น<strong>ไม่ระบุตัวตน</strong>และสมัครใจ คุณสามารถข้ามคำถามหรือหยุดได้ทุกเมื่อ ไม่มีการเก็บชื่อหรือข้อมูลส่วนตัวใดๆ</p>
            </Card>
            <QuestionCard label="คุณยืนยันว่าอยู่ในประเทศไทยและยินดีเข้าร่วมหรือไม่?">
              <div className="space-y-2">
                <OptBtn selected={state.consent === 'yes'} onClick={() => set('consent', 'yes')}>ใช่ ฉันยินดีเข้าร่วม</OptBtn>
                <OptBtn selected={state.consent === 'no'} onClick={() => set('consent', 'no')}>ไม่ ฉันไม่ต้องการเข้าร่วม</OptBtn>
              </div>
            </QuestionCard>
          </div>
        )}

        {/* SEC 1: ROLE */}
        {sec === 1 && (
          <div className="space-y-4">
            <SectionHeader icon="🧑" bg="bg-blue-500/10" title="ส่วนที่ 1 — คุณคือใคร?" sub="เพื่อให้คำถามเหมาะสมกับบริบทของคุณ" />
            <QuestionCard label="คุณมีบทบาทอะไรในระบบการศึกษา?" hint="เลือกข้อที่ตรงกับคุณมากที่สุด">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'student_in', icon: '🏫', label: 'นักเรียน/นักศึกษา\nในระบบ' },
                  { val: 'student_out', icon: '🌆', label: 'เยาวชน\nนอกระบบ' },
                  { val: 'vocational', icon: '🔧', label: 'นักเรียนอาชีวะ' },
                  { val: 'teacher', icon: '📚', label: 'ครู/อาจารย์' },
                  { val: 'volunteer', icon: '🤝', label: 'อาสาสมัคร' },
                  { val: 'other', icon: '✦', label: 'อื่นๆ' },
                ].map(r => (
                  <RoleCard key={r.val} icon={r.icon} label={r.label} selected={state.role === r.val} onClick={() => set('role', r.val)} />
                ))}
              </div>
            </QuestionCard>
          </div>
        )}

        {/* SEC 2: BASIC PROFILE */}
        {sec === 2 && (
          <div className="space-y-4">
            <SectionHeader icon="📋" bg="bg-pink-500/10" title="ส่วนที่ 2 — ข้อมูลพื้นฐาน" sub="ไม่ระบุตัวตน — ใช้สำหรับวิเคราะห์ข้อมูลเท่านั้น" />
            <QuestionCard label="กลุ่มอายุของคุณ">
              <div className="space-y-2">
                {[['u18','ต่ำกว่า 18 ปี'],['18-24','18–24 ปี'],['25-29','25–29 ปี'],['30plus','30 ปีขึ้นไป']].map(([v,l]) => (
                  <OptBtn key={v} selected={state.age === v} onClick={() => set('age', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            <QuestionCard label="คุณอยู่ในพื้นที่ไหน?">
              <div className="space-y-2">
                {[['bkk','กรุงเทพมหานคร'],['central','ภาคกลาง'],['north','ภาคเหนือ'],['northeast','ภาคอีสาน'],['south','ภาคใต้'],['no_say','ไม่ระบุ']].map(([v,l]) => (
                  <OptBtn key={v} selected={state.region === v} onClick={() => set('region', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            <QuestionCard label="อัตลักษณ์ทางเพศ / กลุ่มที่คุณระบุตัวตน" badge="เลือกได้หลายข้อ">
              <div className="space-y-2">
                {[['gay','เกย์ / ชายรักชาย'],['bisexual','ไบเซ็กชวล'],['trans_woman','ผู้หญิงข้ามเพศ / สาวประเภทสอง'],['trans_man','ผู้ชายข้ามเพศ'],['nonbinary','นอนไบนารี / เพศหลากหลาย'],['het_woman','หญิงรักชาย (เฮเทอโร)'],['het_man','ชายรักหญิง (เฮเทอโร)'],['no_say','ไม่ระบุ']].map(([v,l]) => (
                  <OptBtn key={v} multi selected={state.gender.includes(v)} onClick={() => toggleMulti('gender', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
          </div>
        )}

        {/* SEC 3: HIV KNOWLEDGE */}
        {sec === 3 && (
          <div className="space-y-4">
            <SectionHeader icon="💡" bg="bg-amber-500/10" title="ส่วนที่ 3 — ความรู้และการรับรู้เรื่อง HIV" sub="ไม่มีคำตอบถูกหรือผิด ตอบตามที่คุณรู้จริง" />
            <QuestionCard label="คุณรู้สึกว่าตัวเองมีความรู้เรื่องการป้องกัน HIV มากแค่ไหน?">
              <div className="space-y-2">
                {[['very','มากที่สุด — รู้ดีมาก'],['some','พอสมควร'],['little','น้อยมาก'],['none','ไม่รู้เลย']].map(([v,l]) => (
                  <OptBtn key={v} selected={state.know_level === v} onClick={() => set('know_level', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            <QuestionCard label="วิธีป้องกัน HIV ที่คุณรู้จัก" badge="เลือกได้หลายข้อ">
              <div className="space-y-2">
                {[['condom','ถุงยางอนามัย'],['prep','PrEP (ยาป้องกันก่อนสัมผัส)'],['pep','PEP (ยาป้องกันหลังสัมผัส)'],['test','การตรวจ HIV'],['uu','U=U (ตรวจไม่พบ = ไม่แพร่)'],['selftest','การตรวจเอง (Self-test)'],['none','ไม่รู้วิธีใดเลย']].map(([v,l]) => (
                  <OptBtn key={v} multi selected={state.prevention.includes(v)} onClick={() => toggleMulti('prevention', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
          </div>
        )}

        {/* SEC 4: TESTING */}
        {sec === 4 && (
          <div className="space-y-4">
            <SectionHeader icon="🩺" bg="bg-primary/10" title="ส่วนที่ 4 — การเข้าถึงบริการตรวจ HIV" sub="ทุกคำถามไม่ระบุตัวตน ไม่มีการตัดสิน" />
            <QuestionCard label="ในช่วง 12 เดือนที่ผ่านมา คุณเคยตรวจ HIV หรือไม่?">
              <div className="space-y-2">
                {[['yes','ใช่ ตรวจแล้ว'],['no','ไม่เคย'],['unsure','ไม่แน่ใจ / จำไม่ได้']].map(([v,l]) => (
                  <OptBtn key={v} selected={state.tested === v} onClick={() => set('tested', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            {state.tested === 'no' && (
              <>
                <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 border-l-[3px] border-primary">
                  คำถามต่อไปนี้จะช่วยให้เราเข้าใจว่ามีอุปสรรคอะไรที่ทำให้คุณยังไม่ได้ตรวจ
                </div>
                <QuestionCard label="สาเหตุหลักที่ยังไม่ได้ตรวจ HIV คืออะไร?" badge="เลือกได้สูงสุด 3 ข้อ">
                  <div className="space-y-2">
                    {[['norisk','รู้สึกว่าตัวเองไม่เสี่ยง'],['fear','กลัวผลบวก'],['stigma','กลัวถูกตัดสินหรือเลือกปฏิบัติ'],['access','ไม่สะดวกเดินทางหรือเข้าถึงบริการ'],['cost','กังวลเรื่องค่าใช้จ่าย'],['privacy','กังวลเรื่องความเป็นส่วนตัว'],['dontknow','ไม่รู้ว่าจะไปตรวจที่ไหน'],['busy','ไม่มีเวลา'],['selftest','อยากตรวจเองที่บ้านแต่ยังไม่ได้ทำ']].map(([v,l]) => (
                      <OptBtn key={v} multi selected={state.barrier.includes(v)} onClick={() => {
                        if (state.barrier.includes(v)) {
                          toggleMulti('barrier', v);
                        } else if (state.barrier.length < 3) {
                          toggleMulti('barrier', v);
                        }
                      }}>{l}</OptBtn>
                    ))}
                  </div>
                </QuestionCard>
              </>
            )}
          </div>
        )}

        {/* SEC 5: ROLE-SPECIFIC */}
        {sec === 5 && (
          <div className="space-y-4">
            <SectionHeader
              icon="🎓" bg="bg-violet-500/10"
              title={isTeacherRole ? 'ส่วนที่ 5 — ในฐานะครู/อาสาสมัคร' : 'ส่วนที่ 5 — ประสบการณ์การเรียนรู้'}
              sub={isTeacherRole ? 'คำถามสำหรับครูและอาสาสมัครโดยเฉพาะ' : 'คำถามเกี่ยวกับเพศศึกษาในสถาบันของคุณ'}
            />
            {isTeacherRole ? (
              <>
                <QuestionCard label="ในช่วง 1 ปีที่ผ่านมา คุณได้สอนหรือพูดคุยเรื่อง HIV/เพศศึกษากับเยาวชนหรือไม่?">
                  <div className="space-y-2">
                    {[['yes','ใช่ บ่อยครั้ง'],['some','บ้าง นานๆ ครั้ง'],['no','ยังไม่ได้ทำ']].map(([v,l]) => (
                      <OptBtn key={v} selected={state.taught === v} onClick={() => set('taught', v)}>{l}</OptBtn>
                    ))}
                  </div>
                </QuestionCard>
                <QuestionCard label="อุปสรรคในการสอน/พูดเรื่อง HIV กับเยาวชนคืออะไร?" badge="เลือกได้หลายข้อ">
                  <div className="space-y-2">
                    {[['knowledge','ขาดความรู้หรือความมั่นใจ'],['curriculum','หลักสูตรไม่เอื้ออำนวย'],['sensitive','กังวลว่าเรื่องนี้ละเอียดอ่อนเกินไป'],['tools','ขาดสื่อและเครื่องมือที่เหมาะสม'],['support','ขาดการสนับสนุนจากผู้บริหาร'],['none','ไม่มีอุปสรรค']].map(([v,l]) => (
                      <OptBtn key={v} multi selected={state.teach_barrier.includes(v)} onClick={() => toggleMulti('teach_barrier', v)}>{l}</OptBtn>
                    ))}
                  </div>
                </QuestionCard>
              </>
            ) : (
              <>
                <QuestionCard label="คุณเคยได้รับการสอนเรื่อง HIV หรือเพศศึกษาในโรงเรียน/สถาบันหรือไม่?">
                  <div className="space-y-2">
                    {[['yes_enough','ใช่ และเพียงพอ'],['yes_notenough','ใช่ แต่น้อยมากหรือไม่ครบ'],['no','ไม่เคยเลย'],['na','ไม่ได้อยู่ในระบบโรงเรียน']].map(([v,l]) => (
                      <OptBtn key={v} selected={state.school_hiv === v} onClick={() => set('school_hiv', v)}>{l}</OptBtn>
                    ))}
                  </div>
                </QuestionCard>
                <QuestionCard label="คุณรู้สึกสะดวกใจแค่ไหนในการพูดคุยเรื่อง HIV กับคนรอบข้าง?">
                  <div className="space-y-2">
                    {[['very','สบายใจมาก พูดได้เปิดเผย'],['some','สบายใจบ้าง ขึ้นอยู่กับคนที่คุย'],['less','ไม่ค่อยสบายใจ'],['not','ไม่สบายใจเลย']].map(([v,l]) => (
                      <OptBtn key={v} selected={state.comfort === v} onClick={() => set('comfort', v)}>{l}</OptBtn>
                    ))}
                  </div>
                </QuestionCard>
              </>
            )}
          </div>
        )}

        {/* SEC 6: DIGITAL */}
        {sec === 6 && (
          <div className="space-y-4">
            <SectionHeader icon="📱" bg="bg-blue-500/10" title="ส่วนที่ 6 — ดิจิทัลและช่องทางที่ต้องการ" sub="เราอยากรู้ว่าคุณค้นหาข้อมูลสุขภาพจากที่ไหน" />
            <QuestionCard label="คุณใช้แพลตฟอร์มไหนค้นหาข้อมูลสุขภาพทางเพศ?" badge="เลือกได้หลายข้อ">
              <div className="space-y-2">
                {[['line','LINE'],['fb','Facebook'],['ig','Instagram'],['tiktok','TikTok'],['x','X (Twitter)'],['dating','แอปหาคู่ / Dating Apps'],['web','เว็บไซต์ด้านสุขภาพ'],['ai','Chatbot / AI'],['none','ไม่ได้ค้นหาออนไลน์']].map(([v,l]) => (
                  <OptBtn key={v} multi selected={state.platform.includes(v)} onClick={() => toggleMulti('platform', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            <QuestionCard label="ถ้ามีแชทบอทหรือแอปที่คุยเรื่อง HIV ได้แบบส่วนตัว ไม่ต้องบอกชื่อ — คุณอยากลองใช้ไหม?" hint="เช่น ถามเรื่องการตรวจ PrEP ถุงยาง โดยไม่มีคนรู้ว่าคุณถาม">
              <div className="space-y-2">
                <OptBtn selected={state.use_ai === 'yes'} onClick={() => set('use_ai', 'yes')}>
                  <div>อยากลองมาก!<br /><span className="text-xs text-muted-foreground">ฟังดูสะดวกและเป็นส่วนตัวดี</span></div>
                </OptBtn>
                <OptBtn selected={state.use_ai === 'maybe'} onClick={() => set('use_ai', 'maybe')}>
                  <div>อาจจะ ถ้าเชื่อถือได้<br /><span className="text-xs text-muted-foreground">ขึ้นอยู่กับว่าปลอดภัยแค่ไหน</span></div>
                </OptBtn>
                <OptBtn selected={state.use_ai === 'human'} onClick={() => set('use_ai', 'human')}>
                  <div>ยังไม่มั่นใจ อยากคุยกับคนจริงมากกว่า<br /><span className="text-xs text-muted-foreground">โอเค — ช่วยเราออกแบบบริการที่ดีกว่าได้</span></div>
                </OptBtn>
                <OptBtn selected={state.use_ai === 'no'} onClick={() => set('use_ai', 'no')}>ไม่ ไม่สนใจ</OptBtn>
              </div>
            </QuestionCard>
          </div>
        )}

        {/* SEC 7: STIGMA + OPEN */}
        {sec === 7 && (
          <div className="space-y-4">
            <SectionHeader icon="💬" bg="bg-pink-500/10" title="ส่วนที่ 7 — ประสบการณ์และเสียงของคุณ" sub="คำถามสุดท้าย — ขอบคุณที่มาถึงตรงนี้" />
            <QuestionCard label="ในช่วง 12 เดือนที่ผ่านมา คุณเคยหลีกเลี่ยงบริการสุขภาพเพราะกลัวถูกตัดสินหรือเลือกปฏิบัติหรือไม่?">
              <div className="space-y-2">
                {[['yes','ใช่ เคย'],['no','ไม่เคย'],['unsure','ไม่แน่ใจ']].map(([v,l]) => (
                  <OptBtn key={v} selected={state.stigma === v} onClick={() => set('stigma', v)}>{l}</OptBtn>
                ))}
              </div>
            </QuestionCard>
            <QuestionCard label="สิ่งที่จะทำให้คุณเข้าถึงบริการสุขภาพทางเพศได้ง่ายขึ้นคืออะไร?" hint="แบ่งปันความคิดได้อย่างอิสระ">
              <Textarea
                placeholder="พิมพ์ได้เลย..."
                value={state.open_text}
                onChange={e => setState(prev => ({ ...prev, open_text: e.target.value }))}
                className="min-h-[100px]"
              />
            </QuestionCard>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          {sec > 0 ? (
            <Button variant="outline" onClick={goBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> ย้อนกลับ
            </Button>
          ) : <div />}
          <Button
            onClick={goNext}
            disabled={!canNext() || submitting}
            size="sm"
            className="gap-1"
          >
            {submitting ? 'กำลังส่ง...' : sec === 7 ? (
              <>ส่งแบบสอบถาม <Check className="h-4 w-4" /></>
            ) : (
              <>ถัดไป <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
      <BottomNav />
    </PageContainer>
  );
}

// Helper components
function SectionHeader({ icon, bg, title, sub }: { icon: string; bg: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-lg flex-shrink-0", bg)}>{icon}</div>
      <div>
        <h3 className="text-[15px] font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function QuestionCard({ label, hint, badge, children }: { label: string; hint?: string; badge?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium text-foreground leading-relaxed">
        {label}
        {badge && <span className="ml-1.5 inline-block text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary align-middle">{badge}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </Card>
  );
}
