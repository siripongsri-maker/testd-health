import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SEOHead, buildMedicalPageJsonLd } from "@/components/seo";
import { CHEMSEX_FACT_CARDS, FACT_CARD_GROUPS, type ChemsexFactCard } from "@/data/chemsexFactCards";
import { CHEMSEX_CARD_IMAGES } from "@/data/chemsexFactCardImages";
import { getFactCardAlt, getFactCardKeywords } from "@/data/chemsexFactCardSeo";

const GROUP_ORDER: ChemsexFactCard["group"][] = [
  "prepare",
  "during",
  "after",
  "health",
  "mind",
  "rights",
];

export default function ChemsexCards() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";
  const prefix = isEn ? "/en" : "/th";

  return (
    <>
      <PageContainer className="pb-24">
        <SEOHead
          title={isEn ? "Chemsex Fact Cards — 20 Harm Reduction Topics" : "การ์ดความรู้ Chemsex 20 หัวข้อ ลดอันตราย"}
          description={isEn
            ? "20 short chemsex harm reduction fact cards: planning, overdose response, PrEP/PEP, STI windows, mental health, rights and confidentiality."
            : "การ์ดความรู้ chemsex 20 หัวข้อ วางแผนก่อนใช้ รับมือ overdose PrEP/PEP ระยะตรวจ STI สุขภาพใจ สิทธิและความลับ"}
          canonicalPath="/chemsex-cards"
          lang={language}
          jsonLd={buildMedicalPageJsonLd({
            name: "Chemsex Fact Cards",
            description: "20 harm reduction fact cards covering chemsex safety, HIV/STI prevention, mental health and rights.",
            url: "https://testd.website/th/chemsex-cards",
            about: "Chemsex harm reduction, HIV prevention, mental health, sex worker rights",
          })}
        />

        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground"
          onClick={() => navigate(`${prefix}/harm-reduction`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isEn ? "Harm reduction" : "ลดอันตราย"}
        </Button>

        <PageHeader
          title={isEn ? "Chemsex Fact Cards" : "การ์ดความรู้ Chemsex"}
          subtitle={isEn
            ? "20 cards — knowledge on the front, a service on the back."
            : "20 ใบ ด้านหน้าคือความรู้ ด้านหลังคือบริการที่เชื่อมต่อ"}
        />

        <div className="space-y-6">
          {GROUP_ORDER.map((group) => {
            const cards = CHEMSEX_FACT_CARDS.filter((c) => c.group === group);
            if (cards.length === 0) return null;
            return (
              <section key={group}>
                <h2 className="text-[12px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-1">
                  {isEn ? FACT_CARD_GROUPS[group].en : FACT_CARD_GROUPS[group].th}
                </h2>
                <div className="space-y-2">
                  {cards.map((card) => (
                    <button
                      key={card.slug}
                      onClick={() => navigate(`${prefix}/chemsex-cards/${card.slug}`)}
                      className="w-full text-left rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-3 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                    >
                      {CHEMSEX_CARD_IMAGES[card.number] ? (
                        <img
                          src={CHEMSEX_CARD_IMAGES[card.number].front}
                          alt={getFactCardAlt(card, isEn ? "en" : "th", "thumb")}
                          loading="lazy"
                          className="w-20 h-12 rounded-lg object-cover object-left border border-border/40 flex-shrink-0 bg-card"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
                          {card.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-muted-foreground/60">
                          {String(card.number).padStart(2, "0")}
                        </p>
                        <h3 className="text-sm font-semibold text-foreground leading-snug">
                          {isEn ? card.titleEn : card.titleTh}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {isEn ? card.taglineEn : card.taglineTh}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
