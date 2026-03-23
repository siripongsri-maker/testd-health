/**
 * Branching interactive story: "นัดเดท" (Going on a Date)
 * Teaches safer behaviors through storytelling.
 */

export type Speaker = "narrator" | "friend" | "staff" | "date" | "player";

export interface StoryChoice {
  text: string;
  nextId: string;
  effect: { safe?: number; risk?: number };
  tag?: string;
}

export interface StoryNode {
  id: string;
  scene: string; // visual scene key
  speaker: Speaker;
  speakerName?: string;
  text: string;
  textEn?: string;
  choices?: StoryChoice[];
  nextId?: string; // auto-advance (no choices)
  isEnding?: boolean;
  endingType?: "safe" | "semi-safe" | "risky" | "disengage";
}

export const SCENES: Record<string, { bg: string; label: string }> = {
  bedroom: { bg: "linear-gradient(180deg, #2a2040 0%, #3d2d5c 40%, #5a3d7a 100%)", label: "ห้องนอน" },
  chat: { bg: "linear-gradient(180deg, #1a2a3a 0%, #243848 40%, #2d4a5a 100%)", label: "หน้าจอแชท" },
  friend_room: { bg: "linear-gradient(180deg, #2a3a2a 0%, #3a5040 40%, #4a6050 100%)", label: "ห้องเพื่อน" },
  clinic: { bg: "linear-gradient(180deg, #1a3a3a 0%, #2a5050 40%, #3a6868 100%)", label: "คลินิก SWING" },
  street: { bg: "linear-gradient(180deg, #1a1a2e 0%, #2a2a4e 40%, #3a3a5e 100%)", label: "ถนน" },
  cafe: { bg: "linear-gradient(180deg, #3a2a1a 0%, #5a4030 40%, #6a5040 100%)", label: "คาเฟ่" },
  room: { bg: "linear-gradient(180deg, #2a1a2a 0%, #4a2a4a 40%, #5a3a5a 100%)", label: "ห้อง" },
  ending: { bg: "linear-gradient(180deg, #1a2a3a 0%, #2a4050 40%, #3a5868 100%)", label: "ตอนจบ" },
};

export const SPEAKER_CONFIG: Record<Speaker, { name: string; color: string; avatar: string }> = {
  narrator: { name: "เล่าเรื่อง", color: "#a0b8c8", avatar: "📖" },
  friend: { name: "เพื่อน", color: "#7ecf8e", avatar: "🧑" },
  staff: { name: "พี่บี SWING", color: "#e888b8", avatar: "👩‍⚕️" },
  date: { name: "คนที่นัด", color: "#f0a860", avatar: "💬" },
  player: { name: "คุณ", color: "#88c8e8", avatar: "🙂" },
};

