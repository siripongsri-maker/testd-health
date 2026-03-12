import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

// ── Language types ──────────────────────────────────────────────
export type Language = 'th' | 'en' | 'km' | 'lo' | 'vi' | 'my';

export const SUPPORTED_LANGUAGES: { code: Language; label: string; nativeLabel: string }[] = [
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย' },
  { code: 'en', label: 'English', nativeLabel: 'EN' },
  { code: 'km', label: 'Khmer', nativeLabel: 'ខ្មែរ' },
  { code: 'lo', label: 'Lao', nativeLabel: 'ລາວ' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
  { code: 'my', label: 'Burmese', nativeLabel: 'မြန်မာ' },
];

// ── Static dictionaries (th + en only) ──────────────────────────
const translations: Record<'th' | 'en', Record<string, string>> = {
  th: {
    // Landing
    'app.name': 'testD',
    'app.tagline': 'เพื่อนคู่ใจด้านสุขภาพทางเพศ',
    'app.description': 'ติดตาม เรียนรู้ และดูแลการป้องกัน — ในแบบของคุณ ส่วนตัว สนับสนุน และไม่ตัดสิน',
    'landing.startAnonymous': 'เริ่มต้นแบบไม่ระบุตัวตน',
    'landing.loginEmail': 'เข้าสู่ระบบด้วยอีเมล',
    'landing.anonymous': 'ไม่ระบุตัวตน',
    'landing.secure': 'ปลอดภัย',
    'landing.free': 'ฟรี',
    'landing.disclaimer': 'testD เป็นเครื่องมือสนับสนุนสุขภาพ ไม่ใช่คำแนะนำทางการแพทย์',
    'landing.consult': 'โปรดปรึกษาผู้ให้บริการด้านสุขภาพเสมอ',

    // Onboarding
    'onboarding.q1': 'คุณอยู่ในสถานะไหนตอนนี้?',
    'onboarding.q1.subtitle': 'เลือกสิ่งที่เหมาะกับคุณ สามารถเปลี่ยนได้ภายหลัง',
    'onboarding.prep': 'ใช้ PrEP อยู่',
    'onboarding.prep.desc': 'การป้องกันแบบรายวันหรือตามเหตุการณ์',
    'onboarding.pep': 'ใช้ PEP อยู่',
    'onboarding.pep.desc': 'การรักษาหลังสัมผัสเชื้อ',
    'onboarding.exploring': 'กำลังศึกษาข้อมูล',
    'onboarding.exploring.desc': 'เรียนรู้เกี่ยวกับทางเลือกต่างๆ',
    'onboarding.q2': 'คุณใช้ PrEP แบบไหน?',
    'onboarding.daily': 'PrEP รายวัน',
    'onboarding.daily.desc': 'กินยาหนึ่งเม็ดทุกวัน',
    'onboarding.ondemand': 'PrEP ตามเหตุการณ์',
    'onboarding.ondemand.desc': 'กินก่อนและหลังมีกิจกรรม',
    'onboarding.skip': 'ข้ามไปก่อน',

    // Consent
    'consent.title': 'ความเป็นส่วนตัวของคุณสำคัญ',
    'consent.subtitle': 'เราเชื่อในความโปร่งใสเกี่ยวกับการใช้ข้อมูลเพื่อช่วยคุณและชุมชน',
    'consent.anonymous': 'เก็บข้อมูลการใช้งานแบบไม่ระบุตัวตนเท่านั้น',
    'consent.noIdentity': 'ไม่จำเป็นต้องระบุตัวตน',
    'consent.improve': 'ช่วยปรับปรุงบริการ',
    'consent.agree': 'ฉันยินยอมให้เก็บข้อมูลแบบไม่ระบุตัวตนเพื่อช่วยปรับปรุง testD และสนับสนุนการรณรงค์ด้านสุขภาพทางเพศ ฉันเข้าใจว่าไม่จำเป็นต้องให้ข้อมูลส่วนบุคคลใดๆ',
    'consent.continue': 'ดำเนินการต่อ',
    'consent.changeAnytime': 'คุณสามารถเปลี่ยนแปลงได้ทุกเมื่อในการตั้งค่า',

    // Dashboard
    'dashboard.welcome': 'ยินดีต้อนรับกลับ',
    'dashboard.doingGreat': 'คุณทำได้ดีมาก',
    'dashboard.today': 'วันนี้',
    'dashboard.takePrep': 'กิน PrEP วันนี้',
    'dashboard.pepDay': 'PEP วันที่',
    'dashboard.of28': 'จาก 28',
    'dashboard.taken': 'กินแล้ว',
    'dashboard.skipped': 'ข้าม',
    'dashboard.greatJob': 'เยี่ยมมาก! +10 XP',
    'dashboard.skippedToday': 'ข้ามวันนี้',
    'dashboard.setupJourney': 'ตั้งค่าการเดินทางของคุณ',
    'dashboard.setupSubtitle': 'ตั้งค่าการป้องกันเพื่อเริ่มติดตาม',
    'dashboard.startDaily': 'เริ่ม PrEP รายวัน',
    'dashboard.startOndemand': 'เริ่ม PrEP ตามเหตุการณ์',
    'dashboard.needPep': 'ฉันต้องการ PEP',
    'dashboard.emergencyPep': 'ฉันต้องการ PEP ฉุกเฉิน',
    'dashboard.pepProgress': 'ความคืบหน้า PEP',
    'dashboard.daysRemaining': 'วันที่เหลือ',

    // Stats
    'stats.xp': 'XP',
    'stats.streak': 'ต่อเนื่อง',
    'stats.level': 'เลเวล',
    'stats.badges': 'เหรียญ',
    'stats.totalXp': 'XP รวม',
    
    // XP Rewards
    'xp.bonus.3day': 'ต่อเนื่อง 3 วัน = XP x1.5',
    'xp.bonus.7day': 'ต่อเนื่อง 7 วัน = XP x2',
    'xp.reward': 'ได้รับ XP',
    'xp.streak.bonus': 'โบนัส Streak',

    // Setup Daily PrEP
    'setup.daily.title': 'ตั้งค่า PrEP รายวัน',
    'setup.daily.startDate': 'วันที่เริ่มต้น',
    'setup.daily.stopDate': 'วันที่หยุด (ไม่บังคับ)',
    'setup.daily.reminderTime': 'เวลาแจ้งเตือนรายวัน',
    'setup.daily.info': 'PrEP รายวันจะมีประสิทธิภาพเต็มที่หลังจากใช้สม่ำเสมอประมาณ 7 วัน ให้กินทุกวันเพื่อการป้องกันสูงสุด',
    'setup.daily.start': 'เริ่ม PrEP รายวัน',

    // Setup On-demand PrEP
    'setup.ondemand.title': 'PrEP ตามเหตุการณ์',
    'setup.ondemand.eventDate': 'วันที่มีกิจกรรม',
    'setup.ondemand.eventTime': 'เวลาโดยประมาณ',
    'setup.ondemand.timeline': 'ตารางการกินยาของคุณ',
    'setup.ondemand.firstDose': 'ยาโด๊สแรก (2 เม็ด)',
    'setup.ondemand.secondDose': 'ยาโด๊สที่สอง',
    'setup.ondemand.activity': 'กิจกรรม',
    'setup.ondemand.thirdDose': 'ยาโด๊สที่สาม',
    'setup.ondemand.fourthDose': 'ยาโด๊สที่สี่',
    'setup.ondemand.info': 'PrEP ตามเหตุการณ์ (2-1-1) ต้องกิน 2 เม็ด 2-24 ชั่วโมงก่อน แล้วกิน 1 เม็ดที่ 24 ชม. และ 48 ชม. หลังกิจกรรม',
    'setup.ondemand.start': 'เริ่ม PrEP ตามเหตุการณ์',

    // PEP Emergency
    'pep.emergency.title': 'การสนับสนุน PEP ฉุกเฉิน',
    'pep.emergency.when': 'เมื่อไหร่ที่อาจสัมผัสเชื้อ?',
    'pep.emergency.hoursAgo': 'ชั่วโมงที่แล้ว',
    'pep.emergency.remaining': 'ชั่วโมงที่เหลือ',
    'pep.emergency.exceeded': 'เกินเวลาแล้ว',
    'pep.emergency.safe': 'PEP มีประสิทธิภาพสูงสุดเมื่อเริ่มเร็ว',
    'pep.emergency.warning': 'เวลาใกล้หมด — รีบดำเนินการ',
    'pep.emergency.urgent': 'หน้าต่าง 72 ชั่วโมงผ่านไปแล้ว',
    'pep.emergency.whatIs': 'PEP คืออะไร?',
    'pep.emergency.whatIsDesc': 'PEP (Post-Exposure Prophylaxis) คือยาป้องกัน HIV ฉุกเฉินที่ใช้หลังจากอาจสัมผัสเชื้อ ต้องเริ่มภายใน 72 ชั่วโมงหลังสัมผัสและกินต่อเนื่อง 28 วัน',
    'pep.emergency.effective': 'PEP มีประสิทธิภาพสูงสุดเมื่อเริ่มเร็วที่สุด',
    'pep.emergency.where': 'จะหา PEP ได้ที่ไหน',
    'pep.emergency.whereDesc': 'ไปที่คลินิก SWING หรือสถานบริการสุขภาพทางเพศเพื่อรับ PEP ฟรี',
    'pep.emergency.findSwing': 'ค้นหาสถานที่ SWING',
    'pep.emergency.startTracking': 'เริ่มติดตาม PEP',
    'pep.emergency.seekAdvice': 'โปรดขอคำปรึกษาทางการแพทย์',

    // PEP Tracker
    'pep.tracker.title': 'ติดตาม PEP',
    'pep.tracker.ofDays': 'จาก 28 วัน',
    'pep.tracker.todaysDose': 'ยาวันนี้',
    'pep.tracker.thisWeek': 'สัปดาห์นี้',
    'pep.tracker.congrats': 'ยินดีด้วย! 🎉',
    'pep.tracker.completed': 'คุณกิน PEP ครบ 28 วันแล้ว อย่าลืมไปตรวจนะ',
    'pep.tracker.encouragement1': 'เริ่มต้นได้ดี! สัปดาห์แรกสำคัญมาก',
    'pep.tracker.encouragement2': 'คุณผ่านมาครึ่งทางแล้ว!',
    'pep.tracker.encouragement3': 'ใกล้เสร็จแล้ว สู้ต่อไป!',
    'pep.tracker.encouragement4': 'โค้งสุดท้าย — คุณทำได้!',

    // Progress
    'progress.title': 'ความคืบหน้าของคุณ',
    'progress.subtitle': 'ทำดีต่อไป!',
    'progress.currentLevel': 'เลเวลปัจจุบัน',
    'progress.xpToNext': 'XP ถึงเลเวลถัดไป',
    'progress.achievements': 'ความสำเร็จ',
    'progress.motivation.streak': '🔥 สุดยอด! คุณต่อเนื่องสุดๆ!',
    'progress.motivation.xp': '⭐ ความคืบหน้าดีมาก! สู้ต่อไป!',
    'progress.motivation.default': '💪 ทุกวันมีค่า คุณทำได้!',

    // Badges
    'badge.startedPrep': 'เริ่ม PrEP',
    'badge.startedPrep.desc': 'เริ่มต้นการใช้ PrEP',
    'badge.pepWarrior': 'นักรบ PEP',
    'badge.pepWarrior.desc': 'เริ่มต้นการใช้ PEP',
    'badge.completedPep': 'จบ PEP',
    'badge.completedPep.desc': 'กิน PEP ครบ 28 วัน',
    'badge.3dayStreak': 'ต่อเนื่อง 3 วัน',
    'badge.3dayStreak.desc': 'กินยาต่อเนื่อง 3 วัน',
    'badge.7dayStreak': 'ต่อเนื่อง 7 วัน',
    'badge.7dayStreak.desc': 'กินยาต่อเนื่อง 7 วัน',
    'badge.14dayStreak': 'ต่อเนื่อง 14 วัน',
    'badge.14dayStreak.desc': 'กินยาต่อเนื่อง 14 วัน',
    'badge.30dayStreak': 'ต่อเนื่อง 30 วัน',
    'badge.30dayStreak.desc': 'กินยาต่อเนื่อง 30 วัน',
    'badge.firstTest': 'ตรวจครั้งแรก',
    'badge.firstTest.desc': 'ตรวจ HIV ครั้งแรก',
    'badge.level5': 'เลเวล 5',
    'badge.level5.desc': 'ถึงเลเวล 5',
    'badge.level10': 'เลเวล 10',
    'badge.level10.desc': 'ถึงเลเวล 10',
    'badge.xp500': '500 XP',
    'badge.xp500.desc': 'สะสม 500 XP',
    'badge.xp1000': '1000 XP',
    'badge.xp1000.desc': 'สะสม 1000 XP',
    'badge.knowledgeSeeker': 'นักเรียนรู้',
    'badge.knowledgeSeeker.desc': 'อ่านบทความ 5 บทความ',
    'badge.dedicated': 'ทุ่มเท',
    'badge.dedicated.desc': 'ใช้งานต่อเนื่อง 7 วัน',
    'badge.writer': 'นักเขียน',
    'badge.writer.desc': 'เผยแพร่บทความแรก',
    'badge.earned': 'ได้รับเหรียญใหม่!',
    'badge.category.prevention': 'การป้องกัน',
    'badge.category.streak': 'ต่อเนื่อง',
    'badge.category.milestone': 'เป้าหมาย',
    'badge.category.testing': 'การตรวจ',
    'badge.category.engagement': 'การมีส่วนร่วม',

    // Info
    'info.title': 'เรียนรู้',
    'info.subtitle': 'ข้อมูลสุขภาพทางเพศ',
    'info.search': 'ค้นหาหัวข้อ...',
    'info.noResults': 'ไม่พบบทความ',
    'info.whatIsPrep': 'PrEP คืออะไร?',
    'info.whatIsPrep.desc': 'เรียนรู้เกี่ยวกับยาป้องกัน HIV',
    'info.dailyVsOndemand': 'PrEP รายวัน vs ตามเหตุการณ์',
    'info.dailyVsOndemand.desc': 'เลือกวิธีที่เหมาะกับคุณ',
    'info.whatIsPep': 'PEP คืออะไร?',
    'info.whatIsPep.desc': 'การป้องกัน HIV ฉุกเฉิน',
    'info.hivTesting': 'ตรวจ HIV บ่อยแค่ไหน',
    'info.hivTesting.desc': 'คำแนะนำการตรวจประจำ',
    'info.condoms': 'ถุงยาง & การลดอันตราย',
    'info.condoms.desc': 'กลยุทธ์การป้องกันเพิ่มเติม',

    // SWING
    'swing.title': 'รับ PrEP ฟรีที่ SWING',
    'swing.subtitle': 'บริการสุขภาพทางเพศที่เป็นมิตรและไม่ตัดสิน',
    'swing.whoCanAccess': 'ใครสามารถเข้าถึงได้',
    'swing.welcome': 'ทุกคนยินดีต้อนรับ',
    'swing.noJudgment': 'ไม่ตัดสิน ไม่ซักถาม',
    'swing.lgbtq': 'บริการที่เป็นมิตรกับ LGBTQ+',
    'swing.confidential': 'เป็นความลับและปลอดภัย',
    'swing.whatToPrepare': 'สิ่งที่ต้องเตรียม',
    'swing.id': 'บัตรประชาชน (ไม่บังคับแต่มีประโยชน์)',
    'swing.medications': 'รายการยาที่ใช้อยู่',
    'swing.questions': 'คำถามของคุณ (เราพร้อมช่วยเหลือ!)',
    'swing.locations': 'สถานที่',
    'swing.multipleLocations': 'มีหลายสถานที่ทั่วประเทศไทย',
    'swing.visitWebsite': 'เยี่ยมชมเว็บไซต์เพื่อหาคลินิกใกล้บ้าน',
    'swing.hours': 'เวลาเปิดทำการ',
    'swing.checkHours': 'ตรวจสอบเวลาปัจจุบันที่เว็บไซต์',
    'swing.walkIns': 'เข้ามาได้เลย แนะนำให้นัดหมายล่วงหน้า',
    'swing.bookNow': 'จองตอนนี้',
    'swing.opensNewWindow': 'เปิดในหน้าต่างใหม่',

    // Settings
    'settings.title': 'การตั้งค่า',
    'settings.notifications': 'การแจ้งเตือน',
    'settings.dailyPrep': 'PrEP รายวัน',
    'settings.dailyPrep.desc': 'แจ้งเตือนรายวัน',
    'settings.ondemandPrep': 'PrEP ตามเหตุการณ์',
    'settings.ondemandPrep.desc': 'แจ้งเตือนตามเหตุการณ์',
    'settings.pepReminders': 'แจ้งเตือน PEP',
    'settings.pepReminders.desc': 'แจ้งเตือนหลักสูตร 28 วัน',
    'settings.reminderTime': 'เวลาแจ้งเตือน',
    'settings.defaultTime': 'เวลาแจ้งเตือนเริ่มต้น',
    'settings.data': 'ข้อมูล',
    'settings.resetAll': 'รีเซ็ตข้อมูลทั้งหมด',
    'settings.resetWarning': 'การดำเนินการนี้จะลบความคืบหน้า การตั้งค่า และเหรียญทั้งหมดของคุณ',
    'settings.confirmReset': 'คุณแน่ใจหรือไม่? การดำเนินการนี้จะรีเซ็ตความคืบหน้าทั้งหมด',
    'settings.theme': 'ธีม',
    'settings.account': 'บัญชี',
    'settings.loggedInAs': 'เข้าสู่ระบบเป็น',
    'settings.logout': 'ออกจากระบบ',
    'landing.poweredBy': 'สนับสนุนโดย',

    // Auth
    'auth.login': 'เข้าสู่ระบบ',
    'auth.signup': 'สมัครสมาชิก',
    'auth.loginSubtitle': 'เข้าสู่ระบบเพื่อซิงค์ความคืบหน้าของคุณ',
    'auth.signupSubtitle': 'สร้างบัญชีเพื่อบันทึกความคืบหน้า',
    'auth.email': 'อีเมล',
    'auth.emailPlaceholder': 'กรอกอีเมลของคุณ',
    'auth.password': 'รหัสผ่าน',
    'auth.passwordPlaceholder': 'กรอกรหัสผ่านของคุณ',
    'auth.displayName': 'ชื่อที่แสดง',
    'auth.displayNamePlaceholder': 'ชื่อของคุณ',
    'auth.loginButton': 'เข้าสู่ระบบ',
    'auth.signupButton': 'สมัครสมาชิก',
    'auth.noAccount': 'ยังไม่มีบัญชี?',
    'auth.hasAccount': 'มีบัญชีอยู่แล้ว?',
    'auth.signupLink': 'สมัครสมาชิก',
    'auth.loginLink': 'เข้าสู่ระบบ',
    'auth.invalidEmail': 'อีเมลไม่ถูกต้อง',
    'auth.passwordTooShort': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
    'auth.invalidCredentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth.userExists': 'อีเมลนี้ถูกใช้งานแล้ว',
    'auth.loginSuccess': 'เข้าสู่ระบบสำเร็จ!',
    'auth.signupSuccess': 'สมัครสมาชิกสำเร็จ!',
    'auth.privacyNote': 'ข้อมูลของคุณถูกเข้ารหัสและปลอดภัย',

    // Navigation
    'nav.home': 'หน้าแรก',
    'nav.learn': 'เรียนรู้',
    'nav.swing': 'SWING',
    'nav.progress': 'ความคืบหน้า',
    'nav.settings': 'ตั้งค่า',
    'nav.test': 'ตรวจ',
    'nav.bookings': 'นัดหมาย',
    'nav.care': 'ดูแล',

    // Community
    'community.title': 'ชุมชน',
    'community.subtitle': 'เชื่อมต่อและแบ่งปันอย่างปลอดภัย',
    'community.anonymousReminder': 'คุณไม่ระบุตัวตน',
    'community.anonymousDesc': 'ไม่มีใครเห็นข้อมูลส่วนตัวของคุณ',
    'community.manageInterests': 'จัดการความสนใจ',
    'chat.yourNickname': 'ชื่อเล่นของคุณ',
    'chat.guidelines.title': 'กฎชุมชน',
    'chat.guidelines.respectful': 'เคารพซึ่งกันและกัน',
    'chat.guidelines.noPersonalInfo': 'อย่าแชร์ข้อมูลส่วนตัว',
    'chat.guidelines.supportive': 'สนับสนุนกัน',
    'chat.guidelines.notMedicalAdvice': 'นี่ไม่ใช่คำแนะนำทางการแพทย์',
    'chat.typeMessage': 'พิมพ์ข้อความ...',
    'chat.loginRequired': 'เข้าสู่ระบบเพื่อส่งข้อความ',
    'common.dismiss': 'ปิด',
    'interests.title': 'ความสนใจของคุณ',
    'interests.subtitle': 'เลือกหัวข้อที่คุณสนใจ',
    'interests.description': 'เราจะใช้สิ่งนี้เพื่อแนะนำห้องแชทและเนื้อหา',
    'interests.saved': 'บันทึกความสนใจแล้ว',

    // Self-Care
    'selfCare.title': 'ดูแลตัวเอง',
    'selfCare.subtitle': 'ผลิตภัณฑ์และเครื่องมือสำหรับคุณ',
    'selfCare.orderNow': 'สั่งซื้อ',
    'selfCare.reminders': 'การแจ้งเตือน',
    'selfCare.hivTestReminder': 'แจ้งเตือนตรวจ HIV',
    'selfCare.hivTestReminderDesc': 'ทุกเดือน',
    'selfCare.condomReminder': 'แจ้งเตือนเติมถุงยาง',
    'selfCare.condomReminderDesc': 'เมื่อใกล้หมด',
    'selfCare.harmReductionReminder': 'แจ้งเตือนอุปกรณ์ลดอันตราย',
    'selfCare.harmReductionReminderDesc': 'เติมสต็อก',
    'selfCare.reminderEnabled': 'เปิดการแจ้งเตือน',
    'selfCare.reminderDisabled': 'ปิดการแจ้งเตือน',

    // Quests
    'quests.title': 'ภารกิจ',
    'quests.subtitle': 'เดินทางไปพร้อมกัน',
    'quests.journey': 'เส้นทาง',
    'quests.campaign': 'แคมเปญ',
    'quests.join': 'เข้าร่วม',
    'quests.joined': 'เข้าร่วมภารกิจแล้ว',
    'quests.completed': 'สำเร็จ',
    'quests.days': 'วัน',
    'quests.daysLeft': 'วันที่เหลือ',
    'quests.keepGoing': 'สู้ต่อไป!',
    'quests.almostThere': 'ใกล้เสร็จแล้ว!',
    'quests.claimBadge': 'รับเหรียญ!',
    'quests.loginRequired': 'เข้าสู่ระบบเพื่อเข้าร่วม',
    'quests.noJourneyQuests': 'ไม่มีภารกิจเส้นทาง',
    'quests.noCampaignQuests': 'ไม่มีแคมเปญในขณะนี้',

    // Share
    'share.title': 'แชร์ความสำเร็จ',
    'share.subtitle': 'ฉลองเส้นทางของคุณ',
    'share.privacyNote': 'การ์ดไม่กล่าวถึง PrEP, PEP หรือ HIV โดยตรง',
    'share.shareOn': 'แชร์บน',

    // Health Profile
    'healthProfile.title': 'โปรไฟล์สุขภาพ',
    'healthProfile.subtitle': 'ข้อมูลสุขภาพของคุณ (ไม่บังคับ)',
    'healthProfile.disclaimer': 'นี่ไม่ใช่บันทึกทางการแพทย์ ใช้สำหรับการอ้างอิงส่วนตัวเท่านั้น',
    'healthProfile.timeline': 'ไทม์ไลน์',
    'healthProfile.noHistory': 'ยังไม่มีประวัติ',
    'healthProfile.sideEffects': 'ผลข้างเคียง',
    'healthProfile.sideEffectsDesc': 'บันทึกผลข้างเคียงที่คุณสังเกตเห็น',
    'healthProfile.sideEffectsPlaceholder': 'เช่น ปวดหัว, คลื่นไส้...',
    'healthProfile.notes': 'หมายเหตุ',
    'healthProfile.notesPlaceholder': 'หมายเหตุส่วนตัว...',
    'healthProfile.saved': 'บันทึกโปรไฟล์สุขภาพแล้ว',
    'healthProfile.preConsultation': 'แบบฟอร์มก่อนพบแพทย์',

    // Consultation
    'consultation.title': 'แบบฟอร์มก่อนพบแพทย์',
    'consultation.subtitle': 'เตรียมพร้อมสำหรับการนัดหมาย',
    'consultation.description': 'กรอกข้อมูลนี้ก่อนพบผู้ให้บริการสุขภาพ',
    'consultation.preventionUse': 'การใช้ยาป้องกันปัจจุบัน',
    'consultation.preventionUseDesc': 'คุณใช้ PrEP หรือ PEP อยู่หรือไม่?',
    'consultation.preventionUsePlaceholder': 'เช่น PrEP รายวัน มา 3 เดือน',
    'consultation.recentTesting': 'การตรวจล่าสุด',
    'consultation.recentTestingDesc': 'ตรวจ HIV ครั้งล่าสุดเมื่อไหร่?',
    'consultation.recentTestingPlaceholder': 'เช่น 2 เดือนที่แล้ว, ผลลบ',
    'consultation.questions': 'คำถามสำหรับผู้ให้บริการ',
    'consultation.questionsDesc': 'เขียนคำถามที่คุณอยากถาม',
    'consultation.question': 'คำถาม',
    'consultation.addQuestion': 'เพิ่มคำถาม',
    'consultation.copy': 'คัดลอก',
    'consultation.copied': 'คัดลอกแล้ว',
    'consultation.saved': 'บันทึกแบบฟอร์มแล้ว',

    // Booking
    'booking.title': '📅 จองนัดหมาย',
    'booking.subtitle': 'บริการตรวจและปรึกษาฟรีสำหรับคนไทยภายใต้ สปสช. และชาวต่างชาติภายใต้กองทุนโลก (เมียนมา เวียดนาม ลาว กัมพูชา) สำหรับสัญชาติอื่นอาจมีค่าใช้จ่าย',
    'booking.selectBranch': 'เลือกสาขา',
    'booking.selectServices': 'เลือกบริการ',
    'booking.selectDateTime': 'เลือกวันและเวลา',
    'booking.confirmBooking': 'ยืนยันนัดหมาย',
    'booking.bookingConfirmed': 'จองสำเร็จ',
    'booking.slotsAvailable': 'คิวว่าง',
    'booking.reviews': 'รีวิว',
    'booking.openGoogleMaps': 'เปิดใน Google Maps',
    'booking.notSure': 'ไม่แน่ใจว่าต้องการบริการอะไร?',
    'booking.freeThaiNHSO': 'ฟรี คนไทย (สปสช.)',
    'booking.freeGlobalFund': 'ฟรี กองทุนโลก (CLVM)',
    'booking.pepFreeThaiOnly': 'PEP ฟรีเฉพาะคนไทย',
    'booking.pepWarning': '⚠️ PEP (ยาต้านฉุกเฉิน): ฟรีเฉพาะคนไทยเท่านั้น',
    'booking.pepWarningDesc': 'สัญชาติอื่น (รวมถึง CLVM) อาจมีค่าใช้จ่าย ตรวจสอบราคาที่ swingsilompolyclinic.com',
    'booking.riskDisclaimer': '⚕️ นี่ไม่ใช่การวินิจฉัย ตอบคำถามเพื่อช่วยแนะนำบริการที่เหมาะสม',
    'booking.seeRecommendations': 'ดูบริการแนะนำ',
    'booking.selectDate': 'เลือกวันที่',
    'booking.today': 'วันนี้',
    'booking.closed': 'ปิด',
    'booking.fullyClosed': 'ปิดรับนัดทั้งวัน',
    'booking.selectAnotherDate': 'กรุณาเลือกวันอื่น',
    'booking.next': 'ถัดไป',
    'booking.selectedServices': 'บริการที่เลือก',
    'booking.freeInfo': 'ฟรีสำหรับคนไทย (สปสช.) และกองทุนโลก (CLVM) ยกเว้น PEP ที่ฟรีเฉพาะคนไทย',
    'booking.notesLabel': 'หมายเหตุ (ไม่บังคับ)',
    'booking.notesPlaceholder': 'เช่น ต้องการล่ามภาษาอังกฤษ',
    'booking.anonNotice': 'จองโดยไม่ต้องสมัครสมาชิก — กรอกอีเมลเพื่อรับรหัสจอง',
    'booking.contactEmail': 'อีเมลติดต่อ *',
    'booking.idUploadHint': 'คุณสามารถอัปโหลดบัตรประชาชนล่วงหน้าในหน้า "ข้อมูลส่วนตัว" เพื่อความสะดวกในการลงทะเบียน',
    'booking.confirm': 'ยืนยันจอง',
    'booking.successTitle': '🎉 จองสำเร็จ!',
    'booking.bookingCode': 'รหัสจอง / Booking Code',
    'booking.screenshotHint': 'กรุณาแคปหน้าจอนี้และแสดงให้เจ้าหน้าที่ลงทะเบียน',
    'booking.screenshotDesc': 'เจ้าหน้าที่จะค้นหาด้วยรหัสจองของคุณ',
    'booking.viewMyAppointments': 'ดูนัดหมายของฉัน',
    'booking.emailSent': 'เราได้ส่งลิงก์ดูนัดหมายไปที่อีเมลของคุณแล้ว',
    'booking.emailSentDesc': 'ใช้ลิงก์จากอีเมลเพื่อดูนัดหมายได้ทุกเมื่อ',
    'booking.wantEasier': 'อยากจัดการนัดง่ายขึ้นไหม?',
    'booking.registerBenefit': 'สมัครสมาชิกเพื่อดู เลื่อน หรือยกเลิกนัดได้ทันที',
    'booking.register': 'สมัครสมาชิก',
    'booking.backToHome': 'กลับหน้าหลัก',
    'booking.slotBlocked': 'ช่วงเวลานี้ปิดรับนัด กรุณาเลือกเวลาอื่น',
    'booking.slotFull': 'ช่วงเวลานี้เต็มแล้ว กรุณาเลือกเวลาอื่น',
    'booking.duplicateBooking': 'คุณมีนัดหมายในเวลานี้แล้ว',
    'booking.enterEmail': 'กรุณากรอกอีเมล',
    'booking.savedToDevice': 'บันทึกนัดหมายไว้บนอุปกรณ์นี้แล้ว ✅',
    'booking.partialBlackout': 'วันนี้ปิดรับนัดบางช่วงเวลา',
    'booking.dayClosed': 'วันนี้ปิดรับนัดทั้งวัน',
    'booking.closedLabel': 'ปิดรับนัด',

    // Home
    'home.welcome': 'คนเทสต์ดีอยู่นี่จ้า',
    'home.chooseService': 'เลือกบริการที่ต้องการ',
    'home.selfTest': 'ขอชุดตรวจ',
    'home.bookAppointment': 'จองตรวจ',
    'home.surveys': 'แบบประเมิน',
    'home.didYouKnow': 'เรื่องน่ารู้',
    'home.onlineCounselor': 'ขอคำปรึกษา',
    'home.selfCare': 'ดูแลตัวเอง',
    'home.preventionMatch': 'Prevention Match',
    'home.inviteTest': 'ชวนตรวจ',
    'home.members': 'สมาชิก',
    'home.totalVisitors': 'ผู้เข้าชมทั้งหมด',
    'home.healthRewards': 'รางวัลสุขภาพสำหรับผู้ใช้งานประจำ',
    'home.healthRewardsSubtitle': 'รางวัลสำหรับคนที่ดูแลสุขภาพกับ testD',
    'home.poweredBy': 'สนับสนุนโดย',
    'home.freeConfidential': 'บริการนี้ไม่มีค่าใช้จ่าย • ข้อมูลของคุณเป็นความลับ',

    // My Appointments
    'appointments.title': 'นัดหมายของฉัน',
    'appointments.upcoming': 'นัดหมายที่จะถึง',
    'appointments.past': 'นัดหมายที่ผ่านมา',
    'appointments.noUpcoming': 'ไม่มีนัดหมายที่กำลังจะถึง',
    'appointments.bookNew': 'จองนัดหมายใหม่',
    'appointments.cancel': 'ยกเลิกนัดหมาย',
    'appointments.checkin': 'เช็คอิน',
    'appointments.checkout': 'เช็คเอาท์',

    // Admin Sidebar
    'admin.panel': 'ผู้ดูแลระบบ',
    'admin.manageSystem': 'จัดการระบบ',
    'admin.mode': 'โหมดผู้ดูแลระบบ',
    'admin.main': 'หลัก',
    'admin.dashboard': 'ภาพรวม',
    'admin.people': 'ผู้ใช้งาน',
    'admin.users': 'ผู้ใช้',
    'admin.branchStaff': 'สาขา',
    'admin.quickRegister': 'ลงทะเบียน',
    'admin.appointments': 'นัดหมาย',
    'admin.bookings': 'นัดหมาย',
    'admin.today': 'วันนี้',
    'admin.schedule': 'ตารางเวลา',
    'admin.queueBoard': 'ระบบคิว',
    'admin.content': 'เนื้อหา',
    'admin.blog': 'บทความ',
    'admin.surveys': 'แบบสำรวจ',
    'admin.operations': 'ระบบ',
    'admin.kitOrders': 'ชุดตรวจ',
    'admin.notifications': 'แจ้งเตือน',
    'admin.analytics': 'สถิติ',
    'admin.analyticsOverview': 'ภาพรวมช่วงเวลา',
    'admin.import': 'นำเข้า',
    'admin.abuseLogs': 'Anti-spam',
    'admin.translations': 'คำแปล',
    'admin.settings': 'ตั้งค่า',
    'admin.appUpdates': 'อัปเดตแอป',
    'admin.rewards': 'รางวัล/สิทธิพิเศษ',
    'admin.milestones': 'เป้าหมายชุมชน',
    'admin.userChats': 'แชทกับผู้ใช้',
    'admin.partnerInvites': 'ชวนตรวจคู่',
    'admin.partnerNetwork': 'เครือข่ายคู่',
    'admin.pairSessions': 'ตรวจคู่',
    'admin.anonymousResponses': 'การตอบรับ',
    'admin.smsCredits': 'SMS & เครดิต',
    'admin.smsRelay': 'SMS Relay',
    'admin.creditBalances': 'ยอดเครดิต',
    'admin.creditPurchases': 'ซื้อเครดิต',
    'admin.reports': 'รายงาน',
    'admin.exportCenter': 'ส่งออกข้อมูล',
    'admin.activityLogs': 'บันทึกกิจกรรม',
    'admin.adminTools': 'เครื่องมือแอดมิน',
    'admin.harmReduction': 'Harm Reduction',
    'admin.harmReductionDashboard': 'ติดตามผล HR',
    'admin.diagnostics': 'วินิจฉัยระบบ',
    'admin.systemHealth': 'สุขภาพระบบ',
    'admin.ipDocs': 'ศูนย์เอกสาร IP',
    'admin.backToApp': 'กลับหน้าหลัก',
    'admin.logout': 'ออกจากระบบ',

    // Common
    'common.back': 'กลับ',
    'common.continue': 'ดำเนินการต่อ',
    'common.save': 'บันทึก',
    'common.saving': 'กำลังบันทึก...',
    'common.cancel': 'ยกเลิก',
    'common.error': 'เกิดข้อผิดพลาด',
    'common.language': 'ภาษา',
  },
  en: {
    // Landing
    'app.name': 'testD',
    'app.tagline': 'Your sexual health companion',
    'app.description': 'Track, learn, and stay on prevention — your way. Private, supportive, and judgment-free.',
    'landing.startAnonymous': 'Start anonymously',
    'landing.loginEmail': 'Login with email',
    'landing.anonymous': 'Anonymous',
    'landing.secure': 'Secure',
    'landing.free': 'Free',
    'landing.disclaimer': 'testD is a health support tool, not medical advice.',
    'landing.consult': 'Always consult healthcare providers.',

    // Onboarding
    'onboarding.q1': 'Which best describes you right now?',
    'onboarding.q1.subtitle': 'Choose what fits you best. You can always change this later.',
    'onboarding.prep': 'Using PrEP',
    'onboarding.prep.desc': 'Daily or on-demand prevention',
    'onboarding.pep': 'Using PEP',
    'onboarding.pep.desc': 'Post-exposure treatment',
    'onboarding.exploring': 'Just exploring',
    'onboarding.exploring.desc': 'Learning about options',
    'onboarding.q2': 'What type of PrEP?',
    'onboarding.daily': 'Daily PrEP',
    'onboarding.daily.desc': 'One pill every day',
    'onboarding.ondemand': 'On-demand PrEP',
    'onboarding.ondemand.desc': 'Before & after activity',
    'onboarding.skip': 'Skip for now',

    // Consent
    'consent.title': 'Your privacy matters',
    'consent.subtitle': 'We believe in transparency about how we use data to help you and the community.',
    'consent.anonymous': 'Anonymous usage data only',
    'consent.noIdentity': 'No personal identity required',
    'consent.improve': 'Helps improve services',
    'consent.agree': 'I agree to anonymous data collection to help improve testD and support sexual health advocacy. I understand no personal information is required.',
    'consent.continue': 'Continue to testD',
    'consent.changeAnytime': 'You can change this anytime in settings',

    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.doingGreat': "You're doing great",
    'dashboard.today': 'Today',
    'dashboard.takePrep': 'Take PrEP today',
    'dashboard.pepDay': 'PEP Day',
    'dashboard.of28': 'of 28',
    'dashboard.taken': 'Taken',
    'dashboard.skipped': 'Skipped',
    'dashboard.greatJob': 'Great job! +10 XP',
    'dashboard.skippedToday': 'Skipped today',
    'dashboard.setupJourney': 'Set up your journey',
    'dashboard.setupSubtitle': 'Set up your prevention to start tracking',
    'dashboard.startDaily': 'Start Daily PrEP',
    'dashboard.startOndemand': 'Start On-demand PrEP',
    'dashboard.needPep': 'I need PEP',
    'dashboard.emergencyPep': 'I need emergency PEP',
    'dashboard.pepProgress': 'PEP Progress',
    'dashboard.daysRemaining': 'days remaining',

    // Stats
    'stats.xp': 'XP',
    'stats.streak': 'Streak',
    'stats.level': 'Level',
    'stats.badges': 'Badges',
    'stats.totalXp': 'Total XP',
    
    // XP Rewards
    'xp.bonus.3day': '3 day streak = XP x1.5',
    'xp.bonus.7day': '7 day streak = XP x2',
    'xp.reward': 'Earn XP',
    'xp.streak.bonus': 'Streak Bonus',

    // Setup Daily PrEP
    'setup.daily.title': 'Daily PrEP Setup',
    'setup.daily.startDate': 'Start Date',
    'setup.daily.stopDate': 'Stop Date (optional)',
    'setup.daily.reminderTime': 'Daily Reminder Time',
    'setup.daily.info': 'Daily PrEP becomes fully effective after about 7 days of consistent use. Keep taking it every day for maximum protection.',
    'setup.daily.start': 'Start Daily PrEP',

    // Setup On-demand PrEP
    'setup.ondemand.title': 'On-Demand PrEP',
    'setup.ondemand.eventDate': 'Planned Activity Date',
    'setup.ondemand.eventTime': 'Approximate Time',
    'setup.ondemand.timeline': 'Your dose timeline',
    'setup.ondemand.firstDose': 'First dose (2 pills)',
    'setup.ondemand.secondDose': 'Second dose',
    'setup.ondemand.activity': 'Activity',
    'setup.ondemand.thirdDose': 'Third dose',
    'setup.ondemand.fourthDose': 'Fourth dose',
    'setup.ondemand.info': 'On-demand PrEP (2-1-1) requires taking 2 pills 2-24 hours before, then 1 pill at 24h and 48h after activity.',
    'setup.ondemand.start': 'Start On-Demand PrEP',

    // PEP Emergency
    'pep.emergency.title': 'PEP Emergency Support',
    'pep.emergency.when': 'When was the possible exposure?',
    'pep.emergency.hoursAgo': 'hours ago',
    'pep.emergency.remaining': 'hours remaining',
    'pep.emergency.exceeded': 'Time exceeded',
    'pep.emergency.safe': 'PEP is most effective when started early',
    'pep.emergency.warning': 'Time is running short — act now',
    'pep.emergency.urgent': '72-hour window has passed',
    'pep.emergency.whatIs': 'What is PEP?',
    'pep.emergency.whatIsDesc': 'PEP (Post-Exposure Prophylaxis) is emergency HIV prevention medication taken after potential exposure. It must be started within 72 hours and taken for 28 days.',
    'pep.emergency.effective': 'PEP is most effective when started as soon as possible.',
    'pep.emergency.where': 'Where to get PEP',
    'pep.emergency.whereDesc': 'Visit SWING clinics or local sexual health services for free PEP access.',
    'pep.emergency.findSwing': 'Find SWING locations',
    'pep.emergency.startTracking': 'Start PEP Tracking',
    'pep.emergency.seekAdvice': 'Please seek medical advice',

    // PEP Tracker
    'pep.tracker.title': 'PEP Tracker',
    'pep.tracker.ofDays': 'of 28 days',
    'pep.tracker.todaysDose': "Today's Dose",
    'pep.tracker.thisWeek': 'This Week',
    'pep.tracker.congrats': 'Congratulations! 🎉',
    'pep.tracker.completed': "You've completed your 28-day PEP course. Remember to get tested.",
    'pep.tracker.encouragement1': 'Great start! The first week is crucial.',
    'pep.tracker.encouragement2': "You're halfway there!",
    'pep.tracker.encouragement3': 'Almost done, keep pushing!',
    'pep.tracker.encouragement4': "Final stretch — you've got this!",

    // Progress
    'progress.title': 'Your Progress',
    'progress.subtitle': 'Keep up the great work!',
    'progress.currentLevel': 'Current Level',
    'progress.xpToNext': 'XP to next level',
    'progress.achievements': 'Achievements',
    'progress.motivation.streak': "🔥 Amazing streak! You're on fire!",
    'progress.motivation.xp': '⭐ Great progress! Keep going!',
    'progress.motivation.default': "💪 Every day counts. You've got this!",

    // Badges
    'badge.startedPrep': 'Started PrEP',
    'badge.startedPrep.desc': 'Started using PrEP',
    'badge.pepWarrior': 'PEP Warrior',
    'badge.pepWarrior.desc': 'Started using PEP',
    'badge.completedPep': 'Completed PEP',
    'badge.completedPep.desc': 'Completed 28-day PEP course',
    'badge.3dayStreak': '3-Day Streak',
    'badge.3dayStreak.desc': '3 consecutive days',
    'badge.7dayStreak': '7-Day Streak',
    'badge.7dayStreak.desc': '7 consecutive days',
    'badge.14dayStreak': '14-Day Streak',
    'badge.14dayStreak.desc': '14 consecutive days',
    'badge.30dayStreak': '30-Day Streak',
    'badge.30dayStreak.desc': '30 consecutive days',
    'badge.firstTest': 'First Test',
    'badge.firstTest.desc': 'Completed first HIV test',
    'badge.level5': 'Level 5',
    'badge.level5.desc': 'Reached level 5',
    'badge.level10': 'Level 10',
    'badge.level10.desc': 'Reached level 10',
    'badge.xp500': '500 XP',
    'badge.xp500.desc': 'Earned 500 XP',
    'badge.xp1000': '1000 XP',
    'badge.xp1000.desc': 'Earned 1000 XP',
    'badge.knowledgeSeeker': 'Knowledge Seeker',
    'badge.knowledgeSeeker.desc': 'Read 5 articles',
    'badge.dedicated': 'Dedicated',
    'badge.dedicated.desc': 'Active for 7 days',
    'badge.writer': 'Writer',
    'badge.writer.desc': 'Published first article',
    'badge.earned': 'New badge earned!',
    'badge.category.prevention': 'Prevention',
    'badge.category.streak': 'Streaks',
    'badge.category.milestone': 'Milestones',
    'badge.category.testing': 'Testing',
    'badge.category.engagement': 'Engagement',

    // Info
    'info.title': 'Learn',
    'info.subtitle': 'Sexual health information',
    'info.search': 'Search topics...',
    'info.noResults': 'No articles found',
    'info.whatIsPrep': 'What is PrEP?',
    'info.whatIsPrep.desc': 'Learn about HIV prevention medication',
    'info.dailyVsOndemand': 'Daily vs On-Demand PrEP',
    'info.dailyVsOndemand.desc': 'Choose the right approach for you',
    'info.whatIsPep': 'What is PEP?',
    'info.whatIsPep.desc': 'Emergency HIV prevention',
    'info.hivTesting': 'How Often to Test for HIV',
    'info.hivTesting.desc': 'Regular testing recommendations',
    'info.condoms': 'Condoms & Harm Reduction',
    'info.condoms.desc': 'Additional protection strategies',

    // SWING
    'swing.title': 'Get Free PrEP at SWING',
    'swing.subtitle': 'Friendly, judgment-free sexual health services',
    'swing.whoCanAccess': 'Who Can Access',
    'swing.welcome': 'Everyone is welcome',
    'swing.noJudgment': 'No judgment, no questions',
    'swing.lgbtq': 'LGBTQ+ friendly services',
    'swing.confidential': 'Confidential and safe',
    'swing.whatToPrepare': 'What to Prepare',
    'swing.id': 'ID (optional but helpful)',
    'swing.medications': 'List of current medications',
    'swing.questions': "Your questions (we're here to help!)",
    'swing.locations': 'Locations',
    'swing.multipleLocations': 'Multiple locations across Thailand',
    'swing.visitWebsite': 'Visit the website for nearest clinic',
    'swing.hours': 'Opening Hours',
    'swing.checkHours': 'Check website for current hours',
    'swing.walkIns': 'Walk-ins welcome, appointments recommended',
    'swing.bookNow': 'Book Now',
    'swing.opensNewWindow': 'Opens in a new window',

    // Settings
    'settings.title': 'Settings',
    'settings.notifications': 'Notifications',
    'settings.dailyPrep': 'Daily PrEP',
    'settings.dailyPrep.desc': 'Daily reminder',
    'settings.ondemandPrep': 'On-demand PrEP',
    'settings.ondemandPrep.desc': 'Event-based reminder',
    'settings.pepReminders': 'PEP Reminders',
    'settings.pepReminders.desc': '28-day course reminders',
    'settings.reminderTime': 'Reminder Time',
    'settings.defaultTime': 'Default reminder time',
    'settings.data': 'Data',
    'settings.resetAll': 'Reset all data',
    'settings.resetWarning': 'This will delete all your progress, settings, and badges.',
    'settings.confirmReset': 'Are you sure? This will reset all progress.',
    'settings.theme': 'Theme',
    'settings.account': 'Account',
    'settings.loggedInAs': 'Logged in as',
    'settings.logout': 'Logout',
    'landing.poweredBy': 'Powered by',

    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.loginSubtitle': 'Login to sync your progress',
    'auth.signupSubtitle': 'Create an account to save progress',
    'auth.email': 'Email',
    'auth.emailPlaceholder': 'Enter your email',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.displayName': 'Display Name',
    'auth.displayNamePlaceholder': 'Your name',
    'auth.loginButton': 'Login',
    'auth.signupButton': 'Sign Up',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.signupLink': 'Sign Up',
    'auth.loginLink': 'Login',
    'auth.invalidEmail': 'Invalid email',
    'auth.passwordTooShort': 'Password must be at least 6 characters',
    'auth.invalidCredentials': 'Invalid email or password',
    'auth.userExists': 'Email already in use',
    'auth.loginSuccess': 'Login successful!',
    'auth.signupSuccess': 'Sign up successful!',
    'auth.privacyNote': 'Your data is encrypted and secure',

    // Navigation
    'nav.home': 'Home',
    'nav.learn': 'Learn',
    'nav.swing': 'SWING',
    'nav.progress': 'Progress',
    'nav.settings': 'Settings',
    'nav.test': 'Test',
    'nav.bookings': 'Bookings',
    'nav.care': 'Care',

    // Community
    'community.title': 'Community',
    'community.subtitle': 'Connect and share safely',
    'community.anonymousReminder': "You're anonymous",
    'community.anonymousDesc': 'No one can see your personal information',
    'community.manageInterests': 'Manage Interests',
    'chat.yourNickname': 'Your nickname',
    'chat.guidelines.title': 'Community Guidelines',
    'chat.guidelines.respectful': 'Be respectful',
    'chat.guidelines.noPersonalInfo': "Don't share personal info",
    'chat.guidelines.supportive': 'Be supportive',
    'chat.guidelines.notMedicalAdvice': 'Not medical advice',
    'chat.typeMessage': 'Type a message...',
    'chat.loginRequired': 'Login to send messages',
    'common.dismiss': 'Dismiss',
    'interests.title': 'Your Interests',
    'interests.subtitle': 'Choose topics you care about',
    'interests.description': "We'll use this to recommend chat rooms and content",
    'interests.saved': 'Interests saved',

    // Self-Care
    'selfCare.title': 'Self-Care',
    'selfCare.subtitle': 'Products and tools for you',
    'selfCare.orderNow': 'Order Now',
    'selfCare.reminders': 'Reminders',
    'selfCare.hivTestReminder': 'HIV Test Reminder',
    'selfCare.hivTestReminderDesc': 'Monthly',
    'selfCare.condomReminder': 'Condom Refill Reminder',
    'selfCare.condomReminderDesc': 'When running low',
    'selfCare.harmReductionReminder': 'Harm Reduction Supplies',
    'selfCare.harmReductionReminderDesc': 'Restock supplies',
    'selfCare.reminderEnabled': 'Reminder enabled',
    'selfCare.reminderDisabled': 'Reminder disabled',

    // Quests
    'quests.title': 'Quests',
    'quests.subtitle': 'Journey together',
    'quests.journey': 'Journey',
    'quests.campaign': 'Campaign',
    'quests.join': 'Join',
    'quests.joined': 'Quest joined',
    'quests.completed': 'Completed',
    'quests.days': 'days',
    'quests.daysLeft': 'days left',
    'quests.keepGoing': 'Keep going!',
    'quests.almostThere': 'Almost there!',
    'quests.claimBadge': 'Claim Badge!',
    'quests.loginRequired': 'Login to join',
    'quests.noJourneyQuests': 'No journey quests',
    'quests.noCampaignQuests': 'No campaigns right now',

    // Share
    'share.title': 'Share Achievements',
    'share.subtitle': 'Celebrate your journey',
    'share.privacyNote': 'Cards don\'t mention PrEP, PEP or HIV directly',
    'share.shareOn': 'Share on',

    // Health Profile
    'healthProfile.title': 'Health Profile',
    'healthProfile.subtitle': 'Your health info (optional)',
    'healthProfile.disclaimer': 'This is not a medical record. For personal reference only.',
    'healthProfile.timeline': 'Timeline',
    'healthProfile.noHistory': 'No history yet',
    'healthProfile.sideEffects': 'Side Effects',
    'healthProfile.sideEffectsDesc': 'Record side effects you notice',
    'healthProfile.sideEffectsPlaceholder': 'e.g., headache, nausea...',
    'healthProfile.notes': 'Notes',
    'healthProfile.notesPlaceholder': 'Personal notes...',
    'healthProfile.saved': 'Health profile saved',
    'healthProfile.preConsultation': 'Pre-Consultation Form',

    // Consultation
    'consultation.title': 'Pre-Consultation Form',
    'consultation.subtitle': 'Prepare for your appointment',
    'consultation.description': 'Fill this out before visiting a healthcare provider',
    'consultation.preventionUse': 'Current Prevention Use',
    'consultation.preventionUseDesc': 'Are you on PrEP or PEP?',
    'consultation.preventionUsePlaceholder': 'e.g., Daily PrEP for 3 months',
    'consultation.recentTesting': 'Recent Testing',
    'consultation.recentTestingDesc': 'When was your last HIV test?',
    'consultation.recentTestingPlaceholder': 'e.g., 2 months ago, negative',
    'consultation.questions': 'Questions for Provider',
    'consultation.questionsDesc': 'Write down questions you want to ask',
    'consultation.question': 'Question',
    'consultation.addQuestion': 'Add Question',
    'consultation.copy': 'Copy',
    'consultation.copied': 'Copied to clipboard',
    'consultation.saved': 'Form saved',

    // Booking
    'booking.title': '📅 Book Appointment',
    'booking.subtitle': 'Free for Thai nationals under NHSO Universal Coverage & Global Fund-supported nationals (Myanmar, Vietnam, Laos, Cambodia). Other nationalities may have charges.',
    'booking.selectBranch': 'Select Branch',
    'booking.selectServices': 'Select Services',
    'booking.selectDateTime': 'Select Date & Time',
    'booking.confirmBooking': 'Confirm Booking',
    'booking.bookingConfirmed': 'Booking Confirmed',
    'booking.slotsAvailable': 'slots available',
    'booking.reviews': 'reviews',
    'booking.openGoogleMaps': 'Open in Google Maps',
    'booking.notSure': 'Not sure what you need?',
    'booking.freeThaiNHSO': 'Free (Thai NHSO)',
    'booking.freeGlobalFund': 'Free (Global Fund: CLVM)',
    'booking.pepFreeThaiOnly': 'PEP: Free for Thai ONLY',
    'booking.pepWarning': '⚠️ PEP (Emergency Antiretroviral): Free for Thai nationals ONLY',
    'booking.pepWarningDesc': 'Other nationalities (including CLVM) may have charges. Check pricing at swingsilompolyclinic.com',
    'booking.riskDisclaimer': '⚕️ This is NOT a diagnosis. Answer questions to help recommend suitable services.',
    'booking.seeRecommendations': 'See Recommendations',
    'booking.selectDate': 'Select Date',
    'booking.today': 'Today',
    'booking.closed': 'Closed',
    'booking.fullyClosed': 'Fully Closed',
    'booking.selectAnotherDate': 'Please select another date',
    'booking.next': 'Next',
    'booking.selectedServices': 'Selected Services',
    'booking.freeInfo': 'Free for Thai (NHSO) & Global Fund (CLVM), except PEP which is free for Thai only',
    'booking.notesLabel': 'Notes (optional)',
    'booking.notesPlaceholder': 'e.g., Need English interpreter',
    'booking.anonNotice': 'Booking without an account — enter your email to receive a booking code',
    'booking.contactEmail': 'Contact Email *',
    'booking.idUploadHint': 'You can upload your ID card in advance via "Personal Info" page for easier registration',
    'booking.confirm': 'Confirm Booking',
    'booking.successTitle': '🎉 Booking Confirmed!',
    'booking.bookingCode': 'Booking Code',
    'booking.screenshotHint': 'Please take a screenshot and show this to Medical Registration',
    'booking.screenshotDesc': 'Staff will look up your booking using this code',
    'booking.viewMyAppointments': 'View My Appointments',
    'booking.emailSent': 'We sent an appointment link to your email',
    'booking.emailSentDesc': 'Use the link from your email to view your appointment anytime',
    'booking.wantEasier': 'Want to manage your appointment easily?',
    'booking.registerBenefit': 'Register to view, reschedule, or cancel your booking anytime',
    'booking.register': 'Register',
    'booking.backToHome': 'Back to Home',
    'booking.slotBlocked': 'This time is unavailable. Please choose another slot.',
    'booking.slotFull': 'This time slot is full. Please choose another time.',
    'booking.duplicateBooking': 'You already have an appointment at this time',
    'booking.enterEmail': 'Please enter your email',
    'booking.savedToDevice': 'Appointment saved to this device ✅',
    'booking.partialBlackout': 'Some time slots are blocked today',
    'booking.dayClosed': 'This day is fully closed',
    'booking.closedLabel': 'Closed',

    // Home
    'home.welcome': 'Good testers are right here!',
    'home.chooseService': 'Choose a service',
    'home.selfTest': 'SELF TEST',
    'home.bookAppointment': 'BOOK APPOINTMENT',
    'home.surveys': 'SURVEYS',
    'home.didYouKnow': 'DID YOU KNOW?',
    'home.onlineCounselor': 'ONLINE COUNSELOR',
    'home.selfCare': 'SELF CARE',
    'home.preventionMatch': 'Prevention Match',
    'home.inviteTest': 'INVITE TO TEST',
    'home.members': 'Members',
    'home.totalVisitors': 'Total Visitors',
    'home.healthRewards': 'Health Rewards for Active Users',
    'home.healthRewardsSubtitle': 'Rewards for people who take care of their health with testD.',
    'home.poweredBy': 'Powered by',
    'home.freeConfidential': 'This service is free • Your information is confidential',

    // My Appointments
    'appointments.title': 'My Appointments',
    'appointments.upcoming': 'Upcoming',
    'appointments.past': 'Past',
    'appointments.noUpcoming': 'No upcoming appointments',
    'appointments.bookNew': 'Book New Appointment',
    'appointments.cancel': 'Cancel Appointment',
    'appointments.checkin': 'Check In',
    'appointments.checkout': 'Check Out',

    // Admin Sidebar
    'admin.panel': 'Admin Panel',
    'admin.manageSystem': 'Manage system',
    'admin.mode': 'Admin Mode',
    'admin.main': 'Main',
    'admin.dashboard': 'Dashboard',
    'admin.people': 'People',
    'admin.users': 'Users',
    'admin.branchStaff': 'Branch Staff',
    'admin.quickRegister': 'Quick Register',
    'admin.appointments': 'Appointments',
    'admin.bookings': 'Bookings',
    'admin.today': 'Today',
    'admin.schedule': 'Schedule',
    'admin.queueBoard': 'Queue Board',
    'admin.content': 'Content',
    'admin.blog': 'Blog',
    'admin.surveys': 'Surveys',
    'admin.operations': 'Operations',
    'admin.kitOrders': 'Kit Orders',
    'admin.notifications': 'Notifications',
    'admin.analytics': 'Analytics',
    'admin.analyticsOverview': 'Period Overview',
    'admin.import': 'Import',
    'admin.abuseLogs': 'Anti-spam',
    'admin.translations': 'Translations',
    'admin.settings': 'Settings',
    'admin.appUpdates': 'App Updates',
    'admin.rewards': 'Rewards / Incentives',
    'admin.milestones': 'Community Milestones',
    'admin.userChats': 'User Chats',
    'admin.partnerInvites': 'Partner Invites',
    'admin.partnerNetwork': 'Partner Network',
    'admin.pairSessions': 'Pair Sessions',
    'admin.anonymousResponses': 'Responses',
    'admin.smsCredits': 'SMS & Credits',
    'admin.smsRelay': 'SMS Relay',
    'admin.creditBalances': 'Credit Balances',
    'admin.creditPurchases': 'Purchases',
    'admin.reports': 'Reports',
    'admin.exportCenter': 'Export Center',
    'admin.activityLogs': 'Activity Logs',
    'admin.adminTools': 'Admin Tools',
    'admin.harmReduction': 'Harm Reduction',
    'admin.harmReductionDashboard': 'HR Dashboard',
    'admin.diagnostics': 'Diagnostics',
    'admin.systemHealth': 'System Health',
    'admin.ipDocs': 'IP Documentation',
    'admin.backToApp': 'Back to App',
    'admin.logout': 'Logout',

    // Common
    'common.back': 'Back',
    'common.continue': 'Continue',
    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.error': 'An error occurred',
    'common.language': 'Language',
  },
};

// ── Dynamic translation cache ──────────────────────────────────
// In-memory + localStorage cache for CLVM translations
const CACHE_KEY = 'testd-translations-cache';
type TranslationCache = Record<string, Record<string, string>>; // { km: { key: text }, ... }

let dynamicCache: TranslationCache = {};

function loadCacheFromStorage(): TranslationCache {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveCacheToStorage() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(dynamicCache));
  } catch {}
}

