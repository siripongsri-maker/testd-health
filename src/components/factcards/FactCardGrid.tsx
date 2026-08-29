import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";
import { CHEMSEX_FACT_CARDS, FACT_CARD_GROUPS } from "@/data/chemsexFactCards";
import { CHEMSEX_CARD_IMAGES } from "@/data/chemsexFactCardImages";
import { getFactCardAlt } from "@/data/chemsexFactCardSeo";

interface Props {
  /** Show only the first N cards with a "see all" link */
  limit?: number;
  className?: string;
}

/** Grid of the 20 Chemsex Fact Cards — used on /harm-reduction and /info. */
export function FactCardGrid({ limit, className }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";
  const prefix = isEn ? "/en" : "/th";
  const cards = limit ? CHEMSEX_FACT_CARDS.slice(0, limit) : CHEMSEX_FACT_CARDS;

  return (
    <section className={className} aria-label={isEn ? "Chemsex fact cards" : "การ์ดความรู้ Chemsex"}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {isEn ? "Chemsex Fact Cards" : "การ์ดความรู้ Chemsex 20 ใบ"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "20 short cards — knowledge on the front, a service on the back."
              : "20 หัวข้อสั้น ๆ ด้านหน้าคือความรู้ ด้านหลังคือบริการที่เชื่อมต่อ"}
          </p>
        </div>
        {limit && (
          <button
            onClick={() => navigate(`${prefix}/chemsex-cards`)}
            className="text-xs font-semibold text-primary whitespace-nowrap"
          >
            {isEn ? "See all 20" : "ดูทั้ง 20 ใบ"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.slug}
            onClick={() => navigate(`${prefix}/chemsex-cards/${card.slug}`)}
            className="text-left rounded-2xl bg-card border border-border/50 overflow-hidden p-3 transition-all hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
          >
            {CHEMSEX_CARD_IMAGES[card.number] && (
              <img
                src={CHEMSEX_CARD_IMAGES[card.number].front}
                alt={isEn ? card.titleEn : card.titleTh}
                loading="lazy"
                className="w-full aspect-[16/9] object-cover rounded-xl mb-2 border border-border/40"
              />
            )}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl">{card.emoji}</span>
              <span className="text-[10px] font-bold text-muted-foreground/60">
                {String(card.number).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
              {isEn ? card.titleEn : card.titleTh}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
              {isEn ? FACT_CARD_GROUPS[card.group].en : FACT_CARD_GROUPS[card.group].th}
            </p>
          </button>
        ))}
      </div>

      {limit && (
        <button
          onClick={() => navigate(`${prefix}/chemsex-cards`)}
          className="mt-3 w-full rounded-2xl border border-border/50 bg-card p-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary"
        >
          {isEn ? "Browse all 20 fact cards" : "ดูการ์ดความรู้ทั้ง 20 ใบ"}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
}
