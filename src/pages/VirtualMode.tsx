import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { PixelWorld } from "@/components/virtual/PixelWorld";
import { VirtualGuide } from "@/components/virtual/VirtualGuide";
import { VirtualIntroOverlay } from "@/components/virtual/VirtualIntroOverlay";
import { DateStoryExperience } from "@/components/virtual/DateStoryExperience";
import { Episode2Player } from "@/components/virtual/Episode2Player";
import PrepHuntGame from "@/components/PrepHuntGame";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  ArrowLeft, ArrowRight, Play, Gamepad2, Calendar,
  TestTube, MessageCircle, Sparkles, Shield, Check
} from "lucide-react";

interface Props {
  forceClinic?: boolean;
  forceEp2?: boolean;
}

type View = 'hub' | 'ep1' | 'ep2' | 'prep-hunt';

const missions = [
  {
    id: 'ep1',
    emoji: '🌙',
    titleTh: 'คืนที่ไม่มีใครเตือน',
    titleEn: 'The Night No One Warned',
    descTh: 'การเดท ความยินยอม และการดูแลตัวเอง',
    descEn: 'Dating, consent & self-care',
    tags: ['Date Safety', 'Consent'],
    accentClass: 'from-[hsl(333,71%,50%)]/10 to-[hsl(333,71%,50%)]/5',
    borderClass: 'border-[hsl(333,71%,50%)]/20',
    tagClass: 'text-primary bg-primary/10',
    ctaColor: 'text-primary',
    badge: 'EPISODE 1',
  },
  {
    id: 'ep2',
    emoji: '💉',
    titleTh: 'เข็มที่เขายังไม่รู้ว่ามี',
    titleEn: 'The Shot He Didn\'t Know',
    descTh: 'PrEP และทางเลือกใหม่อย่าง Lenacapavir',
    descEn: 'PrEP & Lenacapavir',
    tags: ['PrEP', 'Lenacapavir'],
    accentClass: 'from-[hsl(200,85%,55%)]/10 to-[hsl(280,70%,60%)]/5',
    borderClass: 'border-[hsl(200,85%,55%)]/20',
    tagClass: 'text-[hsl(200,85%,55%)] bg-[hsl(200,85%,55%)]/10',
    ctaColor: 'text-[hsl(200,85%,55%)]',
    badge: 'EPISODE 2',
    isNew: true,
  },
  {
    id: 'prep-hunt',
    emoji: '💊',
    titleTh: 'หา PrEP ให้เจอ!',
    titleEn: 'Find the PrEP!',
    descTh: 'เกมสั้นเรียนรู้เรื่อง PrEP',
    descEn: 'Quick game about PrEP adherence',
    tags: ['Interactive', '3 นาที'],
    accentClass: 'from-[hsl(280,70%,60%)]/10 to-[hsl(200,85%,55%)]/5',
    borderClass: 'border-[hsl(280,70%,60%)]/20',
    tagClass: 'text-[hsl(280,70%,60%)] bg-[hsl(280,70%,60%)]/10',
    ctaColor: 'text-[hsl(280,70%,60%)]',
    badge: '🎮 GAME',
    isGame: true,
  },
];

