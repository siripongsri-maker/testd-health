import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { trackJourneyEvent } from "@/lib/journeyTracker";
import { trackSeedEvent, getClientSeedId } from "@/lib/clientSeed";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { FeedbackIntroCard } from "@/components/feedback/FeedbackIntroCard";
import { CounsellingQualitySection } from "@/components/feedback/CounsellingQualitySection";
import { SatisfactionSection } from "@/components/feedback/SatisfactionSection";
import { ServicesReceivedSection } from "@/components/feedback/ServicesReceivedSection";
import { HarmReductionSection } from "@/components/feedback/HarmReductionSection";
import { MentalHealthSection } from "@/components/feedback/MentalHealthSection";
import { OpenFeedbackSection } from "@/components/feedback/OpenFeedbackSection";
import { UicStepSection } from "@/components/feedback/UicStepSection";
import type { UicVisitStats } from "@/lib/clientSeed";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send, CheckCircle2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export interface FeedbackFormData {
  channel: string;
  service_date: string;
  branch_id: string | null;
  // UIC inputs (used to generate uic)
  first_name: string;
  last_name: string;
  dob: string;
  uic: string;
  // Section 1
  q1: number | null; q2: number | null; q3: number | null; q4: number | null; q5: number | null;
  // Section 2-3
  satisfaction: number | null;
  self_efficacy: number | null;
  // Section 4
  services: string[];
  // STI
  sti_status: string; sti_k1: boolean | null; sti_k2: boolean | null; sti_k3: boolean | null;
  // PrEP
  prep_status: string; prep_k1: boolean | null; prep_k2: boolean | null; prep_k3: boolean | null;
  // PEP
  pep_status: string; pep_k1: boolean | null; pep_k2: boolean | null; pep_k3: boolean | null;
  // ART
  art_status: string; art_k1: boolean | null; art_k2: boolean | null; art_k3: boolean | null;
  // HR
  hr_k1: boolean | null; hr_k2: boolean | null; hr_k3: boolean | null;
  hr_intentions: string[];
  // MH
  mh_referral: string; mh_outcome: string;
  // Open
  open_feedback: string;
  // UIC bypass — when true, skip UIC step even if HR/MH selected
  skip_uic: boolean;
}

const defaultData: FeedbackFormData = {
  channel: 'clinic', service_date: new Date().toISOString().split('T')[0], branch_id: null,
  first_name: '', last_name: '', dob: '', uic: '', skip_uic: false,
  q1: null, q2: null, q3: null, q4: null, q5: null,
  satisfaction: null, self_efficacy: null,
  services: [],
  sti_status: '', sti_k1: null, sti_k2: null, sti_k3: null,
  prep_status: '', prep_k1: null, prep_k2: null, prep_k3: null,
  pep_status: '', pep_k1: null, pep_k2: null, pep_k3: null,
  art_status: '', art_k1: null, art_k2: null, art_k3: null,
  hr_k1: null, hr_k2: null, hr_k3: null, hr_intentions: [],
  mh_referral: '', mh_outcome: '',
  open_feedback: '',
};

