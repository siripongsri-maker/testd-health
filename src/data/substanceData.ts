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

export interface SubstanceContent {
  desc: BilingualText;
  duration: string;
  keyEffect: BilingualText;
  risks: RiskItem[];
  harmReduction: BilingualText[];
  emergencySigns: BilingualText[];
  aftercare: BilingualText[];
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
    },
  },
];

export function getSubstanceById(id: string): SubstanceData | undefined {
  return SUBSTANCES.find((s) => s.id === id);
}

export function getSubstanceBySlug(slug: string): SubstanceData | undefined {
  return SUBSTANCES.find((s) => s.slug === slug);
}
