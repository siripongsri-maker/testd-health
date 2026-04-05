/**
 * Centralized SEO metadata configuration for every route in testD.
 *
 * Route classification:
 *  - public_indexable:  Visible to search engines, full OG/Twitter metadata
 *  - public_low:        Indexable but not priority pages
 *  - private_noindex:   Authenticated pages, noindex
 *  - admin_restricted:  Admin/staff only, noindex + nofollow
 *  - auth_utility:      Login/reset flows, noindex
 */

export type RouteClass =
  | "public_indexable"
  | "public_low"
  | "private_noindex"
  | "admin_restricted"
  | "auth_utility";

export interface RouteSEO {
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  routeClass: RouteClass;
  ogType?: string;
  canonicalPath?: string;
}

const BASE_URL = "https://testd-health.lovable.app";

/** Default fallback for unknown/new pages */
export const SEO_FALLBACK: RouteSEO = {
  titleTh: "testD — ตรวจ HIV ฟรี จองคลินิก ดูแลสุขภาพครบวงจร",
  titleEn: "testD — Free HIV Testing, Clinic Booking & Health Tools",
  descTh: "ตรวจ HIV ฟรีถึงบ้าน จองนัดคลินิก ปรึกษาผู้เชี่ยวชาญ ดูแลสุขภาพอย่างเป็นส่วนตัว ปลอดภัย",
  descEn: "Free HIV self-test kits, clinic booking, expert counseling, and comprehensive health tools.",
  routeClass: "public_indexable",
};

/**
 * Per-route SEO metadata map.
 * Key = exact pathname (without trailing slash).
 * Dynamic routes use a prefix key like "/info/:id".
 */
