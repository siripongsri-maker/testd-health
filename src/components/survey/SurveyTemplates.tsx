import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Heart, Stethoscope, MessageSquare, Star, Shield, Copy, Users } from "lucide-react";
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

const o = (th: string, en: string) => opt(crypto.randomUUID(), th, en);

const base = {
  options: [] as QuestionFormData['options'],
  rating_min: 1,
  rating_max: 5,
  rating_label_min_th: '',
  rating_label_min_en: '',
  rating_label_max_th: '',
  rating_label_max_en: '',
  is_required: false,
};

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
  {
    id: 'chemsex-organizers-circle',
    icon: <Users className="h-5 w-5 text-teal-500" />,
    title_th: 'วงคุยของคนจัดงานโฮม พื้นที่ปลอดภัย',
    title_en: 'Safer Spaces: a circle for people who host',
    description_th:
      'ฟอร์มชวนคนจัดวงมาร่วมวงคุย (Output 1.1.5) ไม่ถามชื่อจริง ไม่ถามสถานที่ ไม่ถามเรื่องสาร\n\nสอบถามเพิ่มเติม โทร 0625493639\nปิดรับ 30 กันยายน 2569 หรือจนกว่าจะครบ 10 คน',
    description_en:
      'Recruitment form for people who host (Output 1.1.5). No real names, no venue, no substance questions.\n\nQuestions: call 0625493639. Closes 30 September 2026 or when 10 people have joined.',
    questions: [
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'ยืนยันว่าอายุ 18 ปีขึ้นไป',
        question_text_en: 'Confirm you are 18 or older',
        options: [
          o('ใช่', 'Yes'),
          o('ไม่ใช่ (ทีมจะส่งต่อบริการสำหรับเยาวชนให้)', 'No (we will refer you to youth services)'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'text_short',
        question_text_th: 'อยากให้เราเรียกคุณว่าอะไร (ชื่อเล่นหรือนามแฝงก็ได้ ไม่ต้องใช้ชื่อจริง)',
        question_text_en: 'What should we call you? (nickname or alias — no real name needed)',
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'ช่องทางที่ติดต่อกลับได้สะดวกที่สุด',
        question_text_en: 'Best channel to reach you',
        options: [
          o('Telegram', 'Telegram'),
          o('LINE', 'LINE'),
          o('X (DM)', 'X (DM)'),
          o('เบอร์โทร', 'Phone'),
          o('อื่นๆ', 'Other'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'text_short',
        question_text_th: 'ไอดีหรือเบอร์สำหรับติดต่อกลับ (ใช้เฉพาะการนัดหมาย ไม่เผยแพร่ ไม่ส่งต่อให้ใคร)',
        question_text_en: 'ID or number for contact (used only to arrange the session, never shared)',
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'ปกติคุณอยู่โซนไหน',
        question_text_en: 'Which area are you usually in?',
        options: [
          o('กรุงเทพ', 'Bangkok'),
          o('พัทยา', 'Pattaya'),
          o('สลับสองที่', 'Both'),
          o('อื่นๆ (ระบุจังหวัด)', 'Other (specify province)'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'บทบาทของคุณในวงเป็นแบบไหน (เลือกได้หลายข้อ)',
        question_text_en: 'Your role in the circle (select all that apply)',
        options: [
          o('เป็นคนตั้งวงหรือชวนคน', 'I host or invite people'),
          o('เป็นแอดมินกลุ่มออนไลน์', 'Online group admin'),
          o('เป็นคนดูแลคนอื่นในวง', 'I look after others'),
          o('เป็นเจ้าของหรือดูแลพื้นที่', 'I own or manage the space'),
          o('เป็นคนที่เพื่อนมักโทรหาเวลามีเรื่อง', 'Friends call me when something happens'),
          o('อื่นๆ', 'Other'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'โดยประมาณ วงที่คุณเกี่ยวข้องมีคนราวกี่คน',
        question_text_en: 'Roughly how many people are in your circle?',
        options: [
          o('2-4', '2-4'),
          o('5-10', '5-10'),
          o('11-20', '11-20'),
          o('มากกว่า 20', 'More than 20'),
          o('ไม่แน่นอน', 'It varies'),
        ],
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'คุณพอจะชวนคนในวงมาร่วมด้วยได้ไหม',
        question_text_en: 'Could you bring others from your circle?',
        options: [
          o('ได้ 1-2 คน', '1-2 people'),
          o('ได้ 3-5 คน', '3-5 people'),
          o('ได้มากกว่า 5 คน', 'More than 5'),
          o('มาคนเดียวก่อน', 'Just me for now'),
          o('ยังไม่แน่ใจ', 'Not sure yet'),
        ],
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'เรื่องที่อยากให้วงคุยพูดถึงมากที่สุด (เลือกได้ไม่เกิน 3 ข้อ)',
        question_text_en: 'Topics you most want to discuss (choose up to 3)',
        options: [
          o('รับมือเมื่อมีคนไม่ไหวหรือหมดสติ', 'Responding when someone is unwell or unconscious'),
          o('การคุยเรื่องความยินยอมในวง', 'Talking about consent'),
          o('การพัก น้ำ อาหาร และการนอน', 'Rest, water, food and sleep'),
          o('ป๊อปเปอร์และยาปลุกเซ็กส์ใช้ยังไงให้เสี่ยงน้อยลง', 'Lowering risk with poppers and sex-enhancing drugs'),
          o('แอลกอฮอล์ผสมกับอย่างอื่น', 'Mixing alcohol with other things'),
          o('ถุงยางและเจลหล่อลื่นในสถานการณ์จริง', 'Condoms and lube in real situations'),
          o('PrEP PEP และการตรวจ', 'PrEP, PEP and testing'),
          o('สุขภาพใจหลังจบวง', 'Mental health afterwards'),
          o('การรับมือกับความรุนแรงหรือการถูกคุกคาม', 'Handling violence or harassment'),
          o('อื่นๆ', 'Other'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'text_long',
        question_text_th:
          'มีสถานการณ์ไหนที่คุณเคยเจอแล้วอยากรู้ว่ารับมือยังไงดี (เขียนเท่าที่สบายใจ ไม่ต้องลงรายละเอียดตัวบุคคล)',
        question_text_en:
          'Any situation you have faced and want to know how to handle? (share only what feels comfortable)',
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'รูปแบบที่คุณสะดวกร่วมที่สุด',
        question_text_en: 'Format you prefer',
        options: [
          o('กลุ่มเล็ก 5-8 คน', 'Small group of 5-8'),
          o('กลุ่มกลาง 10-15 คน', 'Medium group of 10-15'),
          o('คุยตัวต่อตัวก่อน แล้วค่อยเข้ากลุ่ม', 'One-on-one first, then group'),
          o('ยังไม่แน่ใจ', 'Not sure yet'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'ช่วงเวลาที่สะดวก (เลือกได้หลายข้อ)',
        question_text_en: 'Times that work for you (select all that apply)',
        options: [
          o('วันธรรมดา กลางวัน', 'Weekdays, daytime'),
          o('วันธรรมดา เย็นหลัง 18.00', 'Weekdays, after 6pm'),
          o('เสาร์อาทิตย์ กลางวัน', 'Weekends, daytime'),
          o('เสาร์อาทิตย์ เย็น', 'Weekends, evening'),
          o('ดึกหลัง 22.00', 'Late, after 10pm'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'ภาษาที่คุณสะดวกที่สุด',
        question_text_en: 'Language you are most comfortable with',
        options: [
          o('ไทย', 'Thai'),
          o('อังกฤษ', 'English'),
          o('พม่า', 'Burmese'),
          o('เขมร', 'Khmer'),
          o('ลาว', 'Lao'),
          o('เวียดนาม', 'Vietnamese'),
          o('อื่นๆ', 'Other'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'สิ่งที่จะทำให้คุณสบายใจขึ้นในการมาร่วม (เลือกได้หลายข้อ)',
        question_text_en: 'What would make you feel more comfortable joining?',
        options: [
          o('ไม่มีการถ่ายภาพ', 'No photos'),
          o('ไม่ต้องบอกชื่อจริง', 'No real name required'),
          o('สถานที่ที่ไม่ใช่คลินิก', 'A non-clinic venue'),
          o('มีคนรู้จักไปด้วย', 'Bringing someone I know'),
          o('รู้ล่วงหน้าว่าใครจะอยู่ในห้องบ้าง', 'Knowing in advance who will be there'),
          o('มีค่าเดินทาง', 'Travel support'),
          o('อื่นๆ', 'Other'),
        ],
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'คุณสนใจบริการอะไรของ SWING บ้าง (เลือกได้หลายข้อ)',
        question_text_en: 'Which SWING services interest you?',
        options: [
          o('ตรวจเอชไอวีและโรคติดต่อทางเพศสัมพันธ์', 'HIV and STI testing'),
          o('PrEP หรือ PEP', 'PrEP or PEP'),
          o('ชุดตรวจด้วยตัวเอง', 'HIV self-test kit'),
          o('ปรึกษาสุขภาพใจ', 'Mental health support'),
          o('ชุดอุปกรณ์ลดอันตราย', 'Harm reduction pack'),
          o('ยังไม่สนใจตอนนี้', 'Not interested right now'),
        ],
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'อยากได้อะไรในชุดอุปกรณ์บ้าง (เลือกได้หลายข้อ)',
        question_text_en: 'What would you like in your harm reduction pack?',
        options: [
          o('ถุงยางอนามัยขนาดมาตรฐาน', 'Standard-size condoms'),
          o('ถุงยางอนามัยไซซ์ใหญ่', 'Large-size condoms'),
          o('เจลหล่อลื่นแบบซองพกพา', 'Lube sachets'),
          o('เจลหล่อลื่นแบบหลอด', 'Lube tube'),
          o('ชุดตรวจเอชไอวีด้วยตัวเอง', 'HIV self-test kit'),
          o('ผงเกลือแร่และของดื่มแก้คอแห้ง', 'Electrolytes and drinks'),
          o('ลิปมันและหมากฝรั่ง', 'Lip balm and gum'),
          o('หลอดแบบใช้ครั้งเดียว', 'Single-use straws'),
          o('อุปกรณ์ฉีดสะอาดและผ้าเช็ดแอลกอฮอล์', 'Clean injecting equipment and alcohol wipes'),
          o('การ์ดข้อมูลรับมือเหตุฉุกเฉินพร้อมเบอร์ติดต่อ', 'Emergency response card with contacts'),
          o('ถุงใส่แบบทึบไม่มีโลโก้', 'Plain unbranded bag'),
          o('อื่นๆ', 'Other'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'อยากได้ประมาณกี่ชุด',
        question_text_en: 'How many packs would you like?',
        options: [
          o('1 ชุดสำหรับตัวเอง', '1 pack for myself'),
          o('2-5 ชุด', '2-5 packs'),
          o('6-10 ชุด', '6-10 packs'),
          o('มากกว่า 10 ชุด (ทีมจะคุยรายละเอียดอีกครั้ง)', 'More than 10 (team will follow up)'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'multiple_choice',
        question_text_th: 'อยากรับชุดอุปกรณ์แบบไหน',
        question_text_en: 'How would you like to receive the pack?',
        options: [
          o('รับหน้างานวันที่มาร่วมวง', 'At the session'),
          o('นัดรับที่คลินิก SWING', 'Pick up at SWING clinic'),
          o('ให้ทีมเอาไปให้ตอนลงพื้นที่', 'Outreach team delivers it'),
          o('ส่งไปรษณีย์แบบไม่ระบุชื่อผู้ส่ง', 'Discreet post, no sender name'),
        ],
        is_required: true,
      },
      {
        ...base,
        question_type: 'text_long',
        question_text_th: 'อยากฝากอะไรถึงทีมก่อนเจอกันไหม',
        question_text_en: 'Anything you want to tell the team before we meet?',
      },
      {
        ...base,
        question_type: 'checkbox',
        question_text_th: 'ความยินยอม',
        question_text_en: 'Consent',
        options: [
          o('ยินยอมให้ทีมติดต่อกลับตามช่องทางที่ให้ไว้', 'I agree to be contacted via the channel I provided'),
          o('เข้าใจว่าเข้าร่วมโดยสมัครใจ ถอนตัวได้ทุกเมื่อ', 'I understand participation is voluntary and I can withdraw anytime'),
          o(
            'เข้าใจว่าข้อมูลจะถูกใช้แบบรวมกลุ่ม ไม่ระบุตัวตน เพื่อรายงานผลโครงการ',
            'I understand data is used in aggregate, anonymously, for project reporting',
          ),
        ],
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
