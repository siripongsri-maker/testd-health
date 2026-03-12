import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, MessageCircle, TestTube, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Shield, MessageCircle, TestTube, BookOpen } from "lucide-react";
import {
  SEOHead, buildMedicalPageJsonLd, buildFaqJsonLd,
  AISummaryBlock, QuickFactsCard, FAQSection, SourcesCard,
  RelatedContentLinks, buildHarmReductionLinks,
} from "@/components/seo";
import type { FAQItem } from "@/components/seo";
import { trackEvent } from "@/hooks/useAnalytics";

/* ── Landing page data ── */
interface LandingPageConfig {
  slug: string;
  titleEn: string;
  titleTh: string;
  descriptionEn: string;
  descriptionTh: string;
  summaryEn: string;
  summaryTh: string;
  contentEn: string;
  contentTh: string;
  faqs: FAQItem[];
  ctaSection: string; // harm reduction tab to navigate to
}

const LANDING_PAGES: LandingPageConfig[] = [
  {
    slug: "chemsex-safety",
    titleEn: "Chemsex Safety Guide — Harm Reduction Tips",
    titleTh: "คู่มือความปลอดภัย Chemsex — เคล็ดลับลดอันตราย",
    descriptionEn: "Practical harm reduction guidance for chemsex. Learn about safer practices, warning signs, and how to get support.",
    descriptionTh: "คำแนะนำลดอันตรายจากการใช้สารในทางเพศสัมพันธ์ เรียนรู้วิธีปลอดภัยขึ้น สัญญาณเตือน และช่องทางขอความช่วยเหลือ",
    summaryEn: "Chemsex involves combining sexual activity with substance use. This guide provides evidence-based harm reduction information to help people stay safer, recognize warning signs, and access support services.",
    summaryTh: "Chemsex คือการมีเพศสัมพันธ์ร่วมกับการใช้สาร คู่มือนี้ให้ข้อมูลลดอันตรายจากหลักฐานเชิงวิชาการ เพื่อช่วยให้ดูแลตัวเองได้ดีขึ้น รู้จักสัญญาณเตือน และเข้าถึงบริการช่วยเหลือ",
    contentEn: "Chemsex typically involves substances such as methamphetamine, GHB/GBL, mephedrone, or poppers alongside sexual activity. While we do not judge or moralize, understanding risks helps you make more informed choices.\n\nKey harm reduction principles:\n• Never use alone\n• Start with lower amounts\n• Stay hydrated but don't overdrink\n• Use condoms and PrEP\n• Tell a trusted friend your plans\n• Know the signs of overdose\n• Keep emergency numbers accessible (1669)",
    contentTh: "Chemsex มักเกี่ยวข้องกับสารเช่น ยาไอซ์ GHB/GBL เมเฟโดรน หรือ Poppers ในระหว่างกิจกรรมทางเพศ เราไม่ตัดสินแต่การเข้าใจความเสี่ยงช่วยให้ตัดสินใจได้ดีขึ้น\n\nหลักลดอันตราย:\n• ไม่ใช้คนเดียว\n• เริ่มจากปริมาณน้อย\n• ดื่มน้ำแต่อย่ามากเกิน\n• ใช้ถุงยางและ PrEP\n• บอกเพื่อนที่ไว้ใจ\n• รู้จักอาการ Overdose\n• เตรียมเบอร์ฉุกเฉินไว้ (1669)",
    faqs: [
      { questionEn: "What is chemsex?", questionTh: "Chemsex คืออะไร?", answerEn: "Chemsex refers to the use of certain drugs before or during sexual activity to enhance, sustain, or facilitate the experience. Common substances include methamphetamine, GHB/GBL, and mephedrone.", answerTh: "Chemsex หมายถึงการใช้สารบางชนิดก่อนหรือระหว่างมีเพศสัมพันธ์ สารที่พบบ่อย ได้แก่ ยาไอซ์ GHB/GBL และเมเฟโดรน" },
      { questionEn: "How can I reduce risks during chemsex?", questionTh: "ลดความเสี่ยงจาก chemsex ได้อย่างไร?", answerEn: "Start with lower amounts, avoid mixing substances, use condoms and PrEP, stay hydrated, never use alone, and keep emergency contacts accessible.", answerTh: "เริ่มจากปริมาณน้อย หลีกเลี่ยงการผสมสาร ใช้ถุงยางและ PrEP ดื่มน้ำเพียงพอ ไม่ใช้คนเดียว และเตรียมเบอร์ฉุกเฉินไว้" },
      { questionEn: "When should I call for emergency help?", questionTh: "ควรโทรขอความช่วยเหลือเมื่อไหร่?", answerEn: "If someone becomes unconscious, has difficulty breathing, has seizures, or their lips turn blue, call 1669 immediately.", answerTh: "หากมีคนหมดสติ หายใจลำบาก ชัก หรือริมฝีปากเขียว ให้โทร 1669 ทันที" },
    ],
    ctaSection: "learn",
  },
  {
    slug: "drug-combination-risk",
    titleEn: "Drug Combination Risk Checker — Interaction Safety Tool",
    titleTh: "เช็กความเสี่ยงเมื่อใช้สารร่วมกัน — เครื่องมือตรวจสอบปฏิกิริยาระหว่างสาร",
    descriptionEn: "Check risks of mixing drugs such as GHB, methamphetamine, MDMA, ketamine, alcohol and more. Evidence-based harm reduction guidance and warning signs.",
    descriptionTh: "ตรวจสอบความเสี่ยงจากการผสมสาร เช่น GHB ยาไอซ์ MDMA เคตามีน แอลกอฮอล์ ข้อมูลลดอันตรายและสัญญาณเตือน",
    summaryEn: "The Drug Combination Risk Checker helps users understand the risks of mixing two or more substances. It provides evidence-based information about potential dangers, warning signs, and harm reduction strategies.",
    summaryTh: "เครื่องมือเช็กความเสี่ยงจากการใช้สารร่วมกัน ช่วยให้ผู้ใช้เข้าใจอันตรายจากการผสมสาร พร้อมข้อมูลสัญญาณเตือนและวิธีลดอันตราย",
    contentEn: "Mixing substances can significantly increase health risks including overdose, respiratory depression, cardiovascular complications, and mental health emergencies.\n\nOur interaction checker covers 40+ substance pairs with information about:\n• Risk level assessment\n• Why the combination increases risk\n• Warning signs to watch for\n• Harm reduction strategies\n• When to seek emergency help\n\nCommon high-risk combinations include GHB + Alcohol, Poppers + Viagra, and multiple depressants together.",
    contentTh: "การผสมสารอาจเพิ่มความเสี่ยงต่อสุขภาพอย่างมาก รวมถึง overdose ระบบหายใจล้มเหลว ภาวะแทรกซ้อนหัวใจ และวิกฤตสุขภาพจิต\n\nเครื่องมือตรวจสอบของเราครอบคลุม 40+ คู่สาร พร้อมข้อมูล:\n• ระดับความเสี่ยง\n• ทำไมคู่นี้จึงเพิ่มความเสี่ยง\n• อาการที่ควรสังเกต\n• วิธีลดอันตราย\n• เมื่อไหร่ควรขอความช่วยเหลือฉุกเฉิน",
    faqs: [
      { questionEn: "What happens if you mix GHB and alcohol?", questionTh: "ถ้าผสม GHB กับแอลกอฮอล์จะเป็นอย่างไร?", answerEn: "Mixing GHB and alcohol is critically dangerous. Both are depressants that can suppress breathing and consciousness. This combination can quickly lead to overdose, vomiting, and loss of consciousness.", answerTh: "การผสม GHB กับแอลกอฮอล์เป็นอันตรายร้ายแรง ทั้งสองเป็นสารกดประสาทที่อาจทำให้หายใจช้าลงและหมดสติ อาจนำไปสู่ overdose อาเจียน และหมดสติได้อย่างรวดเร็ว" },
      { questionEn: "Is mixing meth and Viagra dangerous?", questionTh: "ผสมยาไอซ์กับไวอากร้าอันตรายไหม?", answerEn: "Yes. Methamphetamine increases heart rate and blood pressure, while sildenafil affects blood flow. Together they can increase cardiovascular strain, especially during physical exertion.", answerTh: "ใช่ ยาไอซ์เพิ่มอัตราการเต้นของหัวใจและความดันเลือด ขณะที่ sildenafil มีผลต่อการไหลเวียนเลือด เมื่อใช้ร่วมกันอาจเพิ่มภาระต่อหัวใจ โดยเฉพาะขณะออกแรง" },
      { questionEn: "Can you mix poppers with Viagra?", questionTh: "ใช้ Poppers กับ Viagra ร่วมกันได้ไหม?", answerEn: "This is a critical-risk combination. Both affect blood vessels and can cause a dangerous drop in blood pressure, leading to fainting, collapse, or loss of consciousness.", answerTh: "คู่นี้มีความเสี่ยงวิกฤต ทั้งสองมีผลต่อหลอดเลือดและอาจทำให้ความดันเลือดตกอย่างรุนแรง นำไปสู่เป็นลม ล้ม หรือหมดสติ" },
      { questionEn: "What are the most dangerous drug combinations?", questionTh: "คู่สารอะไรอันตรายที่สุด?", answerEn: "Critical-risk combinations include GHB + Alcohol, GBL + Alcohol, Poppers + Sildenafil/Tadalafil, and mixing multiple depressants (benzodiazepines + alcohol + GHB).", answerTh: "คู่สารที่มีความเสี่ยงวิกฤต ได้แก่ GHB + แอลกอฮอล์, GBL + แอลกอฮอล์, Poppers + Sildenafil/Tadalafil และการผสมสารกดประสาทหลายชนิด" },
    ],
    ctaSection: "learn",
  },
  {
    slug: "ghb-overdose",
    titleEn: "GHB Overdose — Warning Signs & Emergency Response",
    titleTh: "GHB Overdose — สัญญาณเตือนและการรับมือฉุกเฉิน",
    descriptionEn: "Learn the warning signs of GHB overdose, how to respond, and harm reduction tips. Evidence-based emergency guidance.",
    descriptionTh: "เรียนรู้สัญญาณเตือน GHB overdose วิธีรับมือ และเคล็ดลับลดอันตราย",
    summaryEn: "GHB (gamma-hydroxybutyrate) overdose can be life-threatening. Key warning signs include inability to wake up, slow or irregular breathing, and vomiting while unconscious. If someone shows these signs, call 1669 immediately.",
    summaryTh: "GHB overdose อาจเป็นอันตรายถึงชีวิต สัญญาณสำคัญ ได้แก่ ปลุกไม่ตื่น หายใจช้าหรือไม่สม่ำเสมอ อาเจียนขณะหมดสติ หากพบอาการเหล่านี้ โทร 1669 ทันที",
    contentEn: "GHB is a potent central nervous system depressant. The margin between a recreational dose and overdose can be very narrow.\n\nWarning signs of GHB overdose:\n• Cannot be woken up\n• Breathing becomes slow or irregular\n• Lips or fingertips turn blue\n• Repeated vomiting\n• Seizures\n\nWhat to do:\n1. Call 1669 immediately\n2. Place the person on their side (recovery position)\n3. Monitor breathing\n4. Do not leave them alone\n5. Do not give them anything to eat or drink",
    contentTh: "GHB เป็นสารกดระบบประสาทส่วนกลาง ปริมาณระหว่างใช้สันทนาการกับ overdose อาจห่างกันน้อยมาก\n\nสัญญาณเตือน GHB overdose:\n• ปลุกไม่ตื่น\n• หายใจช้าหรือไม่สม่ำเสมอ\n• ริมฝีปากหรือปลายนิ้วเขียว\n• อาเจียนซ้ำ\n• ชัก\n\nควรทำอย่างไร:\n1. โทร 1669 ทันที\n2. จัดท่านอนตะแคง\n3. เฝ้าดูการหายใจ\n4. อย่าปล่อยให้อยู่คนเดียว\n5. อย่าให้กินหรือดื่มอะไร",
    faqs: [
      { questionEn: "How long does GHB stay in your system?", questionTh: "GHB อยู่ในร่างกายนานแค่ไหน?", answerEn: "GHB typically has effects lasting 1.5-3 hours, but can stay in the body longer. It is generally undetectable in standard drug tests after 12-24 hours.", answerTh: "GHB มักออกฤทธิ์นาน 1.5-3 ชั่วโมง แต่อาจอยู่ในร่างกายนานกว่านั้น ตรวจไม่พบในการตรวจยาทั่วไปหลัง 12-24 ชั่วโมง" },
      { questionEn: "What are the withdrawal symptoms of GHB?", questionTh: "อาการถอน GHB เป็นอย่างไร?", answerEn: "GHB withdrawal can be severe and may include insomnia, anxiety, tremors, sweating, and in serious cases, seizures. Medical supervision is recommended.", answerTh: "อาการถอน GHB อาจรุนแรง ได้แก่ นอนไม่หลับ วิตกกังวล มือสั่น เหงื่อออก และในกรณีรุนแรงอาจชักได้ แนะนำให้อยู่ในการดูแลของแพทย์" },
    ],
    ctaSection: "learn",
  },
  {
    slug: "meth-harm-reduction",
    titleEn: "Methamphetamine Harm Reduction — Safer Use Guide",
    titleTh: "การลดอันตรายจากยาไอซ์ — คู่มือใช้ให้ปลอดภัยขึ้น",
    descriptionEn: "Evidence-based harm reduction tips for methamphetamine use. Warning signs, health effects, and where to get support.",
    descriptionTh: "เคล็ดลับลดอันตรายจากยาไอซ์ สัญญาณเตือน ผลกระทบสุขภาพ และช่องทางขอความช่วยเหลือ",
    summaryEn: "Methamphetamine carries significant health risks including cardiovascular strain, sleep deprivation, and mental health effects. This guide provides practical harm reduction strategies without judgment.",
    summaryTh: "ยาไอซ์มีความเสี่ยงต่อสุขภาพอย่างมาก รวมถึงภาระต่อหัวใจ การนอนไม่หลับ และผลกระทบต่อสุขภาพจิต คู่มือนี้ให้วิธีลดอันตรายโดยไม่ตัดสิน",
    contentEn: "If you or someone you know uses methamphetamine, here are evidence-based harm reduction strategies:\n\n• Stay hydrated and eat regularly\n• Take breaks and rest\n• Avoid mixing with other stimulants or depressants\n• Use condoms and PrEP during sexual activity\n• Monitor heart rate and body temperature\n• Set time limits for sessions\n• Have trusted people nearby\n• Know the signs of psychosis and overheating",
    contentTh: "หากคุณหรือคนที่รู้จักใช้ยาไอซ์ นี่คือวิธีลดอันตราย:\n\n• ดื่มน้ำและกินอาหารสม่ำเสมอ\n• พักผ่อนให้เพียงพอ\n• ไม่ผสมกับสารกระตุ้นหรือสารกดประสาทอื่น\n• ใช้ถุงยางและ PrEP\n• สังเกตอัตราการเต้นของหัวใจและอุณหภูมิร่างกาย\n• กำหนดเวลาในการใช้\n• มีคนที่ไว้ใจอยู่ใกล้\n• รู้จักอาการจิตหลอนและร้อนเกิน",
    faqs: [
      { questionEn: "What are the signs of meth overdose?", questionTh: "อาการ overdose จากยาไอซ์เป็นอย่างไร?", answerEn: "Signs include chest pain, severe overheating, seizures, extreme agitation, confusion, and loss of consciousness. Call 1669 immediately.", answerTh: "อาการรวมถึงเจ็บหน้าอก ร้อนจัด ชัก กระสับกระส่ายรุนแรง สับสน และหมดสติ โทร 1669 ทันที" },
      { questionEn: "How does meth affect mental health?", questionTh: "ยาไอซ์ส่งผลต่อสุขภาพจิตอย่างไร?", answerEn: "Methamphetamine can cause anxiety, paranoia, psychosis, depression, and sleep disturbance. Long-term use may worsen these effects.", answerTh: "ยาไอซ์อาจทำให้เกิดวิตกกังวล หวาดระแวง จิตหลอน ซึมเศร้า และนอนไม่หลับ การใช้ระยะยาวอาจทำให้อาการแย่ลง" },
    ],
    ctaSection: "learn",
  },
  {
    slug: "hiv-self-test-guide",
    titleEn: "HIV Self-Test Guide — How to Test at Home",
    titleTh: "คู่มือการตรวจ HIV ด้วยตนเอง — วิธีตรวจที่บ้าน",
    descriptionEn: "Step-by-step guide for HIV self-testing at home. How to read results, what to do next, and free testing options in Thailand.",
    descriptionTh: "คู่มือตรวจ HIV ด้วยตนเองทีละขั้นตอน วิธีอ่านผล ควรทำอะไรต่อ และตัวเลือกตรวจฟรีในประเทศไทย",
    summaryEn: "HIV self-testing allows you to check your status privately at home. This guide explains how to use a rapid test kit, read results correctly, and what steps to take based on your result.",
    summaryTh: "การตรวจ HIV ด้วยตนเองช่วยให้คุณตรวจสถานะได้เป็นส่วนตัวที่บ้าน คู่มือนี้อธิบายวิธีใช้ชุดตรวจ วิธีอ่านผล และขั้นตอนถัดไป",
    contentEn: "HIV self-testing is a simple, private way to know your status. testD provides free test kits delivered to your door.\n\nHow to use:\n1. Follow the kit instructions\n2. Wait the specified time (usually 15-20 minutes)\n3. Read the result window\n4. Upload a photo of your result for AI verification\n\nIf reactive (positive):\n• Stay calm — a reactive self-test needs confirmation\n• Book a confirmatory test at a clinic\n• Support is available\n\nIf non-reactive (negative):\n• Continue prevention measures\n• Test regularly every 3-6 months",
    contentTh: "การตรวจ HIV ด้วยตนเองเป็นวิธีง่ายและเป็นส่วนตัว testD ส่งชุดตรวจฟรีถึงบ้าน\n\nวิธีใช้:\n1. ทำตามขั้นตอนในชุดตรวจ\n2. รอเวลาที่กำหนด (15-20 นาที)\n3. อ่านผลในช่องแสดงผล\n4. ถ่ายภาพผลเพื่อให้ AI ช่วยตรวจสอบ\n\nหากผลเป็น Reactive:\n• ใจเย็น — ต้องตรวจยืนยันที่คลินิก\n• จองตรวจยืนยัน\n• มีคนพร้อมช่วยเหลือ\n\nหากผลเป็น Non-reactive:\n• ป้องกันต่อเนื่อง\n• ตรวจทุก 3-6 เดือน",
    faqs: [
      { questionEn: "How accurate is an HIV self-test?", questionTh: "ชุดตรวจ HIV ด้วยตนเองแม่นยำแค่ไหน?", answerEn: "HIV self-tests are highly accurate (over 99%) when used correctly and after the window period (usually 3 months after potential exposure).", answerTh: "ชุดตรวจ HIV มีความแม่นยำสูง (มากกว่า 99%) เมื่อใช้ถูกต้องและหลังช่วง window period (3 เดือนหลังสัมผัสเชื้อ)" },
      { questionEn: "Where can I get a free HIV test kit in Thailand?", questionTh: "ขอชุดตรวจ HIV ฟรีได้ที่ไหน?", answerEn: "You can request a free HIV self-test kit through the testD app. Kits are delivered discreetly to your address.", answerTh: "สามารถขอชุดตรวจ HIV ฟรีผ่านแอป testD ส่งถึงบ้านอย่างเป็นความลับ" },
    ],
    ctaSection: "learn",
  },
];

