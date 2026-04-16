export interface SupportFaqItem {
  id: string;
  questionTh: string;
  questionEn: string;
  answerTh: string;
  answerEn: string;
  linkPath?: string;
  linkLabelTh?: string;
  linkLabelEn?: string;
  category: "booking" | "prep" | "testing" | "privacy" | "general";
}

export const supportFaqs: SupportFaqItem[] = [
  {
    id: "faq-booking",
    category: "booking",
    questionTh: "จะนัดหมายเข้ารับบริการได้อย่างไร?",
    questionEn: "How do I book an appointment?",
    answerTh: "คุณสามารถนัดหมายได้ผ่านระบบจองออนไลน์ โดยเลือกสาขา วันที่ และบริการที่ต้องการ ไม่ต้องระบุชื่อจริง",
    answerEn: "You can book online by choosing a branch, date, and service. No real name required.",
    linkPath: "/booking",
    linkLabelTh: "จองนัดหมาย",
    linkLabelEn: "Book Appointment",
  },
  {
    id: "faq-prep",
    category: "prep",
    questionTh: "PrEP คืออะไร และเริ่มใช้ยังไง?",
    questionEn: "What is PrEP and how do I start?",
    answerTh: "PrEP คือยาป้องกันก่อนการสัมผัสเชื้อ HIV สามารถเริ่มต้นได้โดยนัดพบแพทย์ที่คลินิก SWING ฟรี",
    answerEn: "PrEP is pre-exposure prophylaxis for HIV prevention. Start by visiting any SWING clinic for free.",
    linkPath: "/info",
    linkLabelTh: "อ่านเพิ่มเติมเกี่ยวกับ PrEP",
    linkLabelEn: "Learn more about PrEP",
  },
  {
    id: "faq-hivtest",
    category: "testing",
    questionTh: "ตรวจ HIV ที่ไหนได้บ้าง? ฟรีไหม?",
    questionEn: "Where can I get an HIV test? Is it free?",
    answerTh: "ตรวจ HIV ฟรีได้ที่คลินิก SWING ทุกสาขา หรือสั่งชุดตรวจด้วยตัวเองส่งถึงบ้าน",
    answerEn: "Free HIV testing is available at all SWING clinics, or order a self-test kit delivered to your home.",
    linkPath: "/self-test",
    linkLabelTh: "สั่งชุดตรวจ HIV ด้วยตัวเอง",
    linkLabelEn: "Order HIV Self-Test Kit",
  },
  {
    id: "faq-pep",
    category: "prep",
    questionTh: "ถ้าเพิ่งมีความเสี่ยง ต้องทำอย่างไร? (PEP)",
    questionEn: "I just had a risky exposure — what should I do? (PEP)",
    answerTh: "หากเพิ่งมีความเสี่ยงภายใน 72 ชั่วโมง คุณอาจใช้ยา PEP ได้ โปรดติดต่อเราด่วน หรือไปที่คลินิกใกล้คุณ",
    answerEn: "If exposed within 72 hours, PEP may help. Contact us urgently or visit the nearest clinic.",
    linkPath: "/pep-emergency",
    linkLabelTh: "PEP ฉุกเฉิน",
    linkLabelEn: "PEP Emergency",
  },
  {
    id: "faq-privacy",
    category: "privacy",
    questionTh: "ข้อมูลของฉันจะถูกเก็บเป็นความลับไหม?",
    questionEn: "Is my information kept confidential?",
    answerTh: "ใช่ครับ/ค่ะ ข้อมูลทั้งหมดจะถูกเก็บเป็นความลับอย่างเคร่งครัด ตามมาตรฐาน PDPA ไม่มีการเปิดเผยต่อบุคคลที่สาม",
    answerEn: "Yes, all information is strictly confidential under PDPA standards. No disclosure to third parties.",
  },
  {
    id: "faq-walkin",
    category: "booking",
    questionTh: "Walk-in ได้ไหม ไม่ต้องนัดหมาย?",
    questionEn: "Can I walk in without an appointment?",
    answerTh: "ได้ครับ/ค่ะ ทุกสาขารับ Walk-in แต่แนะนำให้จองล่วงหน้าเพื่อลดเวลารอ",
    answerEn: "Yes, all branches accept walk-ins, but we recommend booking ahead to reduce wait times.",
    linkPath: "/booking",
    linkLabelTh: "จองล่วงหน้า",
    linkLabelEn: "Book Ahead",
  },
  {
    id: "faq-harm-reduction",
    category: "general",
    questionTh: "มีข้อมูลเรื่องสารเสพติดและการลดอันตรายไหม?",
    questionEn: "Do you have harm reduction information?",
    answerTh: "มีครับ/ค่ะ เรามีข้อมูลเรื่องการลดอันตราย เครื่องมือคำนวณความเสี่ยง และคำแนะนำจากผู้เชี่ยวชาญ",
    answerEn: "Yes, we offer harm reduction info, risk calculators, and expert guidance.",
    linkPath: "/harm-reduction",
    linkLabelTh: "ข้อมูลการลดอันตราย",
    linkLabelEn: "Harm Reduction Info",
  },
];