// Initialize cache on load
dynamicCache = loadCacheFromStorage();

// ── Batch translation queue ────────────────────────────────────
let pendingQueue: { key: string; source_text: string; source_lang: string }[] = [];
let fetchTimer: ReturnType<typeof setTimeout> | null = null;
let isFetching = false;
const fetchListeners = new Set<() => void>();

async function flushTranslationQueue(targetLang: Language) {
  if (isFetching) return;
  
  const items = pendingQueue.filter(p => p.key && p.source_text && p.source_text.length > 0);
  pendingQueue = [];
  
  if (items.length === 0) return;
  isFetching = true;

  try {
    // Chunk into batches of 150 to stay under the 200 limit
    const CHUNK_SIZE = 150;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase.functions.invoke('translate-ui', {
        body: { target_lang: targetLang, items: chunk },
      });

      if (!error && data?.translations) {
        if (!dynamicCache[targetLang]) dynamicCache[targetLang] = {};
        Object.assign(dynamicCache[targetLang], data.translations);
        saveCacheToStorage();
        fetchListeners.forEach(fn => fn());
      }
    }
  } catch (err) {
    console.error('Translation fetch error:', err);
  } finally {
    isFetching = false;
    if (pendingQueue.length > 0) {
      flushTranslationQueue(targetLang);
    }
  }
}

