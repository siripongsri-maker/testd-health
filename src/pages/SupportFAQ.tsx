import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { SupportFAQ as SupportFAQComponent } from "@/components/support/SupportFAQ";
import { SEOHead, buildFaqJsonLd } from "@/components/seo/SEOHead";
import { supportFaqs } from "@/data/supportFaqData";

export default function SupportFAQPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";

  const faqJsonLd = buildFaqJsonLd(
    supportFaqs.map((f) => ({
      question: isEn ? f.questionEn : f.questionTh,
      answer: isEn ? f.answerEn : f.answerTh,
    }))
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
      <SEOHead
        title={isEn ? "Help & FAQ — testD" : "ช่วยเหลือ & คำถามที่พบบ่อย — testD"}
        description={
          isEn
            ? "Quick answers about booking, PrEP, PEP, HIV testing, and privacy at testD by SWING Foundation."
            : "คำตอบด่วนเกี่ยวกับการจอง PrEP PEP การตรวจ HIV และความเป็นส่วนตัวจาก testD โดยมูลนิธิ SWING"
        }
        canonicalPath="/support-faq"
        lang={isEn ? "en" : "th"}
        jsonLd={faqJsonLd}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">
            {isEn ? "Help & FAQ" : "ช่วยเหลือ & คำถามที่พบบ่อย"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEn ? "Find quick answers or contact us" : "ค้นหาคำตอบด่วน หรือติดต่อเรา"}
          </p>
        </div>
      </div>

      <SupportFAQComponent language={language} />

      {/* CTA to chat */}
      <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center space-y-2">
        <p className="text-sm text-foreground font-medium">
          {isEn ? "Still have questions?" : "ยังมีคำถามอยู่?"}
        </p>
        <Button className="gap-2" onClick={() => navigate("/support-chat")}>
          <MessageCircle className="h-4 w-4" />
          {isEn ? "Chat with us" : "แชทกับเรา"}
        </Button>
      </div>
    </div>
  );
}
