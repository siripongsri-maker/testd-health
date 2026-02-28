import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Heart, Stethoscope, MessageSquare, Star, Shield, Copy } from "lucide-react";
import type { QuestionFormData } from "./types";

export interface SurveyTemplate {
  id: string;
  icon: React.ReactNode;
  title_th: string;
  title_en: string;
  description_th: string;
  description_en: string;
  questions: QuestionFormData[];
}

const opt = (id: string, th: string, en: string) => ({ id, text_th: th, text_en: en });

export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'prep-satisfaction',
    icon: <Heart className="h-5 w-5 text-pink-500" />,
    title_th: 'ความพึงพอใจ PrEP',
    title_en: 'PrEP Satisfaction',
    description_th: 'ประเมินประสบการณ์การใช้ PrEP',
    description_en: 'Evaluate PrEP experience',
    questions: [
      {
        question_type: 'rating',
        question_text_th: 'คุณพอใจกับบริการ PrEP มากแค่ไหน?',
        question_text_en: 'How satisfied are you with PrEP services?',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: 'ไม่พอใจ', rating_label_min_en: 'Not satisfied',
        rating_label_max_th: 'พอใจมาก', rating_label_max_en: 'Very satisfied',
        is_required: true,
      },
      {
        question_type: 'multiple_choice',
        question_text_th: 'คุณรับ PrEP บ่อยแค่ไหน?',
        question_text_en: 'How often do you take PrEP?',
        options: [
          opt(crypto.randomUUID(), 'ทุกวัน', 'Daily'),
          opt(crypto.randomUUID(), 'ตามเหตุการณ์ (On-demand)', 'On-demand'),
          opt(crypto.randomUUID(), 'หยุดใช้แล้ว', 'Stopped'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'checkbox',
        question_text_th: 'คุณเคยมีผลข้างเคียงอะไรบ้าง?',
        question_text_en: 'Have you experienced any side effects?',
        options: [
          opt(crypto.randomUUID(), 'คลื่นไส้', 'Nausea'),
          opt(crypto.randomUUID(), 'ปวดหัว', 'Headache'),
          opt(crypto.randomUUID(), 'ท้องเสีย', 'Diarrhea'),
          opt(crypto.randomUUID(), 'ไม่มี', 'None'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: false,
      },
      {
        question_type: 'text_long',
        question_text_th: 'มีข้อเสนอแนะเพิ่มเติมไหม?',
        question_text_en: 'Any additional suggestions?',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: false,
      },
    ],
  },
  {
    id: 'service-feedback',
    icon: <Stethoscope className="h-5 w-5 text-primary" />,
    title_th: 'ประเมินบริการคลินิก',
    title_en: 'Clinic Service Feedback',
    description_th: 'แบบประเมินคุณภาพการให้บริการ',
    description_en: 'Service quality assessment',
    questions: [
      {
        question_type: 'rating',
        question_text_th: 'คุณให้คะแนนบริการโดยรวมเท่าไหร่?',
        question_text_en: 'How would you rate the overall service?',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: 'แย่มาก', rating_label_min_en: 'Very poor',
        rating_label_max_th: 'ดีมาก', rating_label_max_en: 'Excellent',
        is_required: true,
      },
      {
        question_type: 'rating',
        question_text_th: 'ความเป็นมิตรของเจ้าหน้าที่',
        question_text_en: 'Staff friendliness',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: 'ไม่ดี', rating_label_min_en: 'Poor',
        rating_label_max_th: 'ดีมาก', rating_label_max_en: 'Excellent',
        is_required: true,
      },
      {
        question_type: 'multiple_choice',
        question_text_th: 'ระยะเวลารอคอยเป็นอย่างไร?',
        question_text_en: 'How was the waiting time?',
        options: [
          opt(crypto.randomUUID(), 'สั้นมาก (< 15 นาที)', 'Very short (< 15 min)'),
          opt(crypto.randomUUID(), 'พอรับได้ (15-30 นาที)', 'Acceptable (15-30 min)'),
          opt(crypto.randomUUID(), 'นาน (30-60 นาที)', 'Long (30-60 min)'),
          opt(crypto.randomUUID(), 'นานมาก (> 60 นาที)', 'Very long (> 60 min)'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'text_long',
        question_text_th: 'คุณอยากให้เราปรับปรุงอะไร?',
        question_text_en: 'What can we improve?',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: false,
      },
    ],
  },
  {
    id: 'community-needs',
    icon: <MessageSquare className="h-5 w-5 text-accent" />,
    title_th: 'ความต้องการของชุมชน',
    title_en: 'Community Needs Assessment',
    description_th: 'สำรวจความต้องการด้านสุขภาพ',
    description_en: 'Health needs survey for key populations',
    questions: [
      {
        question_type: 'checkbox',
        question_text_th: 'คุณสนใจบริการอะไรมากที่สุด?',
        question_text_en: 'Which services are you most interested in?',
        options: [
          opt(crypto.randomUUID(), 'ตรวจ HIV', 'HIV Testing'),
          opt(crypto.randomUUID(), 'PrEP', 'PrEP'),
          opt(crypto.randomUUID(), 'PEP', 'PEP'),
          opt(crypto.randomUUID(), 'ให้คำปรึกษา', 'Counseling'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'multiple_choice',
        question_text_th: 'ช่องทางที่คุณต้องการรับข้อมูล',
        question_text_en: 'Preferred communication channel',
        options: [
          opt(crypto.randomUUID(), 'LINE', 'LINE'),
          opt(crypto.randomUUID(), 'แอปนี้', 'This app'),
          opt(crypto.randomUUID(), 'อีเมล', 'Email'),
          opt(crypto.randomUUID(), 'โทรศัพท์', 'Phone'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'rating',
        question_text_th: 'คุณรู้สึกปลอดภัยในการเข้าถึงบริการมากแค่ไหน?',
        question_text_en: 'How safe do you feel accessing services?',
        options: [],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: 'ไม่ปลอดภัย', rating_label_min_en: 'Not safe',
        rating_label_max_th: 'ปลอดภัยมาก', rating_label_max_en: 'Very safe',
        is_required: true,
      },
    ],
  },
  {
    id: 'risk-assessment',
    icon: <Shield className="h-5 w-5 text-warning" />,
    title_th: 'ประเมินความเสี่ยง',
    title_en: 'Risk Assessment',
    description_th: 'ประเมินพฤติกรรมเสี่ยงเบื้องต้น',
    description_en: 'Preliminary risk behavior assessment',
    questions: [
      {
        question_type: 'multiple_choice',
        question_text_th: 'คุณเคยตรวจ HIV ครั้งล่าสุดเมื่อไหร่?',
        question_text_en: 'When was your last HIV test?',
        options: [
          opt(crypto.randomUUID(), 'ภายใน 3 เดือน', 'Within 3 months'),
          opt(crypto.randomUUID(), '3-6 เดือน', '3-6 months'),
          opt(crypto.randomUUID(), '6-12 เดือน', '6-12 months'),
          opt(crypto.randomUUID(), 'ไม่เคย', 'Never'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'multiple_choice',
        question_text_th: 'คุณใช้ถุงยางอนามัยบ่อยแค่ไหน?',
        question_text_en: 'How often do you use condoms?',
        options: [
          opt(crypto.randomUUID(), 'ทุกครั้ง', 'Always'),
          opt(crypto.randomUUID(), 'บางครั้ง', 'Sometimes'),
          opt(crypto.randomUUID(), 'ไม่เคย', 'Never'),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
      {
        question_type: 'multiple_choice',
        question_text_th: 'คุณใช้ PrEP หรือไม่?',
        question_text_en: 'Are you currently on PrEP?',
        options: [
          opt(crypto.randomUUID(), 'ใช่', 'Yes'),
          opt(crypto.randomUUID(), 'ไม่', 'No'),
          opt(crypto.randomUUID(), 'ไม่ทราบว่า PrEP คืออะไร', "I don't know what PrEP is"),
        ],
        rating_min: 1, rating_max: 5,
        rating_label_min_th: '', rating_label_min_en: '',
        rating_label_max_th: '', rating_label_max_en: '',
        is_required: true,
      },
    ],
  },
];

interface SurveyTemplatesProps {
  onSelect: (template: SurveyTemplate) => void;
}

export function SurveyTemplates({ onSelect }: SurveyTemplatesProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {language === 'th'
          ? 'เลือกเทมเพลตเพื่อเริ่มต้นอย่างรวดเร็ว'
          : 'Pick a template to get started quickly'}
      </p>
      <div className="grid gap-3">
        {SURVEY_TEMPLATES.map((t) => (
          <Card
            key={t.id}
            className="p-3.5 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
            onClick={() => onSelect(t)}
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">
                  {language === 'th' ? t.title_th : t.title_en}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {language === 'th' ? t.description_th : t.description_en}
                </p>
                <span className="text-[10px] text-muted-foreground/70 mt-1 inline-block">
                  {t.questions.length} {language === 'th' ? 'คำถาม' : 'questions'}
                </span>
              </div>
              <Copy className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
