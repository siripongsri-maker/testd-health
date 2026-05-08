import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, TestTube, MessageCircle } from 'lucide-react';
import { trackEvent } from '@/hooks/useAnalytics';
import { trackEpisodeComplete, trackEpisodeShare, trackEpisodeCtaClick } from '@/lib/virtualEpisodeAnalytics';
import { VirtualShareCard } from '@/components/virtual/VirtualShareCard';

interface Props {
  onBack: () => void;
}

const HEAVENLY_STEMS = ['เจี๋ย', 'อิ่ว', 'ปิ่ง', 'ติง', 'อู้', 'จี่', 'เกิง', 'ซิน', 'เหริน', 'กุ่ย'];
const EARTHLY_BRANCHES = ['จื้อ', 'โฉ่ว', 'อิ๋น', 'เหม่า', 'เฉิน', 'ซื่อ', 'อู่', 'เว่ย', 'เซิน', 'โหย่ว', 'ซวี', 'ไฮ่'];

const HOUR_ANIMALS = [
  { name: 'หนู', emoji: '🐀', vibe: 'สายดึก ดวงเปลี่ยว' },
  { name: 'วัว', emoji: '🐂', vibe: 'อึดทน ลุยยาว' },
  { name: 'เสือ', emoji: '🐅', vibe: 'ดุดัน เร่าร้อน' },
  { name: 'กระต่าย', emoji: '🐇', vibe: 'หวานเจี๊ยบ น่ากอด' },
  { name: 'มังกร', emoji: '🐉', vibe: 'แรงเยอะ ปลุกง่าย' },
  { name: 'งู', emoji: '🐍', vibe: 'ลึกลับ มีลีลา' },
  { name: 'ม้า', emoji: '🐎', vibe: 'พลังเหลือ วิ่งทั้งวัน' },
  { name: 'แพะ', emoji: '🐐', vibe: 'อ่อนหวาน แต่ซน' },
  { name: 'ลิง', emoji: '🐒', vibe: 'พลิ้วไหว ติดเล่น' },
  { name: 'ไก่', emoji: '🐓', vibe: 'แต่งตัวจัด มาแรง' },
  { name: 'หมา', emoji: '🐕', vibe: 'ซื่อสัตย์ จัดจ้าน' },
  { name: 'หมู', emoji: '🐖', vibe: 'ฟิน เต็มอิ่ม' },
];

