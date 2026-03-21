/* ─── Substance Factsheet Data ─────────────────────────────────
   Structured, multi-substance, multi-language content source.
   Add new substances by appending to SUBSTANCES array.
   ──────────────────────────────────────────────────────────── */

import coverMeth from "@/assets/factsheet/cover-meth.jpg";
import coverKetamine from "@/assets/factsheet/cover-ketamine.jpg";
import coverMdma from "@/assets/factsheet/cover-mdma.jpg";
import coverCannabis from "@/assets/factsheet/cover-cannabis.jpg";
import coverPoppers from "@/assets/factsheet/cover-poppers.jpg";
import coverGhb from "@/assets/factsheet/cover-ghb.jpg";
import coverCocaine from "@/assets/factsheet/cover-cocaine.jpg";

export type RiskLevel = "high" | "medium" | "low";

export interface BilingualText {
  th: string;
  en: string;
}

export interface RiskItem {
  iconName: string;
  th: string;
  en: string;
}

export interface SubstanceImage {
  cover: string;
  alt: string;
}

export interface ScenarioTip {
  scenario: BilingualText;
  tips: BilingualText[];
}

export interface SubstanceContent {
  desc: BilingualText;
  duration: string;
  keyEffect: BilingualText;
  risks: RiskItem[];
  harmReduction: BilingualText[];
  emergencySigns: BilingualText[];
  aftercare: BilingualText[];
  /* ── Enhanced content fields ── */
  saferUse: {
    before: BilingualText[];
    during: BilingualText[];
    after: BilingualText[];
  };
  mixingRisks: {
    substance: BilingualText;
    risk: BilingualText;
    severity: "critical" | "high" | "medium";
  }[];
  mentalCare: BilingualText[];
  scenarios: ScenarioTip[];
}

export interface SubstanceData {
  id: string;
  slug: string;
  icon: string;
  nameTh: string;
  nameEn: string;
  categoryTh: string;
  categoryEn: string;
  riskLevel: RiskLevel;
  image: SubstanceImage;
  content: SubstanceContent;
}

/* ── Risk visual config ──────────────────────────────────────── */

export const RISK_GRADIENTS: Record<RiskLevel, string> = {
  high: "linear-gradient(135deg, hsl(340 60% 45%), hsl(270 50% 40%))",
  medium: "linear-gradient(135deg, hsl(30 80% 50%), hsl(45 90% 55%))",
  low: "linear-gradient(135deg, hsl(150 50% 40%), hsl(170 60% 45%))",
};

export const RISK_LABELS: Record<RiskLevel, BilingualText> = {
  high: { th: "ความเสี่ยงสูง", en: "High Risk" },
  medium: { th: "ความเสี่ยงปานกลาง", en: "Medium Risk" },
  low: { th: "ความเสี่ยงต่ำ", en: "Lower Risk" },
};

/* ── Substances ──────────────────────────────────────────────── */

