/**
 * Chemsex Fact Cards — 20 topic cards split out of the printed
 * "Chemsex Fact Card" deck (front page = knowledge, back page = service link).
 *
 * Each card renders as its own page at /th/chemsex-cards/:slug (and /en/...)
 * and is surfaced in both /harm-reduction and /info.
 */

export interface FactCardLink {
  labelTh: string;
  labelEn: string;
  /** Internal route, tel: link, or in-page section */
  to: string;
  /** Human-readable service this card connects to (used in reports/analytics) */
  service: string;
}

export interface ChemsexFactCard {
  /** 1–20, matches the printed card number */
  number: number;
  slug: string;
  titleTh: string;
  titleEn: string;
  taglineTh: string;
  taglineEn: string;
  emoji: string;
  /** Theme group used for filtering */
  group: "prepare" | "during" | "after" | "health" | "mind" | "rights";
  pointsTh: string[];
  pointsEn: string[];
  ctas: FactCardLink[];
}

export const CHEMSEX_FACT_CARDS: ChemsexFactCard[] = [
  {
    number: 1,
    slug: "before-you-start",
    titleTh: "ก่อนเริ่ม: วางแผนให้ Fun ปลอดภัยกว่า",
    titleEn: "Before You Start: Planning for Safer Chemsex",
    taglineTh: "เตรียมตัวก่อน Fun ปลอดภัยกว่าเสมอ",
    taglineEn: "Plan ahead. Play safer.",
    emoji: "🗒️",
    group: "prepare",
    pointsTh: [
      "เลือกพื้นที่ที่คุณรู้สึกปลอดภัย มีคนที่คุณ trust อยู่ใกล้ ๆ ถ้าเป็นที่ใหม่ บอกเพื่อนว่าไปที่ไหน กับใคร",
      "เก็บเบอร์ฉุกเฉินไว้ในมือ: สายด่วน 1669 มีเบอร์เพื่อนสนิทอย่างน้อย 1 คน และทำแผนฉุกเฉินบน testD",
      "ดื่มน้ำ กินอาหารเบา ๆ ก่อนเริ่ม นอนพอ ร่างกายจะพร้อมรับมือกับเรื่องไม่คาดคิดได้ดีกว่า",
    ],
    pointsEn: [
      "Choose a space where you feel safe, with someone you trust nearby. In a new place, tell a friend where you are and who you're with.",
      "Keep emergency numbers handy: 1669, at least one close friend, and a safety plan saved on testD.",
      "Drink water, eat something light and sleep enough before you start — your body copes better with the unexpected.",
    ],
    ctas: [
      { labelTh: "สร้างแผนปลอดภัยของคุณ", labelEn: "Build your safety plan", to: "/th/harm-reduction", service: "Safer Use Planner (Harm Reduction)" },
      { labelTh: "โทรสายด่วนฉุกเฉิน 1669", labelEn: "Emergency hotline 1669", to: "tel:1669", service: "Emergency medical hotline" },
    ],
  },
  {
    number: 2,
    slug: "during-session",
    titleTh: "ระหว่าง Fun ดูแลตัวเองยังไง",
    titleEn: "During Chemsex: Staying Safer in Real Time",
    taglineTh: "Pace yourself ฟังเสียงร่างกาย",
    taglineEn: "Pace yourself. Listen to your body.",
    emoji: "⏱️",
    group: "during",
    pointsTh: [
      "จิบน้ำเรื่อย ๆ และพักทุก 30–60 นาที ลองตั้งเวลาในมือถือช่วยเตือนได้",
      "ไม่ผสมยาที่ไม่รู้จัก ถ้าเพิ่งใช้ครั้งแรก ให้เริ่มจากปริมาณน้อยที่สุด แล้วรอดูปฏิกิริยา",
      "อยู่กับคนที่คุณเชื่อใจ และมีแผนฉุกเฉิน ถ้ารู้สึกไม่ปลอดภัยหรือมากเกินไป ออกได้ทันที",
    ],
    pointsEn: [
      "Sip water regularly and take a break every 30–60 minutes — a phone timer helps.",
      "Don't mix substances you don't know. If it's your first time, start with the smallest dose and wait.",
      "Stay with people you trust and keep an exit plan. If it feels unsafe or too much, you can leave right away.",
    ],
    ctas: [
      { labelTh: "ตั้ง Dose Timer / เช็คลิสต์", labelEn: "Set a dose timer / checklist", to: "/th/harm-reduction", service: "Dose Timer & Safety Nudges" },
      { labelTh: "คุยกับที่ปรึกษาแบบลับ", labelEn: "Chat with a counselor", to: "/support-chat", service: "Support Chat (counseling)" },
    ],
  },
  {
    number: 3,
    slug: "after-session-recovery",
    titleTh: "หลังจบ Session: ฟื้นฟูร่างกายและใจ",
    titleEn: "After Chemsex: Recovery and Self-Care",
    taglineTh: "ไม่ต้องรีบ การพักเป็นส่วนหนึ่งของแผน",
    taglineEn: "Rest is part of the plan.",
    emoji: "🛌",
    group: "after",
    pointsTh: [
      "กินอาหารที่มีสารอาหารครบ พักผ่อนเต็มที่ 24–48 ชั่วโมง ร่างกายต้องการเวลาคืนสมดุล",
      "ดื่มน้ำเปล่า น้ำเกลือแร่ หลีกเลี่ยงแอลกอฮอล์และคาเฟอีนหนัก ๆ ช่วงนี้",
      "ถ้ารู้สึกเฟลหนัก โทรหาเพื่อน หรือคุยกับที่ปรึกษาที่ SWING ไม่ต้องรับมือคนเดียว",
    ],
    pointsEn: [
      "Eat nutritious food and rest fully for 24–48 hours — your body needs time to rebalance.",
      "Drink water and electrolytes; avoid alcohol and heavy caffeine during this window.",
      "If the crash hits hard, call a friend or talk to a SWING counselor. You don't have to handle it alone.",
    ],
    ctas: [
      { labelTh: "โหมดฟื้นฟู & ดูแลตัวเอง", labelEn: "Recovery & self-care mode", to: "/self-care", service: "Self-Care / Recovery Mode" },
      { labelTh: "หาสาขา SWING ใกล้คุณ", labelEn: "Find a SWING clinic", to: "/th/swing", service: "SWING Clinic branches" },
    ],
  },
  {
    number: 4,
    slug: "drug-combinations",
    titleTh: "เข้าใจการผสมยา",
    titleEn: "Understanding Drug Combinations",
    taglineTh: "การผสมเปลี่ยนทุกอย่าง",
    taglineEn: "Mixing changes everything.",
    emoji: "⚗️",
    group: "during",
    pointsTh: [
      "GHB กับเหล้า ทำให้เสี่ยงหยุดหายใจ ห้ามผสมเด็ดขาด ไม่มีข้อยกเว้น",
      "ไอซ์ร่วมกับป๊อปเปอร์ทำให้หัวใจทำงานหนักเกิน อาจช็อก ถ้าเพิ่งใช้ไอซ์ควรเว้นป๊อปเปอร์ไปก่อน",
      "ถ้าจำเป็นต้องใช้หลายตัว เว้นเวลาให้ห่างที่สุด เริ่มจากปริมาณน้อย และอยู่กับคนที่รู้ว่าคุณใช้สารอะไร",
    ],
    pointsEn: [
      "GHB with alcohol risks respiratory arrest. Never mix — no exceptions.",
      "Meth plus poppers overloads the heart and can cause collapse. If you've just used meth, skip poppers.",
      "If you do combine, space doses as far apart as possible, start low, and stay with someone who knows what you've taken.",
    ],
    ctas: [
      { labelTh: "ตรวจปฏิกิริยาระหว่างสาร", labelEn: "Check drug interactions", to: "/th/harm-reduction", service: "Drug Interaction Checker" },
      { labelTh: "คลังข้อมูลสารเสพติด", labelEn: "Substance library", to: "/th/harm-reduction", service: "Substance Factsheets" },
    ],
  },
  {
    number: 5,
    slug: "overdose-response",
    titleTh: "รู้ทันสัญญาณ Overdose: 10 วินาทีที่ช่วยชีวิต",
    titleEn: "Recognising and Responding to Overdose",
    taglineTh: "10 วินาทีที่ตัดสินใจ อาจช่วยชีวิตคนได้",
    taglineEn: "10 seconds can save a life.",
    emoji: "🚨",
    group: "during",
    pointsTh: [
      "สัญญาณอันตราย: หมดสติ หายใจช้ามาก ผิวเขียวคล้ำ ปลุกไม่ตื่น ตัวเย็น",
      "จัด recovery position (นอนตะแคง หัวแหงนเปิดทางเดินหายใจ) แล้วโทร 1669 ทันที บอกที่อยู่และสารที่ใช้ให้ชัด ไม่ต้องบอกชื่อจริง",
      "อย่ารอให้ดีขึ้นเอง อย่าให้กินหรือดื่ม อย่าทำให้อาเจียน รอจนรถพยาบาลมาถึง",
    ],
    pointsEn: [
      "Danger signs: unconscious, very slow breathing, blue-grey skin, unrousable, cold body.",
      "Put them in the recovery position (on their side, head tilted to open the airway) and call 1669 immediately. Give the address and the substances used — no real name needed.",
      "Don't wait it out, don't give food or drink, don't induce vomiting. Stay until the ambulance arrives.",
    ],
    ctas: [
      { labelTh: "โทร 1669 ทันที", labelEn: "Call 1669 now", to: "tel:1669", service: "Emergency medical hotline" },
      { labelTh: "ดูขั้นตอนช่วยเหลือฉุกเฉิน", labelEn: "Emergency response steps", to: "/th/harm-reduction", service: "Safety Escalation / Emergency guide" },
    ],
  },
  {
    number: 6,
    slug: "injecting-vs-non-injecting",
    titleTh: "ฉีดกับสูบ ต่างกันยังไง",
    titleEn: "Injecting vs Non-Injecting Risks",
    taglineTh: "ทุกวิธีมีความเสี่ยง แต่บางวิธีเสี่ยงกว่า",
    taglineEn: "Every route has risks.",
    emoji: "💉",
    group: "during",
    pointsTh: [
      "การฉีดเพิ่มความเสี่ยงเอชไอวีและไวรัสตับอักเสบซีอย่างมาก ถ้าใช้เข็มร่วมกันหรือเข็มไม่สะอาด",
      "ถ้าจำเป็นต้องฉีด ใช้เข็มสะอาดของตัวเองเท่านั้น และทิ้งในภาชนะปิดมิดชิด ขอเข็มสะอาดฟรีที่ SWING",
      "การสลับวิธีใช้ไม่ได้ทำให้ปลอดภัยขึ้นเสมอไป ปรึกษาที่ SWING ก่อนเปลี่ยนวิธี",
    ],
    pointsEn: [
      "Injecting sharply raises HIV and hepatitis C risk when needles are shared or unclean.",
      "If you inject, use only your own clean needle and dispose of it in a sealed container. Free clean equipment is available at SWING.",
      "Switching routes isn't automatically safer — talk to SWING before you change.",
    ],
    ctas: [
      { labelTh: "ขออุปกรณ์สะอาดที่ SWING", labelEn: "Get clean equipment at SWING", to: "/th/swing", service: "SWING needle & syringe programme" },
      { labelTh: "ขอชุดตรวจ HIV ด้วยตัวเอง", labelEn: "Request an HIV self-test kit", to: "/th/hiv-selftest", service: "HIV Self-Test kit request" },
    ],
  },
  {
    number: 7,
    slug: "chemsex-and-hiv",
    titleTh: "Chemsex กับ HIV รู้ไว้ลดเสี่ยง",
    titleEn: "Chemsex and HIV Risk",
    taglineTh: "ยาไม่ได้ทำให้ติดเชื้อ แต่บริบทมีผล",
    taglineEn: "The drugs don't infect you. The context does.",
    emoji: "🧬",
    group: "health",
    pointsTh: [
      "ใช้สารยาว หลายคน อาจไม่ใช้ถุง ทำให้ความเสี่ยง HIV และโรคติดต่อทางเพศสัมพันธ์สูงขึ้น",
      "ลืมใช้ถุงตอนใช้สารเกิดขึ้นได้ เตรียมกิน PrEP (ยาป้องกัน HIV ก่อนเสี่ยง) ดีกว่าเครียดทีหลัง",
      "ตรวจ HIV ทุก 3 เดือน ที่ SWING ตรวจฟรี",
    ],
    pointsEn: [
      "Long sessions with multiple partners and less condom use push HIV and STI risk up.",
      "Forgetting condoms while using happens — being on PrEP beats the anxiety afterwards.",
      "Test for HIV every 3 months. It's free at SWING.",
    ],
    ctas: [
      { labelTh: "จองตรวจ HIV ฟรี", labelEn: "Book a free HIV test", to: "/booking", service: "Clinic appointment booking (HIV testing)" },
      { labelTh: "ขอชุดตรวจส่งถึงบ้าน", labelEn: "Request a home test kit", to: "/th/hiv-selftest", service: "HIV Self-Test kit request" },
    ],
  },
  {
    number: 8,
    slug: "prep-and-pep",
    titleTh: "PrEP กับ PEP ใช้ยังไงในชีวิตจริง",
    titleEn: "Using PrEP and PEP in Chemsex Contexts",
    taglineTh: "PrEP กันก่อน PEP กันหลัง เลือกได้ตามจังหวะชีวิต",
    taglineEn: "Before or after, you have options.",
    emoji: "💊",
    group: "health",
    pointsTh: [
      "PrEP กินทุกวันหรือแบบ on-demand (2-1-1) ป้องกัน HIV ได้ถึง 99%",
      "PEP ถ้ามีเหตุเสี่ยง รีบเริ่มภายใน 72 ชั่วโมง ยิ่งเร็วยิ่งดี รับได้ที่ SWING เปิดทุกวัน",
      "เมื่อใช้สาร อาจลืมกินยาได้ง่ายขึ้น PrEP จึงเหมาะกับคนที่มีกิจกรรมบ่อย ๆ",
    ],
    pointsEn: [
      "PrEP — daily or on-demand (2-1-1) — prevents HIV up to 99%.",
      "PEP must start within 72 hours of exposure; sooner is better. Available at SWING every day.",
      "Substance use makes it easier to miss doses, so PrEP suits people with frequent sessions.",
    ],
    ctas: [
      { labelTh: "PEP ฉุกเฉิน ภายใน 72 ชม.", labelEn: "Emergency PEP within 72h", to: "/pep", service: "PEP emergency pathway" },
      { labelTh: "จองรับ PrEP ที่คลินิก", labelEn: "Book PrEP at the clinic", to: "/booking", service: "Clinic appointment booking (PrEP)" },
    ],
  },
  {
    number: 9,
    slug: "sti-testing-window",
    titleTh: "ตรวจโรคหลัง Fun กี่วันถึงเหมาะ",
    titleEn: "STI Testing After Chemsex",
    taglineTh: "บางโรครอ 2 อาทิตย์ บางโรครอ 3 เดือน",
    taglineEn: "Different tests, different windows.",
    emoji: "🗓️",
    group: "health",
    pointsTh: [
      "หนองในและหนองในเทียม ตรวจหลัง 2 อาทิตย์ ตรวจง่าย รักษาเร็ว",
      "ซิฟิลิส ตรวจหลัง 4–6 อาทิตย์ ตรวจเลือดง่าย ๆ ที่ SWING",
      "HIV ตรวจซ้ำที่ 3 เดือนเพื่อความแม่นยำสูงสุด ระหว่างรอ ใช้ PrEP หรือ PEP ตามคำแนะนำ",
    ],
    pointsEn: [
      "Gonorrhoea and chlamydia: test after 2 weeks — easy to check, quick to treat.",
      "Syphilis: test after 4–6 weeks with a simple blood test at SWING.",
      "HIV: retest at 3 months for full accuracy. In the meantime use PrEP or PEP as advised.",
    ],
    ctas: [
      { labelTh: "จองตรวจ STI panel ฟรี", labelEn: "Book a free STI panel", to: "/booking", service: "Clinic appointment booking (STI panel)" },
      { labelTh: "ขอชุดตรวจ HIV ด้วยตัวเอง", labelEn: "Request an HIV self-test kit", to: "/th/hiv-selftest", service: "HIV Self-Test kit request" },
    ],
  },
  {
    number: 10,
    slug: "condoms-and-lube",
    titleTh: "ถุงและเจล ยังจำเป็นไหมเมื่อมี PrEP",
    titleEn: "Condoms, Lube, and Harm Reduction in Practice",
    taglineTh: "PrEP กัน HIV แต่โรคอื่น ๆ ยังต้องระวัง",
    taglineEn: "PrEP covers HIV, not STIs.",
    emoji: "🧴",
    group: "health",
    pointsTh: [
      "ถุงยางกับเจลหล่อลื่นสูตรน้ำช่วยลดเสี่ยง STI — PrEP ป้องกันแค่ HIV",
      "เจลแบบน้ำแห้งง่ายเมื่อใช้นาน เจลซิลิโคนเป็นทางเลือกที่ดีกว่า ช่วยลดการบาดเจ็บ ลดแผลและเลือดออก",
      "รับถุงและเจลฟรีจาก SWING ทุกครั้งที่มา ไม่จำกัดจำนวน",
    ],
    pointsEn: [
      "Condoms plus water-based lube reduce STI risk — PrEP only covers HIV.",
      "Water-based lube dries out in long sessions; silicone lube lasts longer and reduces tearing and bleeding.",
      "Pick up free condoms and lube at SWING every visit, no limit.",
    ],
    ctas: [
      { labelTh: "รับถุงและเจลฟรีที่สาขา", labelEn: "Free condoms & lube at a branch", to: "/th/swing", service: "SWING Clinic branches (free supplies)" },
      { labelTh: "จองตรวจ STI", labelEn: "Book an STI check", to: "/booking", service: "Clinic appointment booking (STI panel)" },
    ],
  },
  {
    number: 11,
    slug: "the-crash",
    titleTh: "รู้จัก ‘ช่วงดิ่งดาวน์’ หลัง Session",
    titleEn: "Understanding the Emotional Crash",
    taglineTh: "ความรู้สึกแย่หลังจบ ไม่ใช่ความผิดของคุณ",
    taglineEn: "The crash is chemistry, not character.",
    emoji: "🌧️",
    group: "mind",
    pointsTh: [
      "หลังใช้ไอซ์หรือ GHB สมองหลั่งโดพามีนน้อยลง 2–5 วัน ความรู้สึกดาวน์จึงเป็นเรื่องเคมี ไม่ได้คิดไปเอง",
      "อาจรู้สึกเศร้า กังวล โดดเดี่ยว ไม่อยากเจอใคร เป็นปฏิกิริยาปกติของร่างกายช่วงนี้",
      "พักผ่อน กินอาหารดี อยู่กับคนที่เข้าใจ ค่อย ๆ กลับมา ไม่ต้องเร่ง",
    ],
    pointsEn: [
      "After meth or GHB, dopamine stays low for 2–5 days. The low mood is chemistry, not imagination.",
      "Sadness, anxiety, isolation and not wanting to see anyone are normal reactions in this window.",
      "Rest, eat well, stay near people who get it, and come back at your own pace.",
    ],
    ctas: [
      { labelTh: "Chat กับที่ปรึกษาแบบเพื่อน", labelEn: "Chat with a peer counselor", to: "/support-chat", service: "Support Chat (counseling)" },
      { labelTh: "เช็คอินดูแลใจรายวัน", labelEn: "Daily self-care check-in", to: "/self-care", service: "Daily Check-in / Self-Care" },
    ],
  },
  {
    number: 12,
    slug: "anxiety-shame-guilt",
    titleTh: "จัดการความวิตก ความอาย ความรู้สึกผิด",
    titleEn: "Managing Anxiety, Shame, and Guilt",
    taglineTh: "คุณไม่ใช่คนเดียวที่รู้สึกแบบนี้",
    taglineEn: "You are not alone in this.",
    emoji: "🫂",
    group: "mind",
    pointsTh: [
      "ความอายส่วนใหญ่มาจากการตีตราของสังคม ไม่ใช่ตัวคุณ การตระหนักเรื่องนี้คือก้าวแรก",
      "เขียนบันทึก คุยกับเพื่อน หรือผู้ให้การปรึกษา ช่วยลดความหนักในใจได้จริง",
      "ถ้าความรู้สึกอยู่นานเกิน 2 อาทิตย์ และเริ่มกระทบชีวิตประจำวัน ลองปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิต",
    ],
    pointsEn: [
      "Most shame comes from social stigma, not from you. Recognising that is the first step.",
      "Journalling, talking to a friend, or seeing a counselor genuinely lightens the load.",
      "If it lasts more than 2 weeks and affects daily life, speak with a mental health professional.",
    ],
    ctas: [
      { labelTh: "จองปรึกษาฟรีกับผู้ให้การปรึกษา", labelEn: "Book free counseling", to: "/booking", service: "Counseling appointment booking" },
      { labelTh: "ประเมินสุขภาพจิตเบื้องต้น", labelEn: "Mental health check-in", to: "/th/harm-reduction", service: "Mental Health Check-in (PHQ-4)" },
    ],
  },
  {
    number: 13,
    slug: "when-to-seek-help",
    titleTh: "สัญญาณที่บอกว่าต้องขอความช่วยเหลือ",
    titleEn: "When to Seek Help: Mental Health Warning Signs",
    taglineTh: "สัญญาณเหล่านี้บอกว่าคุณควรมีใครสักคน",
    taglineEn: "These signs mean: reach out.",
    emoji: "🆘",
    group: "mind",
    pointsTh: [
      "ถ้ารู้สึกอยากทำร้ายตัวเอง หรือคิดว่าไม่อยากมีชีวิตอยู่ โทร 1323 (สายด่วนสุขภาพจิต) ได้ทันที 24 ชั่วโมง",
      "นอนไม่หลับเกิน 1 อาทิตย์ ไม่อยากกิน ไม่อยากทำอะไร ลุกจากเตียงยากขึ้นเรื่อย ๆ สัญญาณนี้ไม่ควรเก็บไว้คนเดียว",
      "ใช้สารบ่อยขึ้นเรื่อย ๆ หยุดไม่ได้ ไม่ใช่เรื่องวินัย แต่เป็นสัญญาณให้ขอความช่วยเหลือได้แล้ว",
    ],
    pointsEn: [
      "If you feel like harming yourself or don't want to be alive, call 1323 (mental health hotline), 24 hours.",
      "Not sleeping for over a week, no appetite, no motivation, harder and harder to get out of bed — don't carry that alone.",
      "Using more and more and being unable to stop isn't a discipline problem. It's a signal to ask for help.",
    ],
    ctas: [
      { labelTh: "โทรสายด่วนสุขภาพจิต 1323", labelEn: "Mental health hotline 1323", to: "tel:1323", service: "Mental health hotline (24h)" },
      { labelTh: "ปรึกษาพี่ ๆ ที่ SWING (ลับ 100%)", labelEn: "Talk to SWING (100% confidential)", to: "/support-chat", service: "Support Chat (counseling)" },
    ],
  },
  {
    number: 14,
    slug: "staying-connected",
    titleTh: "ไม่อยู่คนเดียว ลดการแยกตัว",
    titleEn: "Staying Connected: Reducing Isolation",
    taglineTh: "ชุมชนของเราก็ช่วยกันลดอันตรายได้",
    taglineEn: "Belonging is harm reduction.",
    emoji: "🧑‍🤝‍🧑",
    group: "mind",
    pointsTh: [
      "เข้าร่วมกิจกรรมกับเพื่อน หรือแวะมาที่ SWING สัปดาห์ละครั้ง ไม่ต้องพูดถ้ายังไม่พร้อม มานั่งฟังก็ได้",
      "คุยกับพี่ ๆ ที่ปรึกษาในช่องทางของ SWING บรรยากาศปลอดภัย ไม่ตัดสินกัน",
      "หาคนที่ไม่ตัดสิน ที่คุณเป็นตัวเองได้ คนแบบนี้มีอยู่ และ SWING ช่วยเชื่อมให้ได้",
    ],
    pointsEn: [
      "Join activities with friends or drop by SWING once a week. You don't have to talk — sitting and listening is enough.",
      "Talk with SWING's peer counselors in a safe, non-judgemental space.",
      "Find people who don't judge and let you be yourself. They exist, and SWING can connect you.",
    ],
    ctas: [
      { labelTh: "เข้าร่วมชุมชน testD", labelEn: "Join the testD community", to: "/community", service: "Community & peer support" },
      { labelTh: "หาสาขา SWING ใกล้คุณ", labelEn: "Find a SWING branch", to: "/th/swing", service: "SWING Clinic branches" },
    ],
  },
  {
    number: 15,
    slug: "client-pressure",
    titleTh: "เมื่อลูกค้ากดดันให้ใช้",
    titleEn: "Managing Client Pressure",
    taglineTh: "งานของคุณ กฎของคุณ",
    taglineEn: "Your work, your rules.",
    emoji: "🛑",
    group: "rights",
    pointsTh: [
      "มีสิทธิ์ปฏิเสธทุกครั้ง ถ้ารู้สึกไม่ปลอดภัย ไม่ใช่ความผิด และไม่ต้องกลัวเสียงาน ชีวิตมีราคามากกว่างานหนึ่งครั้ง",
      "ตั้งกฎกับลูกค้าตั้งแต่แรก เวลา ค่าใช้จ่าย และสิ่งที่ทำได้กับไม่ทำเด็ดขาด",
      "ถ้าเจอลูกค้าใช้กำลังหรือบังคับ รายงานที่ SWING/testD ทันที เก็บความลับ ไม่ส่งต่อข้อมูลให้ใคร",
    ],
    pointsEn: [
      "You can say no every time. Feeling unsafe is not your fault, and one job is never worth your life.",
      "Set the rules with clients up front: time, price, and what's absolutely off-limits.",
      "If a client uses force or coercion, report it to SWING/testD right away — kept confidential, never shared.",
    ],
    ctas: [
      { labelTh: "ปรึกษาแบบไม่ระบุตัวตน", labelEn: "Report / talk anonymously", to: "/support-chat", service: "Support Chat (anonymous reporting)" },
      { labelTh: "วางแผนความปลอดภัยในการทำงาน", labelEn: "Build a work safety plan", to: "/th/chemsex-cards/work-safety-plan", service: "Safety Planner" },
    ],
  },
  {
    number: 16,
    slug: "work-safety-plan",
    titleTh: "วางแผนความปลอดภัยในการทำงาน",
    titleEn: "Safety Planning for Work in Chemsex Contexts",
    taglineTh: "แผนที่เตรียมไว้ ใช้ได้จริงตอนฉุกเฉิน",
    taglineEn: "A plan you prepared is a plan that works.",
    emoji: "🧭",
    group: "rights",
    pointsTh: [
      "บอกเพื่อนสนิทว่าไปที่ไหน กี่โมง กลับเมื่อไหร่ ส่งโลเคชั่นระหว่างทาง และเช็คอินกับเพื่อนทุก 2 ชั่วโมง",
      "เก็บเบอร์เพื่อน 1669 และ SWING ไว้ที่เข้าถึงเร็ว ตั้ง shortcut บนหน้า lock screen",
      "มี ‘ข้อความลับ’ กับเพื่อน คำสั้น ๆ ที่ส่งแล้วเพื่อนรู้ทันทีว่าคุณต้องการความช่วยเหลือ",
    ],
    pointsEn: [
      "Tell a close friend where you're going, what time, and when you'll be back. Share your location and check in every 2 hours.",
      "Keep your friend's number, 1669 and SWING quick to reach — add a lock-screen shortcut.",
      "Agree a code word with a friend: a short message that means 'I need help now'.",
    ],
    ctas: [
      { labelTh: "ดาวน์โหลดแผนปลอดภัยที่ testD", labelEn: "Download your safety plan", to: "/th/harm-reduction", service: "Safety Planner (downloadable plan)" },
      { labelTh: "โทร 1669 กรณีฉุกเฉิน", labelEn: "Call 1669 in an emergency", to: "tel:1669", service: "Emergency medical hotline" },
    ],
  },
  {
    number: 17,
    slug: "know-your-rights",
    titleTh: "สิทธิของคุณตามกฎหมาย",
    titleEn: "Knowing Your Rights and Reducing Legal Risk",
    taglineTh: "รู้สิทธิ ลดเสี่ยง",
    taglineEn: "Know your rights. Reduce your fear.",
    emoji: "⚖️",
    group: "rights",
    pointsTh: [
      "การครอบครองยาเสพติดปริมาณน้อย สามารถเข้ารับการบำบัดแทนการดำเนินคดี ตาม พ.ร.บ. ยาเสพติด 2564",
      "ถ้าโดนจับ คุณมีสิทธิ์เงียบ และมีสิทธิ์ขอทนายก่อนตอบคำถาม ไม่ต้องเซ็นเอกสารถ้าไม่เข้าใจ",
      "SWING มีเครือข่ายทนายให้ปรึกษาฟรี โทรหรือ chat ได้ ไม่ต้องบอกชื่อจริง",
    ],
    pointsEn: [
      "Small-quantity possession can be routed to treatment instead of prosecution under Thailand's 2021 Narcotics Code.",
      "If arrested you have the right to remain silent and to a lawyer before answering. Don't sign anything you don't understand.",
      "SWING has a free legal network — call or chat, no real name required.",
    ],
    ctas: [
      { labelTh: "ขอคำปรึกษากฎหมายฟรีผ่าน SWING", labelEn: "Free legal support via SWING", to: "/support-chat", service: "Support Chat → legal referral" },
      { labelTh: "ติดต่อสาขา SWING", labelEn: "Contact a SWING branch", to: "/th/swing", service: "SWING Clinic branches" },
    ],
  },
  {
    number: 18,
    slug: "migrant-msw-support",
    titleTh: "ช่วยเหลือพี่น้อง migrant MSWs",
    titleEn: "Support for Migrant MSWs: Where to Go",
    taglineTh: "ไม่มีบัตร ก็รับบริการได้",
    taglineEn: "Services are here for you too.",
    emoji: "🌏",
    group: "rights",
    pointsTh: [
      "บริการตรวจ HIV และโรคติดต่อทางเพศสัมพันธ์ฟรี ที่ SWING คลินิก",
      "มีล่ามและเจ้าหน้าที่ที่เข้าใจบริบทของคุณ",
      "ส่งต่อบริการช่วยเหลือทางกฎหมาย ถ้าเจอสถานการณ์ไม่ปลอดภัย",
    ],
    pointsEn: [
      "Free HIV and STI testing at SWING clinics.",
      "Interpreters and staff who understand your situation.",
      "Referral to legal support if you're in an unsafe situation.",
    ],
    ctas: [
      { labelTh: "ข้อมูลภาษาลาว / เขมร", labelEn: "Lao / Khmer language pages", to: "/lo", service: "Lao & Khmer language landing pages" },
      { labelTh: "จองรับบริการที่ SWING", labelEn: "Book a service at SWING", to: "/booking", service: "Clinic appointment booking" },
    ],
  },
  {
    number: 19,
    slug: "first-visit-to-swing",
    titleTh: "ครั้งแรกที่มา SWING คาดหวังอะไรได้บ้าง",
    titleEn: "What to Expect When You Visit a Clinic",
    taglineTh: "ไม่ต้องเตรียมตัวเยอะ แค่มาเป็นตัวเอง",
    taglineEn: "Just come as you are.",
    emoji: "🚪",
    group: "prepare",
    pointsTh: [
      "ไม่มีฟอร์มยาว ไม่ตัดสิน เป้าหมายของเราคือช่วยให้คุณดูแลตัวเองได้ แค่เตรียมบัตรประชาชนหรือพาสปอร์ต",
      "ตรวจ HIV และให้การปรึกษาโรคติดต่อทางเพศสัมพันธ์ พร้อมรับ PrEP หรือ PEP ฟรี ใช้เวลาประมาณ 45 นาที – 1 ชั่วโมง",
      "ปรึกษาในห้องส่วนตัว กับเจ้าหน้าที่ที่เข้าใจบริบทเดียวกัน",
    ],
    pointsEn: [
      "No long forms, no judgement. Just bring your ID card or passport.",
      "HIV testing and STI counseling with free PrEP or PEP — about 45 minutes to an hour.",
      "Private consultation rooms with staff who share your context.",
    ],
    ctas: [
      { labelTh: "จองนัดหมายการตรวจ", labelEn: "Book an appointment", to: "/booking", service: "Clinic appointment booking" },
      { labelTh: "ดูสาขาและเวลาทำการ", labelEn: "Branches & opening hours", to: "/th/swing", service: "SWING Clinic branches" },
    ],
  },
  {
    number: 20,
    slug: "confidentiality-and-rights",
    titleTh: "ความลับและสิทธิของคุณ",
    titleEn: "Confidentiality and Your Rights in Health Services",
    taglineTh: "ข้อมูลของคุณ เก็บแค่ภายในทีมเรา",
    taglineEn: "Your data, your control.",
    emoji: "🔒",
    group: "rights",
    pointsTh: [
      "SWING ไม่บันทึกข้อมูลส่วนตัวในระบบ outreach ใช้รหัส UIC แทนชื่อจริง",
      "ผลตรวจ HIV ปรึกษาแบบ 1 ต่อ 1 ไม่แจ้งครอบครัว ไม่แจ้งนายจ้าง ไม่แจ้งใครเด็ดขาด",
      "คุณมีสิทธิเข้าถึงข้อมูลของตัวเอง และขอสำเนาผลตรวจได้",
    ],
    pointsEn: [
      "SWING's outreach records use a UIC code instead of your real name.",
      "HIV results are given one-to-one — never to family, employers, or anyone else.",
      "You have the right to access your data and request a copy of your results.",
    ],
    ctas: [
      { labelTh: "ศูนย์ความเป็นส่วนตัวของคุณ", labelEn: "Your privacy center", to: "/privacy-center", service: "PDPA Privacy Center (data access & deletion)" },
      { labelTh: "อ่านนโยบายความเป็นส่วนตัว", labelEn: "Read the privacy policy", to: "/th/privacy-policy", service: "Privacy policy" },
    ],
  },
];

export const FACT_CARD_GROUPS: Record<
  ChemsexFactCard["group"],
  { th: string; en: string }
> = {
  prepare: { th: "ก่อนเริ่ม", en: "Before" },
  during: { th: "ระหว่างใช้", en: "During" },
  after: { th: "หลังจบ", en: "After" },
  health: { th: "สุขภาพทางเพศ", en: "Sexual health" },
  mind: { th: "สุขภาพใจ", en: "Mental health" },
  rights: { th: "สิทธิและความปลอดภัย", en: "Rights & safety" },
};

export function getFactCard(slug?: string): ChemsexFactCard | undefined {
  return CHEMSEX_FACT_CARDS.find((c) => c.slug === slug);
}
