// Episode 2: มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่
// PrEP & Lenacapavir interactive story data

export interface Ep2Choice {
  key: string;
  cls: 'a' | 'b' | 'c';
  text: string;
  hint?: string;
  score: { knowledge: number; readiness: number; community: number };
  path?: 'oral' | 'inject';
  know?: string;
}

export interface Ep2Scene {
  id: number | string;
  label: string;
  narration: string;
  choices: Ep2Choice[];
  path?: 'oral' | 'inject';
}

export interface Ep2Knowledge {
  cls: string;
  icon: string;
  tag: string;
  title: string;
  body: string;
  btn: string;
  btnText: string;
}

export const EP2_STORY_ID = 'ep2_prep_lenacapavir';
export const EP2_TITLE_TH = 'มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่';
export const EP2_TITLE_EN = 'Episode 2: Marc and the injection he didn\'t know existed';
export const EP2_SUBTITLE_TH = 'เรื่องของการทำความเข้าใจ PrEP และทางเลือกใหม่อย่าง Lenacapavir';

export const EP2_SCENES: Ep2Scene[] = [
  {
    id: 1, label: '▌ เช้าหลังคืนนั้น · ห้องนอนมาร์ค',
    narration: 'เมื่อคืนมาร์คนอนไม่หลับ เขาเคยได้ยินคำว่า <span class="hl">PrEP</span> มาบ้าง แต่ไม่เคยคิดว่าเกี่ยวกับตัวเอง... จนกระทั่งตอนนี้',
    choices: [
      { key: 'a', cls: 'a', text: '📱 เปิด Google ค้นข้อมูล PrEP เองก่อนเลย', score: { knowledge: 2, readiness: 1, community: 0 }, know: 'what_is_prep' },
      { key: 'b', cls: 'b', text: '💬 Text หาเพื่อนที่กินอยู่แล้ว ถามตรงๆ', score: { knowledge: 1, readiness: 1, community: 2 } },
      { key: 'c', cls: 'c', text: '🏥 โทรนัดคลินิกเลย ไม่ต้องรอ', hint: 'กล้ามาก!', score: { knowledge: 1, readiness: 3, community: 0 }, know: 'what_is_prep' },
    ],
  },
  {
    id: 2, label: '▌ บ่ายโมง · ห้องรอ คลินิก MSM',
    narration: 'คลินิกดูดีกว่าที่คิดมาก บรรยากาศอบอุ่น ไม่เหมือนโรงพยาบาลทั่วไปเลย มาร์คยังเกร็งนิดนึง กลัวถูกถาม<span class="hl2">อะไรที่ตอบไม่ถูก</span>',
    choices: [
      { key: 'a', cls: 'a', text: '😬 "จะต้องเล่าทุกอย่างในชีวิตให้ฟังเลยมั้ย?"', score: { knowledge: 1, readiness: 1, community: 0 }, know: 'friendly_space' },
      { key: 'b', cls: 'b', text: '🤔 "เขาจะแนะนำอะไร? เราพร้อมรับข้อมูลรึยัง?"', score: { knowledge: 2, readiness: 1, community: 0 }, know: 'friendly_space' },
      { key: 'c', cls: 'c', text: '💪 "มาแล้ว ขอรู้ทุกอย่างเลย ไม่มีอะไรต้องปิด"', score: { knowledge: 1, readiness: 3, community: 1 } },
    ],
  },
  {
    id: 3, label: '▌ ห้องตรวจ · เจ้าหน้าที่อธิบาย PrEP',
    narration: 'เจ้าหน้าที่ถามเรื่อง lifestyle ด้วยน้ำเสียงปกติมาก ไม่ตัดสิน แล้วหยิบ <span class="hl">กล่องยา TDF/FTC</span> ขึ้นมา "PrEP แบบกิน กินทุกวัน ป้องกันได้มากกว่า 99%"',
    choices: [
      { key: 'a', cls: 'a', text: '✅ "โอเค ทำได้! ตั้ง alarm ได้เลย ไม่มีปัญหา"', score: { knowledge: 1, readiness: 3, community: 0 } },
      { key: 'b', cls: 'b', text: '😬 "ลืมแน่ๆ ชีวิตยุ่งมาก บางวันตื่นสายด้วย..."', score: { knowledge: 2, readiness: 1, community: 0 }, know: 'prep_adherence' },
      { key: 'c', cls: 'c', text: '🤔 "มีตัวเลือกอื่นมั้ย? ที่ไม่ต้องกินทุกวัน?"', hint: 'นำไปสู่ AHA moment', score: { knowledge: 3, readiness: 2, community: 0 }, know: 'prep_adherence' },
    ],
  },
  {
    id: 4, label: '▌ AHA MOMENT · เจ้าหน้าที่หันจอให้ดู',
    narration: 'เจ้าหน้าที่หยุด แล้วหันจอโน้ตบุ๊คให้มาร์คดู "จริงๆ มีอีกแบบนึง..." บนหน้าจอมีคำว่า <span class="hl4">LENACAPAVIR</span> กับรูป syringe และตัวเลข... <span class="hl3">100%</span>',
    choices: [
      { key: 'a', cls: 'a', text: '😮 "ทำไมไม่มีใครบอกเราเรื่องนี้มาก่อน?!"', score: { knowledge: 2, readiness: 1, community: 2 }, know: 'lenacapavir' },
      { key: 'b', cls: 'b', text: '🤩 "นี่แหละที่ใช่เลย! ฉีดปีละ 2 ครั้ง perfect!"', score: { knowledge: 2, readiness: 3, community: 0 }, know: 'lenacapavir' },
      { key: 'c', cls: 'c', text: '🧐 "รอก่อน... มันปลอดภัยมั้ย? ผ่านการทดสอบแล้วรึยัง?"', hint: 'ถามถูกมาก!', score: { knowledge: 3, readiness: 2, community: 0 }, know: 'lenacapavir' },
    ],
  },
  {
    id: 5, label: '▌ ห้องตรวจ · มาร์คต้องตัดสินใจ',
    narration: 'เจ้าหน้าที่บอกว่า "ตอนนี้เลือกได้ 2 ทาง — เริ่ม <span class="hl">PrEP กิน</span>ได้เลยวันนี้ หรือรอ <span class="hl4">Lenacapavir</span> ที่กำลังจะมา ไม่มีคำตอบผิด ขึ้นกับ lifestyle ของคุณ"',
    choices: [
      { key: 'a', cls: 'a', text: '💊 เริ่ม PrEP กินก่อนเลย — ป้องกันได้ทันที ไม่รอ', hint: '→ PATH: PrEP กิน', score: { knowledge: 1, readiness: 3, community: 0 }, path: 'oral', know: 'compare_prep' },
      { key: 'b', cls: 'b', text: '⏳ รอ Lenacapavir — ฉีดปีละ 2 ครั้งเหมาะกว่า', hint: '→ PATH: Lenacapavir', score: { knowledge: 2, readiness: 2, community: 0 }, path: 'inject', know: 'compare_prep' },
      { key: 'c', cls: 'c', text: '📋 ขอข้อมูลเพิ่ม แล้วค่อยตัดสินใจกลับบ้าน', hint: '→ PATH: Lenacapavir', score: { knowledge: 3, readiness: 1, community: 0 }, path: 'inject', know: 'compare_prep' },
    ],
  },
  {
    id: '6a', label: '▌ สัปดาห์แรก · ห้องน้ำตอนเช้า', path: 'oral',
    narration: 'วันแรกที่กิน มาร์ครู้สึกตื่นเต้นแปลกๆ มันเล็กมาก แค่เม็ดเดียว แต่รู้สึกเหมือนได้<span class="hl2">ดูแลตัวเองอย่างจริงจัง</span>ครั้งแรก',
    choices: [
      { key: 'a', cls: 'a', text: '⏰ ตั้ง alarm ทุกเช้า 8 โมง ชื่อว่า "ดูแลตัวเอง"', score: { knowledge: 1, readiness: 3, community: 0 }, know: 'prep_tips' },
      { key: 'b', cls: 'b', text: '📱 ใช้ testD Tracker ติดตาม streak เก็บ badge', score: { knowledge: 2, readiness: 2, community: 1 }, know: 'prep_tips' },
      { key: 'c', cls: 'c', text: '🤝 ชวนเพื่อนตั้ง reminder ด้วยกัน accountability buddy', score: { knowledge: 1, readiness: 2, community: 3 }, know: 'prep_tips' },
    ],
  },
  {
    id: '6b', label: '▌ ที่บ้าน · Marc subscribe รอ Lenacapavir', path: 'inject',
    narration: 'มาร์คยังไม่ได้เริ่มวันนี้ แต่ก็ได้รับคำแนะนำสำคัญ — <span class="hl3">"ระหว่างรอ Lenacapavir ขอแนะนำให้เริ่ม PrEP กินก่อนนะคะ ป้องกันได้ทันที"</span>',
    choices: [
      { key: 'a', cls: 'a', text: '💊 "โอเค เริ่มกินก่อนเลย ดีกว่ารอโดยไม่ป้องกัน"', score: { knowledge: 2, readiness: 3, community: 0 }, know: 'while_waiting' },
      { key: 'b', cls: 'b', text: '🔔 Subscribe รอ Lenacapavir + อ่านข้อมูลเพิ่มใน testD', score: { knowledge: 3, readiness: 2, community: 1 }, know: 'while_waiting' },
      { key: 'c', cls: 'c', text: '🛡️ "ใช้ถุงยางให้สม่ำเสมอระหว่างนี้ก่อน"', score: { knowledge: 2, readiness: 2, community: 0 }, know: 'while_waiting' },
    ],
  },
  {
    id: 7, label: '▌ หน้าคลินิก · แสงสีทอง',
    narration: 'มาร์คเดินออกมาจากคลินิก แสงบ่ายทองส่องหน้า เขาเปิด <span class="hl">testD app</span> บนโทรศัพท์ วันนี้เขารู้มากกว่าตอนเช้า — <span class="hl3">นั่นคือก้าวที่สำคัญที่สุด</span>',
    choices: [
      { key: 'a', cls: 'a', text: '📅 ตั้ง reminder นัด follow-up 3 เดือน + track ใน testD', score: { knowledge: 1, readiness: 3, community: 0 } },
      { key: 'b', cls: 'b', text: '🔔 Subscribe รออัปเดต Lenacapavir + แชร์ให้เพื่อน', score: { knowledge: 2, readiness: 1, community: 3 } },
      { key: 'c', cls: 'c', text: '🤝 ชวนเพื่อนที่สงสัยเรื่อง PrEP มาคลินิกด้วยกัน', score: { knowledge: 1, readiness: 1, community: 3 } },
    ],
  },
];