export const SEO_MAP: Record<string, RouteSEO> = {
  "/": {
    titleTh: "testD — ตรวจ HIV ฟรี จองคลินิก ดูแลสุขภาพครบวงจร",
    titleEn: "testD — Free HIV Testing, Clinic Booking & Health Tools",
    descTh: "ตรวจ HIV ฟรีถึงบ้าน จองนัดคลินิก ปรึกษาผู้เชี่ยวชาญ PrEP/PEP ดูแลสุขภาพอย่างเป็นส่วนตัว ปลอดภัย",
    descEn: "Free HIV self-test delivered home, clinic booking, PrEP/PEP support, and expert health counseling.",
    routeClass: "public_indexable",
    canonicalPath: "/",
  },
  "/auth": {
    titleTh: "เข้าสู่ระบบ | testD",
    titleEn: "Sign In | testD",
    descTh: "เข้าสู่ระบบ testD เพื่อเข้าถึงบริการสุขภาพและชุมชน",
    descEn: "Sign in to testD to access health services and community.",
    routeClass: "auth_utility",
    canonicalPath: "/auth",
  },
  "/onboarding": {
    titleTh: "เริ่มต้นใช้งาน | testD",
    titleEn: "Get Started | testD",
    descTh: "ตั้งค่าโปรไฟล์ของคุณและเริ่มใช้งาน testD",
    descEn: "Set up your profile and get started with testD.",
    routeClass: "auth_utility",
  },
  "/consent": {
    titleTh: "ยินยอมข้อมูล | testD",
    titleEn: "Data Consent | testD",
    descTh: "ให้ความยินยอมในการใช้ข้อมูลตามนโยบายความเป็นส่วนตัว",
    descEn: "Provide data consent according to our privacy policy.",
    routeClass: "auth_utility",
  },
  "/dashboard": {
    titleTh: "แดชบอร์ดของฉัน | testD",
    titleEn: "My Dashboard | testD",
    descTh: "ดูภาพรวมสุขภาพ ติดตามยา และจัดการนัดหมาย",
    descEn: "View your health overview, track medication, and manage appointments.",
    routeClass: "private_noindex",
  },
  "/setup/prep-daily": {
    titleTh: "ตั้งค่า PrEP รายวัน | testD",
    titleEn: "Set Up Daily PrEP | testD",
    descTh: "ตั้งค่าการกิน PrEP แบบรายวันและตั้งเตือนประจำวัน",
    descEn: "Set up daily PrEP intake with reminders.",
    routeClass: "private_noindex",
  },
  "/setup/prep-ondemand": {
    titleTh: "ตั้งค่า PrEP แบบ On-Demand | testD",
    titleEn: "Set Up On-Demand PrEP | testD",
    descTh: "ตั้งค่า PrEP แบบ Event-Driven สำหรับสถานการณ์เฉพาะ",
    descEn: "Set up event-driven PrEP for specific situations.",
    routeClass: "private_noindex",
  },
  "/pep": {
    titleTh: "PEP ฉุกเฉิน | testD",
    titleEn: "Emergency PEP | testD",
    descTh: "ข้อมูลฉุกเฉินเกี่ยวกับ PEP — ยาป้องกัน HIV หลังสัมผัสเชื้อ",
    descEn: "Emergency PEP information — post-exposure HIV prevention.",
    routeClass: "public_indexable",
    canonicalPath: "/pep",
  },
  "/pep-tracker": {
    titleTh: "ติดตาม PEP | testD",
    titleEn: "PEP Tracker | testD",
    descTh: "ติดตามการกินยา PEP และตั้งเวลาเตือน",
    descEn: "Track your PEP medication intake with reminders.",
    routeClass: "private_noindex",
  },
  "/progress": {
    titleTh: "ความก้าวหน้า | testD",
    titleEn: "My Progress | testD",
    descTh: "ดูความก้าวหน้าด้านสุขภาพและเป้าหมายของคุณ",
    descEn: "View your health progress and goals.",
    routeClass: "private_noindex",
  },
  "/info": {
    titleTh: "บทความสุขภาพ | testD",
    titleEn: "Health Articles | testD",
    descTh: "อ่านบทความสุขภาพ ข้อมูลการป้องกัน และเคล็ดลับการดูแลตัวเอง",
    descEn: "Read health articles, prevention info, and self-care tips.",
    routeClass: "public_indexable",
    canonicalPath: "/info",
  },
  "/info/write": {
    titleTh: "เขียนบทความ | testD",
    titleEn: "Write Article | testD",
    descTh: "เขียนและแชร์บทความสุขภาพกับชุมชน testD",
    descEn: "Write and share health articles with the testD community.",
    routeClass: "private_noindex",
  },
  "/swing": {
    titleTh: "เกี่ยวกับ SWING | testD",
    titleEn: "About SWING | testD",
    descTh: "เรียนรู้เกี่ยวกับมูลนิธิ SWING และบริการสุขภาพชุมชน",
    descEn: "Learn about SWING Foundation and community health services.",
    routeClass: "public_indexable",
    canonicalPath: "/swing",
  },
  "/settings": {
    titleTh: "ตั้งค่า | testD",
    titleEn: "Settings | testD",
    descTh: "จัดการบัญชี ภาษา ธีม และการแจ้งเตือน",
    descEn: "Manage your account, language, theme, and notifications.",
    routeClass: "private_noindex",
  },
  "/community": {
    titleTh: "ชุมชน | testD",
    titleEn: "Community | testD",
    descTh: "เข้าร่วมชุมชน testD พูดคุยแลกเปลี่ยนประสบการณ์สุขภาพ",
    descEn: "Join the testD community to discuss health experiences.",
    routeClass: "public_low",
    canonicalPath: "/community",
  },
  "/self-care": {
    titleTh: "ดูแลตัวเอง | testD",
    titleEn: "Self-Care | testD",
    descTh: "เครื่องมือดูแลสุขภาพกายและจิตใจ ผ่อนคลาย และฟื้นฟู",
    descEn: "Physical and mental health self-care tools.",
    routeClass: "public_low",
    canonicalPath: "/self-care",
  },
  "/hiv-selftest": {
    titleTh: "ตรวจ HIV ด้วยตนเอง | testD",
    titleEn: "HIV Self-Test | testD",
    descTh: "สั่งชุดตรวจ HIV ฟรี ส่งถึงบ้าน ตรวจง่าย เป็นส่วนตัว ปลอดภัย",
    descEn: "Order a free HIV self-test kit delivered to your home. Easy, private, and safe.",
    routeClass: "public_indexable",
    canonicalPath: "/hiv-selftest",
  },
  "/quests": {
    titleTh: "ภารกิจสุขภาพ | testD",
    titleEn: "Health Quests | testD",
    descTh: "ทำภารกิจสุขภาพ สะสมแต้ม XP และรับรางวัล",
    descEn: "Complete health quests, earn XP, and get rewards.",
    routeClass: "private_noindex",
  },
  "/leaderboard": {
    titleTh: "กระดานอันดับ | testD",
    titleEn: "Leaderboard | testD",
    descTh: "ดูอันดับสมาชิกชุมชนที่มีส่วนร่วมมากที่สุด",
    descEn: "View the community leaderboard.",
    routeClass: "private_noindex",
  },
  "/share-achievements": {
    titleTh: "แชร์ความสำเร็จ | testD",
    titleEn: "Share Achievements | testD",
    descTh: "แชร์ความสำเร็จด้านสุขภาพกับเพื่อนและชุมชน",
    descEn: "Share your health achievements with friends.",
    routeClass: "private_noindex",
  },
  "/surveys": {
    titleTh: "แบบสำรวจ | testD",
    titleEn: "Surveys | testD",
    descTh: "ร่วมตอบแบบสำรวจสุขภาพจากชุมชน",
    descEn: "Participate in community health surveys.",
    routeClass: "public_low",
    canonicalPath: "/surveys",
  },
  "/health-profile": {
    titleTh: "โปรไฟล์สุขภาพ | testD",
    titleEn: "Health Profile | testD",
    descTh: "จัดการข้อมูลสุขภาพส่วนตัวและการตั้งค่าของคุณ",
    descEn: "Manage your personal health profile and settings.",
    routeClass: "private_noindex",
  },
  "/consultation": {
    titleTh: "ปรึกษาผู้เชี่ยวชาญ | testD",
    titleEn: "Expert Consultation | testD",
    descTh: "ส่งแบบฟอร์มปรึกษาเพื่อพูดคุยกับผู้เชี่ยวชาญ SWING",
    descEn: "Submit a consultation form to speak with SWING experts.",
    routeClass: "public_low",
    canonicalPath: "/consultation",
  },
  "/admin": {
    titleTh: "แดชบอร์ดผู้ดูแลระบบ | testD",
    titleEn: "Admin Dashboard | testD",
    descTh: "แดชบอร์ดบริหารจัดการ testD สำหรับเจ้าหน้าที่",
    descEn: "testD administration dashboard for staff.",
    routeClass: "admin_restricted",
  },
  "/track-order": {
    titleTh: "ติดตามคำสั่งซื้อ | testD",
    titleEn: "Track Order | testD",
    descTh: "ติดตามสถานะการจัดส่งชุดตรวจ HIV",
    descEn: "Track your HIV test kit delivery status.",
    routeClass: "private_noindex",
  },
  "/personal-info": {
    titleTh: "ข้อมูลส่วนตัว | testD",
    titleEn: "Personal Info | testD",
    descTh: "จัดการข้อมูลส่วนตัวของคุณ",
    descEn: "Manage your personal information.",
    routeClass: "private_noindex",
  },
  "/avatar": {
    titleTh: "แต่งตัวอวาตาร์ | testD",
    titleEn: "Avatar Customization | testD",
    descTh: "ปรับแต่งอวาตาร์ของคุณในชุมชน testD",
    descEn: "Customize your avatar in the testD community.",
    routeClass: "private_noindex",
  },
  "/medication-tracker": {
    titleTh: "ติดตามการกินยา | testD",
    titleEn: "Medication Tracker | testD",
    descTh: "ติดตามการกินยาประจำวัน ตั้งเตือน และดูประวัติ",
    descEn: "Track daily medication, set reminders, and view history.",
    routeClass: "private_noindex",
  },
  "/booking": {
    titleTh: "จองนัดตรวจ | testD",
    titleEn: "Book Appointment | testD",
    descTh: "จองนัดตรวจ HIV, PrEP, PEP และบริการสุขภาพที่คลินิก SWING",
    descEn: "Book HIV, PrEP, PEP, and health service appointments at SWING clinics.",
    routeClass: "public_indexable",
    canonicalPath: "/booking",
  },
  "/my-appointments": {
    titleTh: "นัดหมายของฉัน | testD",
    titleEn: "My Appointments | testD",
    descTh: "ดูและจัดการนัดหมายตรวจสุขภาพของคุณ",
    descEn: "View and manage your health appointments.",
    routeClass: "private_noindex",
  },
  "/guest-appointments": {
    titleTh: "ตรวจสอบนัดหมาย | testD",
    titleEn: "Check Appointment | testD",
    descTh: "ตรวจสอบสถานะนัดหมายของคุณโดยไม่ต้องเข้าสู่ระบบ",
    descEn: "Check your appointment status without signing in.",
    routeClass: "public_low",
  },
  "/invite": {
    titleTh: "ชวนเพื่อนตรวจ | testD",
    titleEn: "Invite a Friend | testD",
    descTh: "ชวนเพื่อนมาตรวจ HIV ฟรีและรับรางวัล",
    descEn: "Invite a friend to get a free HIV test and earn rewards.",
    routeClass: "private_noindex",
  },
  "/credits": {
    titleTh: "เครดิต SMS | testD",
    titleEn: "SMS Credits | testD",
    descTh: "จัดการเครดิต SMS สำหรับการแจ้งเตือน",
    descEn: "Manage SMS notification credits.",
    routeClass: "private_noindex",
  },
  "/install": {
    titleTh: "ติดตั้งแอป | testD",
    titleEn: "Install App | testD",
    descTh: "ติดตั้ง testD บนมือถือเพื่อเข้าถึงบริการสุขภาพง่ายขึ้น",
    descEn: "Install testD on your phone for easier access to health services.",
    routeClass: "public_low",
    canonicalPath: "/install",
  },
  "/forgot-password": {
    titleTh: "ลืมรหัสผ่าน | testD",
    titleEn: "Forgot Password | testD",
    descTh: "รีเซ็ตรหัสผ่านบัญชี testD ของคุณ",
    descEn: "Reset your testD account password.",
    routeClass: "auth_utility",
  },
  "/reset-password": {
    titleTh: "ตั้งรหัสผ่านใหม่ | testD",
    titleEn: "Reset Password | testD",
    descTh: "ตั้งรหัสผ่านใหม่สำหรับบัญชี testD ของคุณ",
    descEn: "Set a new password for your testD account.",
    routeClass: "auth_utility",
  },
  "/docs": {
    titleTh: "เอกสารคู่มือ | testD",
    titleEn: "Documentation | testD",
    descTh: "คู่มือและเอกสารสำหรับการใช้งาน testD",
    descEn: "Guides and documentation for using testD.",
    routeClass: "public_low",
  },
  "/support-chat": {
    titleTh: "แชทกับเจ้าหน้าที่ | testD",
    titleEn: "Support Chat | testD",
    descTh: "พูดคุยกับเจ้าหน้าที่ SWING เพื่อขอคำปรึกษาสุขภาพ",
    descEn: "Chat with SWING staff for health counseling.",
    routeClass: "private_noindex",
  },
  "/prevention-match": {
    titleTh: "Prevention Match — ค้นหาวิธีป้องกันที่เหมาะกับคุณ | testD",
    titleEn: "Prevention Match — Find Your Best Protection | testD",
    descTh: "ทำแบบทดสอบเพื่อค้นหาวิธีป้องกัน HIV ที่เหมาะกับไลฟ์สไตล์ของคุณ",
    descEn: "Take a quiz to find the HIV prevention method that fits your lifestyle.",
    routeClass: "public_indexable",
    canonicalPath: "/prevention-match",
  },
  "/harm-reduction": {
    titleTh: "Harm Reduction — คู่มือลดอันตรายและความปลอดภัย Chemsex | testD",
    titleEn: "Harm Reduction — Chemsex Safety & Drug Interaction Guide | testD",
    descTh: "ตรวจสอบความเสี่ยงจากการผสมสาร คลังความรู้ลดอันตราย และเครื่องมือดูแลสุขภาพ",
    descEn: "Check drug combination risks, substance knowledge library, and health tools.",
    routeClass: "public_indexable",
    canonicalPath: "/harm-reduction",
  },
  "/partners": {
    titleTh: "พาร์ทเนอร์และนักการศึกษา | testD",
    titleEn: "Partners & Educators | testD",
    descTh: "เครือข่ายพาร์ทเนอร์ด้านสาธารณสุขและการศึกษาของ testD",
    descEn: "testD's public health and education partner network.",
    routeClass: "public_indexable",
    canonicalPath: "/partners",
  },
  "/whats-new": {
    titleTh: "มีอะไรใหม่ | testD",
    titleEn: "What's New | testD",
    descTh: "ดูฟีเจอร์ใหม่และการอัปเดตล่าสุดของ testD",
    descEn: "See the latest features and updates in testD.",
    routeClass: "public_low",
    canonicalPath: "/whats-new",
  },
  "/privacy-center": {
    titleTh: "ศูนย์ความเป็นส่วนตัว | testD",
    titleEn: "Privacy Center | testD",
    descTh: "จัดการการยินยอมข้อมูลและความเป็นส่วนตัวของคุณ",
    descEn: "Manage your data consent and privacy settings.",
    routeClass: "private_noindex",
  },
  "/privacy-policy": {
    titleTh: "นโยบายความเป็นส่วนตัว | testD",
    titleEn: "Privacy Policy | testD",
    descTh: "นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลของ testD",
    descEn: "testD privacy policy and personal data protection.",
    routeClass: "public_indexable",
    canonicalPath: "/privacy-policy",
  },
  "/outreach-form": {
    titleTh: "แบบฟอร์ม Outreach | testD",
    titleEn: "Outreach Form | testD",
    descTh: "แบบฟอร์มบันทึกข้อมูลกิจกรรมเชิงรุกภาคสนาม สำหรับเจ้าหน้าที่ SWING Foundation",
    descEn: "Field outreach data recording form for SWING Foundation staff.",
    routeClass: "admin_restricted",
  },
  "/admin/docs/harm-reduction-guide": {
    titleTh: "คู่มือ Harm Reduction สำหรับเจ้าหน้าที่ | testD",
    titleEn: "Harm Reduction Staff Guide | testD",
    descTh: "คู่มือปฏิบัติงาน Harm Reduction สำหรับเจ้าหน้าที่ SWING",
    descEn: "Harm Reduction operational guide for SWING staff.",
    routeClass: "admin_restricted",
  },
  // SEO landing pages
  "/chemsex-safety": {
    titleTh: "Chemsex Safety — ความปลอดภัยในการใช้สารขณะมีเพศสัมพันธ์ | testD",
    titleEn: "Chemsex Safety — Safer Drug Use During Sex | testD",
    descTh: "คู่มือลดอันตรายจาก Chemsex วิธีใช้สารอย่างปลอดภัย และการดูแลสุขภาพ",
    descEn: "Chemsex harm reduction guide, safer substance use, and health care.",
    routeClass: "public_indexable",
    canonicalPath: "/chemsex-safety",
  },
  "/drug-combination-risk": {
    titleTh: "ตรวจสอบความเสี่ยงจากการผสมสาร | testD",
    titleEn: "Drug Combination Risk Checker | testD",
    descTh: "ตรวจสอบอันตรายจากการผสมสารต่างๆ เพื่อความปลอดภัยและลดอันตราย",
    descEn: "Check the risks of mixing different substances for safety and harm reduction.",
    routeClass: "public_indexable",
    canonicalPath: "/drug-combination-risk",
  },
  "/ghb-overdose": {
    titleTh: "GHB Overdose — สัญญาณอันตรายและการช่วยเหลือ | testD",
    titleEn: "GHB Overdose — Warning Signs & Emergency Response | testD",
    descTh: "สังเกตสัญญาณ GHB เกินขนาด การปฐมพยาบาล และวิธีขอความช่วยเหลือ",
    descEn: "Recognize GHB overdose signs, first aid, and how to get help.",
    routeClass: "public_indexable",
    canonicalPath: "/ghb-overdose",
  },
  "/meth-harm-reduction": {
    titleTh: "ลดอันตรายจากยาไอซ์ | testD",
    titleEn: "Methamphetamine Harm Reduction | testD",
    descTh: "ข้อมูลการลดอันตรายจากยาไอซ์ การดูแลสุขภาพ และแหล่งช่วยเหลือ",
    descEn: "Meth harm reduction information, health care, and support resources.",
    routeClass: "public_indexable",
    canonicalPath: "/meth-harm-reduction",
  },
  "/hiv-self-test-guide": {
    titleTh: "คู่มือตรวจ HIV ด้วยตนเอง | testD",
    titleEn: "HIV Self-Test Guide | testD",
    descTh: "วิธีตรวจ HIV ด้วยตนเอง อ่านผลตรวจ และขั้นตอนถัดไป",
    descEn: "How to use an HIV self-test, read results, and next steps.",
    routeClass: "public_indexable",
    canonicalPath: "/hiv-self-test-guide",
  },
  "/virtual": {
    titleTh: "Virtual Stories — เรียนรู้สุขภาพผ่านเรื่องเล่าแบบเลือกเส้นทาง | testD",
    titleEn: "Virtual Stories — Interactive Health Stories | testD",
    descTh: "เรียนรู้เรื่อง HIV, PrEP, Lenacapavir และการดูแลตัวเองผ่านเรื่องเล่าแบบเลือกได้ เล่นฟรี ไม่ต้องสมัคร",
    descEn: "Learn about HIV prevention, PrEP, and self-care through interactive choose-your-path stories. Free to play.",
    routeClass: "public_indexable",
    canonicalPath: "/virtual",
  },
  "/virtual/ep2": {
    titleTh: "มาร์คกับเข็มที่เขายังไม่รู้ว่ามีอยู่ — PrEP & Lenacapavir | testD",
    titleEn: "Marc & The Injection He Didn't Know Existed — PrEP Story | testD",
    descTh: "เรื่องราวของมาร์คกับการค้นพบ PrEP และ Lenacapavir ทางเลือกใหม่ในการป้องกัน HIV ฉีดปีละ 2 ครั้ง",
    descEn: "Marc's journey discovering PrEP and Lenacapavir — a new twice-yearly HIV prevention option.",
    routeClass: "public_indexable",
    canonicalPath: "/virtual/ep2",
  },
};

