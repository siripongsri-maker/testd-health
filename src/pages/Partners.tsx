import { useLanguage } from "@/lib/i18n";
import { SEOHead, buildFaqJsonLd } from "@/components/seo/SEOHead";
import { FAQSection, type FAQItem } from "@/components/seo/FAQSection";
import { SourcesCard } from "@/components/seo/SourcesCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Shield, Heart, BookOpen, Users, FileText, Mail,
  Globe, ExternalLink, CheckCircle2
} from "lucide-react";

const PARTNERS_FAQ: FAQItem[] = [
  { questionEn: "What is testD?", questionTh: "testD คืออะไร?", answerEn: "testD is a digital health platform focused on HIV prevention, chemsex harm reduction, and sexual health education. Built by SWING Foundation Thailand.", answerTh: "testD เป็นแพลตฟอร์มสุขภาพดิจิทัลที่มุ่งเน้นการป้องกัน HIV การลดอันตรายจากเคมเซ็กส์ และการให้ความรู้ด้านสุขภาพทางเพศ สร้างโดยมูลนิธิสวิง ประเทศไทย" },
  { questionEn: "Can I link to testD resources?", questionTh: "ฉันสามารถลิงก์ไปยังแหล่งข้อมูล testD ได้หรือไม่?", answerEn: "Yes. All public knowledge pages are free to link to and cite. We encourage NGOs, educators, and health organizations to share our resources.", answerTh: "ได้ หน้าความรู้สาธารณะทั้งหมดสามารถลิงก์และอ้างอิงได้ฟรี" },
  { questionEn: "How can I partner with testD?", questionTh: "จะร่วมงานกับ testD ได้อย่างไร?", answerEn: "Contact us at partnerships@swingth.org with your organization details and proposed collaboration. We welcome co-branded guides, resource inclusions, and expert reviews.", answerTh: "ติดต่อเราที่ partnerships@swingth.org พร้อมรายละเอียดองค์กรและข้อเสนอความร่วมมือ" },
  { questionEn: "Is testD content evidence-based?", questionTh: "เนื้อหา testD อิงหลักฐานหรือไม่?", answerEn: "Yes. Our content follows WHO, UNODC, and EMCDDA guidelines. All harm reduction content is reviewed for medical accuracy and uses non-stigmatizing language.", answerTh: "ใช่ เนื้อหาของเราเป็นไปตามแนวทาง WHO, UNODC และ EMCDDA" },
];