export const EP2_KNOWLEDGE: Record<string, Ep2Knowledge> = {
  what_is_prep: {
    cls: 'cyan', icon: '💊', tag: 'PrEP BASICS',
    title: 'PrEP คืออะไร?',
    body: `<strong>PrEP</strong> = Pre-Exposure Prophylaxis — ยาป้องกัน HIV <strong>ก่อนสัมผัส</strong><br/><br/>
    • ประสิทธิภาพ <strong>&gt;99%</strong> ถ้ากินสม่ำเสมอ<br/>
    • กินทุกวัน เวลาเดิม ไม่หยุดเอง<br/>
    • เริ่มป้องกันใน <strong>7 วัน</strong> (สำหรับ anal sex)<br/>
    • ต้องตรวจ HIV ก่อนเริ่ม และ follow-up ทุก 3 เดือน<br/>
    • ไม่ป้องกัน STI อื่น — ยังต้องใช้ถุงยางด้วยนะ<br/><br/>
    💡 PrEP ไม่ใช่ยาหลังเสี่ยง! ถ้าเพิ่งเสี่ยงต้องหา PEP ภายใน 72 ชม.`,
    btn: 'cyan', btnText: 'เข้าใจแล้ว! ไปต่อ 💊',
  },
  friendly_space: {
    cls: 'green', icon: '🌈', tag: 'SAFE SPACE',
    title: 'คลินิก Friendly Space คืออะไร?',
    body: `คลินิกที่ออกแบบมาเพื่อ LGBTQ+ และ key populations โดยเฉพาะ<br/><br/>
    • <strong>ไม่ตัดสิน</strong> ไม่ว่า lifestyle คุณจะเป็นยังไง<br/>
    • ขอ <strong>anonymous</strong> ได้ — ไม่ต้องให้ชื่อจริง<br/>
    • เจ้าหน้าที่ผ่านการอบรม LGBTQ+ inclusive care<br/>
    • ข้อมูลส่วนตัว <strong>ปลอดภัย</strong> ไม่รั่วไหล<br/>
    • พูดได้ทุกเรื่อง — เซ็กส์ ยา ความกังวล ทุกอย่าง<br/><br/>
    💡 testD เชื่อมกับคลินิก friendly space ทั่วไทย — หาคลินิกใกล้บ้านได้เลย`,
    btn: 'green', btnText: 'ดีมาก ไม่ต้องกลัวแล้ว 🌈',
  },
  prep_adherence: {
    cls: 'yellow', icon: '⏰', tag: 'ADHERENCE TIPS',
    title: 'PrEP กิน — ถ้ากลัวลืมทำยังไง?',
    body: `<strong>ไม่ต้องกินพร้อมอาหาร กินตอนไหนก็ได้ที่สม่ำเสมอ</strong><br/><br/>
    Tips ที่ได้ผล:<br/>
    • วางยาข้างแปรงสีฟัน — เห็นทุกเช้า<br/>
    • ตั้ง alarm ในโทรศัพท์ ชื่อว่า "ดูแลตัวเอง"<br/>
    • ใช้ app tracker เก็บ streak — สนุกกว่า!<br/>
    • ถ้าลืม <strong>ไม่เกิน 12 ชม.</strong> กินได้เลย ถ้าเกิน ข้ามไปมื้อถัดไป<br/><br/>
    <strong>นอกจากนี้ยังมี On-demand (2-1-1):</strong><br/>
    กิน 2 เม็ดก่อนเซ็กส์ 2-24 ชม. + อีก 1 เม็ดหลัง 24 ชม. + 1 เม็ดอีก 24 ชม.<br/><br/>
    ✨ และ... มีอีกตัวเลือกที่คุณกำลังจะได้รู้ 👀`,
    btn: 'yellow', btnText: 'โอ้ มีอะไรอีก? อยากรู้!',
  },
  lenacapavir: {
    cls: 'mint', icon: '💉', tag: '⭐ LENACAPAVIR — รุ่นใหม่',
    title: 'Lenacapavir — PrEP แบบฉีด',
    body: `💉 <strong>ฉีดทุก 6 เดือน (ปีละ 2 ครั้ง)</strong><br/><br/>
    <strong>กลไก:</strong> Capsid inhibitor — ทำงานต่างจาก PrEP กิน (NRTI) ทั้งหมด เป็นนวัตกรรมใหม่มาก<br/><br/>
    <strong>ประสิทธิภาพ:</strong><br/>
    • การทดลอง <strong>PURPOSE 1</strong> (ผู้หญิง แอฟริกา): <strong>ป้องกัน 100%</strong><br/>
    • การทดลอง <strong>PURPOSE 2</strong> (MSM, Trans): <strong>ป้องกัน 100%</strong><br/>
    • ไม่มีผู้เข้าร่วมการทดลองแม้แต่คนเดียวที่ติด HIV<br/><br/>
    <strong>ผลข้างเคียง:</strong> รอยแดง/บวมเล็กน้อยที่จุดฉีด ชั่วคราว ไม่กระทบไตหรือกระดูก<br/><br/>
    ⚠️ <strong>สถานะในไทย:</strong> ปัจจุบัน Lenacapavir อยู่ระหว่างขั้นตอนพิจารณาอนุมัติในไทย ยังไม่มีให้บริการทั่วไป แต่กำลังจะมา 🌟 ติดตามความคืบหน้าล่าสุดได้ที่ testD`,
    btn: 'mint', btnText: 'ว้าว! รู้แล้ว ขอบคุณมาก 🌟',
  },
  compare_prep: {
    cls: 'cyan', icon: '⚖️', tag: 'COMPARE · เลือกให้ตรง LIFESTYLE',
    title: 'PrEP กิน vs Lenacapavir',
    body: `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0">
    <tr><th></th><th style="color:#00e5ff;text-align:center">💊 PrEP กิน</th><th style="color:#7fffd4;text-align:center">💉 Lenacapavir</th></tr>
    <tr><td style="opacity:0.7">ความถี่</td><td style="text-align:center;color:#00e5ff">ทุกวัน</td><td style="text-align:center;color:#7fffd4">ทุก 6 เดือน</td></tr>
    <tr><td style="opacity:0.7">ประสิทธิภาพ</td><td style="text-align:center;color:#00e5ff">&gt;99%</td><td style="text-align:center;color:#7fffd4">100%*</td></tr>
    <tr><td style="opacity:0.7">เริ่มป้องกัน</td><td style="text-align:center;color:#00e5ff">~7 วัน</td><td style="text-align:center;color:#7fffd4">หลังฉีดทันที</td></tr>
    <tr><td style="opacity:0.7">ผลข้างเคียง</td><td style="text-align:center;color:#00e5ff">คลื่นไส้ช่วงแรก</td><td style="text-align:center;color:#7fffd4">บวมที่จุดฉีด</td></tr>
    <tr><td style="opacity:0.7">ความลับ</td><td style="text-align:center;color:#00e5ff">ต้องมียาที่บ้าน</td><td style="text-align:center;color:#7fffd4">สูงมาก</td></tr>
    <tr><td style="opacity:0.7">สถานะไทย</td><td style="text-align:center;color:#00cc70">ใช้ได้แล้ว ✓</td><td style="text-align:center;color:#ff3355">รออนุมัติ ⏳</td></tr>
    </table><br/>
    *จากการทดลอง PURPOSE 1 & 2 (2024)<br/><br/>
    <strong>ไม่มีคำตอบผิด</strong> — เลือกที่เหมาะกับชีวิตคุณ`,
    btn: 'cyan', btnText: 'เข้าใจแล้ว! ตัดสินใจได้แล้ว 💙',
  },
  prep_tips: {
    cls: 'cyan', icon: '🏆', tag: 'PrEP TRACKER',
    title: 'PrEP กิน — เริ่มต้นให้แข็งแกร่ง',
    body: `<strong>คุณเริ่มแล้ว! นั่นคือก้าวที่กล้าที่สุด</strong><br/><br/>
    สิ่งที่ต้องรู้ต่อไป:<br/>
    • กินวันแรก → <strong>เริ่มป้องกันใน 7 วัน</strong> (anal sex)<br/>
    • นัด follow-up ทุก <strong>3 เดือน</strong> — ตรวจ HIV + ไต<br/>
    • ถ้าลืม <strong>ไม่เกิน 12 ชม.</strong> กินได้เลย<br/>
    • ถ้าหยุดยา ป้องกันลดลงใน 7-10 วัน<br/><br/>
    <strong>testD Tracker:</strong><br/>
    • Log ยาทุกวัน → เก็บ streak 🔥<br/>
    • ครบ 7 วัน → badge "Week 1 Hero"<br/>
    • ครบ 30 วัน → badge "PrEP Champion"`,
    btn: 'cyan', btnText: 'เริ่ม Streak เลย! 🔥',
  },
  while_waiting: {
    cls: 'yellow', icon: '⏳', tag: 'ระหว่างรอ LENACAPAVIR',
    title: 'ดูแลตัวเองยังไงระหว่างรอ?',
    body: `<strong>Lenacapavir กำลังจะมา แต่ตอนนี้ก็ป้องกันได้เลย</strong><br/><br/>
    <strong>หมอแนะนำ: เริ่ม PrEP กินก่อน</strong><br/>
    • ป้องกันได้ทันที ไม่ต้องรอ<br/>
    • เมื่อ Lenacapavir พร้อม เปลี่ยนได้เลย<br/>
    • ดีกว่าไม่มีการป้องกันระหว่างรอ<br/><br/>
    <strong>พร้อมกันนี้:</strong><br/>
    • ใช้ถุงยางสม่ำเสมอ<br/>
    • Subscribe รับ alert ใน testD เมื่อ Lenacapavir พร้อม<br/>
    • ตรวจ HIV ทุก 3 เดือน<br/><br/>
    🔔 testD จะแจ้งเตือนคุณเมื่อ Lenacapavir พร้อมในไทย`,
    btn: 'yellow', btnText: 'โอเค รู้แล้ว ขอบคุณ! 💛',
  },
};

