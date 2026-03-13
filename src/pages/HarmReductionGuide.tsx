import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { PageLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  FlaskConical,
  UserCog,
  Brain,
  Route,
  Hospital,
  BarChart3,
  Users,
  MessageCircleWarning,
  ChevronDown,
  ChevronRight,
  Printer,
  Globe,
  Lock,
  ImageIcon,
  Menu,
  X,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────── */
const t = (lang: string, th: string, en: string) => (lang === "th" ? th : en);

/* ── section definitions ────────────────────────────── */
interface Section {
  id: string;
  icon: React.ElementType;
  titleTh: string;
  titleEn: string;
}

const SECTIONS: Section[] = [
  { id: "overview", icon: ShieldCheck, titleTh: "ภาพรวมระบบ Harm Reduction", titleEn: "Overview of Harm Reduction System" },
  { id: "tools", icon: FlaskConical, titleTh: "เครื่องมือ Harm Reduction", titleEn: "Harm Reduction Tools" },
  { id: "personalization", icon: UserCog, titleTh: "ระบบปรับแต่งส่วนตัว", titleEn: "Personalization System" },
  { id: "mental-health", icon: Brain, titleTh: "การคัดกรองสุขภาพจิต (PHQ-4)", titleEn: "Mental Health Screening (PHQ-4)" },
  { id: "pathways", icon: Route, titleTh: "เส้นทางบริการ", titleEn: "Service Pathways" },
  { id: "clinic", icon: Hospital, titleTh: "การเชื่อมต่อ SWING Clinic", titleEn: "SWING Clinic Integration" },
  { id: "mel", icon: BarChart3, titleTh: "การบันทึกข้อมูล MEL", titleEn: "MEL Data Capture" },
  { id: "scenarios", icon: Users, titleTh: "สถานการณ์จำลองสำหรับเจ้าหน้าที่", titleEn: "Staff Scenarios" },
  { id: "guidelines", icon: MessageCircleWarning, titleTh: "แนวทางการสื่อสาร & ความปลอดภัย", titleEn: "Communication & Safety Guidelines" },
];

/* ── screenshot placeholder ─────────────────────────── */
const ScreenshotPlaceholder = ({ label }: { label: string }) => (
  <div className="my-4 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-8 flex flex-col items-center gap-2 print:border-solid print:border-muted-foreground/40">
    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

/* ── prose helper ───────────────────────────────────── */
const Prose = ({ children }: { children: React.ReactNode }) => (
  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground">
    {children}
  </div>
);

/* ── reusable tool card ─────────────────────────────── */
const ToolCard = ({
  title,
  purpose,
  whenToUse,
  userExperience,
  dataCaptured,
  connection,
}: {
  title: string;
  purpose: string;
  whenToUse: string;
  userExperience: string[];
  dataCaptured: string;
  connection: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3 break-inside-avoid">
    <h4 className="font-semibold text-foreground">{title}</h4>
    <div className="space-y-2 text-sm text-foreground/80">
      <p><strong className="text-foreground">Purpose:</strong> {purpose}</p>
      <p><strong className="text-foreground">When to recommend:</strong> {whenToUse}</p>
      <div>
        <strong className="text-foreground">User experience:</strong>
        <ol className="list-decimal ml-5 mt-1 space-y-0.5">
          {userExperience.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </div>
      <p><strong className="text-foreground">Data captured:</strong> {dataCaptured}</p>
      <p><strong className="text-foreground">Service connection:</strong> {connection}</p>
    </div>
  </div>
);

/* ── scenario card ──────────────────────────────────── */
const ScenarioCard = ({
  number,
  title,
  setting,
  situation,
  steps,
  data,
}: {
  number: number;
  title: string;
  setting: string;
  situation: string;
  steps: string[];
  data: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 space-y-3 break-inside-avoid">
    <div className="flex items-center gap-2">
      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-bold">{number}</span>
      <h4 className="font-semibold text-foreground">{title}</h4>
    </div>
    <div className="text-sm text-foreground/80 space-y-2">
      <p><strong className="text-foreground">Setting:</strong> {setting}</p>
      <p><strong className="text-foreground">Situation:</strong> {situation}</p>
      <ol className="list-decimal ml-5 space-y-0.5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p className="text-xs text-muted-foreground"><strong>Data recorded:</strong> {data}</p>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════ */
const HarmReductionGuide = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useAdminRole();
  const { language } = useLanguage();
  const lang = language === "th" ? "th" : "en";

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [tocOpen, setTocOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const scrollTo = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    setTocOpen(false);
  };

  /* ── auth guard ─────────────────────────────────── */
  if (authLoading || roleLoading) return <PageLoader />;

  const allowed = role === "admin" || role === "moderator" || role === "me_analyst";
  if (!user || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">
            {t(lang, "ไม่มีสิทธิ์เข้าถึง", "Access Restricted")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(lang, "หน้านี้สำหรับเจ้าหน้าที่เท่านั้น กรุณาเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์", "This page is for authorized staff only. Please log in with a staff account.")}
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-2">
            {t(lang, "เข้าสู่ระบบ", "Log in")}
          </Button>
        </div>
      </div>
    );
  }

  /* ── render ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* ── top bar ─────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:static print:border-none">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="print:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <h1 className="text-sm font-semibold text-foreground truncate">
            {t(lang, "คู่มือเจ้าหน้าที่ Harm Reduction", "Harm Reduction Staff Guide")}
          </h1>
          <span className="ml-auto hidden sm:inline text-xs text-muted-foreground">v3.0 — March 2026</span>
          <Button variant="outline" size="sm" className="print:hidden ml-1 gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> {t(lang, "พิมพ์", "Print")}
          </Button>
          {/* mobile TOC toggle */}
          <Button variant="outline" size="icon" className="lg:hidden print:hidden ml-1" onClick={() => setTocOpen(!tocOpen)}>
            {tocOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* ── sidebar TOC ───────────────────────── */}
        <aside
          className={`
            fixed lg:sticky top-[57px] left-0 z-20 h-[calc(100vh-57px)] w-64 shrink-0
            overflow-y-auto border-r border-border bg-background p-4 transition-transform duration-200
            print:hidden
            ${tocOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t(lang, "สารบัญ", "Table of Contents")}
          </h2>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-foreground/80 hover:text-foreground"
              >
                <s.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{lang === "th" ? s.titleTh : s.titleEn}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* overlay backdrop for mobile */}
        {tocOpen && (
          <div className="fixed inset-0 z-10 bg-black/30 lg:hidden print:hidden" onClick={() => setTocOpen(false)} />
        )}

        {/* ── main content ──────────────────────── */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-8 print:px-0">
          {/* hero */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6 sm:p-8 print:border-none print:bg-transparent">
            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 mb-3">
              Version 3.0
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {t(lang, "คู่มือเจ้าหน้าที่ Harm Reduction", "Harm Reduction Staff Guide")}
            </h1>
            <p className="mt-2 text-foreground/70 max-w-xl text-sm leading-relaxed">
              {t(
                lang,
                "สำหรับเจ้าหน้าที่ SWING Foundation — ผู้ให้บริการภาคสนาม ที่ปรึกษา เจ้าหน้าที่คลินิก เจ้าหน้าที่ MEL และผู้จัดการโครงการ",
                "For SWING Foundation outreach workers, counselors, clinic staff, MEL officers, and program managers."
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t(lang, "อัปเดตล่าสุด: มีนาคม 2026", "Last updated: March 2026")}</p>
          </div>

          {/* ─── SECTION 1: Overview ────────────── */}
          <SectionWrapper
            section={SECTIONS[0]}
            lang={lang}
            open={openSections["overview"]}
            onToggle={() => toggleSection("overview")}
            ref={(el) => { sectionRefs.current["overview"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "Harm Reduction Hub คืออะไร?", "What is the Harm Reduction Hub?")}</h3>
              <p>{t(
                lang,
                "Harm Reduction Hub เป็นหน้าหลักบน testD (/harm-reduction) ที่สมาชิกชุมชนสามารถเข้าถึงเครื่องมือลดอันตรายที่เกี่ยวข้องกับการใช้สาร chemsex และสุขภาพทางเพศ — โดยไม่มีการตัดสิน",
                "The Harm Reduction Hub is the central page on testD (/harm-reduction) where community members can access tools to reduce risks related to substance use, chemsex, and sexual health — without judgment."
              )}</p>

              <h3>{t(lang, "สนับสนุนความปลอดภัยชุมชนอย่างไร", "How it supports community safety")}</h3>
              <ul>
                <li>{t(lang, "ข้อมูลที่ถูกต้อง สองภาษา (ไทย/อังกฤษ) เกี่ยวกับสารเสพติดและปฏิสัมพันธ์ระหว่างสาร", "Accurate, bilingual (Thai/English) information about substances and their interactions")}</li>
                <li>{t(lang, "เครื่องมือคัดกรองที่ผ่านการตรวจสอบ เพื่อให้ผู้ใช้ประเมินความเสี่ยงด้วยตนเอง", "Validated screening tools for self-risk assessment")}</li>
                <li>{t(lang, "เชื่อมต่อกับบริการ SWING Clinic — การจอง การให้คำปรึกษา การตรวจ", "Connection to real SWING Clinic services — booking, counseling, testing")}</li>
                <li>{t(lang, "สนับสนุนผู้ใช้ก่อน ระหว่าง และหลังการใช้สาร", "Support before, during, and after substance use")}</li>
              </ul>

              <h3>{t(lang, "แผนภาพระบบ", "System Flow")}</h3>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap">
{`User → /harm-reduction
  ↓ Age Gate (18+)
  ↓ Landing: Hero → Pathways → Personalization → Recommendations → Trust
  ↓ Select pathway: Learn | Check | Plan | Support | Clinic
  ↓ Complete tool (screening, plan, check-in)
  ↓ Receive recommendations
  ↓ Connect to services: Booking → Clinic Intake → Counseling → Follow-up
  ↓ All events recorded for MEL reporting`}
              </div>
            </Prose>
            <ScreenshotPlaceholder label={t(lang, "ภาพหน้าจอ: หน้า Harm Reduction Hub", "Screenshot: Harm Reduction Hub landing")} />
          </SectionWrapper>

          {/* ─── SECTION 2: Tools ───────────────── */}
          <SectionWrapper
            section={SECTIONS[1]}
            lang={lang}
            open={openSections["tools"]}
            onToggle={() => toggleSection("tools")}
            ref={(el) => { sectionRefs.current["tools"] = el; }}
          >
            <div className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
              <ToolCard
                title={t(lang, "Harm Reduction Hub", "Harm Reduction Hub")}
                purpose={t(lang, "ศูนย์ความรู้หลักสำหรับข้อมูลสารและกลยุทธ์การลดอันตราย", "Central knowledge center for substance information and harm reduction strategies.")}
                whenToUse={t(lang, "เมื่อสมาชิกชุมชนต้องการเรียนรู้เกี่ยวกับสาร ความเสี่ยง หรือแนวปฏิบัติที่ปลอดภัยขึ้น", "When a community member wants to learn about substances, risks, or safer practices.")}
                userExperience={[
                  t(lang, "เรียกดูโปรไฟล์สาร อ่านเคล็ดลับลดอันตราย", "Browse substance profiles, read harm reduction tips"),
                  t(lang, "เข้าถึงตัวตรวจสอบปฏิสัมพันธ์และห้องสมุดความรู้", "Access the interaction checker and knowledge library"),
                ]}
                dataCaptured={t(lang, "การเข้าชมหน้า หัวข้อสารที่เข้าถึง", "Page views, substance topics accessed.")}
                connection={t(lang, "ลิงก์ไปยังการคัดกรอง การวางแผนความปลอดภัย และการให้คำปรึกษา", "Links to screening, safety planning, and counseling.")}
              />
              <ToolCard
                title={t(lang, "ห้องสมุดความรู้เรื่องสาร", "Substance Knowledge Library")}
                purpose={t(lang, "ให้ข้อมูลที่ถูกต้อง ไม่ตัดสิน เกี่ยวกับสารที่ใช้กันทั่วไป", "Provide accurate, non-judgmental information about commonly used substances.")}
                whenToUse={t(lang, "เมื่อผู้ใช้ถาม 'สารนี้คืออะไร?' หรือต้องการเข้าใจผลกระทบ", "When a user asks 'What is this substance?' or wants to understand effects.")}
                userExperience={[
                  t(lang, "เรียกดูหรือค้นหาโปรไฟล์สาร", "Browse or search substance profiles"),
                  t(lang, "ดูผลกระทบ ความเสี่ยง สัญญาณ OD และคำแนะนำ", "View effects, risks, overdose signs, and advice"),
                  t(lang, "เนื้อหาสองภาษา (ไทย/อังกฤษ)", "Bilingual content (Thai/English)"),
                ]}
                dataCaptured={t(lang, "สารที่ดู เวลาที่ใช้", "Substances viewed, time spent.")}
                connection={t(lang, "ลิงก์ไปยังตัวตรวจสอบปฏิสัมพันธ์ เครื่องมือคัดกรอง และการจอง", "Links to interaction checker, screening tools, and booking.")}
              />
              <ToolCard
                title={t(lang, "ตัวตรวจสอบปฏิสัมพันธ์ยา (Mix Risk)", "Drug Interaction Checker (Mix Risk)")}
                purpose={t(lang, "ช่วยผู้ใช้เข้าใจความเสี่ยงเมื่อใช้สารสองตัวขึ้นไปร่วมกัน", "Help users understand risks when combining two or more substances.")}
                whenToUse={t(lang, "เมื่อผู้ใช้วางแผนใช้สารหลายตัวร่วมกัน", "When a user plans to use multiple substances together.")}
                userExperience={[
                  t(lang, "เลือกสารสองตัวจากรายการ 18+ ตัวเลือก", "Select two substances from 18+ options"),
                  t(lang, "ดูระดับความเสี่ยงแบบมีรหัสสี (5 ระดับ)", "View color-coded risk level (5-point scale)"),
                  t(lang, "อ่านคำแนะนำโดยละเอียด", "Read detailed guidance"),
                  t(lang, "เข้าถึงทางลัด 'Common Checks'", "Access 'Common Checks' shortcuts"),
                ]}
                dataCaptured={t(lang, "คู่สารที่ตรวจ ระดับความเสี่ยงที่ดู", "Substance pairs checked, risk levels viewed.")}
                connection={t(lang, "คู่ที่มีความเสี่ยงสูงลิงก์ไปยัง Support Triage และ SWING Clinic", "High-risk combinations link to support triage and SWING Clinic.")}
              />
              <ToolCard
                title={t(lang, "แผนความปลอดภัยตามสถานการณ์", "Scenario-Based Safety Planner")}
                purpose={t(lang, "ช่วยผู้ใช้สร้างแผนความปลอดภัยส่วนตัว", "Help users create a personalized safety plan.")}
                whenToUse={t(lang, "ก่อนออกไปเที่ยว ใช้สารคนเดียว หรือต้องการการสนับสนุนหลังใช้", "Before going out, using alone, or wanting recovery support.")}
                userExperience={[
                  t(lang, "เลือกสถานการณ์: 'ออกไปเที่ยวคืนนี้' 'ใช้คนเดียว' ฯลฯ", "Select scenario: 'Going out tonight,' 'Using alone,' etc."),
                  t(lang, "ตอบคำถามแบบปรับตัว", "Answer guided adaptive questions"),
                  t(lang, "รับแผนส่วนตัวพร้อมขั้นตอนปฏิบัติ", "Receive personalized plan with practical steps"),
                  t(lang, "เปิดการแจ้งเตือน: ดื่มน้ำ เว้นระยะโดส", "Opt into reminders: hydration, dose spacing"),
                ]}
                dataCaptured={t(lang, "สถานการณ์ที่เลือก แผนที่สร้าง (safer_plan_created)", "Scenario selected, plan created (safer_plan_created event).")}
                connection={t(lang, "แผนลิงก์ไปยัง Support Triage ถ้าตรวจพบความเสี่ยง Recovery Mode เชื่อมต่อกับการติดตามผล", "Plans link to support triage if risk detected. Recovery Mode connects to follow-up.")}
              />
              <ToolCard
                title={t(lang, "การคัดกรองความเสี่ยง", "Risk Screening Flow")}
                purpose={t(lang, "เครื่องมือคัดกรองที่ผ่านการตรวจสอบสำหรับประเมินความเสี่ยงด้วยตนเอง", "Validated screening tool for self-risk assessment.")}
                whenToUse={t(lang, "ระหว่าง outreach ผู้เยี่ยมชมคลินิกครั้งแรก หรือเมื่อผู้ใช้แสดงความกังวล", "During outreach, first-time clinic visitors, or when a user expresses concern.")}
                userExperience={[
                  t(lang, "ตอบคำถามคัดกรอง", "Answer screening questions"),
                  t(lang, "ดูผลประเมินความเสี่ยง", "View risk assessment results"),
                  t(lang, "รับคำแนะนำที่ปรับตามผล", "Receive tailored recommendations"),
                ]}
                dataCaptured={t(lang, "เหตุการณ์เริ่ม/เสร็จสิ้นการคัดกรอง ระดับความเสี่ยง", "Screening start/complete events, risk level results.")}
                connection={t(lang, "ความเสี่ยงปานกลาง/สูง → แนะนำให้ปรึกษาหรือจอง SWING Clinic", "Moderate/high risk → directed to counseling or SWING Clinic booking.")}
              />
              <ToolCard
                title={t(lang, "ศูนย์คัดกรองการสนับสนุน", "Support Triage Hub")}
                purpose={t(lang, "นำผู้ใช้ไปยังการสนับสนุนที่เหมาะสมตามความต้องการ", "Route users to the right support based on needs.")}
                whenToUse={t(lang, "เมื่อผู้ใช้พูดว่า 'ต้องการความช่วยเหลือ' หรืออยู่ในภาวะวิกฤต", "When a user says 'I need help' or is in distress.")}
                userExperience={[
                  t(lang, "ต้องการความช่วยเหลือตอนนี้ — ความปลอดภัยเร่งด่วน (1669/1323)", "Need Help Now — urgent safety (1669/1323)"),
                  t(lang, "พูดคุยกับใครบางคน — การสนับสนุนทางอารมณ์", "Talk to Someone — emotional support"),
                  t(lang, "SWING Clinic — ตรวจ PrEP/PEP สุขภาพทางเพศ", "SWING Clinic — testing, PrEP/PEP, sexual health"),
                  t(lang, "การสนับสนุนการฟื้นตัว / ขอให้โทรกลับ", "Recovery Support / Callback request"),
                ]}
                dataCaptured={t(lang, "เส้นทางที่เลือก คำขอให้คำปรึกษา คำขอโทรกลับ", "Pathway selected, counseling requests, callback requests.")}
                connection={t(lang, "เชื่อมต่อตรงกับการจอง SWING Clinic ขั้นตอนให้คำปรึกษา และคิวติดตามผล", "Direct connection to SWING Clinic booking, counseling workflow, and follow-up queue.")}
              />
              <ToolCard
                title={t(lang, "AI Companion", "AI Companion")}
                purpose={t(lang, "ให้ข้อมูล harm reduction แบบ on-demand สองภาษาผ่าน AI chat", "On-demand, bilingual harm reduction information through AI chat.")}
                whenToUse={t(lang, "เมื่อผู้ใช้มีคำถามด่วน หรือต้องการสนับสนุนนอกเวลาคลินิก", "Quick questions or support outside clinic hours.")}
                userExperience={[
                  t(lang, "ปุ่มแชทลอยบนหน้า Harm Reduction ทุกหน้า", "Floating chat button on all HR pages"),
                  t(lang, "ถามคำถามเป็นภาษาไทยหรืออังกฤษ", "Ask questions in Thai or English"),
                  t(lang, "รับคำตอบที่เน้น harm reduction", "Receive harm reduction-focused responses"),
                ]}
                dataCaptured={t(lang, "เซสชันปฏิสัมพันธ์ หัวข้อที่พูดคุย (ไม่ระบุตัวตน)", "Interaction sessions, topics discussed (anonymized).")}
                connection={t(lang, "AI แนะนำผู้ใช้ไปยังการคัดกรอง การวางแผนความปลอดภัย หรือการให้คำปรึกษา", "AI directs users to screening, safety planning, or counseling.")}
              />
              <ToolCard
                title={t(lang, "เช็คอินรายวัน", "Daily Check-in")}
                purpose={t(lang, "ส่งเสริมการมีส่วนร่วมรายวันและติดตามสุขภาวะ", "Encourage daily engagement and track wellness over time.")}
                whenToUse={t(lang, "สำหรับผู้ใช้ที่ต้องการตรวจสอบสุขภาวะของตนเอง", "For users who want to monitor their wellbeing.")}
                userExperience={[
                  t(lang, "เช็คอินรายวันเรื่องอารมณ์ ความเครียด คุณภาพการนอน", "Daily check-in tracking mood, stress, sleep quality"),
                  t(lang, "ดูตัวนับ streak", "View streak counter"),
                  t(lang, "คะแนนสุขภาวะ 0–100", "Wellness Score (0–100)"),
                ]}
                dataCaptured={t(lang, "รายการรายวัน จำนวน streak คะแนนสุขภาวะ", "Daily entries, streak count, wellness score.")}
                connection={t(lang, "แนวโน้มลดลงอาจทำให้เกิด nudge cards หรือคำแนะนำสนับสนุน", "Declining trends may trigger nudge cards or support recommendations.")}
              />
              <ToolCard
                title={t(lang, "Nudge Cards", "Nudge Cards")}
                purpose={t(lang, "การเตือนที่อ่อนโยนและทันเวลา ส่งเสริมพฤติกรรมที่ปลอดภัยขึ้น", "Gentle, timely reminders encouraging safer behavior.")}
                whenToUse={t(lang, "ปรากฏโดยอัตโนมัติตามบริบทและพฤติกรรมของผู้ใช้", "Appear automatically based on context and user behavior.")}
                userExperience={[
                  t(lang, "การ์ดแจ้งเตือนขนาดเล็กบนหน้า HR landing", "Small notification cards on HR landing page"),
                  t(lang, "ผู้ใช้สามารถปิดแต่ละ nudge ได้", "Users can dismiss each nudge"),
                ]}
                dataCaptured={t(lang, "Nudges ที่แสดง, Nudges ที่ปิด", "Nudges shown, nudges dismissed.")}
                connection={t(lang, "ลิงก์ไปยังเครื่องมือที่เกี่ยวข้อง — การตรวจ เช็คอิน การจองคลินิก", "Link to relevant tools — testing, check-in, clinic booking.")}
              />
            </div>
            <ScreenshotPlaceholder label={t(lang, "ภาพหน้าจอ: เครื่องมือ Harm Reduction", "Screenshot: Harm Reduction tools")} />
          </SectionWrapper>

          {/* ─── SECTION 3: Personalization ─────── */}
          <SectionWrapper
            section={SECTIONS[2]}
            lang={lang}
            open={openSections["personalization"]}
            onToggle={() => toggleSection("personalization")}
            ref={(el) => { sectionRefs.current["personalization"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "โปรไฟล์ส่วนตัว", "Profile Personalization")}</h3>
              <p>{t(
                lang,
                "ผู้ใช้สามารถเลือกแชร์ข้อมูลพื้นฐานผ่าน 'identity chips' ง่ายๆ — ไม่ต้องกรอกฟอร์ม ไม่ต้องสมัครสมาชิก",
                "Users can optionally share basic identity information through simple 'identity chips' — no forms, no registration required."
              )}</p>

              <h3>{t(lang, "คำแนะนำตามชุมชน", "Community-Specific Recommendations")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">{t(lang, "กลุ่ม", "Profile")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "คำแนะนำ", "Recommendations")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border-b border-border font-medium">MSM</td><td className="p-2 border-b border-border">{t(lang, "ตรวจ HIV/STI, ข้อมูล PrEP, เครื่องมือ chemsex safety, จอง SWING Clinic", "HIV/STI testing, PrEP info, chemsex safety tools, SWING Clinic booking")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "ผู้ให้บริการทางเพศ", "Sex workers")}</td><td className="p-2 border-b border-border">{t(lang, "สนับสนุน outreach, บริการคลินิก, คัดกรอง STI", "Outreach support, clinic services, STI screening")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "เยาวชน (อายุต่ำกว่า 25)", "Youth (under 25)")}</td><td className="p-2 border-b border-border">{t(lang, "ข้อมูลปลอดภัย สนับสนุนสุขภาพจิต เพื่อนร่วมทาง", "Safe information, mental health support, peer connection")}</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>{t(lang, "เจ้าหน้าที่แนะนำอย่างไร", "How staff can guide personalization")}</h3>
              <ul>
                <li><strong>{t(lang, "ระหว่าง outreach:", "During outreach:")}</strong> {t(lang, "\"แอปนี้แสดงข้อมูลที่เกี่ยวข้องกับคุณมากขึ้น คุณสามารถแตะตัวเลือกไม่กี่อย่างเพื่อปรับแต่ง — ไม่ต้องใช้ชื่อหรือบัญชี\"", "\"This app can show you info that's more relevant to you. Tap a few options — no name or account needed.\"")}</li>
                <li><strong>{t(lang, "ที่คลินิก:", "At the clinic:")}</strong> {t(lang, "\"ถ้าตั้งค่าความชอบในแอป จะเตือนเรื่องตารางตรวจและติดตามผล\"", "\"If you set up preferences, it will remind you about testing schedules and follow-ups.\"")}</li>
                <li>{t(lang, "การปรับแต่งเป็นทางเลือกเสมอ เครื่องมือใช้งานได้โดยไม่ต้องทำ", "Personalization is always optional. The tools work without it.")}</li>
              </ul>
            </Prose>
            <ScreenshotPlaceholder label={t(lang, "ภาพหน้าจอ: Identity chips และคำแนะนำ", "Screenshot: Identity chips and recommendations")} />
          </SectionWrapper>

          {/* ─── SECTION 4: Mental Health ──────── */}
          <SectionWrapper
            section={SECTIONS[3]}
            lang={lang}
            open={openSections["mental-health"]}
            onToggle={() => toggleSection("mental-health")}
            ref={(el) => { sectionRefs.current["mental-health"] = el; }}
          >
            <Prose>
              <p>{t(
                lang,
                "เครื่องมือคัดกรองสั้นที่ผ่านการตรวจสอบ สำหรับอาการวิตกกังวลและซึมเศร้า ใช้ PHQ-4 (Patient Health Questionnaire-4)",
                "A brief, validated screening tool for anxiety and depression symptoms using the PHQ-4 (Patient Health Questionnaire-4)."
              )}</p>

              <h3>{t(lang, "การให้คะแนน", "Scoring")}</h3>
              <ul>
                <li>{t(lang, "4 คำถาม: วิตกกังวล (2) และซึมเศร้า (2) ใน 2 สัปดาห์ที่ผ่านมา", "4 questions: anxiety (2) and depression (2) over the past 2 weeks")}</li>
                <li>{t(lang, "แต่ละข้อ 0–3 (ไม่เลย → เกือบทุกวัน)", "Each scored 0–3 (Not at all → Nearly every day)")}</li>
                <li>{t(lang, "คะแนนรวม: 0–12", "Total score range: 0–12")}</li>
              </ul>

              <h3>{t(lang, "ระดับความทุกข์", "Distress Levels")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">{t(lang, "คะแนน", "Score")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "ระดับ", "Level")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "การตอบสนองของระบบ", "System response")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border-b border-border">0–2</td><td className="p-2 border-b border-border">{t(lang, "น้อยที่สุด", "Minimal")}</td><td className="p-2 border-b border-border">{t(lang, "เสริมแรงเชิงบวก เคล็ดลับสุขภาวะ", "Positive reinforcement, wellness tips")}</td></tr>
                    <tr><td className="p-2 border-b border-border">3–5</td><td className="p-2 border-b border-border">{t(lang, "เล็กน้อย", "Mild")}</td><td className="p-2 border-b border-border">{t(lang, "คำแนะนำการดูแลตนเอง แนะนำเช็คอินรายวัน", "Self-care suggestions, daily check-in")}</td></tr>
                    <tr><td className="p-2 border-b border-border">6–8</td><td className="p-2 border-b border-border">{t(lang, "ปานกลาง", "Moderate")}</td><td className="p-2 border-b border-border">{t(lang, "แนะนำการให้คำปรึกษา แสดงตัวเลือกสนับสนุน SWING Clinic", "Recommend counseling, show SWING Clinic support")}</td></tr>
                    <tr><td className="p-2 border-b border-border">9–12</td><td className="p-2 border-b border-border">{t(lang, "รุนแรง", "Severe")}</td><td className="p-2 border-b border-border">{t(lang, "เส้นทางสนับสนุนเร่งด่วน ส่งต่อให้คำปรึกษาทันที", "Urgent support pathways, immediate counseling referral")}</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>{t(lang, "เมื่อตรวจพบความทุกข์สูง", "When high distress is detected")}</h3>
              <ol>
                <li>{t(lang, "ผู้ใช้เห็นข้อความที่ชัดเจนและสงบ", "User sees a clear, calm message acknowledging their feelings")}</li>
                <li>{t(lang, "แสดงตัวเลือกสนับสนุนทันที (สายด่วน, SWING Clinic, ขอโทรกลับ)", "Immediate support options shown (hotlines, SWING Clinic, callback)")}</li>
                <li>{t(lang, "ระบบบันทึก mental_health_screen_completed", "System records mental_health_screen_completed service event")}</li>
                <li>{t(lang, "เจ้าหน้าที่ได้รับแจ้งผ่านคิวให้คำปรึกษา", "Staff notified through counseling workflow queue")}</li>
              </ol>
            </Prose>
            <ScreenshotPlaceholder label={t(lang, "ภาพหน้าจอ: PHQ-4 screening", "Screenshot: PHQ-4 screening")} />
          </SectionWrapper>

          {/* ─── SECTION 5: Pathways ────────────── */}
          <SectionWrapper
            section={SECTIONS[4]}
            lang={lang}
            open={openSections["pathways"]}
            onToggle={() => toggleSection("pathways")}
            ref={(el) => { sectionRefs.current["pathways"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "Service Entry Cards", "Service Entry Cards")}</h3>
              <p>{t(
                lang,
                "การ์ดที่นำเสนอต่อผู้ใช้ถาม 'วันนี้คุณมาเรื่องอะไร?' ตัวเลือกรวมถึง: สนับสนุนสุขภาพจิต, คลินิก/ตรวจ/PrEP/PEP, เช็คสุขภาพ, สนับสนุนหลังใช้, ข้อมูลการใช้ที่ปลอดภัยขึ้น, สนับสนุนทั่วไป",
                "Cards presented asking 'What brings you here today?' Options include: Mental health support, Clinic/testing/PrEP/PEP, Health check, After-use support, Safer use information, General support."
              )}</p>

              <h3>{t(lang, "Clinic Service Door", "Clinic Service Door")}</h3>
              <p>{t(
                lang,
                "'ประตูหน้า' ที่ชัดเจนไปยังบริการ SWING Clinic ภายในแอป ดูบริการที่มี เวลาเปิดทำการ จองนัดหมายผ่าน /booking",
                "Clear 'front door' to SWING Clinic services within the app. View available services, opening hours, book appointments via /booking."
              )}</p>

              <h3>{t(lang, "Service Timeline", "Service Timeline")}</h3>
              <p>{t(
                lang,
                "แสดงประวัติบริการของผู้ใช้ที่เข้าสู่ระบบ: เหตุการณ์บริการที่ผ่านมา การติดตามผลที่รอดำเนินการ ตัวบ่งชี้สถานะ",
                "Shows logged-in users their service history: past service events, pending follow-ups with due dates, status indicators."
              )}</p>

              <h3>{t(lang, "เหตุการณ์บริการที่บันทึก", "Recorded Service Events")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">{t(lang, "เหตุการณ์", "Event")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "เมื่อบันทึก", "When recorded")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["hr_screening_started", t(lang, "ผู้ใช้เริ่มคัดกรอง", "User begins screening")],
                      ["hr_screening_completed", t(lang, "ผู้ใช้คัดกรองเสร็จ", "User finishes screening")],
                      ["hr_counseling_requested", t(lang, "ผู้ใช้ขอให้คำปรึกษา", "User requests counseling")],
                      ["swing_clinic_booking_completed", t(lang, "ยืนยันการจอง", "Booking confirmed")],
                      ["mental_health_screen_completed", t(lang, "PHQ-4 เสร็จสิ้น", "PHQ-4 completed")],
                      ["callback_requested", t(lang, "ผู้ใช้ขอให้โทรกลับ", "User requests callback")],
                      ["safer_plan_created", t(lang, "แผนความปลอดภัยเสร็จสิ้น", "Safety plan completed")],
                    ].map(([event, when]) => (
                      <tr key={event}>
                        <td className="p-2 border-b border-border font-mono text-xs">{event}</td>
                        <td className="p-2 border-b border-border">{when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Prose>
          </SectionWrapper>

          {/* ─── SECTION 6: Clinic ──────────────── */}
          <SectionWrapper
            section={SECTIONS[5]}
            lang={lang}
            open={openSections["clinic"]}
            onToggle={() => toggleSection("clinic")}
            ref={(el) => { sectionRefs.current["clinic"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "จากเครื่องมือดิจิทัลสู่บริการจริง", "From digital tools to real services")}</h3>
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-xs whitespace-pre-wrap">
{`1. User opens /harm-reduction
2. Completes risk screening → moderate risk detected
3. System recommends HIV testing + counseling
4. User taps "Book at SWING Clinic"
5. Redirected to /booking → selects branch, date, time
6. Appointment confirmed
7. On visit day:
   a. Front Desk checks user in
   b. Clinic Intake: structured health assessment
   c. Counseling session documented
   d. Follow-up scheduled (24h / 7d)
8. All events recorded in MEL system`}
              </div>

              <h3>{t(lang, "หน้าสำคัญ", "Key Pages")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">{t(lang, "หน้า", "Page")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "วัตถุประสงค์", "Purpose")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border-b border-border font-mono text-xs">/harm-reduction</td><td className="p-2 border-b border-border">{t(lang, "Harm Reduction Hub — เครื่องมือทั้งหมด", "Harm Reduction Hub — all tools")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-mono text-xs">/clinic</td><td className="p-2 border-b border-border">{t(lang, "SWING Clinic front door", "SWING Clinic front door — services, hours")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-mono text-xs">/booking</td><td className="p-2 border-b border-border">{t(lang, "การจองนัดหมาย", "Appointment booking")}</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>{t(lang, "ข้อมูลติดต่อ SWING Clinic", "SWING Clinic Contact")}</h3>
              <ul>
                <li><strong>{t(lang, "โทรศัพท์:", "Phone:")}</strong> 02 632 9501</li>
                <li><strong>{t(lang, "เวลาและที่อยู่:", "Hours and address:")}</strong> {t(lang, "จัดการผ่าน Admin Dashboard (Clinic Settings)", "Managed through Admin Dashboard (Clinic Settings)")}</li>
              </ul>
            </Prose>
            <ScreenshotPlaceholder label={t(lang, "ภาพหน้าจอ: ขั้นตอนการจอง", "Screenshot: Booking flow")} />
          </SectionWrapper>

          {/* ─── SECTION 7: MEL ─────────────────── */}
          <SectionWrapper
            section={SECTIONS[6]}
            lang={lang}
            open={openSections["mel"]}
            onToggle={() => toggleSection("mel")}
            ref={(el) => { sectionRefs.current["mel"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "ระบบบันทึกอะไรบ้าง", "What the system captures")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">{t(lang, "ประเภทข้อมูล", "Data type")}</th>
                      <th className="text-left p-2 border-b border-border">{t(lang, "ตัวอย่าง", "Examples")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "เหตุการณ์บริการ", "Service events")}</td><td className="p-2 border-b border-border">{t(lang, "คัดกรองเสร็จ แผนที่สร้าง จองเสร็จ ขอให้คำปรึกษา", "Screenings, plans, bookings, counseling")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "ผลการคัดกรอง", "Screening results")}</td><td className="p-2 border-b border-border">{t(lang, "ระดับความเสี่ยง คะแนน PHQ-4 หมวดหมู่ความทุกข์", "Risk levels, PHQ-4 scores, distress categories")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "ผลลัพธ์เส้นทาง", "Pathway outcomes")}</td><td className="p-2 border-b border-border">{t(lang, "เหตุผลเข้าใช้ บริการที่เข้าถึง สถานะการส่งต่อ", "Entry reason, services accessed, referral status")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "การส่งต่อ", "Referrals")}</td><td className="p-2 border-b border-border">{t(lang, "ประเภท การยอมรับ/ปฏิเสธ จุดหมาย", "Type, acceptance/decline, destination")}</td></tr>
                    <tr><td className="p-2 border-b border-border font-medium">{t(lang, "การติดตามผล", "Follow-ups")}</td><td className="p-2 border-b border-border">{t(lang, "วันที่กำหนด สถานะเสร็จสิ้น ประเภท", "Scheduled date, completion status, type")}</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>{t(lang, "โมเดลตัวตน", "Identity Model")}</h3>
              <ul>
                <li><strong>{t(lang, "ผู้ใช้ที่เข้าสู่ระบบ:", "Logged-in users:")}</strong> {t(lang, "เหตุการณ์เชื่อมกับ user_id", "Events linked to user_id")}</li>
                <li><strong>{t(lang, "ผู้ใช้ไม่ระบุตัวตน:", "Anonymous users:")}</strong> {t(lang, "เหตุการณ์เชื่อมกับ anonymous_token", "Events linked to anonymous_token")}</li>
              </ul>

              <h3>{t(lang, "ทีม MEL ใช้ข้อมูลอย่างไร", "How MEL teams use this data")}</h3>
              <ol>
                <li><strong>Service Ledger:</strong> {t(lang, "ดูเหตุการณ์บริการทั้งหมดพร้อมตัวกรอง", "View all service events with filters")}</li>
                <li><strong>Indicators:</strong> {t(lang, "ติดตามความคืบหน้าตามตัวชี้วัดโปรแกรม", "Track progress against program indicators")}</li>
                <li><strong>Reporting:</strong> {t(lang, "สร้างรายงานตามรอบสำหรับผู้ให้ทุน", "Generate period-based reports for donors")}</li>
                <li><strong>Export:</strong> {t(lang, "ส่งออก CSV รองรับ UTF-8/BOM", "CSV export with UTF-8/BOM support")}</li>
              </ol>
            </Prose>
          </SectionWrapper>

          {/* ─── SECTION 8: Scenarios ───────────── */}
          <SectionWrapper
            section={SECTIONS[7]}
            lang={lang}
            open={openSections["scenarios"]}
            onToggle={() => toggleSection("scenarios")}
            ref={(el) => { sectionRefs.current["scenarios"] = el; }}
          >
            <div className="grid gap-4 md:grid-cols-2 print:grid-cols-1">
              <ScenarioCard
                number={1}
                title={t(lang, "Peer educator ช่วยเรื่องปฏิสัมพันธ์ยา", "Peer educator helping with drug interaction risks")}
                setting={t(lang, "งาน Outreach ในชุมชน", "Community outreach event")}
                situation={t(lang, "สมาชิกชุมชนถามเรื่องการผสมยาไอซ์กับแอลกอฮอล์", "A community member asks about mixing crystal meth with alcohol.")}
                steps={[
                  t(lang, "เปิด testD → Harm Reduction → 'Learn'", "Open testD → Harm Reduction → 'Learn' pathway"),
                  t(lang, "เปิดตัวตรวจสอบปฏิสัมพันธ์ยา", "Open the Drug Interaction Checker"),
                  t(lang, "เลือก 'Crystal Meth' และ 'Alcohol'", "Select 'Crystal Meth' and 'Alcohol'"),
                  t(lang, "ดูระดับความเสี่ยงและเคล็ดลับร่วมกัน", "Review risk level and tips together"),
                  t(lang, "ถ้าต้องการช่วยเหลือเพิ่มเติม → แนะนำ SWING Clinic", "If more help needed → suggest SWING Clinic"),
                ]}
                data={t(lang, "เหตุการณ์ตรวจสอบปฏิสัมพันธ์", "Interaction check event")}
              />
              <ScenarioCard
                number={2}
                title={t(lang, "ที่ปรึกษาใช้เช็คอินสุขภาพจิต", "Counselor using mental health check-in")}
                setting={t(lang, "ห้องให้คำปรึกษา SWING Clinic", "SWING Clinic counseling room")}
                situation={t(lang, "ลูกค้าบอกว่ารู้สึกวิตกกังวลและอ่อนเพลีย", "Client mentions feeling anxious and low energy.")}
                steps={[
                  t(lang, "เปิด testD → Harm Reduction → เลือก 'สนับสนุนสุขภาพจิต'", "Open testD → HR → select 'Mental health support'"),
                  t(lang, "แนะนำลูกค้าทำคำถาม PHQ-4", "Guide client through PHQ-4 questions"),
                  t(lang, "ดูคะแนนร่วมกัน", "Review score together"),
                  t(lang, "ถ้าปานกลาง/รุนแรง: พูดคุยตัวเลือกสนับสนุน", "If moderate/severe: discuss support options"),
                  t(lang, "บันทึกใน Counseling Workflow", "Document in Counseling Workflow"),
                ]}
                data="mental_health_screen_completed, distress level, follow-up"
              />
              <ScenarioCard
                number={3}
                title={t(lang, "ผู้ใช้วางแผนการใช้สารที่ปลอดภัยขึ้น", "User planning safer substance use")}
                setting={t(lang, "ผู้ใช้ที่บ้าน เตรียมตัวไปปาร์ตี้", "User at home, planning for a party")}
                situation={t(lang, "ผู้ใช้ต้องการเตรียมแผนความปลอดภัยก่อนออกไป", "User wants to prepare a safety plan before going out.")}
                steps={[
                  t(lang, "เปิด testD → Harm Reduction → 'Plan'", "Open testD → HR → 'Plan' pathway"),
                  t(lang, "เลือกสถานการณ์: 'ออกไปเที่ยวคืนนี้'", "Select scenario: 'Going out tonight'"),
                  t(lang, "ตอบคำถามเกี่ยวกับแผน สาร สถานที่", "Answer questions about plans, substances, location"),
                  t(lang, "รับแผนส่วนตัวพร้อมการแจ้งเตือน", "Receive personalized plan with reminders"),
                  t(lang, "วันถัดไป: เข้าถึง Recovery Mode", "Next day: access Recovery Mode"),
                ]}
                data="safer_plan_created, reminder opt-ins, recovery_mode_activated"
              />
              <ScenarioCard
                number={4}
                title={t(lang, "ผู้ใช้ถูกส่งต่อไป SWING Clinic", "User referred to SWING Clinic")}
                setting={t(lang, "ผู้ใช้ทำการคัดกรองบน testD", "User completes screening on testD")}
                situation={t(lang, "คัดกรองแสดงความเสี่ยงสูงสำหรับ STI ระบบแนะนำไปคลินิก", "Screening shows elevated STI risk. System recommends clinic.")}
                steps={[
                  t(lang, "ผู้ใช้คัดกรองเสร็จ → ผลแสดงความเสี่ยงปานกลาง", "User completes screening → moderate risk"),
                  t(lang, "ระบบแนะนำ: 'ไปตรวจที่ SWING Clinic'", "System recommends: 'Visit SWING Clinic for testing'"),
                  t(lang, "ผู้ใช้แตะ 'จองนัดหมาย'", "User taps 'Book appointment'"),
                  t(lang, "เลือกสาขา วันที่ เวลา บน /booking", "Select branch, date, time on /booking"),
                  t(lang, "รับยืนยัน → วันนัด: Front Desk → Intake → Testing → Follow-up", "Receive confirmation → visit day: intake → testing → follow-up"),
                ]}
                data="screening results, booking created, follow-up scheduled"
              />
              <ScenarioCard
                number={5}
                title={t(lang, "Outreach worker ใช้เครื่องมือ HR ระหว่างออก outreach", "Outreach worker using HR tools during engagement")}
                setting={t(lang, "ศูนย์ drop-in หรือบูธ outreach", "Drop-in center or outreach booth")}
                situation={t(lang, "เจ้าหน้าที่ outreach มีส่วนร่วมกับสมาชิกชุมชนที่ต้องการเรียนรู้", "Outreach worker engaging with community members wanting to learn.")}
                steps={[
                  t(lang, "เปิด testD → หน้า Harm Reduction", "Open testD → HR landing page"),
                  t(lang, "แสดงห้องสมุดความรู้สารเพื่อการศึกษา", "Show Substance Knowledge Library for education"),
                  t(lang, "ใช้ตัวตรวจสอบปฏิสัมพันธ์สำหรับคำถามเฉพาะ", "Use Interaction Checker for specific questions"),
                  t(lang, "ช่วยปรับแต่งโปรไฟล์ (ทางเลือก ไม่ต้องใช้บัญชี)", "Help personalize profile (optional, no account needed)"),
                  t(lang, "สำหรับผู้ที่ต้องการบริการคลินิก → Service Entry cards", "For clinic services → Service Entry cards"),
                ]}
                data="page views, interaction checks, service entries"
              />
            </div>
          </SectionWrapper>

          {/* ─── SECTION 9: Guidelines ──────────── */}
          <SectionWrapper
            section={SECTIONS[8]}
            lang={lang}
            open={openSections["guidelines"]}
            onToggle={() => toggleSection("guidelines")}
            ref={(el) => { sectionRefs.current["guidelines"] = el; }}
          >
            <Prose>
              <h3>{t(lang, "ภาษาที่ไม่ตีตรา", "Non-stigmatizing Language")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b border-border">❌ {t(lang, "หลีกเลี่ยง", "Avoid")}</th>
                      <th className="text-left p-2 border-b border-border">✅ {t(lang, "ใช้แทน", "Use instead")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [t(lang, "ผู้ติดยา / คนเสพยา", "Drug abuser / addict"), t(lang, "ผู้ใช้สาร", "Person who uses substances")],
                      [t(lang, "สะอาด / สกปรก (ผลตรวจ)", "Clean / dirty (test results)"), t(lang, "ลบ / บวก / reactive", "Negative / positive / reactive")],
                      [t(lang, "การใช้ยาในทางที่ผิด", "Substance abuse"), t(lang, "การใช้สาร", "Substance use")],
                      [t(lang, "เลิกยา", "Getting clean"), t(lang, "การฟื้นตัว / ลดการใช้", "Recovery / reducing use")],
                    ].map(([avoid, use], i) => (
                      <tr key={i}>
                        <td className="p-2 border-b border-border">{avoid}</td>
                        <td className="p-2 border-b border-border">{use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>{t(lang, "การปกป้องความเป็นส่วนตัว", "Privacy Protection")}</h3>
              <ul>
                <li>{t(lang, "อย่าแชร์ผลการคัดกรองของผู้ใช้กับผู้อื่นโดยไม่ได้รับความยินยอม", "Never share a user's screening results without consent")}</li>
                <li>{t(lang, "การเข้าถึงแบบไม่ระบุตัวตนมีให้เสมอ — ผู้ใช้ไม่จำเป็นต้องมีบัญชี", "Anonymous access is always available — no account needed")}</li>
                <li>{t(lang, "อย่าดูหน้าจอโทรศัพท์ของผู้อื่นโดยไม่ได้รับอนุญาต", "Don't look at someone's phone screen without permission")}</li>
                <li>{t(lang, "ถ้าช่วยคนใช้เครื่องมือต่อหน้า ให้เขาถืออุปกรณ์", "If helping in person, let them hold the device")}</li>
              </ul>

              <h3>{t(lang, "วิธีแนะนำเครื่องมือ", "How to Introduce the Tools")}</h3>
              <div className="space-y-2">
                <p className="font-medium text-primary">{t(lang, "✅ วิธีที่ดี:", "✅ Good approaches:")}</p>
                <ul>
                  <li>{t(lang, "\"เรามีแอปฟรีที่มีข้อมูลเกี่ยวกับสารและวิธีอยู่อย่างปลอดภัยขึ้น — อยากลองดูไหม?\"", "\"We have a free app with info about substances and how to stay safer — want to take a look?\"")}</li>
                  <li>{t(lang, "\"เครื่องมือนี้ตรวจสอบว่าการผสมสารบางอย่างมีความเสี่ยงหรือไม่ — เป็นส่วนตัวและไม่ต้องสมัคร\"", "\"This tool can check if mixing substances is risky — it's private and you don't need to sign up.\"")}</li>
                </ul>
              </div>

              <h3>{t(lang, "เมื่อไหร่ควรแนะนำคลินิก", "When to Recommend Clinic Support")}</h3>
              <ul>
                <li>{t(lang, "ผลคัดกรองแสดงความเสี่ยงปานกลางหรือสูง", "Screening results show moderate or high risk")}</li>
                <li>{t(lang, "คะแนน PHQ-4 ≥ 6", "PHQ-4 score is 6 or above")}</li>
                <li>{t(lang, "ผู้ใช้แสดงความทุกข์หรือพูดถึงการทำร้ายตนเอง", "User expresses distress or mentions self-harm")}</li>
                <li>{t(lang, "ผู้ใช้ถามเรื่อง PrEP, PEP, ตรวจ HIV หรือ STI", "User asks about PrEP, PEP, HIV or STI testing")}</li>
                <li>{t(lang, "ตัวตรวจปฏิสัมพันธ์แสดง 'ความเสี่ยงวิกฤต' หรือ 'อันตราย'", "Interaction checker shows 'Critical risk' or 'Dangerous'")}</li>
              </ul>

              <h3>{t(lang, "สถานการณ์ฉุกเฉิน", "Emergency Situations")}</h3>
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                <ol>
                  <li><strong>{t(lang, "โทร 1669", "Call 1669")}</strong> {t(lang, "(บริการฉุกเฉินไทย) หรือ", "(Thai emergency) or")} <strong>1323</strong> {t(lang, "(สายด่วนวิกฤตสุขภาพจิต)", "(mental health crisis line)")}</li>
                  <li>{t(lang, "อยู่กับคนนั้นถ้าปลอดภัย", "Stay with the person if safe to do so")}</li>
                  <li>{t(lang, "ใช้ Support Triage Hub → 'ต้องการความช่วยเหลือตอนนี้'", "Use Support Triage Hub → 'Need Help Now'")}</li>
                  <li>{t(lang, "บันทึกเหตุการณ์หลังจากสถานการณ์คลี่คลาย", "Document incident after the situation resolves")}</li>
                </ol>
              </div>
            </Prose>
          </SectionWrapper>

          {/* footer */}
          <div className="border-t border-border pt-6 pb-20 text-center text-xs text-muted-foreground space-y-1 print:pb-6">
            <p>{t(lang, "คู่มือนี้ดูแลโดยทีมแพลตฟอร์ม testD", "This guide is maintained by the testD platform team.")}</p>
            <p>{t(lang, "อัปเดตล่าสุด: มีนาคม 2026 — เวอร์ชัน 3.0", "Last updated: March 2026 — Version 3.0")}</p>
          </div>
        </main>
      </div>

      {/* print styles */}
      <style>{`
        @media print {
          body { font-size: 11pt !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:static { position: static !important; }
          .print\\:grid-cols-1 { grid-template-columns: 1fr !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:pb-6 { padding-bottom: 1.5rem !important; }
          .print\\:border-solid { border-style: solid !important; }
          [data-section] { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
};

/* ── collapsible section wrapper ────────────────────── */
import { forwardRef } from "react";

const SectionWrapper = forwardRef<
  HTMLDivElement,
  {
    section: Section;
    lang: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }
>(({ section, lang, open, onToggle, children }, ref) => {
  const Icon = section.icon;
  return (
    <div ref={ref} data-section={section.id} className="scroll-mt-20">
      <Collapsible open={open} onOpenChange={onToggle}>
        <CollapsibleTrigger className="flex items-center gap-3 w-full text-left group py-2">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-foreground flex-1">
            {lang === "th" ? section.titleTh : section.titleEn}
          </h2>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground print:hidden" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground print:hidden" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 pb-2 pl-12">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

SectionWrapper.displayName = "SectionWrapper";

export default HarmReductionGuide;
