import { useNavigate } from 'react-router-dom';
import { ArrowRight, Play, Gamepad2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/hooks/useAnalytics';
import { useLanguage } from '@/lib/i18n';

const journeyCards = [
  {
    emoji: '🌙',
    titleTh: 'คืนที่ไม่มีใครเตือน',
    titleEn: 'The Night No One Warned',
    descTh: 'เรื่องของการเดทและการดูแลตัวเอง',
    descEn: 'Dating, consent & self-care',
    tags: ['Date Safety', 'Consent'],
    color: 'from-[hsl(333,71%,50%)]/10 to-[hsl(333,71%,50%)]/5',
    border: 'border-[hsl(333,71%,50%)]/20',
    tagColor: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    emoji: '💉',
    titleTh: 'เข็มที่เขายังไม่รู้ว่ามี',
    titleEn: 'The Shot He Didn\'t Know',
    descTh: 'PrEP และทางเลือกใหม่',
    descEn: 'PrEP & new prevention options',
    tags: ['PrEP', 'Lenacapavir'],
    color: 'from-[hsl(200,85%,55%)]/10 to-[hsl(280,70%,60%)]/5',
    border: 'border-[hsl(200,85%,55%)]/20',
    tagColor: 'text-[hsl(200,85%,55%)] bg-[hsl(200,85%,55%)]/10 border-[hsl(200,85%,55%)]/20',
  },
  {
    emoji: '💊',
    titleTh: 'หา PrEP ให้เจอ!',
    titleEn: 'Find the PrEP!',
    descTh: 'เกมสั้นเรียนรู้เรื่อง PrEP',
    descEn: 'Quick game about PrEP',
    tags: ['Interactive', '3 นาที'],
    color: 'from-[hsl(280,70%,60%)]/10 to-[hsl(200,85%,55%)]/5',
    border: 'border-[hsl(280,70%,60%)]/20',
    tagColor: 'text-[hsl(280,70%,60%)] bg-[hsl(280,70%,60%)]/10 border-[hsl(280,70%,60%)]/20',
    isGame: true,
  },
  {
    emoji: '💕',
    titleTh: 'PrEP Boys: เลือกหนุ่มในฝัน',
    titleEn: 'PrEP Boys: Pick Your Crush',
    descTh: 'จีบหนุ่ม 4 สไตล์ แล้วหา PrEP ที่ใช่',
    descEn: 'Date 4 guys & match the right PrEP',
    tags: ['Dating Sim', 'NEW'],
    color: 'from-[hsl(333,80%,62%)]/15 to-[hsl(333,80%,62%)]/5',
    border: 'border-[hsl(333,80%,62%)]/30',
    tagColor: 'text-[hsl(333,80%,62%)] bg-[hsl(333,80%,62%)]/10 border-[hsl(333,80%,62%)]/25',
    isGame: true,
    href: '/virtual/prep-boys/',
    external: true,
  },
  {
    emoji: '🔮',
    titleTh: 'ดวงโดน PrEP',
    titleEn: 'PrEP Fortune',
    descTh: 'ซินแสไซเบอร์ทำนายดวงคุณจากวันเกิด',
    descEn: 'Cyber Saju fortune from your birth date',
    tags: ['Fortune', 'NEW'],
    color: 'from-[hsl(0,72%,51%)]/15 to-[hsl(45,65%,52%)]/5',
    border: 'border-[hsl(45,65%,52%)]/30',
    tagColor: 'text-[hsl(0,72%,51%)] bg-[hsl(0,72%,51%)]/10 border-[hsl(45,65%,52%)]/25',
    isGame: true,
    href: '/virtual?play=prep-fortune',
    external: true,
    emoji: '🔮',
    titleTh: 'ดวงโดน PrEP',
    titleEn: 'PrEP Fortune',
    descTh: 'ซินแสไซเบอร์ทำนายดวงคุณจากวันเกิด',
    descEn: 'Cyber Saju fortune from your birth date',
    tags: ['Fortune', 'NEW'],
    color: 'from-[hsl(0,72%,51%)]/15 to-[hsl(45,65%,52%)]/5',
    border: 'border-[hsl(45,65%,52%)]/30',
    tagColor: 'text-[hsl(0,72%,51%)] bg-[hsl(0,72%,51%)]/10 border-[hsl(45,65%,52%)]/25',
    isGame: true,
  },
];

export function FeaturedJourneySection() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Check if user has visited /virtual before
  const hasVisited = typeof window !== 'undefined' && localStorage.getItem('virtualVisited');

  return (
    <section className="mb-8">
      {/* Section header */}
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
              : (language === 'th' ? 'เล่น เรียนรู้ และเลือกวิธีที่ใช่สำหรับคุณ' : 'Play, learn, and find what suits you')
            }
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
        {journeyCards.map((card, i) => (
          <button
            key={i}
            onClick={() => {
              trackEvent('homepage_journey_card_click', {
                source: 'homepage',
                card_index: i,
                card_title: card.titleEn,
              });
              localStorage.setItem('virtualVisited', '1');
              if ((card as any).external && (card as any).href) {
                window.location.href = (card as any).href;
              } else {
                navigate('/virtual');
              }
            }}
            className={`
              group flex-shrink-0 w-[220px] snap-start
              relative overflow-hidden rounded-2xl
              bg-gradient-to-br ${card.color}
              border ${card.border}
              p-4 text-left
              hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5
              active:scale-[0.98] transition-all duration-200
            `}
          >
            {/* Badge */}
            {card.isGame && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(280,70%,60%)]/15 border border-[hsl(280,70%,60%)]/25">
                <Gamepad2 className="h-3 w-3 text-[hsl(280,70%,60%)]" />
                <span className="text-[10px] font-bold text-[hsl(280,70%,60%)]">GAME</span>
              </div>
            )}

            {/* Emoji icon */}
            <div className="text-3xl mb-3">{card.emoji}</div>

            {/* Title */}
            <h3 className="text-sm font-bold text-foreground leading-snug mb-1">
              {language === 'th' ? card.titleTh : card.titleEn}
            </h3>

            {/* Desc */}
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {language === 'th' ? card.descTh : card.descEn}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {card.tags.map(tag => (
                <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${card.tagColor}`}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Play CTA */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              <Play className="h-3 w-3" />
              {card.isGame
                ? (language === 'th' ? 'เล่นเลย' : 'Play Now')
                : (language === 'th' ? 'เริ่มเรื่อง' : 'Start Story')
              }
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