export const EP2_SCENE_ORDER = [1, 2, 3, 4, 5, '6a', '6b', 7] as const;

export function getEp2NextScene(currentId: number | string, path: string, choice?: Ep2Choice): number | string | 'result' {
  const id = String(currentId);
  if (id === '5') return choice?.path === 'oral' ? '6a' : '6b';
  if (id === '6a' || id === '6b') return 7;
  if (id === '7') return 'result';
  const nums = [1, 2, 3, 4, 5];
  const idx = nums.indexOf(Number(id));
  return idx >= 0 && idx < nums.length - 1 ? nums[idx + 1] : 'result';
}

export function getEp2ResultType(scores: { knowledge: number; readiness: number; community: number }): string {
  const { knowledge, readiness } = scores;
  if (knowledge >= 12 && readiness >= 10) return '🌟 PrEP Champion';
  if (knowledge >= 10) return '💡 Informed Explorer';
  if (readiness >= 10) return '💪 Ready to Go';
  return '💙 Just Starting';
}

export function getEp2ResultDescription(resultType: string): string {
  switch (resultType) {
    case '🌟 PrEP Champion':
      return 'คุณเข้าใจทุกอย่างและพร้อมดูแลตัวเองแล้ว ทั้ง PrEP กินและ Lenacapavir — คุณคือ inspiration ของชุมชน!';
    case '💡 Informed Explorer':
      return 'คุณรู้เรื่องราวดีมาก กำลังหาทางเลือกที่ใช่ — นั่นคือวิธีที่ชาญฉลาดที่สุด!';
    case '💪 Ready to Go':
      return 'คุณพร้อมดูแลตัวเองมาก ก้าวแรกสำคัญที่สุด และคุณก็กล้าเดินมาแล้ว!';
    default:
      return 'ทุกคนเริ่มจากตรงนี้ การรู้เรื่องนี้แล้วนับว่ากล้ามากแล้ว!';
  }
}

export const EP2_TOPICS = [
  { id: 'prep_basics', label: 'PrEP basics', labelTh: 'PrEP คืออะไร', episode: 2 },
  { id: 'prep_oral', label: 'PrEP แบบกิน', labelTh: 'PrEP แบบกิน', episode: 2 },
  { id: 'lenacapavir', label: 'Lenacapavir', labelTh: 'Lenacapavir / long-acting', episode: 2 },
  { id: 'friendly_clinic', label: 'Friendly clinic', labelTh: 'คลินิกที่ปลอดภัย', episode: 2 },
  { id: 'lifestyle_choice', label: 'Choosing prevention', labelTh: 'เลือกวิธีที่เหมาะกับคุณ', episode: 2 },
  { id: 'date_safety', label: 'Date safety', labelTh: 'ความปลอดภัยในการเดท', episode: 1 },
  { id: 'consent', label: 'Consent', labelTh: 'การยินยอม', episode: 1 },
  { id: 'harm_reduction', label: 'Harm reduction', labelTh: 'ลดอันตราย', episode: 1 },
];