/**
 * Look up SEO metadata for a given pathname.
 * Falls back to SEO_FALLBACK for unmapped routes.
 */
export function getRouteSEO(pathname: string): RouteSEO {
  // Exact match
  if (SEO_MAP[pathname]) return SEO_MAP[pathname];

  // Dynamic route patterns
  if (pathname.startsWith("/info/article/") || pathname.match(/^\/info\/[^/]+$/)) {
    return {
      titleTh: "บทความสุขภาพ | testD",
      titleEn: "Health Article | testD",
      descTh: "อ่านบทความสุขภาพและข้อมูลที่เป็นประโยชน์จากชุมชน testD",
      descEn: "Read health articles and useful information from testD community.",
      routeClass: "public_indexable",
    };
  }
  if (pathname.startsWith("/community/chat/")) {
    return {
      titleTh: "ห้องแชทชุมชน | testD",
      titleEn: "Community Chat Room | testD",
      descTh: "เข้าร่วมห้องสนทนาชุมชน testD",
      descEn: "Join testD community chat rooms.",
      routeClass: "private_noindex",
    };
  }
  if (pathname.startsWith("/community/interests")) {
    return {
      titleTh: "ความสนใจชุมชน | testD",
      titleEn: "Community Interests | testD",
      descTh: "เลือกหัวข้อที่คุณสนใจในชุมชน testD",
      descEn: "Choose your interests in the testD community.",
      routeClass: "private_noindex",
    };
  }
  if (pathname.startsWith("/surveys/") && pathname.endsWith("/builder")) {
    return {
      titleTh: "สร้างแบบสำรวจ | testD",
      titleEn: "Survey Builder | testD",
      descTh: "สร้างแบบสำรวจสุขภาพสำหรับชุมชน",
      descEn: "Create health surveys for the community.",
      routeClass: "admin_restricted",
    };
  }
  if (pathname.startsWith("/surveys/")) {
    return {
      titleTh: "ทำแบบสำรวจ | testD",
      titleEn: "Take Survey | testD",
      descTh: "ร่วมตอบแบบสำรวจสุขภาพจากชุมชน testD",
      descEn: "Participate in a testD community health survey.",
      routeClass: "public_low",
    };
  }
  if (pathname.startsWith("/invite/session/")) {
    return {
      titleTh: "ชวนเพื่อนตรวจ | testD",
      titleEn: "Invite Session | testD",
      descTh: "เข้าร่วมเซสชันตรวจ HIV กับเพื่อนของคุณ",
      descEn: "Join an HIV testing session with your friend.",
      routeClass: "private_noindex",
    };
  }
  if (pathname.startsWith("/invite/")) {
    return {
      titleTh: "คำเชิญตรวจ HIV ฟรี | testD",
      titleEn: "Free HIV Test Invitation | testD",
      descTh: "เพื่อนของคุณเชิญมาตรวจ HIV ฟรีที่คลินิก SWING",
      descEn: "Your friend invited you to get a free HIV test at SWING clinic.",
      routeClass: "public_indexable",
    };
  }
  if (pathname.startsWith("/docs/")) {
    return {
      titleTh: "เอกสาร | testD",
      titleEn: "Documentation | testD",
      descTh: "เอกสารและคู่มือ testD",
      descEn: "testD documentation and guides.",
      routeClass: "public_low",
    };
  }
  if (pathname.startsWith("/queue-tv/")) {
    return {
      titleTh: "หน้าจอคิว | testD",
      titleEn: "Queue Display | testD",
      descTh: "หน้าจอแสดงคิวสำหรับสาขา",
      descEn: "Branch queue display screen.",
      routeClass: "admin_restricted",
    };
  }
  if (pathname.startsWith("/interaction/")) {
    return {
      titleTh: "ตรวจสอบปฏิสัมพันธ์สาร | testD",
      titleEn: "Substance Interaction | testD",
      descTh: "ข้อมูลความเสี่ยงจากการใช้สารร่วมกัน คำแนะนำลดอันตราย",
      descEn: "Drug interaction risk information and harm reduction advice.",
      routeClass: "public_indexable",
    };
  }

  return SEO_FALLBACK;
}

/**
 * Get robots directive based on route classification.
 */
export function getRobotsDirective(routeClass: RouteClass): string {
  switch (routeClass) {
    case "public_indexable":
      return "index, follow";
    case "public_low":
      return "index, follow";
    case "private_noindex":
      return "noindex, nofollow";
    case "admin_restricted":
      return "noindex, nofollow";
    case "auth_utility":
      return "noindex, nofollow";
    default:
      return "noindex, nofollow";
  }
}