export const STORY_NODES: StoryNode[] = [
  // ─── Scene 1: เริ่มต้น ───
  {
    id: "start",
    scene: "bedroom",
    speaker: "narrator",
    text: "คืนนี้... มีข้อความเด้งเข้ามา จากคนที่คุยกันมาสักพัก",
    nextId: "msg1",
  },
  {
    id: "msg1",
    scene: "chat",
    speaker: "date",
    speakerName: "คนที่นัด",
    text: "วันนี้ว่างมั้ย? อยากเจอจัง 🥰 มาเจอกันมั้ย?",
    choices: [
      { text: "อยากไป! บอกเพื่อนก่อนนะ", nextId: "tell_friend", effect: { safe: 1 }, tag: "share_location" },
      { text: "โอเค ไปเลย ไม่ต้องบอกใคร", nextId: "no_tell", effect: { risk: 1 } },
      { text: "ยังไม่พร้อมวันนี้นะ", nextId: "decline_early", effect: { safe: 1 }, tag: "self_respect" },
    ],
  },

  // ─── Scene 2a: คุยกับเพื่อน ───
  {
    id: "tell_friend",
    scene: "friend_room",
    speaker: "friend",
    text: "เฮ้! ดีใจที่บอก~ ส่ง location ให้ฉันด้วยนะ ถ้ามีอะไรจะได้ช่วยได้",
    choices: [
      { text: "ได้เลย จะ share location ให้", nextId: "share_loc", effect: { safe: 1 }, tag: "share_location" },
      { text: "โอเค แต่ไม่ share location หรอก", nextId: "no_share_loc", effect: { risk: 1 } },
    ],
  },
  {
    id: "share_loc",
    scene: "friend_room",
    speaker: "friend",
    text: "เยี่ยม! แล้วเตรียมอะไรยัง? ถุงยาง เจลหล่อลื่น พกมั้ย?",
    nextId: "prep_question",
  },
  {
    id: "no_share_loc",
    scene: "friend_room",
    speaker: "friend",
    text: "ก็ได้... แต่ระวังตัวด้วยนะ แล้วเตรียมอะไรยัง?",
    nextId: "prep_question",
  },

  // ─── Scene 2b: ไม่บอกใคร ───
  {
    id: "no_tell",
    scene: "bedroom",
    speaker: "narrator",
    text: "คุณตัดสินใจไปเอง ไม่บอกใคร... ก่อนออกจากบ้าน คุณเตรียมตัวอะไรมั้ย?",
    nextId: "prep_question",
  },

  // ─── Scene 2c: ปฏิเสธ ───
  {
    id: "decline_early",
    scene: "bedroom",
    speaker: "narrator",
    text: "คุณบอกเค้าว่ายังไม่พร้อม... เค้าก็เข้าใจนะ",
    nextId: "decline_react",
  },
  {
    id: "decline_react",
    scene: "chat",
    speaker: "date",
    text: "โอเคนะ ไว้ค่อยนัดใหม่ 😊",
    nextId: "ending_disengage",
  },

  // ─── Scene 3: เตรียมตัว ───
  {
    id: "prep_question",
    scene: "bedroom",
    speaker: "narrator",
    text: "ก่อนออกจากบ้าน... คุณจะเตรียมอะไรมั้ย?",
    choices: [
      { text: "พกถุงยาง + เจลหล่อลื่น", nextId: "packed_safe", effect: { safe: 2 }, tag: "condom" },
      { text: "ไม่เตรียมอะไร ไปเลย", nextId: "packed_nothing", effect: { risk: 1 } },
      { text: "แวะคลินิก SWING รับของก่อน", nextId: "visit_clinic", effect: { safe: 2 }, tag: "clinic" },
    ],
  },

  // ─── Scene 3a: แวะ SWING ───
  {
    id: "visit_clinic",
    scene: "clinic",
    speaker: "staff",
    text: "ยินดีต้อนรับ! มารับถุงยางกับเจลหล่อลื่นใช่มั้ย? เรามีแจกฟรีนะคะ 💕",
    nextId: "clinic_advice",
  },
  {
    id: "clinic_advice",
    scene: "clinic",
    speaker: "staff",
    text: "อ๋อ จะไปเจอคน~ ดีใจที่แวะมาก่อน! ถ้านัดที่สาธารณะก่อนจะปลอดภัยกว่านะ แล้วก็อย่าลืมสื่อสาร consent กับเค้าด้วย",
    nextId: "clinic_done",
  },
  {
    id: "clinic_done",
    scene: "clinic",
    speaker: "staff",
    text: "เอาถุงยางไปนะ มีเจลด้วย ระวังตัวด้วยนะ ถ้ามีอะไรโทรหา SWING ได้เลย! 📞",
    nextId: "location_choice",
  },

  // ─── Scene 3b: พกแล้ว / ไม่พก ───
  {
    id: "packed_safe",
    scene: "bedroom",
    speaker: "narrator",
    text: "เตรียมพร้อม! ถุงยาง + เจลอยู่ในกระเป๋าแล้ว ✅ จะนัดเจอกันที่ไหนดี?",
    nextId: "location_choice",
  },
  {
    id: "packed_nothing",
    scene: "bedroom",
    speaker: "narrator",
    text: "ไม่ได้เตรียมอะไรเลย... ก็ไปเลยแล้วกัน จะนัดเจอกันที่ไหนดี?",
    nextId: "location_choice",
  },

  // ─── Scene 4: สถานที่นัดเจอ ───
  {
    id: "location_choice",
    scene: "street",
    speaker: "narrator",
    text: "ถึงเวลานัดแล้ว... จะเจอกันที่ไหน?",
    choices: [
      { text: "นัดเจอที่คาเฟ่ก่อน ที่สาธารณะ", nextId: "meet_cafe", effect: { safe: 1 }, tag: "public_place" },
      { text: "ไปห้องเค้าเลย", nextId: "meet_room_direct", effect: { risk: 2 } },
    ],
  },

  // ─── Scene 4a: คาเฟ่ ───
  {
    id: "meet_cafe",
    scene: "cafe",
    speaker: "date",
    text: "เฮ้~ มาถึงแล้ว! ดีใจจังที่ได้เจอ 😊",
    nextId: "cafe_vibe",
  },
  {
    id: "cafe_vibe",
    scene: "cafe",
    speaker: "narrator",
    text: "บรรยากาศดี พูดคุยกันสบายๆ รู้สึกปลอดภัย... หลังจากคุยกันสักพัก เค้าชวนไปต่อ",
    choices: [
      { text: "โอเค ไปต่อกัน", nextId: "go_room", effect: {} },
      { text: "วันนี้คุยแค่นี้ก่อนนะ ไว้นัดใหม่", nextId: "ending_disengage_late", effect: { safe: 1 } },
    ],
  },

  // ─── Scene 4b: ไปห้องเลย ───
  {
    id: "meet_room_direct",
    scene: "room",
    speaker: "narrator",
    text: "คุณไปที่ห้องเค้าเลย... ไม่ได้เจอกันที่สาธารณะก่อน",
    nextId: "go_room",
  },

  // ─── Scene 5: ในห้อง ───
  {
    id: "go_room",
    scene: "room",
    speaker: "narrator",
    text: "บรรยากาศเริ่มใกล้ชิดขึ้น... ถึงเวลาสื่อสารกัน",
    choices: [
      { text: "คุยเรื่อง consent ก่อน: \"อะไรโอเค อะไรไม่โอเค\"", nextId: "talk_consent", effect: { safe: 2 }, tag: "consent" },
      { text: "ตามน้ำเลย ไม่พูดอะไร", nextId: "no_consent_talk", effect: { risk: 2 } },
    ],
  },

  // ─── Scene 5a: คุย consent ───
  {
    id: "talk_consent",
    scene: "room",
    speaker: "player",
    text: "เฮ้ ก่อนอะไร อยากคุยกันก่อนนะ อะไรโอเค อะไรไม่โอเค",
    nextId: "consent_response",
  },
  {
    id: "consent_response",
    scene: "room",
    speaker: "date",
    text: "โอเค ชอบที่พูดตรงๆ นะ 💛 มาคุยกัน",
    nextId: "negotiation",
  },

  // ─── Scene 5b: ไม่คุย consent ───
  {
    id: "no_consent_talk",
    scene: "room",
    speaker: "narrator",
    text: "ไม่ได้คุยอะไรก่อน... สิ่งต่างๆ ดำเนินไปเอง",
    nextId: "negotiation",
  },

  // ─── Scene 6: Negotiation ───
  {
    id: "negotiation",
    scene: "room",
    speaker: "date",
    text: "ไม่ต้องใช้ถุงก็ได้มั้ย? สบายกว่า~",
    choices: [
      { text: "ใช้ถุงยางนะ ไม่ใช้ไม่ได้", nextId: "insist_condom", effect: { safe: 2 }, tag: "condom" },
      { text: "ก็ได้... ไม่ใช้ก็ได้", nextId: "no_condom", effect: { risk: 3 } },
      { text: "ถ้าไม่ใช้ถุง ฉันไม่ทำนะ", nextId: "firm_boundary", effect: { safe: 3 }, tag: "boundary" },
    ],
  },

  // ─── Scene 6a: ยืนยันใช้ถุง ───
  {
    id: "insist_condom",
    scene: "room",
    speaker: "date",
    text: "โอเค~ ใช้ก็ใช้ 😊",
    nextId: "check_ending",
  },

  // ─── Scene 6b: ไม่ใช้ถุง ───
  {
    id: "no_condom",
    scene: "room",
    speaker: "narrator",
    text: "คุณยอมไม่ใช้ถุงยาง... ความเสี่ยงเพิ่มขึ้น",
    nextId: "check_ending",
  },

  // ─── Scene 6c: ยืนยันขอบเขต ───
  {
    id: "firm_boundary",
    scene: "room",
    speaker: "date",
    text: "โอเค เข้าใจ เคารพในสิ่งที่คุณต้องการ 🙏",
    nextId: "check_ending",
  },

  // ─── Routing node (invisible, auto-routes by score) ───
  {
    id: "check_ending",
    scene: "ending",
    speaker: "narrator",
    text: "...",
    // This is a routing node - the engine will calculate score and redirect
    nextId: "ending_safe", // default, overridden by engine
  },

  // ─── Scene: ยกเลิกหลังเจอ ───
  {
    id: "ending_disengage_late",
    scene: "cafe",
    speaker: "narrator",
    text: "คุณเลือกจบที่คาเฟ่ เป็นนัดที่ดี ได้รู้จักกัน แต่ไม่จำเป็นต้องไปต่อ 💛",
    nextId: "ending_disengage",
  },

  // ─── ENDINGS ───
  {
    id: "ending_safe",
    scene: "ending",
    speaker: "narrator",
    text: "🌟 คุณรู้จักปกป้องตัวเอง สื่อสาร consent และใช้ protection เก่งมาก!",
    isEnding: true,
    endingType: "safe",
  },
  {
    id: "ending_semi",
    scene: "ending",
    speaker: "narrator",
    text: "⚡ คุณทำได้ดีในหลายเรื่อง แต่มีบางจุดที่สามารถปลอดภัยกว่านี้ได้ ลองดูคำแนะนำนะ",
    isEnding: true,
    endingType: "semi-safe",
  },
  {
    id: "ending_risky",
    scene: "ending",
    speaker: "narrator",
    text: "💛 คราวนี้มีความเสี่ยงบ้าง... ไม่เป็นไรนะ ครั้งหน้าลองเตรียมตัวให้พร้อมขึ้น เรามีทีมพร้อมช่วยเสมอ",
    isEnding: true,
    endingType: "risky",
  },
  {
    id: "ending_disengage",
    scene: "ending",
    speaker: "narrator",
    text: "✨ การรู้ว่าตัวเองยังไม่พร้อม เป็นทางเลือกที่เก่งมาก! คุณเคารพตัวเองได้ดี 💕",
    isEnding: true,
    endingType: "disengage",
  },
];

