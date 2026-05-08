import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Gamepad2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';
import { getVirtualEpisodesSorted } from '@/config/virtualEpisodes';

export function FeaturedJourneySection() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const cards = getVirtualEpisodesSorted();

  const hasVisited = typeof window !== 'undefined' && localStorage.getItem('virtualVisited');

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {language === 'th' ? 'มาเริ่มดูแลตัวเองกัน' : 'Start your journey'}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {hasVisited
              ? (language === 'th' ? 'เล่นต่อจากที่ค้างไว้' : 'Pick up where you left off')
              : (language === 'th' ? 'เล่น เรียนรู้ และเลือกวิธีที่ใช่สำหรับคุณ' : 'Play, learn, and find what suits you')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary gap-1 h-8 px-2"
          onClick={() => {
            trackEvent('homepage_journey_viewall_click', { source: 'homepage' });
            navigate('/virtual');
          }}
        >
          {language === 'th' ? 'ทั้งหมด' : 'View All'}
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {cards.map((card, i) => {
          const isGame = card.kind === 'game';
          return (
            <button
              key={card.slug}
              onClick={() => {
                trackEvent('homepage_journey_card_click', {
                  source: 'homepage',
                  card_index: i,
                  card_slug: card.slug,
                });
                localStorage.setItem('virtualVisited', '1');
                navigate(`/virtual/${card.slug}`);
              }}
              className="group flex-shrink-0 w-[220px] snap-start relative overflow-hidden rounded-2xl border p-4 text-left hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
              style={{
                background: `linear-gradient(135deg, ${card.accent}15, ${card.accent}05)`,
                borderColor: `${card.accent}30`,
              }}
            >
              <div className="absolute top-3 right-3 flex items-center gap-1">
                {card.isNew && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-bold text-primary animate-pulse">
                    NEW
                  </span>
                )}
                {isGame && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${card.accent}20`, border: `1px solid ${card.accent}40` }}>
                    <Gamepad2 className="h-3 w-3" style={{ color: card.accent }} />
                    <span className="text-[10px] font-bold" style={{ color: card.accent }}>GAME</span>
                  </div>
                )}
              </div>

              <div className="text-3xl mb-3">{card.emoji}</div>

              <h3 className="text-sm font-bold text-foreground leading-snug mb-1">
                {language === 'th' ? card.titleTh : card.titleEn}
              </h3>

              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {language === 'th' ? card.descTh : card.descEn}
              </p>

              <div className="flex flex-wrap gap-1 mb-3">
                {card.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                    style={{ color: card.accent, background: `${card.accent}15`, borderColor: `${card.accent}30` }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: card.accent }}>
                {isGame ? <Gamepad2 className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isGame
                  ? (language === 'th' ? 'เล่นเลย' : 'Play Now')
                  : (language === 'th' ? 'เริ่มเรื่อง' : 'Start Story')}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
