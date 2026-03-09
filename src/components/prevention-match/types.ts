export interface QuizQuestion {
  id: number;
  question: string;
  options: { label: string; value: string }[];
}

export type ResultType = 'smart_planner' | 'social_explorer' | 'careful_learner' | 'chill_adventurer';

export interface ResultData {
  type: ResultType;
  title: string;
  description: string;
  recommendations: string[];
  avatarName: string;
  avatarTagline: string;
  gradient: string;
  accentColors: string[];
  datingBehavior: string[];
  partnerPreference: string[];
  compatibleType: ResultType;
  compatibilityReason: string;
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'เวลาไปปาร์ตี้หรือออกเดท คุณมักจะ',
    options: [
      { label: 'วางแผนล่วงหน้าเสมอ', value: 'A' },
      { label: 'ดูสถานการณ์หน้างาน', value: 'B' },
      { label: 'แล้วแต่อารมณ์', value: 'C' },
      { label: 'ชอบพบคนใหม่ ๆ', value: 'D' },
    ],
  },
  {
    id: 2,
    question: 'คุณตรวจสุขภาพทางเพศบ่อยแค่ไหน',
    options: [
      { label: 'ทุก 3 เดือน', value: 'A' },
      { label: 'ปีละ 1–2 ครั้ง', value: 'B' },
      { label: 'เฉพาะเวลารู้สึกเสี่ยง', value: 'C' },
      { label: 'ยังไม่เคยตรวจ', value: 'D' },
    ],
  },
  {
    id: 3,
    question: 'สิ่งที่คุณให้ความสำคัญมากที่สุดคือ',
    options: [
      { label: 'การวางแผนป้องกัน', value: 'A' },
      { label: 'ความสะดวก', value: 'B' },
      { label: 'ความสนุก', value: 'C' },
      { label: 'การดูแลตัวเอง', value: 'D' },
    ],
  },
  {
    id: 4,
    question: 'คุณรู้จัก PrEP มากแค่ไหน',
    options: [
      { label: 'ใช้อยู่แล้ว', value: 'A' },
      { label: 'เคยได้ยิน', value: 'B' },
      { label: 'ยังไม่แน่ใจ', value: 'C' },
      { label: 'ไม่รู้จัก', value: 'D' },
    ],
  },
  {
    id: 5,
    question: 'คุณพก condom บ่อยแค่ไหน',
    options: [
      { label: 'พกตลอด', value: 'A' },
      { label: 'บางครั้ง', value: 'B' },
      { label: 'แทบไม่เคย', value: 'C' },
      { label: 'แล้วแต่สถานการณ์', value: 'D' },
    ],
  },
  {
    id: 6,
    question: 'ถ้าคุณรู้สึกเสี่ยง คุณจะ',
    options: [
      { label: 'ตรวจทันที', value: 'A' },
      { label: 'ปรึกษาเพื่อน', value: 'B' },
      { label: 'รอดูอาการ', value: 'C' },
      { label: 'ค้นหาข้อมูลก่อน', value: 'D' },
    ],
  },
];

// Score mapping: A=smart_planner, B=careful_learner, C=chill_adventurer, D=social_explorer
const ANSWER_SCORES: Record<string, Record<ResultType, number>> = {
  A: { smart_planner: 3, careful_learner: 1, social_explorer: 0, chill_adventurer: 0 },
  B: { smart_planner: 1, careful_learner: 3, social_explorer: 1, chill_adventurer: 0 },
  C: { smart_planner: 0, careful_learner: 0, social_explorer: 1, chill_adventurer: 3 },
  D: { smart_planner: 0, careful_learner: 1, social_explorer: 3, chill_adventurer: 1 },
};