function enqueueTranslation(key: string, sourceText: string, sourceLang: 'th' | 'en', targetLang: Language) {
  // Don't queue if already cached
  if (dynamicCache[targetLang]?.[key]) return;

  // Don't queue duplicates
  if (pendingQueue.some(p => p.key === key)) return;

  pendingQueue.push({ key, source_text: sourceText, source_lang: sourceLang });

  // Debounce: wait 300ms to batch
  if (fetchTimer) clearTimeout(fetchTimer);
  fetchTimer = setTimeout(() => flushTranslationQueue(targetLang), 300);
}

// ── Zustand store ──────────────────────────────────────────────
interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  _cacheVersion: number; // triggers re-renders when cache updates
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'th' as Language,
      _cacheVersion: 0,
      setLanguage: (lang) => set({ language: lang }),
      t: (key) => {
        const { language } = get();

        // For th/en, use static dictionaries directly
        if (language === 'th' || language === 'en') {
          return translations[language][key] || translations['en'][key] || key;
        }

        // For CLVM languages, check dynamic cache first
        const cached = dynamicCache[language]?.[key];
        if (cached) return cached;

        // Fallback to en → th → key
        const enText = translations['en'][key];
        const thText = translations['th'][key];

        // Enqueue for background translation if we have source text
        if (enText) {
          enqueueTranslation(key, enText, 'en', language);
        } else if (thText) {
          enqueueTranslation(key, thText, 'th', language);
        }

        // Return English fallback while loading
        return enText || thText || key;
      },
    }),
    {
      name: 'testd-language',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

// Subscribe to cache updates to trigger re-renders
fetchListeners.add(() => {
  useLanguage.setState(s => ({ _cacheVersion: s._cacheVersion + 1 }));
});

// ── Pre-fetch translations for current language on init ─────────
export function prefetchTranslations(lang: Language) {
  if (lang === 'th' || lang === 'en') return;

  // Collect all keys that need translation
  const allKeys = Object.keys(translations['en']);
  const missing = allKeys.filter(key => !dynamicCache[lang]?.[key]);

  if (missing.length === 0) return;

  // Batch them
  for (const key of missing) {
    const enText = translations['en'][key];
    if (enText) {
      enqueueTranslation(key, enText, 'en', lang);
    }
  }
}