export { LANDING_PAGES };
export type { LandingPageConfig };

export default function SEOLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";

  const page = LANDING_PAGES.find(p => p.slug === slug);

  useEffect(() => {
    if (page) {
      trackEvent("seo_landing_view", { slug: page.slug });
    }
  }, [page?.slug]);

  if (!page) {
    return (
      <PageContainer className="pb-24">
        <div className="text-center py-16 space-y-4">
          <h1 className="text-xl font-bold text-foreground">
            {isEn ? "Page not found" : "ไม่พบหน้านี้"}
          </h1>
          <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
            {isEn ? "Go home" : "กลับหน้าหลัก"}
          </Button>
        </div>
      </PageContainer>
    );
  }

  const jsonLd = [
    buildMedicalPageJsonLd({
      name: isEn ? page.titleEn : page.titleTh,
      description: isEn ? page.descriptionEn : page.descriptionTh,
      url: `https://testd-health.lovable.app/${page.slug}`,
    }),
    buildFaqJsonLd(
      page.faqs.map(f => ({
        question: isEn ? f.questionEn : f.questionTh,
        answer: isEn ? f.answerEn : f.answerTh,
      }))
    ),
  ];

  const content = isEn ? page.contentEn : page.contentTh;

  return (
    <PageContainer className="pb-24">
      <SEOHead
        title={isEn ? page.titleEn : page.titleTh}
        description={isEn ? page.descriptionEn : page.descriptionTh}
        canonicalPath={`/${page.slug}`}
        lang={language}
        alternateLanguages={[
          { lang: "th", path: `/${page.slug}` },
          { lang: "en", path: `/${page.slug}` },
        ]}
        jsonLd={jsonLd}
      />

      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2 text-muted-foreground"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {isEn ? "Back" : "กลับ"}
      </Button>

      <article className="space-y-6">
        {/* H1 */}
        <h1 className="text-[22px] font-bold text-foreground leading-tight">
          {isEn ? page.titleEn : page.titleTh}
        </h1>

        {/* AI Summary */}
        <AISummaryBlock
          summaryEn={page.summaryEn}
          summaryTh={page.summaryTh}
          isEn={isEn}
        />

        {/* Content */}
        <div className="rounded-2xl bg-card p-5" style={{ boxShadow: "var(--hr-card-shadow)" }}>
          {content.split("\n").map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-3" />;
            if (line.startsWith("•") || line.startsWith("•")) {
              return (
                <p key={i} className="text-[14px] text-muted-foreground leading-relaxed flex gap-2 ml-2">
                  <span className="text-hr-divider select-none">•</span>
                  <span>{line.replace(/^[•]\s?/, "")}</span>
                </p>
              );
            }
            return (
              <p key={i} className="text-[14px] text-foreground/85 leading-relaxed mb-2">
                {line}
              </p>
            );
          })}
        </div>

        {/* FAQ */}
        <FAQSection faqs={page.faqs} isEn={isEn} />

        {/* Related */}
        <RelatedContentLinks
          links={[
            {
              labelEn: "Drug Combination Risk Checker",
              labelTh: "เช็กความเสี่ยงเมื่อใช้สารร่วมกัน",
              icon: Shield,
              action: () => navigate("/harm-reduction"),
            },
            {
              labelEn: "Substance Knowledge Library",
              labelTh: "คลังความรู้เรื่องสาร",
              icon: BookOpen,
              action: () => navigate("/harm-reduction"),
            },
            {
              labelEn: "HIV Self-Test",
              labelTh: "ตรวจ HIV ด้วยตนเอง",
              icon: TestTube,
              action: () => navigate("/hiv-selftest"),
            },
            {
              labelEn: "Talk to a Counselor",
              labelTh: "ปรึกษาผู้เชี่ยวชาญ",
              icon: MessageCircle,
              action: () => navigate("/harm-reduction"),
            },
          ]}
          isEn={isEn}
        />

        {/* Sources */}
        <SourcesCard isEn={isEn} />

        {/* Disclaimer */}
        <div className="rounded-2xl bg-hr-surface p-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {isEn
              ? "⚕️ This information is provided for harm reduction and health education. It does not promote or encourage substance use. Lower relative risk does not mean no risk. Always consult a healthcare professional."
              : "⚕️ ข้อมูลนี้จัดทำเพื่อการลดอันตรายและสุขศึกษา ไม่ได้ส่งเสริมหรือสนับสนุนการใช้สาร ความเสี่ยงที่ต่ำกว่าไม่ได้หมายความว่าไม่มีความเสี่ยง ควรปรึกษาแพทย์เสมอ"}
          </p>
        </div>
      </article>
    </PageContainer>
  );
}
