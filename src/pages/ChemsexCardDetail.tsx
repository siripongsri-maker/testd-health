import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Phone, ZoomIn } from "lucide-react";
import { SEOHead, buildMedicalPageJsonLd, buildBreadcrumbJsonLd } from "@/components/seo";
import { trackEvent } from "@/hooks/useAnalytics";
import { CHEMSEX_FACT_CARDS, FACT_CARD_GROUPS, getFactCard } from "@/data/chemsexFactCards";
import { CHEMSEX_CARD_IMAGES } from "@/data/chemsexFactCardImages";
import { getFactCardAlt, getFactCardKeywords, getFactCardMetaDescription } from "@/data/chemsexFactCardSeo";

export default function ChemsexCardDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";
  const prefix = isEn ? "/en" : "/th";
  const [zoom, setZoom] = useState<"front" | "back" | null>(null);

  const card = getFactCard(slug);

  if (!card) {
    return (
      <>
        <PageContainer className="pb-24">
          <p className="text-muted-foreground py-12 text-center">
            {isEn ? "Card not found." : "ไม่พบการ์ดนี้"}
          </p>
          <Button className="w-full" onClick={() => navigate(`${prefix}/chemsex-cards`)}>
            {isEn ? "All fact cards" : "ดูการ์ดทั้งหมด"}
          </Button>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  const index = CHEMSEX_FACT_CARDS.findIndex((c) => c.slug === card.slug);
  const prev = index > 0 ? CHEMSEX_FACT_CARDS[index - 1] : null;
  const next = index < CHEMSEX_FACT_CARDS.length - 1 ? CHEMSEX_FACT_CARDS[index + 1] : null;

  const title = isEn ? card.titleEn : card.titleTh;
  const tagline = isEn ? card.taglineEn : card.taglineTh;
  const points = isEn ? card.pointsEn : card.pointsTh;
  const artwork = CHEMSEX_CARD_IMAGES[card.number];

  const handleCta = (to: string, service: string) => {
    trackEvent("chemsex_card_cta_click", {
      card_slug: card.slug,
      card_number: card.number,
      target_path: to,
      service,
    });
    if (to.startsWith("tel:")) {
      window.location.href = to;
      return;
    }
    navigate(to.startsWith("/th") || to.startsWith("/en") ? `${prefix}${to.slice(3)}` : to);
  };

  return (
    <>
      <PageContainer className="pb-24">
        <SEOHead
          title={`${title} — ${isEn ? "Chemsex Fact Card" : "การ์ดความรู้ Chemsex"} ${String(card.number).padStart(2, "0")}`}
          description={getFactCardMetaDescription(card, isEn ? "en" : "th")}
          canonicalPath={`/chemsex-cards/${card.slug}`}
          lang={language}
          ogImageAlt={getFactCardAlt(card, isEn ? "en" : "th")}
          extraMeta={[
            { attr: "name", key: "keywords", content: getFactCardKeywords(card, isEn ? "en" : "th") },
          ]}
          jsonLd={[
            {
              ...buildMedicalPageJsonLd({
                name: title,
                description: tagline,
                url: `https://testd.website/${isEn ? "en" : "th"}/chemsex-cards/${card.slug}`,
                about: "Chemsex harm reduction",
              }),
              alternateName: isEn ? card.titleTh : card.titleEn,
              keywords: `${getFactCardKeywords(card, "th")}, ${getFactCardKeywords(card, "en")}`,
              position: card.number,
            },
            buildBreadcrumbJsonLd([
              { name: isEn ? "Harm Reduction" : "ลดอันตราย", path: "/th/harm-reduction" },
              { name: isEn ? "Chemsex Fact Cards" : "การ์ดความรู้ Chemsex", path: "/th/chemsex-cards" },
              { name: title, path: `/th/chemsex-cards/${card.slug}` },
            ]),
          ]}
        />

        <Button
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground"
          onClick={() => navigate(`${prefix}/chemsex-cards`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {isEn ? "All fact cards" : "การ์ดทั้งหมด"}
        </Button>

        {/* Front of the card — printed artwork */}
        {artwork && (
          <button
            type="button"
            onClick={() => setZoom("front")}
            aria-label={isEn ? "View card front in full size" : "ดูภาพด้านหน้าขนาดใหญ่"}
            className="relative w-full mb-4 rounded-3xl overflow-hidden border border-border/50 bg-card group cursor-zoom-in"
          >
            <img
              src={artwork.front}
              alt={`${isEn ? "Fact card" : "การ์ดความรู้"} ${String(card.number).padStart(2, "0")} — ${title}`}
              loading="eager"
              className="w-full"
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-background/80 backdrop-blur p-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4 text-foreground" />
            </span>
          </button>
        )}

        <article
          className="rounded-3xl p-5 text-white mb-4"
          style={{ background: "linear-gradient(135deg, hsl(340 60% 45%), hsl(270 50% 40%))" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-3xl">{card.emoji}</span>
            <span className="text-xs font-bold text-white/70">
              {String(card.number).padStart(2, "0")} / 20 ·{" "}
              {isEn ? FACT_CARD_GROUPS[card.group].en : FACT_CARD_GROUPS[card.group].th}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-snug">{title}</h1>
          <p className="text-sm text-white/80 mt-1">{isEn ? card.titleTh : card.titleEn}</p>
          <p className="text-sm font-semibold text-white/90 mt-3">{tagline}</p>
        </article>

        <ol className="space-y-2 mb-6">
          {points.map((p, i) => (
            <li key={i} className="rounded-2xl bg-card border border-border/50 p-4 flex gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-foreground leading-relaxed">{p}</p>
            </li>
          ))}
        </ol>

        {/* Back of the card — printed artwork */}
        {artwork && (
          <button
            type="button"
            onClick={() => setZoom("back")}
            aria-label={isEn ? "View card back in full size" : "ดูภาพด้านหลังขนาดใหญ่"}
            className="relative w-full mb-6 rounded-3xl overflow-hidden border border-border/50 bg-card group cursor-zoom-in"
          >
            <img
              src={artwork.back}
              alt={`${isEn ? "Fact card back" : "ด้านหลังการ์ด"} ${String(card.number).padStart(2, "0")} — ${title}`}
              loading="lazy"
              className="w-full"
            />
            <span className="absolute bottom-3 right-3 rounded-full bg-background/80 backdrop-blur p-2 opacity-80 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4 text-foreground" />
            </span>
          </button>
        )}

        {/* Full-size artwork lightbox */}
        <Dialog open={zoom !== null} onOpenChange={(open) => !open && setZoom(null)}>
          <DialogContent className="max-w-2xl w-[95vw] p-3 sm:p-5">
            {zoom && artwork && (
              <>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{card.emoji}</span>
                  <span>{title}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    · {zoom === "front"
                      ? (isEn ? "Front — Knowledge" : "ด้านหน้า — ความรู้")
                      : (isEn ? "Back — Services" : "ด้านหลัง — บริการ")}
                  </span>
                </DialogTitle>
                <img
                  src={zoom === "front" ? artwork.front : artwork.back}
                  alt={`${title} — ${zoom === "front" ? "front" : "back"}`}
                  className="w-full rounded-2xl border border-border/40 bg-card"
                />
                {zoom === "front" ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tagline} — {points[0]}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {card.ctas.map((cta) => (
                      <li key={cta.to + cta.labelEn} className="text-sm text-muted-foreground">
                        • <span className="font-semibold text-foreground">{isEn ? cta.labelEn : cta.labelTh}</span>
                        {" "}({cta.service})
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>


        {/* Back of the card — services */}
        <section className="mb-6">
          <h2 className="text-[12px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2 px-1">
            {isEn ? "Connected services" : "บริการที่เชื่อมต่อ"}
          </h2>
          <div className="space-y-2">
            {card.ctas.map((cta) => (
              <button
                key={cta.to + cta.labelEn}
                onClick={() => handleCta(cta.to, cta.service)}
                className="w-full text-left rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-3 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {cta.to.startsWith("tel:") ? (
                    <Phone className="h-4 w-4 text-primary" />
                  ) : (
                    <ArrowRight className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isEn ? cta.labelEn : cta.labelTh}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{cta.service}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* Prev / next */}
        <nav className="grid grid-cols-2 gap-2" aria-label={isEn ? "Card navigation" : "ไปการ์ดถัดไป"}>
          {prev ? (
            <button
              onClick={() => navigate(`${prefix}/chemsex-cards/${prev.slug}`)}
              className="rounded-2xl bg-card border border-border/50 p-3 text-left flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-medium line-clamp-2">
                {isEn ? prev.titleEn : prev.titleTh}
              </span>
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button
              onClick={() => navigate(`${prefix}/chemsex-cards/${next.slug}`)}
              className="rounded-2xl bg-card border border-border/50 p-3 text-right flex items-center gap-2 justify-end"
            >
              <span className="text-xs font-medium line-clamp-2">
                {isEn ? next.titleEn : next.titleTh}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          )}
        </nav>
      </PageContainer>
      <BottomNav />
    </>
  );
}