export const ENDING_DETAILS: Record<string, {
  title: string;
  titleEn: string;
  message: string;
  xp: number;
  color: string;
  icon: string;
  tips: string[];
}> = {
  safe: {
    title: "ไปนัดแบบเซฟ ๆ",
    titleEn: "Safe & Empowered",
    message: "คุณเตรียมตัวดี สื่อสารชัด และปกป้องตัวเอง ✨",
    xp: 500,
    color: "#4aba80",
    icon: "🏆",
    tips: [
      "ดีมาก! การแชร์ location กับเพื่อนช่วยได้จริง",
      "การพกถุงยางและเจลคือการรักตัวเอง",
      "การพูดเรื่อง consent ก่อนทำให้ทุกคนสบายใจ",
    ],
  },
  "semi-safe": {
    title: "เกือบเซฟแล้ว!",
    titleEn: "Almost There",
    message: "ทำได้ดีหลายเรื่อง แต่มีบางจุดที่ปรับได้นะ 💪",
    xp: 200,
    color: "#f0a860",
    icon: "⚡",
    tips: [
      "ลองแชร์ location กับเพื่อนครั้งหน้านะ",
      "การพกถุงยางไว้ก่อนดีกว่าไม่มี",
      "ลองนัดเจอที่สาธารณะก่อนจะปลอดภัยกว่า",
    ],
  },
  risky: {
    title: "มีความเสี่ยงนะ",
    titleEn: "Be Careful Next Time",
    message: "ไม่เป็นไร ครั้งหน้าลองเตรียมตัวให้พร้อมขึ้น เรามีทีมพร้อมช่วยเสมอ 💛",
    xp: 0,
    color: "#e06070",
    icon: "💛",
    tips: [
      "ลองบอกเพื่อนก่อนไปเจอคนที่นัด",
      "การใช้ถุงยางลดความเสี่ยง HIV/STI ได้มาก",
      "SWING มีถุงยางและเจลฟรี แวะรับได้เลย",
      "ถ้ามีเรื่องกังวล ปรึกษาเจ้าหน้าที่ SWING ได้นะ",
    ],
  },
  disengage: {
    title: "เคารพตัวเอง",
    titleEn: "Self-Respect",
    message: "การรู้ว่ายังไม่พร้อม เป็นทางเลือกที่ดี! คุณเก่งมาก ✨",
    xp: 300,
    color: "#88a8e8",
    icon: "✨",
    tips: [
      "ไม่ต้องรีบ ใช้เวลาของตัวเองได้",
      "ถ้าพร้อมเมื่อไหร่ SWING พร้อมให้คำแนะนำ",
      "ลองดูข้อมูลเรื่อง safer dating ไว้ก่อนก็ได้",
    ],
  },
};

export const SWING_SERVICES = [
  {
    icon: "🩺",
    title: "ตรวจสุขภาพ / HIV & STI Testing",
    desc: "อยากตรวจก่อนหรือหลังนัด? เรามีบริการที่เป็นมิตรและไม่ตัดสินคุณ",
    route: "/booking",
    cta: "นัดตรวจเลย",
  },
  {
    icon: "🎁",
    title: "รับถุงยาง / เจลหล่อลื่น ฟรี",
    desc: "แวะมารับได้เลย หรือสั่งทางออนไลน์ก็ได้",
    route: "/clinic",
    cta: "ดูรายละเอียด",
  },
  {
    icon: "💬",
    title: "ปรึกษาเจ้าหน้าที่",
    desc: "มีเรื่องกังวล? พูดคุยกับทีม SWING ได้เลย ไม่ตัดสินคุณ",
    route: "/chat",
    cta: "เริ่มคุย",
  },
  {
    icon: "📅",
    title: "นัดหมายผ่าน testBKK",
    desc: "จองเวลาสะดวก มาตรวจไม่ต้องรอ",
    route: "/booking",
    cta: "จองเลย",
  },
];