export default function VirtualMode({ forceClinic, forceEp2 }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [showClinic, setShowClinic] = useState(!!forceClinic);
  const [view, setView] = useState<View>(forceEp2 ? 'ep2' : 'hub');

  // Track completed missions from localStorage
  const completed = useMemo(() => {
    const raw = localStorage.getItem('virtualCompleted');
    return raw ? JSON.parse(raw) as string[] : [];
  }, []);

  const completedCount = completed.length;
  const totalMissions = missions.length;

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    (language === "th" ? "ฉัน" : "Me");

  // Mark visit
  if (typeof window !== 'undefined') {
    localStorage.setItem('virtualVisited', '1');
  }

  if (showClinic) {
    return (
      <>
        <VirtualIntroOverlay />
        <div style={{ height: "calc(100dvh - 3.5rem)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          <PixelWorld displayName={displayName} />
        </div>
        <VirtualGuide />
      </>
    );
  }

  if (view === 'ep1') {
    return (
      <div className="h-[calc(100dvh-3.5rem)] relative" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button onClick={() => setView('hub')} className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm text-foreground border border-border/30 shadow-sm">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <DateStoryExperience />
      </div>
    );
  }

  if (view === 'ep2') {
    return <Episode2Player onBack={() => setView('hub')} />;
  }

  if (view === 'prep-hunt') {
    return <PrepHuntGame onBack={() => setView('hub')} />;
  }

  // Hub view
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {language === 'th' ? 'Interactive Journey' : 'Interactive Journey'}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === 'th'
              ? 'สำรวจเรื่องราว เรียนรู้ แล้วเลือกสิ่งที่ดีสำหรับคุณ'
              : 'Explore stories, learn, and choose what\'s right for you'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="glass rounded-2xl p-4 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              {language === 'th' ? 'ความก้าวหน้า' : 'Progress'}
            </span>
            <span className="text-xs font-bold text-primary">
              {completedCount}/{totalMissions}
            </span>
          </div>
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-[hsl(280,70%,60%)] rounded-full transition-all duration-500"
              style={{ width: `${totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0}%` }}
            />
          </div>
          {completedCount > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {language === 'th'
                ? `เยี่ยม! คุณสำรวจไปแล้ว ${completedCount} ภารกิจ`
                : `Great! You've explored ${completedCount} missions`}
            </p>
          )}
        </div>

        {/* Mission cards */}
        <div className="space-y-3">
          {missions.map((m) => {
            const isDone = completed.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  trackEvent('virtual_mission_start', { mission: m.id, source: '/virtual' });
                  setView(m.id as View);
                }}
                className={`
                  group w-full text-left relative overflow-hidden rounded-2xl
                  bg-gradient-to-br ${m.accentClass}
                  border ${m.borderClass}
                  p-4 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200
                `}
              >
                {/* Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {isDone && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/25">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-[10px] font-bold text-success">
                        {language === 'th' ? 'เสร็จแล้ว' : 'Done'}
                      </span>
                    </div>
                  )}
                  {m.isNew && !isDone && (
                    <div className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25">
                      <span className="text-[10px] font-bold text-primary">NEW</span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      {m.badge}
                    </p>
                    <h3 className="text-sm font-bold text-foreground leading-snug mb-1">
                      {language === 'th' ? m.titleTh : m.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                      {language === 'th' ? m.descTh : m.descEn}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.tags.map(tag => (
                        <span key={tag} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${m.tagClass}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${m.ctaColor} group-hover:gap-2 transition-all`}>
                      {m.isGame ? <Gamepad2 className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" />}
                      {isDone
                        ? (language === 'th' ? 'เล่นอีกครั้ง' : 'Play Again')
                        : m.isGame
                          ? (language === 'th' ? 'เล่นเลย' : 'Play Now')
                          : (language === 'th' ? 'เริ่มเรื่อง' : 'Start Story')
                      }
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conversion CTAs */}
        <div className="glass rounded-2xl p-5 border border-border/30 space-y-3">
          <p className="text-xs font-semibold text-foreground">
            {language === 'th' ? 'พร้อมลงมือทำจริง?' : 'Ready to take action?'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 h-10 rounded-xl text-xs"
              onClick={() => {
                trackEvent('virtual_cta_booking', { source: '/virtual' });
                navigate('/booking');
              }}
            >
              <Calendar className="h-3.5 w-3.5" />
              {language === 'th' ? 'นัดตรวจ' : 'Book Test'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-10 rounded-xl text-xs border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => {
                trackEvent('virtual_cta_selftest', { source: '/virtual' });
                navigate('/hiv-selftest');
              }}
            >
              <TestTube className="h-3.5 w-3.5" />
              {language === 'th' ? 'รับชุดตรวจ' : 'Get Kit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-10 rounded-xl text-xs col-span-2 border-border/50"
              onClick={() => {
                trackEvent('virtual_cta_support', { source: '/virtual' });
                navigate('/support-chat');
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {language === 'th' ? 'คุยกับเจ้าหน้าที่แบบไม่ระบุตัวตน' : 'Chat Anonymously'}
            </Button>
          </div>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground py-2">
          <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {language === 'th' ? 'ปลอดภัย' : 'Safe'}</span>
          <span>•</span>
          <span>{language === 'th' ? 'เป็นความลับ' : 'Confidential'}</span>
          <span>•</span>
          <span>{language === 'th' ? 'ไม่ตัดสิน' : 'Judgment-free'}</span>
        </div>
      </div>
    </div>
  );
}