export default function ClientFeedbackForm() {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FeedbackFormData>(defaultData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uicStats, setUicStats] = useState<UicVisitStats | null>(null);

  useEffect(() => {
    trackJourneyEvent('engagement', 'feedback_form_viewed');
    // First-party seed tracking
    trackSeedEvent('assessment_viewed', { language });
    const ch = searchParams.get('channel');
    const bid = searchParams.get('branch_id');
    if (ch) setData(d => ({ ...d, channel: ch }));
    if (bid) setData(d => ({ ...d, branch_id: bid }));
  }, [searchParams]);

  const update = (partial: Partial<FeedbackFormData>) => setData(d => ({ ...d, ...partial }));

  // Compute steps dynamically based on selected services
  // UIC step appears only when Harm Reduction or Mental Health is selected
  const getSteps = () => {
    const steps = ['intro', 'counselling', 'satisfaction', 'services'];
    if (data.services.includes('sti') || data.services.includes('prep') ||
        data.services.includes('pep') || data.services.includes('art')) {
      steps.push('service_detail');
    }
    const needsUic = data.services.includes('harm_reduction') || data.services.includes('mental_health');
    if (needsUic) steps.push('uic');
    if (data.services.includes('harm_reduction')) steps.push('harm_reduction');
    if (data.services.includes('mental_health')) steps.push('mental_health');
    steps.push('open_feedback');
    return steps;
  };

  const steps = getSteps();
  const totalSteps = steps.length;
  const currentStep = steps[step] || 'intro';

  const canProceed = () => {
    if (currentStep === 'counselling') return data.q1 !== null && data.q2 !== null && data.q3 !== null && data.q4 !== null && data.q5 !== null;
    if (currentStep === 'satisfaction') return data.satisfaction !== null && data.self_efficacy !== null;
    if (currentStep === 'services') return data.services.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const seed = getClientSeedId();

      const payload = {
        service_date: data.service_date,
        channel: data.channel,
        branch_id: data.branch_id || null,
        is_anonymous: !user?.user?.id,
        user_id: user?.user?.id || null,
        created_by: user?.user?.id || null,
        appointment_id: searchParams.get('appointment_id') || null,
        uic: data.uic?.trim() || null,
        client_seed_id: seed,
        q1_respect: data.q1,
        q2_open_discussion: data.q2,
        q3_info_clarity: data.q3,
        q4_results_explained: data.q4,
        q5_condom_demo: data.q5,
        satisfaction_score: data.satisfaction,
        self_efficacy_score: data.self_efficacy,
        received_sti: data.services.includes('sti'),
        received_prep: data.services.includes('prep'),
        received_pep: data.services.includes('pep'),
        received_art: data.services.includes('art'),
        received_harm_reduction: data.services.includes('harm_reduction'),
        received_mental_health: data.services.includes('mental_health'),
        no_additional_service: data.services.includes('none'),
        sti_status: data.sti_status || null,
        sti_knowledge_1: data.sti_k1,
        sti_knowledge_2: data.sti_k2,
        sti_knowledge_3: data.sti_k3,
        prep_status: data.prep_status || null,
        prep_knowledge_1: data.prep_k1,
        prep_knowledge_2: data.prep_k2,
        prep_knowledge_3: data.prep_k3,
        pep_status: data.pep_status || null,
        pep_knowledge_1: data.pep_k1,
        pep_knowledge_2: data.pep_k2,
        pep_knowledge_3: data.pep_k3,
        art_status: data.art_status || null,
        art_knowledge_1: data.art_k1,
        art_knowledge_2: data.art_k2,
        art_knowledge_3: data.art_k3,
        hr_knowledge_1: data.hr_k1,
        hr_knowledge_2: data.hr_k2,
        hr_knowledge_3: data.hr_k3,
        hr_intention_change: data.hr_intentions,
        hr_intention_count: data.hr_intentions.length,
        mh_referral_uptake: data.mh_referral || null,
        mh_outcome: data.mh_outcome || null,
        open_feedback_text: data.open_feedback || null,
        status: 'submitted',
      };

      const { error } = await supabase.from('client_feedback_responses').insert(payload as any);
      if (error) throw error;

      // Log first-party seed events
      await trackSeedEvent('assessment_submitted', {
        channel: data.channel,
        branch_id: data.branch_id,
        language,
        uic: data.uic?.trim() || null,
      });

      trackJourneyEvent('engagement', 'feedback_form_submitted', {
        channel: data.channel,
        is_anonymous: !user?.user?.id,
      });

      setSubmitted(true);
      toast.success(language === 'th' ? '🎉 ส่งแบบประเมินสำเร็จ! ขอบคุณค่ะ / ครับ' : '🎉 Feedback submitted successfully! Thank you!');
    } catch (err) {
      console.error(err);
      toast.error(language === 'th' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full text-center space-y-6 rounded-3xl border border-primary/20 bg-card shadow-lg p-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={2.25} />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary/70" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'th' ? '🎉 ส่งแบบประเมินสำเร็จ!' : '🎉 Feedback submitted successfully!'}
            </h1>
            <p className="text-sm text-foreground/80">
              {language === 'th' ? 'ขอบคุณค่ะ / ครับ 🙏' : 'Thank you for your time! 🙏'}
            </p>
          </div>

          <div className="rounded-xl bg-muted/40 border border-border p-4 text-left space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ✅ {language === 'th'
                ? 'ข้อมูลของคุณถูกบันทึกอย่างปลอดภัยแล้ว'
                : 'Your responses have been saved securely.'}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 {language === 'th'
                ? 'ความคิดเห็นของคุณจะช่วยให้เราพัฒนาบริการให้ดียิ่งขึ้น'
                : 'Your feedback helps us improve our services for everyone.'}
            </p>
          </div>

          <Button asChild className="w-full">
            <Link to="/">
              {language === 'th' ? 'กลับสู่หน้าหลัก' : 'Back to home'}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Progress */}
        <ProgressIndicator current={step + 1} total={totalSteps} className="mb-2" />
        <p className="text-xs text-muted-foreground text-center">
          {step + 1} / {totalSteps}
        </p>

        {/* Steps */}
        {currentStep === 'intro' && <FeedbackIntroCard data={data} update={update} />}
        {currentStep === 'counselling' && <CounsellingQualitySection data={data} update={update} />}
        {currentStep === 'satisfaction' && <SatisfactionSection data={data} update={update} />}
        {currentStep === 'services' && <ServicesReceivedSection data={data} update={update} />}
        {currentStep === 'service_detail' && (
          <div className="space-y-4">
            {data.services.includes('sti') && <ServiceSubSection type="sti" data={data} update={update} />}
            {data.services.includes('prep') && <ServiceSubSection type="prep" data={data} update={update} />}
            {data.services.includes('pep') && <ServiceSubSection type="pep" data={data} update={update} />}
            {data.services.includes('art') && <ServiceSubSection type="art" data={data} update={update} />}
          </div>
        )}
        {currentStep === 'uic' && (
          <UicStepSection
            data={data}
            update={update}
            stats={uicStats}
            onStatsLoaded={setUicStats}
            onSkip={() => {
              update({ uic: '' });
              setStep(s => s + 1);
            }}
          />
        )}
        {currentStep === 'harm_reduction' && <HarmReductionSection data={data} update={update} />}
        {currentStep === 'mental_health' && <MentalHealthSection data={data} update={update} />}
        {currentStep === 'open_feedback' && <OpenFeedbackSection data={data} update={update} />}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'th' ? 'ย้อนกลับ' : 'Back'}
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button className="flex-1" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              {language === 'th' ? 'ถัดไป' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-2" />
              {submitting
                ? (language === 'th' ? 'กำลังส่ง...' : 'Submitting...')
                : (language === 'th' ? 'ส่งแบบประเมิน' : 'Submit')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Service Sub-Section ---
import { ServiceKnowledgeCard } from "@/components/feedback/ServiceKnowledgeCard";

function ServiceSubSection({ type, data, update }: {
  type: 'sti' | 'prep' | 'pep' | 'art';
  data: FeedbackFormData;
  update: (p: Partial<FeedbackFormData>) => void;
}) {
  return <ServiceKnowledgeCard type={type} data={data} update={update} />;
}