export const SUBSTANCES: SubstanceData[] = [
  {
    id: "meth",
    slug: "methamphetamine",
    icon: "💎",
    nameTh: "ยาบ้า / ไอซ์",
    nameEn: "Methamphetamine",
    categoryTh: "สารกระตุ้น",
    categoryEn: "Stimulant",
    riskLevel: "high",
    image: { cover: coverMeth, alt: "Crystal geometric shapes dissolving" },
    content: {
      desc: {
        th: "สารกระตุ้นออกฤทธิ์แรงที่เพิ่มพลังงาน ความตื่นตัว และความสุข แต่มีความเสี่ยงสูงต่อสุขภาพ",
        en: "A potent stimulant that boosts energy, alertness, and euphoria, but carries significant health risks.",
      },
      duration: "4–12 hrs",
      keyEffect: { th: "พลังงาน, ความสุข, ตื่นตัว", en: "Energy, euphoria, alertness" },
      risks: [
        { iconName: "Activity", th: "อาจทำให้หัวใจเต้นเร็วและความดันสูง", en: "May cause rapid heart rate and high blood pressure" },
        { iconName: "Brain", th: "อาจทำให้วิตกกังวล หวาดระแวง หรือนอนไม่หลับ", en: "May cause anxiety, paranoia, or insomnia" },
        { iconName: "Flame", th: "ความเสี่ยงภาวะร่างกายร้อนเกินไป (overheating)", en: "Risk of overheating (hyperthermia)" },
        { iconName: "Droplets", th: "อาจทำให้ขาดน้ำอย่างรุนแรง", en: "May cause severe dehydration" },
        { iconName: "Eye", th: "ใช้บ่อยอาจส่งผลต่อจิตใจและความจำ", en: "Frequent use may affect mental health and memory" },
      ],
      harmReduction: [
        { th: "เริ่มจากปริมาณน้อย รอดูผลก่อนเพิ่ม", en: "Start with a small amount, wait before taking more" },
        { th: "ดื่มน้ำสม่ำเสมอ (ไม่เกิน 500ml/ชม.)", en: "Stay hydrated (max 500ml/hour)" },
        { th: "หลีกเลี่ยงการใช้ร่วมกับแอลกอฮอล์หรือสารอื่น", en: "Avoid mixing with alcohol or other substances" },
        { th: "พักเป็นระยะ ลดอุณหภูมิร่างกาย", en: "Take breaks, cool down your body temperature" },
        { th: "ใช้กับคนที่ไว้ใจ ในที่ปลอดภัย", en: "Use with trusted people in a safe space" },
        { th: "วางแผนเวลาพัก ตั้งนาฬิกาเตือน", en: "Plan rest time, set alarms as reminders" },
      ],
      emergencySigns: [
        { th: "เจ็บหน้าอก หายใจลำบาก", en: "Chest pain, difficulty breathing" },
        { th: "ชัก หมดสติ ตัวร้อนมาก", en: "Seizures, loss of consciousness, extreme heat" },
        { th: "เห็นภาพหลอน หวาดกลัวรุนแรง", en: "Hallucinations, extreme fear/paranoia" },
      ],
      aftercare: [
        { th: "พักผ่อนอย่างน้อย 8 ชม.", en: "Rest for at least 8 hours" },
        { th: "กินอาหารที่มีประโยชน์ ดื่มน้ำเยอะ", en: "Eat nutritious food, drink plenty of water" },
        { th: "หลีกเลี่ยงคาเฟอีนและสารกระตุ้น", en: "Avoid caffeine and stimulants" },
        { th: "พูดคุยกับคนที่ไว้ใจ หากรู้สึกไม่ดี", en: "Talk to someone you trust if you feel unwell" },
      ],
      saferUse: {
        before: [
          { th: "กินอาหาร ดื่มน้ำให้เพียงพอก่อนเริ่ม", en: "Eat well and hydrate before starting" },
          { th: "แจ้งเพื่อนที่ไว้ใจว่าจะใช้สาร", en: "Tell a trusted friend about your plan" },
          { th: "ตั้งจำกัดเวลาไว้ล่วงหน้า เช่น ไม่เกิน 6 ชม.", en: "Set a time limit in advance, e.g. no more than 6 hours" },
          { th: "เตรียมอาหาร น้ำ และที่พักไว้ให้พร้อม", en: "Prepare food, water, and a rest space in advance" },
        ],
        during: [
          { th: "จิบน้ำทุก 30 นาที ไม่ต้องรอกระหาย", en: "Sip water every 30 minutes, don't wait until thirsty" },
          { th: "ตั้งนาฬิกาเตือนเพื่อเช็คตัวเองทุก 2 ชม.", en: "Set alarms to check in with yourself every 2 hours" },
          { th: "ถ้ารู้สึกหัวใจเต้นแรง ให้หยุดพักทันที", en: "If your heart is racing, stop and rest immediately" },
          { th: "ไม่ใช้ซ้ำ (redose) ถ้ายังไม่หมดฤทธิ์ครั้งแรก", en: "Don't redose before the first dose wears off" },
        ],
        after: [
          { th: "วันถัดมา: กิน นอน ดื่มน้ำ ไม่ต้องรีบทำอะไร", en: "Next day: eat, sleep, hydrate — don't rush anything" },
          { th: "ระวังอาการ comedown 2–3 วัน อาจรู้สึกซึม", en: "Watch for comedown 2–3 days; you may feel low" },
          { th: "หลีกเลี่ยงการตัดสินใจสำคัญระหว่าง comedown", en: "Avoid making big decisions during comedown" },
          { th: "ถ้าอารมณ์ตกนานกว่า 1 สัปดาห์ ปรึกษาผู้เชี่ยวชาญ", en: "If low mood lasts over a week, seek professional support" },
        ],
      },
      mixingRisks: [
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "เพิ่มภาระหัวใจ ขาดน้ำรุนแรง อาจไม่รู้ตัวว่าเมามาก", en: "Increases heart strain, severe dehydration, masks intoxication level" }, severity: "high" },
        { substance: { th: "GHB / GBL", en: "GHB / GBL" }, risk: { th: "ผลขัดกัน ทำให้ตัดสินปริมาณผิด เสี่ยงหมดสติ", en: "Opposing effects make dosing unpredictable, risk of collapse" }, severity: "critical" },
        { substance: { th: "MDMA / ยาอี", en: "MDMA / Ecstasy" }, risk: { th: "เพิ่มอุณหภูมิร่างกาย หัวใจทำงานหนักมาก", en: "Dramatically increases body temperature and cardiac stress" }, severity: "high" },
        { substance: { th: "Viagra / Cialis", en: "Viagra / Cialis" }, risk: { th: "ความดันโลหิตผิดปกติ เสี่ยงหัวใจวาย", en: "Dangerous blood pressure fluctuations, heart attack risk" }, severity: "high" },
      ],
      mentalCare: [
        { th: "ใช้สารไม่ได้แปลว่าเป็นคนไม่ดี — อย่าตัดสินตัวเอง", en: "Using substances doesn't make you a bad person — don't judge yourself" },
        { th: "ความวิตกหลังใช้เป็นเรื่องปกติ มันจะผ่านไป", en: "Post-use anxiety is normal — it will pass" },
        { th: "ถ้ารู้สึกอยากใช้ซ้ำอย่างควบคุมไม่ได้ ลองพูดคุยกับคนที่เข้าใจ", en: "If cravings feel uncontrollable, try talking to someone who understands" },
        { th: "นอนไม่หลับหลายวัน? ลองฟังเสียงผ่อนคลาย ลดแสงจอ", en: "Can't sleep for days? Try calming sounds, reduce screen brightness" },
        { th: "การหยุดใช้ชั่วคราวก็ถือว่าเป็นก้าวที่ดี", en: "Even taking a break counts as a positive step" },
      ],
      scenarios: [
        {
          scenario: { th: "🎉 ไปปาร์ตี้กับเพื่อน", en: "🎉 Going to a party with friends" },
          tips: [
            { th: "กินข้าวก่อนออก ดื่มน้ำเยอะ", en: "Eat before going out, drink plenty of water" },
            { th: "ตกลงกับเพื่อนเรื่องเวลากลับก่อนเริ่ม", en: "Agree on a return time with friends before starting" },
            { th: "พกน้ำดื่มติดตัว ตั้งนาฬิกาเตือนดื่มน้ำ", en: "Carry water, set reminders to drink" },
            { th: "ถ้ารู้สึกไม่ดี บอกเพื่อนทันที", en: "If you feel unwell, tell your friend immediately" },
          ],
        },
        {
          scenario: { th: "🏠 ใช้คนเดียวที่บ้าน", en: "🏠 Using alone at home" },
          tips: [
            { th: "แจ้งเพื่อนที่ไว้ใจ ให้เช็คอินทุก 2 ชม.", en: "Tell a trusted friend and check in every 2 hours" },
            { th: "เตรียมน้ำ อาหาร ไว้ข้างตัว", en: "Prepare water and food nearby" },
            { th: "ตั้งนาฬิกาเตือนเวลาหยุด", en: "Set an alarm for when to stop" },
            { th: "ห้ามล็อคประตู เผื่อต้องการความช่วยเหลือ", en: "Don't lock doors in case you need help" },
          ],
        },
        {
          scenario: { th: "🆕 ใช้ครั้งแรก", en: "🆕 First time using" },
          tips: [
            { th: "เริ่มจากปริมาณน้อยมากๆ", en: "Start with a very small amount" },
            { th: "อยู่กับคนที่เคยใช้และไว้ใจได้", en: "Be with someone experienced and trustworthy" },
            { th: "รอดูฤทธิ์อย่างน้อย 1 ชม. ก่อนใช้เพิ่ม", en: "Wait at least 1 hour to feel effects before taking more" },
            { th: "ไม่ต้องกดดันตัวเองให้ใช้เท่าคนอื่น", en: "Don't pressure yourself to match others' doses" },
          ],
        },
      ],
    },
  },
  {
    id: "ketamine",
    slug: "ketamine",
    icon: "🫧",
    nameTh: "เคตามีน",
    nameEn: "Ketamine",
    categoryTh: "สารหลอนประสาทแยกตัว",
    categoryEn: "Dissociative",
    riskLevel: "high",
    image: { cover: coverKetamine, alt: "Flowing liquid forms in ocean blue" },
    content: {
      desc: {
        th: "สารที่ทำให้เกิดภาวะแยกตัวจากร่างกาย ใช้ทางการแพทย์เป็นยาสลบ แต่ใช้เพื่อความบันเทิงมีความเสี่ยง",
        en: "A dissociative anesthetic that causes out-of-body feelings. Medically used but carries risks recreationally.",
      },
      duration: "1–3 hrs",
      keyEffect: { th: "ผ่อนคลาย, แยกตัว, เคลิ้ม", en: "Relaxation, dissociation, euphoria" },
      risks: [
        { iconName: "Brain", th: "อาจทำให้สับสน เคลื่อนไหวลำบาก (K-hole)", en: "May cause confusion, immobility (K-hole)" },
        { iconName: "Droplets", th: "อาจทำให้คลื่นไส้ อาเจียน", en: "May cause nausea and vomiting" },
        { iconName: "Activity", th: "ใช้บ่อยอาจทำลายกระเพาะปัสสาวะ", en: "Frequent use can damage the bladder" },
        { iconName: "Eye", th: "ลดการรับรู้ความเจ็บปวด เพิ่มความเสี่ยงบาดเจ็บ", en: "Reduces pain awareness, increases injury risk" },
      ],
      harmReduction: [
        { th: "เริ่มจากปริมาณน้อยมาก", en: "Start with a very small dose" },
        { th: "ห้ามใช้ร่วมกับแอลกอฮอล์หรือยากดประสาทอื่น", en: "Never mix with alcohol or other depressants" },
        { th: "ใช้ในท่านั่งหรือนอน ป้องกันล้ม", en: "Use while sitting or lying to prevent falls" },
        { th: "มีคนที่ไว้ใจอยู่ด้วยเสมอ", en: "Always have a trusted person nearby" },
        { th: "เว้นระยะระหว่างการใช้แต่ละครั้ง", en: "Space out sessions to protect bladder health" },
      ],
      emergencySigns: [
        { th: "หายใจไม่ออก หายใจช้ามาก", en: "Difficulty breathing, very slow breathing" },
        { th: "หมดสติ ไม่ตอบสนอง", en: "Unconscious, unresponsive" },
        { th: "อาเจียนในท่านอนหงาย", en: "Vomiting while lying on back" },
      ],
      aftercare: [
        { th: "ดื่มน้ำ พักผ่อนในที่เงียบ", en: "Drink water, rest in a quiet space" },
        { th: "กินอาหารเบาๆ เมื่อรู้สึกดีขึ้น", en: "Eat light food when you feel better" },
        { th: "หากปัสสาวะเจ็บ พบแพทย์ทันที", en: "If urination is painful, see a doctor immediately" },
      ],
      saferUse: {
        before: [
          { th: "อย่ากินอาหารหนักก่อนใช้ เพื่อลดคลื่นไส้", en: "Avoid heavy meals before use to reduce nausea" },
          { th: "เตรียมพื้นที่นั่ง/นอนที่ปลอดภัย", en: "Prepare a safe sitting/lying space" },
          { th: "มีคนที่ไว้ใจอยู่ด้วยเสมอ", en: "Make sure a trusted person is with you" },
        ],
        during: [
          { th: "นั่งหรือนอนเสมอ — ห้ามเดินขณะออกฤทธิ์", en: "Stay seated or lying down — don't walk while under effects" },
          { th: "ถ้ารู้สึก K-hole ให้อยู่นิ่งๆ มันจะผ่านไป", en: "If you feel a K-hole coming, stay still — it will pass" },
          { th: "ห้ามใช้ในอ่างน้ำ สระว่ายน้ำ หรือใกล้น้ำ", en: "Never use in bathtubs, pools, or near water" },
        ],
        after: [
          { th: "ดื่มน้ำอุ่น พักในที่เงียบ", en: "Drink warm water, rest in a quiet place" },
          { th: "เว้นการใช้อย่างน้อย 2 สัปดาห์เพื่อปกป้องกระเพาะปัสสาวะ", en: "Wait at least 2 weeks between uses to protect your bladder" },
          { th: "ปัสสาวะเจ็บ? พบแพทย์ทันที — อย่ารอ", en: "Painful urination? See a doctor now — don't wait" },
        ],
      },
      mixingRisks: [
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "ทั้งคู่กดระบบหายใจ เสี่ยงหมดสติและหยุดหายใจ", en: "Both depress breathing — risk of collapse and respiratory arrest" }, severity: "critical" },
        { substance: { th: "GHB / GBL", en: "GHB / GBL" }, risk: { th: "กดการหายใจสองเท่า เสี่ยงตายสูงมาก", en: "Double respiratory depression — extremely high death risk" }, severity: "critical" },
        { substance: { th: "ยาบ้า / ไอซ์", en: "Methamphetamine" }, risk: { th: "ผลขัดกัน หัวใจทำงานหนัก อาจทำให้ตัดสินปริมาณผิด", en: "Opposing effects strain the heart, makes dosing unpredictable" }, severity: "high" },
      ],
      mentalCare: [
        { th: "K-hole อาจรู้สึกน่ากลัว แต่ไม่เป็นอันตรายถาวร", en: "K-holes can feel scary, but they are not permanently harmful" },
        { th: "ถ้ารู้สึก 'หลุด' จากโลกจริงนานเกินไป ลองพูดคุยกับคนที่เข้าใจ", en: "If you feel 'detached' from reality for too long, talk to someone who understands" },
        { th: "การใช้บ่อยอาจทำให้ความจำและอารมณ์เปลี่ยนไป", en: "Frequent use can affect memory and emotional stability" },
        { th: "คุณไม่ต้องรับมือคนเดียว — มีคนพร้อมช่วยเสมอ", en: "You don't have to deal with this alone — support is available" },
      ],
      scenarios: [
        {
          scenario: { th: "🎶 ใช้ที่งานปาร์ตี้ / คลับ", en: "🎶 Using at a party or club" },
          tips: [
            { th: "หาที่นั่งก่อนใช้ ห้ามยืนหรือเดิน", en: "Find a seat before using — don't stand or walk" },
            { th: "บอกเพื่อนว่าใช้อะไร เผื่อต้องการช่วย", en: "Tell a friend what you're taking in case you need help" },
            { th: "ห้ามขับรถกลับเด็ดขาด", en: "Absolutely do not drive home" },
          ],
        },
        {
          scenario: { th: "🏠 ใช้คนเดียวที่บ้าน", en: "🏠 Using alone at home" },
          tips: [
            { th: "แจ้งเพื่อนทางข้อความ ให้เช็คอินทุก 1 ชม.", en: "Text a friend and have them check on you hourly" },
            { th: "นั่ง/นอนตะแคง ห้ามนอนหงาย", en: "Sit or lie on your side — never on your back" },
            { th: "เตรียมน้ำไว้ข้างตัว", en: "Keep water within reach" },
          ],
        },
      ],
    },
  },
  {
    id: "mdma",
    slug: "mdma",
    icon: "🌈",
    nameTh: "ยาอี / MDMA",
    nameEn: "Ecstasy / MDMA",
    categoryTh: "สารกระตุ้น-หลอนประสาท",
    categoryEn: "Stimulant-Psychedelic",
    riskLevel: "medium",
    image: { cover: coverMdma, alt: "Colorful light waves flowing" },
    content: {
      desc: {
        th: "สารที่เพิ่มความรู้สึกใกล้ชิด ความสุข และพลังงาน แต่มีผลกระทบต่ออุณหภูมิร่างกายและสมดุลน้ำ",
        en: "A substance that increases closeness, euphoria, and energy, but affects body temperature and hydration.",
      },
      duration: "3–6 hrs",
      keyEffect: { th: "ความสุข, ความใกล้ชิด, พลังงาน", en: "Euphoria, closeness, energy" },
      risks: [
        { iconName: "Flame", th: "ภาวะร่างกายร้อนเกินไป (overheating)", en: "Overheating (hyperthermia)" },
        { iconName: "Droplets", th: "ขาดน้ำหรือดื่มน้ำมากเกินไป", en: "Dehydration or water intoxication" },
        { iconName: "Brain", th: "อาจทำให้กังวลหรือซึมเศร้าหลังใช้", en: "May cause anxiety or depression after use" },
        { iconName: "Activity", th: "หัวใจเต้นเร็ว ความดันสูง", en: "Rapid heart rate, high blood pressure" },
        { iconName: "Eye", th: "กรามเกร็ง ตาเบิกกว้าง", en: "Jaw clenching, dilated pupils" },
      ],
      harmReduction: [
        { th: "เริ่มจากครึ่งเม็ดหรือน้อยกว่า", en: "Start with half a pill or less" },
        { th: "ดื่มน้ำ 250ml ทุก 1 ชม. (ไม่ดื่มเยอะเกินไป)", en: "Sip 250ml water per hour (don't overdrink)" },
        { th: "พักจากการเต้น ลดอุณหภูมิร่างกาย", en: "Take breaks from dancing, cool down" },
        { th: "ห้ามใช้ร่วมกับ SSRI หรือยาต้านซึมเศร้า", en: "Do not mix with SSRIs or antidepressants" },
        { th: "เว้นอย่างน้อย 3 เดือนระหว่างการใช้", en: "Wait at least 3 months between uses" },
      ],
      emergencySigns: [
        { th: "ตัวร้อนมากผิดปกติ เหงื่อออกมาก", en: "Extremely hot, excessive sweating" },
        { th: "ชัก หมดสติ", en: "Seizures, loss of consciousness" },
        { th: "สับสนรุนแรง พูดไม่รู้เรื่อง", en: "Severe confusion, incoherent speech" },
      ],
      aftercare: [
        { th: "พักผ่อน 2-3 วัน หลังใช้", en: "Rest for 2-3 days after use" },
        { th: "กินอาหารที่มี 5-HTP, วิตามิน C", en: "Eat foods rich in 5-HTP, Vitamin C" },
        { th: "หลีกเลี่ยงแอลกอฮอล์และคาเฟอีน", en: "Avoid alcohol and caffeine" },
        { th: "ระวังอาการซึมเศร้าหลังใช้ (comedown)", en: "Be aware of post-use depression (comedown)" },
      ],
      saferUse: {
        before: [
          { th: "กินอาหารเบาๆ 2 ชม. ก่อนใช้", en: "Eat a light meal 2 hours before" },
          { th: "เตรียมหมากฝรั่ง / อมยิ้ม สำหรับกรามเกร็ง", en: "Prepare gum or lollipops for jaw clenching" },
          { th: "ตรวจสอบยาด้วย drug checking service ถ้าทำได้", en: "Test your pills with a drug checking service if possible" },
          { th: "ถ้าใช้ยาต้านซึมเศร้า (SSRI) ห้ามใช้ MDMA เด็ดขาด", en: "If you take SSRIs, absolutely do not use MDMA" },
        ],
        during: [
          { th: "ดื่มน้ำทีละนิด — ไม่ดื่มทีละมากๆ", en: "Sip water slowly — don't gulp large amounts" },
          { th: "ออกจากที่ร้อนมาพักเป็นระยะ", en: "Step away from hot areas regularly to cool down" },
          { th: "ไม่ redose ภายใน 2 ชม. แรก", en: "Don't redose within the first 2 hours" },
          { th: "ถ้ารู้สึกร้อนมาก ราดน้ำเย็นที่ข้อมือ/คอ", en: "If overheating, apply cold water to wrists and neck" },
        ],
        after: [
          { th: "'Suicide Tuesday' เป็นเรื่องปกติ — อารมณ์ตกหลังใช้ 2-3 วัน", en: "'Suicide Tuesday' is common — mood dips 2-3 days after" },
          { th: "กินอาหารที่มี tryptophan เช่น กล้วย ถั่ว", en: "Eat tryptophan-rich foods like bananas and nuts" },
          { th: "ไม่ใช้ MDMA ซ้ำเพื่อแก้อาการ comedown", en: "Don't use more MDMA to fix the comedown" },
          { th: "เว้น 3 เดือน เพื่อให้สมองฟื้นตัวเต็มที่", en: "Wait 3 months for full brain recovery" },
        ],
      },
      mixingRisks: [
        { substance: { th: "SSRI / ยาต้านซึมเศร้า", en: "SSRIs / Antidepressants" }, risk: { th: "เสี่ยง Serotonin Syndrome — อาจถึงตาย", en: "Risk of Serotonin Syndrome — potentially fatal" }, severity: "critical" },
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "ขาดน้ำรุนแรง เพิ่มอุณหภูมิร่างกาย", en: "Severe dehydration, increases body temperature" }, severity: "high" },
        { substance: { th: "ยาบ้า / ไอซ์", en: "Methamphetamine" }, risk: { th: "หัวใจทำงานหนักเกินไป เพิ่มอุณหภูมิร่างกาย", en: "Extreme cardiac stress, increased body temperature" }, severity: "high" },
      ],
      mentalCare: [
        { th: "อาการ comedown ไม่ใช่ตัวตนจริงของคุณ — มันเป็นเคมีในสมอง", en: "The comedown isn't 'the real you' — it's brain chemistry adjusting" },
        { th: "ถ้ารู้สึกซึมเศร้ามากหลังใช้ ให้พูดกับคนที่ไว้ใจ", en: "If you feel very depressed after use, talk to someone you trust" },
        { th: "การใช้ MDMA บ่อยเกินไปจะทำให้ 'ไม่สนุก' เท่าเดิม", en: "Using MDMA too often reduces its positive effects over time" },
        { th: "อย่าใช้ MDMA เพื่อหนีปัญหาจิตใจ — มันจะแย่ลง", en: "Don't use MDMA to escape mental health issues — it makes them worse" },
      ],
      scenarios: [
        {
          scenario: { th: "🎉 ใช้ที่งานเทศกาล", en: "🎉 Using at a festival" },
          tips: [
            { th: "ตรวจยาที่ drug checking booth ถ้ามี", en: "Test your substances at a drug checking booth if available" },
            { th: "พกขวดน้ำติดตัวตลอดเวลา", en: "Carry a water bottle at all times" },
            { th: "นัดจุดเจอเพื่อนกรณีโทรศัพท์ไม่ได้", en: "Set a meeting point with friends in case phones die" },
            { th: "หาจุดพักที่ร่ม/เย็นไว้ล่วงหน้า", en: "Know where the shaded/cool rest areas are" },
          ],
        },
        {
          scenario: { th: "💑 ใช้กับคู่รัก", en: "💑 Using with a partner" },
          tips: [
            { th: "ตกลงเรื่อง consent ล่วงหน้า ก่อนใช้สาร", en: "Discuss consent boundaries before taking anything" },
            { th: "ดูแลกันเรื่องน้ำ อุณหภูมิ และการพัก", en: "Look after each other's hydration, temperature, and rest" },
            { th: "จำไว้ว่า MDMA ทำให้รู้สึกใกล้ชิดมากขึ้น — ตรวจสอบอารมณ์อีกทีหลังหมดฤทธิ์", en: "Remember MDMA amplifies closeness — revisit feelings when sober" },
          ],
        },
      ],
    },
  },
  {
    id: "cannabis",
    slug: "cannabis",
    icon: "🌿",
    nameTh: "กัญชา",
    nameEn: "Cannabis",
    categoryTh: "สารกดประสาท-หลอนประสาท",
    categoryEn: "Depressant-Psychedelic",
    riskLevel: "low",
    image: { cover: coverCannabis, alt: "Soft green botanical leaves" },
    content: {
      desc: {
        th: "พืชที่มีสาร THC และ CBD ใช้เพื่อผ่อนคลาย แต่อาจส่งผลต่อจิตใจและการทำงานของสมอง",
        en: "A plant containing THC and CBD used for relaxation, but may affect mental health and cognitive function.",
      },
      duration: "2–6 hrs",
      keyEffect: { th: "ผ่อนคลาย, หิวข้าว, เคลิ้ม", en: "Relaxation, hunger, mellowness" },
      risks: [
        { iconName: "Brain", th: "อาจทำให้วิตกกังวลหรือหวาดระแวงในบางคน", en: "May cause anxiety or paranoia in some people" },
        { iconName: "Activity", th: "ลดปฏิกิริยาตอบสนอง ห้ามขับรถ", en: "Slows reaction time, do not drive" },
        { iconName: "Eye", th: "ใช้มากอาจส่งผลต่อความจำระยะสั้น", en: "Heavy use may affect short-term memory" },
        { iconName: "Flame", th: "การสูบอาจระคายเคืองปอด", en: "Smoking may irritate the lungs" },
      ],
      harmReduction: [
        { th: "เริ่มจากปริมาณน้อย โดยเฉพาะ edibles", en: "Start low, especially with edibles" },
        { th: "ใช้ในที่ปลอดภัย คุ้นเคย", en: "Use in a safe, familiar environment" },
        { th: "หลีกเลี่ยงการใช้ทุกวัน", en: "Avoid daily use" },
        { th: "เลือก vaporize แทนการสูบเพื่อลดอันตรายปอด", en: "Choose vaporizing over smoking for lung health" },
        { th: "ระวังปฏิกิริยากับยาอื่นๆ", en: "Be cautious of interactions with other medications" },
      ],
      emergencySigns: [
        { th: "วิตกกังวลรุนแรง panic attack", en: "Severe anxiety, panic attack" },
        { th: "หัวใจเต้นเร็วมาก เจ็บหน้าอก", en: "Very rapid heartbeat, chest pain" },
        { th: "อาเจียนไม่หยุด (CHS)", en: "Uncontrollable vomiting (CHS)" },
      ],
      aftercare: [
        { th: "ดื่มน้ำ กินอาหารเบาๆ", en: "Drink water, eat light food" },
        { th: "พักผ่อนในที่เงียบ", en: "Rest in a quiet place" },
        { th: "หากรู้สึกไม่ดีต่อเนื่อง ปรึกษาแพทย์", en: "If feeling persistently unwell, consult a doctor" },
      ],
      saferUse: {
        before: [
          { th: "รู้ว่า edibles ใช้เวลาออกฤทธิ์นาน 1–2 ชม.", en: "Know that edibles take 1–2 hours to kick in" },
          { th: "อย่าใช้ตอนอารมณ์ไม่ดี — กัญชาอาจทำให้แย่ลง", en: "Don't use when you're already in a bad mood — cannabis can amplify it" },
          { th: "ถ้ามีประวัติโรคจิตในครอบครัว ควรหลีกเลี่ยง THC สูง", en: "If there's a family history of psychosis, avoid high-THC strains" },
        ],
        during: [
          { th: "สูบนิดเดียวก่อน รอ 10 นาทีดูผล", en: "Take one puff and wait 10 minutes to feel the effect" },
          { th: "อยู่กับคนที่ไว้ใจ", en: "Stay with people you trust" },
          { th: "ถ้าวิตก ให้หายใจลึกๆ ดมพริกไทยดำ (ช่วยได้จริง)", en: "If anxious, breathe deeply and sniff black pepper (it actually helps)" },
        ],
        after: [
          { th: "ดื่มน้ำ กินของว่าง ผ่อนคลาย", en: "Drink water, snack, and relax" },
          { th: "อย่าขับรถอย่างน้อย 6 ชม. หลังใช้", en: "Don't drive for at least 6 hours after use" },
          { th: "ถ้ารู้สึก 'greening out' ให้นอนตะแคง กินน้ำตาล", en: "If 'greening out,' lie on your side and eat something sweet" },
        ],
      },
      mixingRisks: [
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "ทำให้เมามากขึ้น คลื่นไส้ อาเจียน ('cross-faded')", en: "Intensifies intoxication, nausea, vomiting ('cross-faded')" }, severity: "medium" },
        { substance: { th: "ยาบ้า / ไอซ์", en: "Methamphetamine" }, risk: { th: "ผลขัดกัน เพิ่มความวิตก หัวใจเต้นผิดจังหวะ", en: "Opposing effects increase anxiety and heart irregularities" }, severity: "medium" },
      ],
      mentalCare: [
        { th: "Panic attack จากกัญชาน่ากลัวแต่ไม่อันตราย — มันจะผ่านไป", en: "Cannabis panic attacks are scary but not dangerous — they will pass" },
        { th: "ถ้าใช้ทุกวันเพื่อรับมืออารมณ์ ลองหาวิธีอื่นเสริม", en: "If you use daily to cope, consider adding other coping strategies" },
        { th: "กัญชาอาจทำให้เรา 'สบาย' จนไม่อยากทำอะไร — สังเกตตัวเอง", en: "Cannabis can make you 'too comfortable' to act — watch for that pattern" },
      ],
      scenarios: [
        {
          scenario: { th: "🍪 กินเป็น edible ครั้งแรก", en: "🍪 Trying edibles for the first time" },
          tips: [
            { th: "เริ่มจาก 5mg หรือน้อยกว่า", en: "Start with 5mg or less" },
            { th: "รออย่างน้อย 2 ชม. ก่อนกินเพิ่ม", en: "Wait at least 2 hours before eating more" },
            { th: "กินตอนอยู่บ้าน ไม่มีแผนไปไหน", en: "Try at home when you have no plans to go out" },
          ],
        },
      ],
    },
  },
  {
    id: "poppers",
    slug: "poppers",
    icon: "💨",
    nameTh: "ป๊อปเปอร์ส",
    nameEn: "Poppers",
    categoryTh: "สารสูดดม",
    categoryEn: "Inhalant",
    riskLevel: "medium",
    image: { cover: coverPoppers, alt: "Amber and rose vapor wisps" },
    content: {
      desc: {
        th: "สารเคมีที่สูดดมเพื่อผ่อนคลายกล้ามเนื้อและเพิ่มความรู้สึก ออกฤทธิ์สั้น แต่มีความเสี่ยง",
        en: "A chemical inhaled for muscle relaxation and enhanced sensation. Short-acting but carries risks.",
      },
      duration: "1–5 min",
      keyEffect: { th: "ร้อนวูบวาบ, ผ่อนคลาย, เวียนศีรษะ", en: "Head rush, relaxation, dizziness" },
      risks: [
        { iconName: "Activity", th: "ทำให้ความดันโลหิตลดลงอย่างรวดเร็ว", en: "Causes rapid drop in blood pressure" },
        { iconName: "Eye", th: "อาจทำให้ปวดหัวรุนแรง", en: "May cause severe headaches" },
        { iconName: "Flame", th: "ไวไฟมาก ห้ามใช้ใกล้ไฟ", en: "Highly flammable, keep away from flames" },
        { iconName: "Brain", th: "ห้ามใช้ร่วมกับ Viagra/Cialis อันตรายถึงชีวิต", en: "NEVER mix with Viagra/Cialis — life-threatening" },
      ],
      harmReduction: [
        { th: "ห้ามกลืน ใช้สูดดมเท่านั้น", en: "Never swallow, inhale only" },
        { th: "ห้ามใช้ร่วมกับยาแก้อาการหย่อนสมรรถภาพ", en: "Never combine with erectile dysfunction drugs" },
        { th: "ใช้ในที่อากาศถ่ายเท", en: "Use in a well-ventilated area" },
        { th: "หลีกเลี่ยงการสัมผัสผิวหนังโดยตรง", en: "Avoid direct skin contact" },
        { th: "อย่าใช้ต่อเนื่องหลายครั้งรวดเร็ว", en: "Don't use multiple times in quick succession" },
      ],
      emergencySigns: [
        { th: "หน้ามืด หมดสติ", en: "Fainting, loss of consciousness" },
        { th: "ริมฝีปากเขียว หายใจลำบาก", en: "Blue lips, difficulty breathing" },
        { th: "เจ็บหน้าอกรุนแรง (โดยเฉพาะถ้าใช้กับ Viagra)", en: "Severe chest pain (especially if mixed with Viagra)" },
      ],
      aftercare: [
        { th: "นั่งพัก หายใจลึกๆ", en: "Sit down, breathe deeply" },
        { th: "ดื่มน้ำ", en: "Drink water" },
        { th: "หากปวดหัวรุนแรง หยุดใช้ทันที", en: "If severe headache persists, stop immediately" },
      ],
      saferUse: {
        before: [
          { th: "ตรวจสอบยาอื่นที่คุณใช้ — ห้ามใช้กับ Viagra/Cialis", en: "Check other medications — never use with Viagra/Cialis" },
          { th: "ใช้ในห้องที่อากาศถ่ายเท", en: "Ensure good ventilation in the room" },
        ],
        during: [
          { th: "สูดดมสั้นๆ อย่าสูดลึก", en: "Take short sniffs, don't inhale deeply" },
          { th: "ระวังอย่าให้ของเหลวสัมผัสผิวหนัง จมูก หรือปาก", en: "Avoid liquid contact with skin, nose, or mouth" },
          { th: "ถ้าเวียนศีรษะมาก ให้หยุดทันที", en: "If very dizzy, stop immediately" },
        ],
        after: [
          { th: "นั่งพักจนหายเวียนศีรษะ", en: "Sit and rest until dizziness passes" },
          { th: "ถ้าปวดหัว ดื่มน้ำ พักผ่อน", en: "If headache occurs, drink water and rest" },
        ],
      },
      mixingRisks: [
        { substance: { th: "Viagra / Cialis", en: "Viagra / Cialis" }, risk: { th: "ทั้งคู่ลดความดันโลหิต — อาจเสียชีวิตได้", en: "Both drop blood pressure — can be fatal" }, severity: "critical" },
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "เพิ่มเวียนศีรษะ ลดความดัน เสี่ยงหมดสติ", en: "Increased dizziness, lowered blood pressure, risk of fainting" }, severity: "high" },
      ],
      mentalCare: [
        { th: "Poppers ออกฤทธิ์สั้น ผลกระทบจิตใจมักไม่ยาวนาน", en: "Poppers are short-acting — mental effects are usually brief" },
        { th: "ถ้ารู้สึกต้องใช้ทุกครั้งที่มีเพศสัมพันธ์ ลองพูดคุยเรื่องนี้กับคนที่เข้าใจ", en: "If you feel you need them every time for sex, consider talking to someone about it" },
      ],
      scenarios: [
        {
          scenario: { th: "💑 ใช้ระหว่างมีเพศสัมพันธ์", en: "💑 Using during sex" },
          tips: [
            { th: "ตรวจสอบว่าไม่ได้ใช้ ED drugs (Viagra/Cialis)", en: "Confirm you haven't taken ED drugs (Viagra/Cialis)" },
            { th: "วางขวดในที่มั่นคง ป้องกันหกใส่ผิว", en: "Place the bottle on a stable surface to prevent spills" },
            { th: "อย่าใช้ติดกันหลายครั้ง เว้นอย่างน้อย 5 นาที", en: "Don't use repeatedly — wait at least 5 minutes between" },
          ],
        },
      ],
    },
  },
  {
    id: "ghb",
    slug: "ghb-gbl",
    icon: "💧",
    nameTh: "GHB / GBL",
    nameEn: "GHB / GBL",
    categoryTh: "สารกดประสาท",
    categoryEn: "Depressant",
    riskLevel: "high",
    image: { cover: coverGhb, alt: "Clear droplets on deep blue surface" },
    content: {
      desc: {
        th: "สารกดประสาทที่มีช่วงปริมาณปลอดภัยแคบมาก ใช้มากเกินนิดเดียวอาจหมดสติ",
        en: "A depressant with a very narrow safe dosage range. Slightly too much can cause unconsciousness.",
      },
      duration: "1.5–4 hrs",
      keyEffect: { th: "ผ่อนคลาย, สุขสบาย, มึนเมา", en: "Relaxation, well-being, intoxication" },
      risks: [
        { iconName: "Brain", th: "ปริมาณเกินนิดเดียวอาจทำให้หมดสติ", en: "Slightly too much can cause unconsciousness" },
        { iconName: "Activity", th: "กดการหายใจ อันตรายถึงชีวิต", en: "Respiratory depression, potentially fatal" },
        { iconName: "Droplets", th: "ห้ามใช้ร่วมกับแอลกอฮอล์อย่างเด็ดขาด", en: "NEVER mix with alcohol" },
        { iconName: "Eye", th: "อาจทำให้ความจำเสีย (date rape drug)", en: "May cause memory loss (date rape drug)" },
      ],
      harmReduction: [
        { th: "วัดปริมาณอย่างแม่นยำด้วยกระบอกฉีดยา", en: "Measure doses precisely with a syringe" },
        { th: "ห้ามใช้ร่วมกับแอลกอฮอล์หรือสารกดประสาทอื่น", en: "Never mix with alcohol or other depressants" },
        { th: "จับเวลา เว้นอย่างน้อย 2 ชม. ระหว่างโดส", en: "Time doses, wait at least 2 hours between" },
        { th: "มีคนที่รู้วิธีช่วยเหลืออยู่ด้วยเสมอ", en: "Always have someone who knows how to help present" },
        { th: "ติดฉลากขวดชัดเจน ป้องกันดื่มผิด", en: "Label bottles clearly to prevent accidental use" },
      ],
      emergencySigns: [
        { th: "หมดสติ ปลุกไม่ตื่น", en: "Unconscious, cannot be woken" },
        { th: "หายใจผิดปกติ ช้ามาก หรือหยุดหายใจ", en: "Abnormal breathing, very slow or stopped" },
        { th: "อาเจียนขณะหมดสติ", en: "Vomiting while unconscious" },
      ],
      aftercare: [
        { th: "จัดท่าตะแคง (recovery position) ถ้าหมดสติ", en: "Place in recovery position if unconscious" },
        { th: "ไม่ปล่อยให้อยู่คนเดียวหลังใช้", en: "Never leave someone alone after use" },
        { th: "ดื่มน้ำ พักผ่อน", en: "Drink water, rest" },
      ],
      saferUse: {
        before: [
          { th: "วัดปริมาณด้วยกระบอกฉีดยา (syringe) เท่านั้น — ห้ามกะด้วยสายตา", en: "Measure ONLY with a syringe — never eyeball doses" },
          { th: "ห้ามดื่มแอลกอฮอล์ก่อน ระหว่าง หรือหลังใช้", en: "No alcohol before, during, or after use" },
          { th: "บอกเพื่อนว่าจะใช้อะไร ปริมาณเท่าไหร่ เวลาเท่าไหร่", en: "Tell a friend what you're taking, how much, and when" },
          { th: "ติดฉลากขวดเขียนว่า 'GHB — ห้ามดื่ม'", en: "Label bottles clearly: 'GHB — Do Not Drink'" },
        ],
        during: [
          { th: "ตั้งนาฬิกาเตือนทุก 2 ชม. — ห้าม redose ก่อน", en: "Set a 2-hour timer — never redose before it rings" },
          { th: "ถ้าเริ่มง่วง ห้ามใช้เพิ่ม", en: "If feeling sleepy, do NOT take more" },
          { th: "ถ้าเพื่อนหมดสติ จัดท่าตะแคง โทร 1669 ทันที", en: "If a friend passes out, put in recovery position and call 1669" },
        ],
        after: [
          { th: "พักผ่อนเต็มที่ ดื่มน้ำ กินอาหาร", en: "Rest fully, drink water, eat food" },
          { th: "อย่าใช้ GHB ทุกวัน — การถอนอาจอันตรายถึงชีวิต", en: "Don't use GHB daily — withdrawal can be life-threatening" },
          { th: "ถ้าหยุดใช้แล้วมีอาการสั่น เหงื่อออก ชัก — ไปโรงพยาบาลทันที", en: "If you stop and experience tremors, sweating, seizures — go to hospital immediately" },
        ],
      },
      mixingRisks: [
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "อันตรายถึงชีวิต — กดการหายใจ หมดสติ ตาย", en: "LETHAL — respiratory depression, coma, death" }, severity: "critical" },
        { substance: { th: "เคตามีน", en: "Ketamine" }, risk: { th: "กดการหายใจสองเท่า เสี่ยงตายสูง", en: "Double respiratory depression — very high death risk" }, severity: "critical" },
        { substance: { th: "ยานอนหลับ / Benzo", en: "Sleeping pills / Benzos" }, risk: { th: "ทั้งคู่กดประสาท — เสี่ยงหยุดหายใจ", en: "Both are depressants — risk of respiratory arrest" }, severity: "critical" },
      ],
      mentalCare: [
        { th: "GHB ถอนยาได้อันตราย — ถ้าใช้ประจำ ห้ามหยุดเอง", en: "GHB withdrawal is dangerous — if using regularly, don't stop alone" },
        { th: "ถ้ารู้สึกต้องใช้ทุกวัน นั่นคือสัญญาณที่ต้องขอความช่วยเหลือ", en: "If you feel you need it daily, that's a sign to seek help" },
        { th: "การใช้ GHB ไม่ได้ทำให้เป็นคนไม่ดี — แต่ต้องรู้จักดูแลตัวเอง", en: "Using GHB doesn't make you a bad person — but learn to take care of yourself" },
      ],
      scenarios: [
        {
          scenario: { th: "🎉 ใช้ที่งานปาร์ตี้", en: "🎉 Using at a party" },
          tips: [
            { th: "วัดปริมาณของตัวเอง ห้ามรับจากคนอื่นที่ไม่รู้ปริมาณ", en: "Measure your own dose — don't accept from strangers" },
            { th: "ห้ามดื่มแอลกอฮอล์เลยแม้แต่นิดเดียว", en: "Do not drink ANY alcohol — not even a sip" },
            { th: "มีคนที่ไม่ใช้สารอยู่ด้วยเสมอ (buddy system)", en: "Always have a sober buddy present" },
            { th: "ถ้าเริ่มง่วง บอกเพื่อนทันที ห้าม redose", en: "If getting sleepy, tell a friend immediately — never redose" },
          ],
        },
        {
          scenario: { th: "🏠 ใช้คนเดียว (ไม่แนะนำ)", en: "🏠 Using alone (NOT recommended)" },
          tips: [
            { th: "⚠️ ไม่แนะนำอย่างยิ่ง — GHB ต้องมีคนอยู่ด้วยเสมอ", en: "⚠️ Strongly NOT recommended — always have someone present for GHB" },
            { th: "ถ้าจำเป็น: แจ้งเพื่อนทางข้อความ ให้โทรเช็คทุก 1 ชม.", en: "If you must: text a friend and have them call every hour" },
            { th: "นอนตะแคง ปลดล็อคประตู", en: "Lie on your side, unlock your door" },
          ],
        },
      ],
    },
  },
  {
    id: "cocaine",
    slug: "cocaine",
    icon: "❄️",
    nameTh: "โคเคน",
    nameEn: "Cocaine",
    categoryTh: "สารกระตุ้น",
    categoryEn: "Stimulant",
    riskLevel: "high",
    image: { cover: coverCocaine, alt: "Crystalline particles in cold light" },
    content: {
      desc: {
        th: "สารกระตุ้นที่ออกฤทธิ์เร็วและสั้น ทำให้รู้สึกมั่นใจและมีพลัง แต่เสพติดได้ง่ายและมีผลต่อหัวใจ",
        en: "A fast-acting, short-duration stimulant that produces confidence and energy, but is highly addictive and affects the heart.",
      },
      duration: "30–90 min",
      keyEffect: { th: "ตื่นตัว, มั่นใจ, พลังงาน", en: "Alertness, confidence, energy" },
      risks: [
        { iconName: "Activity", th: "เพิ่มความเสี่ยงหัวใจวายและหลอดเลือดสมอง", en: "Increases risk of heart attack and stroke" },
        { iconName: "Brain", th: "เสพติดได้เร็ว อยากใช้ซ้ำบ่อย", en: "Highly addictive, frequent redosing urge" },
        { iconName: "Flame", th: "สูดดมอาจทำลายเยื่อบุจมูก", en: "Snorting can damage nasal passages" },
        { iconName: "Eye", th: "อาจทำให้วิตกกังวลและหวาดระแวง", en: "May cause anxiety and paranoia" },
      ],
      harmReduction: [
        { th: "เริ่มจากปริมาณน้อย", en: "Start with a small amount" },
        { th: "สลับรูจมูก ล้างจมูกด้วยน้ำเกลือ", en: "Alternate nostrils, rinse with saline" },
        { th: "ห้ามใช้ร่วมกับแอลกอฮอล์ (สร้าง cocaethylene)", en: "Avoid mixing with alcohol (creates cocaethylene)" },
        { th: "ตั้งจำกัดเวลาและปริมาณก่อนเริ่ม", en: "Set time and amount limits before starting" },
        { th: "ใช้หลอดสูดของตัวเอง ไม่แชร์", en: "Use your own straw, never share" },
      ],
      emergencySigns: [
        { th: "เจ็บหน้าอก แขนขาชา", en: "Chest pain, numbness in limbs" },
        { th: "ชัก หมดสติ", en: "Seizures, loss of consciousness" },
        { th: "หายใจลำบาก ตัวร้อนมาก", en: "Difficulty breathing, extreme heat" },
      ],
      aftercare: [
        { th: "กินอาหาร ดื่มน้ำ พักผ่อน", en: "Eat, drink water, rest" },
        { th: "หลีกเลี่ยงคาเฟอีน", en: "Avoid caffeine" },
        { th: "ระวังอาการ comedown", en: "Be prepared for comedown effects" },
        { th: "ปรึกษาผู้เชี่ยวชาญหากใช้บ่อย", en: "Seek professional help if using frequently" },
      ],
      saferUse: {
        before: [
          { th: "ตั้งงบประมาณและปริมาณก่อนเริ่ม — ยึดตามนั้น", en: "Set a budget and amount limit before starting — stick to it" },
          { th: "โคเคนทำให้อยากใช้ซ้ำมาก — เตรียมตัวรับมือ", en: "Cocaine makes you want to redose — prepare for that urge" },
          { th: "เตรียมหลอดสูดส่วนตัว ไม่ใช้ธนบัตร (เสี่ยงติดเชื้อ)", en: "Prepare your own straw — never use banknotes (infection risk)" },
        ],
        during: [
          { th: "สลับรูจมูกทุกครั้ง", en: "Alternate nostrils each time" },
          { th: "บดให้ละเอียดที่สุด ลดอันตรายเยื่อจมูก", en: "Crush as finely as possible to reduce nasal damage" },
          { th: "ตั้งนาฬิกาเตือน: ถ้าถึงเวลาที่ตั้งไว้ ให้หยุด", en: "Set a timer: when it goes off, stop" },
          { th: "ดื่มน้ำ ไม่ดื่มแอลกอฮอล์", en: "Drink water, avoid alcohol" },
        ],
        after: [
          { th: "ล้างจมูกด้วยน้ำเกลือ (saline rinse)", en: "Rinse nose with saline solution" },
          { th: "กินอาหาร (คุณอาจไม่หิว แต่ร่างกายต้องการ)", en: "Eat food (you may not feel hungry but your body needs it)" },
          { th: "ถ้าใช้บ่อยกว่าสัปดาห์ละครั้ง ลองทบทวนดู", en: "If using more than once a week, consider reflecting on that" },
        ],
      },
      mixingRisks: [
        { substance: { th: "แอลกอฮอล์", en: "Alcohol" }, risk: { th: "สร้าง cocaethylene ในร่างกาย — เพิ่มพิษต่อหัวใจ 25 เท่า", en: "Creates cocaethylene — 25x more cardiotoxic" }, severity: "critical" },
        { substance: { th: "MDMA / ยาอี", en: "MDMA / Ecstasy" }, risk: { th: "เพิ่มภาระหัวใจมาก อุณหภูมิร่างกายสูง", en: "Extreme cardiac strain, elevated body temperature" }, severity: "high" },
        { substance: { th: "ยาบ้า / ไอซ์", en: "Methamphetamine" }, risk: { th: "สารกระตุ้นสองตัว — หัวใจรับภาระหนักมาก", en: "Two stimulants — extreme cardiovascular stress" }, severity: "high" },
      ],
      mentalCare: [
        { th: "ความอยากใช้ซ้ำ (craving) เป็นเรื่องปกติของสาร — ไม่ใช่ความอ่อนแอ", en: "Craving is a normal effect of the substance — not a weakness" },
        { th: "Comedown อาจทำให้รู้สึกว่า 'ไม่มีอะไรสนุก' — มันจะกลับมาปกติ", en: "Comedown can make nothing feel fun — your baseline will return" },
        { th: "ถ้าใช้ทุกสุดสัปดาห์ ลองหยุดสัก 1 เดือนดู", en: "If using every weekend, try taking a month off" },
        { th: "การพูดคุยกับคนที่เข้าใจไม่ใช่เรื่องน่าอาย", en: "Talking to someone who understands is nothing to be ashamed of" },
      ],
      scenarios: [
        {
          scenario: { th: "🎉 ใช้ที่งานสังสรรค์", en: "🎉 Using at a social event" },
          tips: [
            { th: "ตั้งจำนวนครั้งสูงสุดก่อนเริ่ม", en: "Set a maximum number of lines before starting" },
            { th: "ไม่ใช้แอลกอฮอล์ร่วม — ลดความเสี่ยงหัวใจ", en: "Skip alcohol — reduces cardiac risk significantly" },
            { th: "แจ้งเพื่อนหนึ่งคนว่าใช้ เพื่อความปลอดภัย", en: "Tell one friend what you're using, for safety" },
          ],
        },
        {
          scenario: { th: "🔄 รู้สึกใช้บ่อยขึ้นเรื่อยๆ", en: "🔄 Noticing increasing use patterns" },
          tips: [
            { th: "จดบันทึกว่าใช้เมื่อไหร่ เท่าไหร่ — สังเกตตัวเอง", en: "Keep a log of when and how much — observe your pattern" },
            { th: "ลองตั้งเป้าไม่ใช้ 30 วัน ดูว่ารู้สึกอย่างไร", en: "Try a 30-day break and notice how you feel" },
            { th: "ปรึกษาที่ SWING ได้ — ไม่ตัดสิน ไม่บังคับ", en: "Talk to SWING — no judgment, no pressure" },
          ],
        },
      ],
    },
  },
];

export function getSubstanceById(id: string): SubstanceData | undefined {
  return SUBSTANCES.find((s) => s.id === id);
}

export function getSubstanceBySlug(slug: string): SubstanceData | undefined {
  return SUBSTANCES.find((s) => s.slug === slug);
}