function getHourAnimalIndex(hour: number) {
  if (hour === 23 || hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

function createSeed(date: string, hour: number, minute: number) {
  const d = new Date(date);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + hour * 60 + minute;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const HOURS_UNTIL_DOOM = [
  { hours: 1, vibe: 'ฟ้าผ่ากลางใจ', desc: 'แทบไม่ทันกินเสร็จ ก็มีคนทักมาแล้ว' },
  { hours: 3, vibe: 'จัดเต็มไม่รอ', desc: 'พอยานึงเข้าระบบ ดวงก็เปิดประตู' },
  { hours: 6, vibe: 'ค่ำนี้ไม่นอนคนเดียว', desc: 'แค่ครึ่งวัน เรื่องก็เริ่มแล้ว' },
  { hours: 12, vibe: 'พรุ่งนี้เช้ามีเซอร์ไพรส์', desc: 'ตื่นมาอาจไม่ได้อยู่บ้านตัวเอง' },
  { hours: 24, vibe: 'หนึ่งวันเต็มกำลังจะฟิน', desc: 'รอบนี้ฟ้าจัดให้แบบเป๊ะเวลา' },
  { hours: 48, vibe: 'สองคืนนี้ระวังตัว', desc: 'ดวงเปิดยาวๆ ถ้าพร้อม ลุยเลย' },
  { hours: 72, vibe: 'สามวันแห่งการรอ', desc: 'อดทนหน่อย รางวัลใหญ่กำลังมา' },
];

const PILLS_UNTIL_DOOM = [
  { pills: 2, label: '2 เม็ดเอง' },
  { pills: 5, label: '5 เม็ดถ้วน' },
  { pills: 7, label: '7 เม็ดศักดิ์สิทธิ์' },
  { pills: 13, label: '13 เม็ดเลขมงคล' },
  { pills: 21, label: '21 เม็ดเต็มแพ็ค' },
  { pills: 28, label: '28 เม็ดครบเดือน' },
];

const DESTINY_TITLES = [
  'ดวงเปิดประตูสวรรค์ 🌈',
  'ดาวจัดหนักโคจรเข้า ⚡',
  'ฟ้าส่งของขวัญ 🎁',
  'ดวงโดนแบบไม่รู้ตัว 🍯',
  'ดาวฟินพุ่งชนชะตา 💫',
  'ฤกษ์งามยามจัดเต็ม 🔥',
  'ดวงพ่นพิษหวานเจี๊ยบ 🐝',
  'ราศีแซ่บแตกซ่าน 🍑',
];

const PARTNER_HINTS = [
  'คนเก่าที่ไม่ได้คุยมานาน',
  'คนใหม่ที่เพิ่งทักใน DM',
  'คนที่เจอในงานเลี้ยง',
  'คนแปลกหน้าใน BTS',
  'เพื่อนของเพื่อน',
  'แมตช์ในแอป สายเร็ว',
  'คนที่หมายตามานาน',
  'คนที่นึกไม่ถึงเลย',
];

const LUCKY_LOCATIONS = [
  'ห้องแอร์เย็นๆ',
  'โรงแรมริมแม่น้ำ',
  'คอนโดชั้นสูง',
  'รถส่วนตัวใต้ดิน',
  'ห้องน้ำในผับ',
  'บ้านเพื่อน',
  'ที่พักตากอากาศ',
];

const WARNINGS = [
  'อย่าลืมเช็กเวลากินยาให้ตรง ไม่งั้นดวงพังเอง',
  'ฟ้าจัดให้ก็จริง แต่ถุงต้องพร้อมนะคุณ',
  'ดวงเปิด แต่หัวต้องเย็น อย่าเมาจนลืมตัว',
  'พลังเยอะแบบนี้ พักดื่มน้ำบ่อยๆ ด้วย',
  'เตือนเลย โทรศัพท์ชาร์จไว้ให้พร้อม',
];

function generateFortune(seed: number) {
  const r = (n: number) => seededRandom(seed + n);
  return {
    title: DESTINY_TITLES[Math.floor(r(0) * DESTINY_TITLES.length)],
    hours: HOURS_UNTIL_DOOM[Math.floor(r(1) * HOURS_UNTIL_DOOM.length)],
    pills: PILLS_UNTIL_DOOM[Math.floor(r(2) * PILLS_UNTIL_DOOM.length)],
    partner: PARTNER_HINTS[Math.floor(r(3) * PARTNER_HINTS.length)],
    location: LUCKY_LOCATIONS[Math.floor(r(4) * LUCKY_LOCATIONS.length)],
    warning: WARNINGS[Math.floor(r(5) * WARNINGS.length)],
    luckyNumber: Math.floor(r(6) * 88) + 1,
    score: Math.floor(r(0) * 30) + 70,
  };
}

function getSajuPillars(date: string, hour: number) {
  const d = new Date(date);
  const dayIndex = (d.getFullYear() + d.getMonth() + d.getDate()) % 10;
  const dayBranch = (d.getFullYear() + d.getMonth() + d.getDate()) % 12;
  const hourIndex = (hour + 1) % 10;
  const hourBranch = getHourAnimalIndex(hour);
  return {
    dayStem: HEAVENLY_STEMS[dayIndex],
    dayBranch: EARTHLY_BRANCHES[dayBranch],
    hourStem: HEAVENLY_STEMS[hourIndex],
    hourBranch: EARTHLY_BRANCHES[hourBranch],
    animal: HOUR_ANIMALS[hourBranch],
  };
}

export default function PrepFortuneGame({ onBack }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'intro' | 'input' | 'result'>('intro');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [fortune, setFortune] = useState<ReturnType<typeof generateFortune> | null>(null);
  const [pillars, setPillars] = useState<ReturnType<typeof getSajuPillars> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent('virtual_prep_fortune_open', { source: '/virtual' });
  }, []);

  const handleSubmit = () => {
    if (!birthDate || !birthTime) return;
    const [h, m] = birthTime.split(':').map(Number);
    const seed = createSeed(birthDate, h, m);
    setFortune(generateFortune(seed));
    setPillars(getSajuPillars(birthDate, h));
    setStep('result');
    trackEvent('virtual_prep_fortune_reveal', { source: '/virtual' });
    const f = generateFortune(seed);
    trackEpisodeComplete(
      { slug: 'prep-fortune', title: 'ดวงโดน PrEP' },
      { result_type: f.title, score: f.score }
    );

    const completedRaw = localStorage.getItem('virtualCompleted');
    const completed = completedRaw ? JSON.parse(completedRaw) as string[] : [];
    if (!completed.includes('prep-fortune')) {
      completed.push('prep-fortune');
      localStorage.setItem('virtualCompleted', JSON.stringify(completed));
    }
  };

  const handleReset = () => {
    setStep('intro');
    setBirthDate('');
    setBirthTime('');
    setFortune(null);
    setPillars(null);
  };

  const handleShare = async () => {
    if (!fortune) return;
    const text = `🔮 ดวงโดน PrEP วันนี้ของฉัน\n${fortune.title}\n⏰ อีก ${fortune.hours.hours} ชม. → ${fortune.hours.vibe}\n💊 หรือกินอีก ${fortune.pills.label}\n📍 สถานที่มงคล: ${fortune.location}\n🎯 คะแนนดวงโดน: ${fortune.score}/100\n\nดูดวงของคุณที่ testD 🌈`;
    if ((navigator as any).share) {
      try { await (navigator as any).share({ text, title: 'ดวงโดน PrEP' }); } catch { /* */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert('คัดลอกข้อความแล้ว เอาไปแปะลง social ได้เลย ✨');
    }
    trackEvent('virtual_prep_fortune_share', { source: '/virtual' });
    trackEpisodeShare({ slug: 'prep-fortune', title: 'ดวงโดน PrEP' }, 'click');
  };

  return (
    <div style={styles.wrapper as any}>
      <style>{keyframes}</style>
      <button
        onClick={onBack}
        className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm text-foreground border border-border/30 shadow-sm"
        aria-label="Back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div style={styles.bgGlow as any} />
      <div style={styles.bgPattern as any} />

      <div style={styles.container as any}>
        <div style={styles.header as any}>
          <div style={styles.chineseChar as any}>命</div>
          <h1 style={styles.title as any}>ดวงโดน PrEP</h1>
          <div style={styles.subtitle as any}>· ซินแสไซเบอร์ทำนาย ·</div>
        </div>

        {step === 'intro' && (
          <div style={styles.card as any}>
            <div style={styles.introText as any}>
              <p style={{ marginBottom: 12 }}>
                ซินแสจะผูกดวงคุณกับศาสตร์ <strong>ซาจู (四柱)</strong>
                <br />เสาหลักวัน + เสาหลักชั่วโมงตกฟาก
              </p>
              <p style={{ marginBottom: 20, opacity: 0.8 }}>
                เพื่อทำนายว่า...<br />
                <span style={styles.highlight as any}>กิน PrEP กี่ชั่วโมง</span> หรือ<br />
                <span style={styles.highlight as any}>กินอีกกี่เม็ด</span><br />
                ก่อนดวงจะเปิดประตู 🚪✨
              </p>
              <p style={styles.warning as any}>
                ⚠️ เพื่อความบันเทิงเท่านั้น<br />
                ของจริงคือ กินตรงเวลา + ใช้ถุง
              </p>
            </div>
            <button style={styles.primaryBtn as any} onClick={() => setStep('input')}>เริ่มผูกดวง 🔮</button>
          </div>
        )}

        {step === 'input' && (
          <div style={styles.card as any}>
            <div style={styles.formLabel as any}>📅 วันเกิดของคุณ</div>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} style={styles.input as any} />
            <div style={{ ...(styles.formLabel as any), marginTop: 18 }}>⏰ เวลาตกฟาก</div>
            <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} style={styles.input as any} />
            <div style={styles.helper as any}>ถ้าจำไม่ได้ ใส่เวลาประมาณก็ได้ ดวงไม่ถือ</div>
            <button
              style={{ ...(styles.primaryBtn as any), marginTop: 24, opacity: birthDate && birthTime ? 1 : 0.5 }}
              onClick={handleSubmit}
              disabled={!birthDate || !birthTime}
            >เปิดดวง ✨</button>
            <button style={styles.linkBtn as any} onClick={() => setStep('intro')}>← ย้อนกลับ</button>
          </div>
        )}

        {step === 'result' && fortune && pillars && (
          <>
            <div ref={cardRef} style={{ ...(styles.card as any), animation: 'reveal 0.8s ease-out' }}>
              <div style={styles.animalBox as any}>
                <div style={styles.animalEmoji as any}>{pillars.animal.emoji}</div>
                <div style={styles.animalName as any}>ราศีชั่วโมง: {pillars.animal.name}</div>
                <div style={styles.animalVibe as any}>"{pillars.animal.vibe}"</div>
              </div>

              <div style={styles.pillarsBox as any}>
                <div style={styles.pillarLabel as any}>เสาหลักของคุณ</div>
                <div style={styles.pillarsGrid as any}>
                  <div style={styles.pillar as any}>
                    <div style={styles.pillarTitle as any}>เสาวัน</div>
                    <div style={styles.pillarValue as any}>{pillars.dayStem}<br />{pillars.dayBranch}</div>
                  </div>
                  <div style={styles.pillar as any}>
                    <div style={styles.pillarTitle as any}>เสาชั่วโมง</div>
                    <div style={styles.pillarValue as any}>{pillars.hourStem}<br />{pillars.hourBranch}</div>
                  </div>
                </div>
              </div>

              <div style={styles.fortuneTitle as any}>{fortune.title}</div>

              <div style={styles.scoreBox as any}>
                <div style={styles.scoreLabel as any}>คะแนนดวงโดน</div>
                <div style={styles.scoreNumber as any}>{fortune.score}<span style={styles.scoreMax as any}>/100</span></div>
                <div style={styles.scoreBar as any}>
                  <div style={{ ...(styles.scoreBarFill as any), width: `${fortune.score}%` }} />
                </div>
              </div>

              <div style={styles.predictionGroup as any}>
                {[
                  { icon: '⏰', head: `อีก ${fortune.hours.hours} ชั่วโมง`, sub: fortune.hours.vibe, desc: fortune.hours.desc },
                  { icon: '💊', head: `หรือกินอีก ${fortune.pills.label}`, desc: 'นับเม็ดดีๆ ดวงเปิดเป๊ะตามนี้' },
                  { icon: '👤', head: 'คนที่จะมา', sub: fortune.partner },
                  { icon: '📍', head: 'สถานที่มงคล', sub: fortune.location },
                  { icon: '🎲', head: 'เลขนำโชค', sub: String(fortune.luckyNumber) },
                ].map((p, i) => (
                  <div key={i} style={styles.predBlock as any}>
                    <div style={styles.predIcon as any}>{p.icon}</div>
                    <div style={styles.predBody as any}>
                      <div style={styles.predHead as any}>{p.head}</div>
                      {p.sub && <div style={styles.predSub as any}>{p.sub}</div>}
                      {p.desc && <div style={styles.predDesc as any}>{p.desc}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.warningBox as any}>
                <div style={styles.warningTitle as any}>คำเตือนจากซินแส</div>
                <div style={styles.warningText as any}>{fortune.warning}</div>
              </div>

              <div style={styles.stamp as any}>testD · 真</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <VirtualShareCard
                episodeSlug="prep-fortune"
                episodeTitle="ดวงโดน PrEP"
                emoji="🔮"
                accent="hsl(0, 72%, 51%)"
                resultTitle={fortune.title}
                resultDetail={`อีก ${fortune.hours.hours} ชม. → ${fortune.hours.vibe}\nคะแนนดวงโดน: ${fortune.score}/100`}
                hint="ดวงเปิด ถุงต้องพร้อม กินยาตรงเวลา"
              />
            </div>
            <button style={styles.secondaryBtn as any} onClick={handleReset}>🔮 ผูกดวงใหม่</button>

            {/* Real-world action bridges */}
            <div style={{ marginTop: 24, padding: 16, background: 'rgba(245, 230, 200, 0.05)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: 4 }}>
              <div style={{ fontSize: 13, color: '#d4af37', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center', fontWeight: 700 }}>
                🌟 จากดวง สู่การลงมือจริง
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  onClick={() => { trackEvent('virtual_prep_fortune_cta_booking', {}); trackEpisodeCtaClick({ slug: 'prep-fortune', title: 'PrEP Fortune' }, { cta_type: 'booking', cta_target: '/booking?service=prep' }); navigate('/booking?service=prep'); }}
                  style={{ ...(styles.secondaryBtn as any), marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Calendar className="h-4 w-4" /> นัดรับ PrEP
                </button>
                <button
                  onClick={() => { trackEvent('virtual_prep_fortune_cta_selftest', {}); navigate('/hiv-selftest'); }}
                  style={{ ...(styles.secondaryBtn as any), marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <TestTube className="h-4 w-4" /> รับชุดตรวจ
                </button>
                <button
                  onClick={() => { trackEvent('virtual_prep_fortune_cta_support', {}); navigate('/support-chat'); }}
                  style={{ ...(styles.secondaryBtn as any), marginTop: 0, gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <MessageCircle className="h-4 w-4" /> คุยกับเจ้าหน้าที่แบบไม่ระบุตัวตน
                </button>
              </div>
            </div>
          </>
        )}

        <div style={styles.footer as any}>※ ความบันเทิงล้วน ไม่ได้แทนคำแนะนำทางการแพทย์</div>
      </div>
    </div>
  );
}

const keyframes = `
  @keyframes reveal { 0% { opacity: 0; transform: translateY(20px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
`;

const styles = {
  wrapper: { minHeight: '100%', height: '100%', overflowY: 'auto', background: 'linear-gradient(180deg, #1a0405 0%, #2d0608 50%, #1a0405 100%)', color: '#f5e6c8', fontFamily: '"Noto Serif Thai", "Cormorant Garamond", serif', position: 'relative', padding: '20px 16px 40px' },
  bgGlow: { position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '120%', height: '60%', background: 'radial-gradient(ellipse, rgba(220, 38, 38, 0.25) 0%, transparent 60%)', pointerEvents: 'none', animation: 'pulse 4s ease-in-out infinite' },
  bgPattern: { position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(245, 230, 200, 0.02) 40px, rgba(245, 230, 200, 0.02) 41px)`, pointerEvents: 'none' },
  container: { maxWidth: 480, margin: '0 auto', position: 'relative', zIndex: 1 },
  header: { textAlign: 'center', marginBottom: 28 },
  chineseChar: { fontSize: 72, color: '#dc2626', fontWeight: 900, lineHeight: 1, textShadow: '0 0 20px rgba(220, 38, 38, 0.6), 2px 2px 0 #f5e6c8', animation: 'float 3s ease-in-out infinite' },
  title: { fontSize: 36, fontWeight: 800, margin: '12px 0 4px', color: '#f5e6c8', letterSpacing: '0.05em', textShadow: '0 2px 8px rgba(0,0,0,0.5)' },
  subtitle: { fontSize: 14, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase', fontStyle: 'italic' },
  card: { background: 'linear-gradient(145deg, #2d0608 0%, #1a0405 100%)', border: '2px solid #d4af37', borderRadius: 4, padding: '32px 24px', marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212, 175, 55, 0.2)', position: 'relative' },
  introText: { fontSize: 17, lineHeight: 1.7, textAlign: 'center', color: '#f5e6c8' },
  highlight: { color: '#dc2626', fontWeight: 700, fontSize: 19 },
  warning: { fontSize: 13, color: '#d4af37', fontStyle: 'italic', marginTop: 16, paddingTop: 16, borderTop: '1px dashed rgba(212, 175, 55, 0.4)' },
  formLabel: { fontSize: 15, color: '#d4af37', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' },
  input: { width: '100%', padding: '14px 16px', fontSize: 16, background: 'rgba(245, 230, 200, 0.05)', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: 4, color: '#f5e6c8', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
  helper: { fontSize: 12, color: 'rgba(245, 230, 200, 0.5)', marginTop: 6, fontStyle: 'italic' },
  primaryBtn: { width: '100%', padding: '16px', fontSize: 17, fontWeight: 700, background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: '#f5e6c8', border: '1px solid #d4af37', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em', boxShadow: '0 4px 16px rgba(220, 38, 38, 0.4)', marginTop: 8 },
  secondaryBtn: { width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: 'transparent', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.5)', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit', marginTop: 10 },
  linkBtn: { width: '100%', padding: '12px', fontSize: 14, background: 'transparent', color: 'rgba(245, 230, 200, 0.6)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
  animalBox: { textAlign: 'center', marginBottom: 20, padding: 16, background: 'rgba(212, 175, 55, 0.05)', borderRadius: 4, border: '1px solid rgba(212, 175, 55, 0.2)' },
  animalEmoji: { fontSize: 64, lineHeight: 1, animation: 'float 2.5s ease-in-out infinite' },
  animalName: { fontSize: 18, fontWeight: 700, color: '#d4af37', marginTop: 8 },
  animalVibe: { fontSize: 13, color: 'rgba(245, 230, 200, 0.7)', fontStyle: 'italic', marginTop: 4 },
  pillarsBox: { marginBottom: 24 },
  pillarLabel: { textAlign: 'center', fontSize: 12, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 },
  pillarsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  pillar: { padding: '14px 8px', background: 'linear-gradient(180deg, rgba(220, 38, 38, 0.15) 0%, transparent 100%)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 4, textAlign: 'center' },
  pillarTitle: { fontSize: 11, color: '#d4af37', letterSpacing: '0.1em', marginBottom: 6 },
  pillarValue: { fontSize: 18, fontWeight: 700, color: '#f5e6c8', lineHeight: 1.3 },
  fortuneTitle: { fontSize: 26, fontWeight: 800, textAlign: 'center', color: '#d4af37', margin: '20px 0', textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' },
  scoreBox: { textAlign: 'center', marginBottom: 24, padding: 16, background: 'rgba(220, 38, 38, 0.08)', borderRadius: 4 },
  scoreLabel: { fontSize: 12, color: '#d4af37', letterSpacing: '0.2em', textTransform: 'uppercase' },
  scoreNumber: { fontSize: 56, fontWeight: 900, color: '#dc2626', lineHeight: 1, margin: '4px 0 12px', textShadow: '0 0 24px rgba(220, 38, 38, 0.6)' },
  scoreMax: { fontSize: 22, color: 'rgba(245, 230, 200, 0.5)' },
  scoreBar: { height: 8, background: 'rgba(245, 230, 200, 0.1)', borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', background: 'linear-gradient(90deg, #dc2626, #d4af37)', backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite', transition: 'width 1s ease-out' },
  predictionGroup: { display: 'flex', flexDirection: 'column', gap: 12 },
  predBlock: { display: 'flex', gap: 14, padding: 14, background: 'rgba(245, 230, 200, 0.04)', borderLeft: '3px solid #d4af37', borderRadius: 4 },
  predIcon: { fontSize: 28, flexShrink: 0 },
  predBody: { flex: 1 },
  predHead: { fontSize: 16, fontWeight: 700, color: '#f5e6c8', marginBottom: 2 },
  predSub: { fontSize: 15, color: '#d4af37', marginBottom: 2 },
  predDesc: { fontSize: 13, color: 'rgba(245, 230, 200, 0.6)', lineHeight: 1.5 },
  warningBox: { marginTop: 24, padding: '14px 16px', background: 'rgba(220, 38, 38, 0.1)', border: '1px dashed rgba(220, 38, 38, 0.5)', borderRadius: 4 },
  warningTitle: { fontSize: 12, color: '#dc2626', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 700 },
  warningText: { fontSize: 14, color: '#f5e6c8', lineHeight: 1.5 },
  stamp: { position: 'absolute', bottom: 12, right: 14, fontSize: 11, color: '#dc2626', border: '1px solid #dc2626', padding: '2px 8px', borderRadius: 2, letterSpacing: '0.1em', opacity: 0.7 },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(245, 230, 200, 0.4)', marginTop: 20, letterSpacing: '0.05em' },
};