export default function PartnersPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const faqs = PARTNERS_FAQ;

  const linkableAssets = [
    { icon: Shield, titleEn: "Drug Combination Risk Checker", titleTh: "เครื่องมือตรวจสอบความเสี่ยงยาผสม", descEn: "Interactive tool checking risks of 50+ drug combinations with harm reduction advice.", descTh: "เครื่องมือตรวจสอบความเสี่ยงยาผสมกว่า 50 รายการพร้อมคำแนะนำลดอันตราย", path: "/harm-reduction" },
    { icon: BookOpen, titleEn: "Substance Knowledge Library", titleTh: "คลังความรู้สารออกฤทธิ์", descEn: "Comprehensive bilingual guides on 15+ substances with effects, risks, and safer use advice.", descTh: "คู่มือสองภาษาเกี่ยวกับสารออกฤทธิ์กว่า 15 ชนิด", path: "/harm-reduction" },
    { icon: Heart, titleEn: "Chemsex Safety Hub", titleTh: "ศูนย์ความปลอดภัยเคมเซ็กส์", descEn: "Holistic chemsex harm reduction: risk screening, safer use planning, peer support, and counseling referrals.", descTh: "การลดอันตรายเคมเซ็กส์แบบองค์รวม", path: "/chemsex-safety" },
    { icon: FileText, titleEn: "HIV Self-Test Guide", titleTh: "คู่มือตรวจ HIV ด้วยตนเอง", descEn: "Step-by-step guide for HIV self-testing with AI-assisted result reading and counselor support.", descTh: "คู่มือตรวจ HIV ด้วยตนเองพร้อม AI ช่วยอ่านผล", path: "/hiv-self-test-guide" },
  ];

  const editorialPrinciples = isEn ? [
    "Evidence-based: All content follows WHO, UNODC, EMCDDA, and NIDA guidelines",
    "Non-stigmatizing: We use person-first, non-judgmental language",
    "Harm reduction focused: We acknowledge drug use exists and prioritize safety",
    "Never prescriptive: We do not provide dosing, preparation, or sourcing information",
    "Bilingual: All content available in Thai and English",
    "Reviewed regularly: Content includes last-reviewed dates and source citations",
  ] : [
    "อิงหลักฐาน: เนื้อหาทั้งหมดเป็นไปตามแนวทาง WHO, UNODC, EMCDDA และ NIDA",
    "ไม่ตีตรา: เราใช้ภาษาที่ให้ความสำคัญกับบุคคลและไม่ตัดสิน",
    "เน้นการลดอันตราย: เรายอมรับว่ามีการใช้สารเสพติดและให้ความสำคัญกับความปลอดภัย",
    "ไม่แนะนำปริมาณ: เราไม่ให้ข้อมูลเกี่ยวกับขนาดยา การเตรียม หรือแหล่งซื้อ",
    "สองภาษา: เนื้อหาทั้งหมดมีทั้งภาษาไทยและอังกฤษ",
    "ตรวจสอบเป็นประจำ: เนื้อหามีวันที่ตรวจสอบล่าสุดและการอ้างอิงแหล่งข้อมูล",
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={isEn ? "Partners & Educators | testD" : "พาร์ทเนอร์และนักการศึกษา | testD"}
        description={isEn
          ? "Partner with testD — a digital harm reduction platform by SWING Foundation. Access free linkable resources, co-branded guides, and bilingual health education tools."
          : "ร่วมงานกับ testD — แพลตฟอร์มลดอันตรายดิจิทัลโดยมูลนิธิสวิง เข้าถึงแหล่งข้อมูลฟรีและเครื่องมือให้ความรู้สุขภาพสองภาษา"}
        canonicalPath="/partners"
        lang={language}
        alternateLanguages={[
          { lang: "en", path: "/partners" },
          { lang: "th", path: "/partners" },
        ]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: isEn ? "Partners & Educators" : "พาร์ทเนอร์และนักการศึกษา",
            description: "Collaboration and partnership page for testD harm reduction platform",
            publisher: { "@type": "Organization", name: "SWING Foundation", url: "https://testd-health.lovable.app" },
          },
          buildFaqJsonLd(faqs.map(f => ({ question: isEn ? f.questionEn : f.questionTh, answer: isEn ? f.answerEn : f.answerTh }))),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Users className="h-4 w-4" />
            {isEn ? "For Partners & Educators" : "สำหรับพาร์ทเนอร์และนักการศึกษา"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {isEn ? "Build Healthier Communities Together" : "สร้างชุมชนที่สุขภาพดีร่วมกัน"}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isEn
              ? "testD provides free, evidence-based harm reduction resources. Partner with us to expand access to chemsex safety, HIV prevention, and drug interaction education."
              : "testD ให้แหล่งข้อมูลลดอันตรายที่อิงหลักฐานฟรี ร่วมงานกับเราเพื่อขยายการเข้าถึงความปลอดภัยเคมเซ็กส์ การป้องกัน HIV และการศึกษาปฏิสัมพันธ์ยา"}
          </p>
        </header>

        {/* About testD */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "About testD" : "เกี่ยวกับ testD"}
          </h2>
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isEn
                  ? "testD is a digital health platform by SWING Foundation (Service Workers IN Group), a Thai NGO supporting sex workers, MSM, transgender people, and people who use drugs since 2004. testD provides HIV prevention tools, chemsex harm reduction education, and anonymous health support — all bilingual in Thai and English."
                  : "testD เป็นแพลตฟอร์มสุขภาพดิจิทัลโดยมูลนิธิสวิง (Service Workers IN Group) องค์กรพัฒนาเอกชนไทยที่สนับสนุนผู้ให้บริการทางเพศ MSM ผู้มีความหลากหลายทางเพศ และผู้ใช้สารเสพติดตั้งแต่ปี 2547"}
              </p>
              <div className="flex flex-wrap gap-2">
                {["HIV Prevention", "Chemsex Safety", "Harm Reduction", "Drug Interactions", "Mental Health"].map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{tag}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Linkable Assets */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "Free Linkable Resources" : "แหล่งข้อมูลลิงก์ฟรี"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isEn
              ? "These resources are free to link to, cite, and share. No permission needed."
              : "แหล่งข้อมูลเหล่านี้สามารถลิงก์ อ้างอิง และแชร์ได้ฟรี ไม่ต้องขออนุญาต"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {linkableAssets.map((asset, i) => (
              <Card key={i} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(asset.path)}>
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <asset.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">{isEn ? asset.titleEn : asset.titleTh}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{isEn ? asset.descEn : asset.descTh}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Editorial Principles */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "Editorial Principles" : "หลักการบรรณาธิการ"}
          </h2>
          <Card>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {editorialPrinciples.map((p, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Collaboration */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            {isEn ? "How to Collaborate" : "วิธีร่วมมือ"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { titleEn: "Resource Inclusion", titleTh: "รวมแหล่งข้อมูล", descEn: "Add testD to your organization's 'helpful resources' or harm reduction toolkit pages.", descTh: "เพิ่ม testD ในหน้า 'แหล่งข้อมูลที่เป็นประโยชน์' ขององค์กร" },
              { titleEn: "Co-branded Guides", titleTh: "คู่มือร่วมแบรนด์", descEn: "Create bilingual educational materials together. We provide content, you provide reach.", descTh: "สร้างสื่อการศึกษาสองภาษาร่วมกัน" },
              { titleEn: "Expert Review", titleTh: "ผู้เชี่ยวชาญตรวจสอบ", descEn: "Help us improve accuracy. We acknowledge expert reviewers on our published pages.", descTh: "ช่วยเราปรับปรุงความถูกต้อง เราระบุชื่อผู้เชี่ยวชาญที่ตรวจสอบ" },
            ].map((item, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold text-sm">{isEn ? item.titleEn : item.titleTh}</h3>
                  <p className="text-xs text-muted-foreground">{isEn ? item.descEn : item.descTh}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Sources */}
        <SourcesCard
          sources={[
            { name: "World Health Organization (WHO)", url: "https://www.who.int/health-topics/drugs-psychoactive-substances" },
            { name: "UNODC Drug Safety", url: "https://www.unodc.org" },
            { name: "EMCDDA", url: "https://www.emcdda.europa.eu" },
            { name: "NIDA (NIH)", url: "https://nida.nih.gov" },
          ]}
          isEn={isEn}
        />

        {/* FAQ */}
        <FAQSection faqs={faqs} isEn={isEn} />

        {/* Contact CTA */}
        <section className="text-center space-y-4 py-8">
          <h2 className="text-xl font-bold">{isEn ? "Get in Touch" : "ติดต่อเรา"}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {isEn
              ? "Interested in partnering or citing testD? Contact us for collaboration opportunities."
              : "สนใจร่วมงานหรืออ้างอิง testD? ติดต่อเราสำหรับโอกาสความร่วมมือ"}
          </p>
          <Button size="lg" onClick={() => window.location.href = "mailto:partnerships@swingth.org"}>
            <Mail className="h-4 w-4 mr-2" />
            partnerships@swingth.org
          </Button>
        </section>

        {/* Harm Reduction Disclaimer */}
        <footer className="border-t pt-6 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isEn ? "Harm Reduction Disclaimer" : "ข้อจำกัดความรับผิดชอบการลดอันตราย"}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isEn
              ? "testD provides harm reduction information only. This content does not constitute medical advice, does not endorse or encourage drug use, and should not replace professional medical consultation. All information is provided for educational purposes within a public health harm reduction framework. If you need emergency help, call your local emergency services."
              : "testD ให้ข้อมูลการลดอันตรายเท่านั้น เนื้อหานี้ไม่ใช่คำแนะนำทางการแพทย์ ไม่สนับสนุนหรือส่งเสริมการใช้สารเสพติด และไม่ควรใช้แทนการปรึกษาแพทย์ ข้อมูลทั้งหมดให้เพื่อการศึกษาภายในกรอบการลดอันตรายด้านสาธารณสุข หากต้องการความช่วยเหลือฉุกเฉิน โปรดโทรหาบริการฉุกเฉินในพื้นที่"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Last reviewed: March 2026" : "ตรวจสอบล่าสุด: มีนาคม 2569"} · © SWING Foundation
          </p>
        </footer>
      </div>
    </div>
  );
}