export function calculateResult(answers: Record<number, string>): ResultType {
  const scores: Record<ResultType, number> = {
    smart_planner: 0,
    social_explorer: 0,
    careful_learner: 0,
    chill_adventurer: 0,
  };

  Object.values(answers).forEach((answer) => {
    const mapping = ANSWER_SCORES[answer];
    if (mapping) {
      (Object.keys(mapping) as ResultType[]).forEach((type) => {
        scores[type] += mapping[type];
      });
    }
  });

  return (Object.entries(scores) as [ResultType, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
}

export function getResultScore(answers: Record<number, string>): number {
  const scores: Record<ResultType, number> = {
    smart_planner: 0, social_explorer: 0, careful_learner: 0, chill_adventurer: 0,
  };
  Object.values(answers).forEach((answer) => {
    const mapping = ANSWER_SCORES[answer];
    if (mapping) {
      (Object.keys(mapping) as ResultType[]).forEach((type) => {
        scores[type] += mapping[type];
      });
    }
  });
  return Math.max(...Object.values(scores));
}

export const RESULT_DATA: Record<ResultType, ResultData> = {
  smart_planner: {
    type: 'smart_planner',
    title: 'Smart Planner',
    description: 'คุณเป็นคนวางแผนและใส่ใจสุขภาพ',
    recommendations: [
      'ตรวจ HIV ทุก 3 เดือน',
      'ใช้ PrEP เป็นประจำ',
      'พก condom เสมอ',
    ],
    avatarName: 'PrEP Hero',
    avatarTagline: 'Ready, protected, and always one step ahead.',
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    accentColors: ['hsl(221, 83%, 53%)', 'hsl(271, 91%, 65%)', 'hsl(330, 81%, 60%)'],
    datingBehavior: [
      'ชอบความชัดเจน',
      'วางแผนก่อนเจอ',
      'ให้ความสำคัญกับความสม่ำเสมอและความไว้ใจ',
    ],
    partnerPreference: [
      'มักชอบคนที่สื่อสารตรงไปตรงมา',
      'ชอบคนที่รับผิดชอบและดูแลตัวเอง',
      'เข้ากับคนที่มีเป้าหมายชัดเจน',
    ],
    compatibleType: 'social_explorer',
    compatibilityReason: 'คุณเติมกันได้ดี — คนหนึ่งวางแผนเก่ง อีกคนเติมพลังและความยืดหยุ่น',
  },
  social_explorer: {
    type: 'social_explorer',
    title: 'Social Explorer',
    description: 'คุณเปิดกว้าง ชอบพบปะผู้คน และพร้อมเรียนรู้',
    recommendations: [
      'ตรวจ STI สม่ำเสมอ',
      'พก condom ทุกครั้ง',
      'พิจารณา PrEP on-demand',
    ],
    avatarName: 'Glow Connector',
    avatarTagline: 'Confident, connected, and prevention-aware.',
    gradient: 'from-pink-500 via-orange-400 to-purple-500',
    accentColors: ['hsl(330, 81%, 60%)', 'hsl(25, 95%, 53%)', 'hsl(271, 91%, 65%)'],
    datingBehavior: [
      'ชอบพบคนใหม่ ๆ',
      'ยืดหยุ่นและเปิดรับ',
      'เปิดรับ connection ใหม่ ๆ ที่สนุก',
    ],
    partnerPreference: [
      'ชอบคนที่สนุก คุยง่าย และพลังงานดี',
      'เข้ากับคนที่เปิดใจและ respect boundaries',
      'มักเลือกคนที่ทำให้รู้สึกเป็นตัวเองได้',
    ],
    compatibleType: 'smart_planner',
    compatibilityReason: 'คุณเติมกันได้ดี — คนหนึ่งเปิดกว้าง อีกคนเติมความมั่นคงและการวางแผน',
  },
  careful_learner: {
    type: 'careful_learner',
    title: 'Careful Learner',
    description: 'คุณกำลังเริ่มต้นเรียนรู้และใส่ใจการดูแลตัวเองมากขึ้น',
    recommendations: [
      'เริ่มตรวจ HIV อย่างน้อยปีละ 1 ครั้ง',
      'เรียนรู้เรื่อง PrEP',
      'เตรียม condom เมื่อจำเป็น',
    ],
    avatarName: 'Knowledge Bloom',
    avatarTagline: 'Growing your health power, one step at a time.',
    gradient: 'from-emerald-400 via-teal-400 to-violet-400',
    accentColors: ['hsl(160, 84%, 39%)', 'hsl(175, 77%, 26%)', 'hsl(263, 70%, 50%)'],
    datingBehavior: [
      'ค่อย ๆ เปิดใจ',
      'ใช้เวลาศึกษากันก่อน',
      'ให้ความสำคัญกับความสบายใจและความปลอดภัยทางใจ',
    ],
    partnerPreference: [
      'ชอบคนที่ใจเย็น',
      'ชอบคนที่ไม่กดดัน',
      'เข้ากับคนที่ supportive และให้พื้นที่กัน',
    ],
    compatibleType: 'chill_adventurer',
    compatibilityReason: 'คุณเติมกันได้ดี — คนหนึ่งใส่ใจรอบคอบ อีกคนเติมความสบายใจและผ่อนคลาย',
  },
  chill_adventurer: {
    type: 'chill_adventurer',
    title: 'Chill Adventurer',
    description: 'คุณใช้ชีวิตตามสไตล์ของตัวเองและพร้อมดูแลตัวเองให้ดีขึ้น',
    recommendations: [
      'ตรวจสุขภาพสม่ำเสมอ',
      'ใช้ condom เพื่อความปลอดภัย',
      'ปรึกษาเรื่อง PrEP ได้ฟรี',
    ],
    avatarName: 'Safe Vibe Rider',
    avatarTagline: 'Living freely, while staying smart and safe.',
    gradient: 'from-orange-400 via-rose-500 to-fuchsia-500',
    accentColors: ['hsl(25, 95%, 53%)', 'hsl(350, 89%, 60%)', 'hsl(292, 84%, 61%)'],
    datingBehavior: [
      'Spontaneous ตามฟีล',
      'ชอบ connection ที่ไม่ตึงเกินไป',
      'ให้ความสำคัญกับความสนุกและ vibe ที่ดี',
    ],
    partnerPreference: [
      'ชอบคนที่ยืดหยุ่น',
      'เข้ากับคนที่ positive และไม่ judgmental',
      'ชอบคนที่ balance ความสนุกกับความรับผิดชอบได้',
    ],
    compatibleType: 'careful_learner',
    compatibilityReason: 'คุณเติมกันได้ดี — คนหนึ่งสนุกและยืดหยุ่น อีกคนเติมความใส่ใจและความมั่นคง',
  },
};

export const AVATAR_MAP: Record<ResultType, string> = {
  smart_planner: 'prep_hero',
  social_explorer: 'glow_connector',
  careful_learner: 'knowledge_bloom',
  chill_adventurer: 'safe_vibe_rider',
};
