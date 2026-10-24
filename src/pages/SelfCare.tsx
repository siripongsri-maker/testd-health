/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { TestTube, ArrowRight } from "lucide-react";
import { SelfCareShop } from "@/components/SelfCareShop";
import { Link, useNavigate } from "react-router-dom";
import { withLocalePrefix } from "@/lib/seoLocalePrefix";

export default function SelfCare() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  return (
    <>
      <PageContainer>
        <PageHeader title={t('selfCare.title')} subtitle={t('selfCare.subtitle')} />
        <nav aria-label="Language" className="mb-4 flex justify-end gap-2">
          <Button asChild variant="ghost" size="sm"><Link to="/th/self-care" hrefLang="th" lang="th">ไทย</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/en/self-care" hrefLang="en" lang="en">English</Link></Button>
        </nav>

        {/* HIV Self-Test Kit Banner */}
         <Button
          variant="ghost"
          className="h-auto sm:h-auto w-full whitespace-normal p-5 mb-6 text-left glass glass-shine hover:shadow-soft transition-all duration-200 rounded-2xl"
          onClick={() => navigate(withLocalePrefix('/hiv-selftest', language === 'en' ? 'en' : 'th'))}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <TestTube className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">
                {language === 'th' ? 'ขอรับชุดตรวจ HIV ฟรี' : 'Get Free HIV Self-Test Kit'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'th' ? 'ตรวจที่บ้าน ส่งฟรีทั่วไทย โดย SWING' : 'Test at home, free delivery by SWING'}
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
          </div>
         </Button>

        <SelfCareShop language={language} />
      </PageContainer>
      <BottomNav />
    </>
  );
}
