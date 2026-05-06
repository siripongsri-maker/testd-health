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
import PrepFortuneGame from "@/components/virtual/PrepFortuneGame";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  ArrowLeft, ArrowRight, Play, Gamepad2, Calendar,
  TestTube, MessageCircle, Sparkles, Shield, Check,
  Compass, Star, Zap
} from "lucide-react";

interface Props {
  forceClinic?: boolean;
  forceEp2?: boolean;
}

type View = 'hub' | 'ep1' | 'ep2' | 'prep-hunt' | 'prep-boys' | 'prep-fortune';

const missions = [
  {
    id: 'ep1',
    emoji: '🌙',
    titleTh: 'คืนที่ไม่มีใครเตือน',
    titleEn: 'The Night No One Warned',
    descTh: 'การเดท ความยินยอม และการดูแลตัวเอง',
    descEn: 'Dating, consent & self-care',
    tags: ['Date Safety', 'Consent'],
    accentFrom: 'hsl(333, 71%, 50%)',
    borderColor: 'hsl(333, 71%, 50%)',
    badge: 'EPISODE 1',
    badgeIcon: '📖',
    duration: '5 นาที',
  },
  {
    id: 'ep2',
    emoji: '💉',
    titleTh: 'เข็มที่เขายังไม่รู้ว่ามี',
    titleEn: 'The Shot He Didn\'t Know',
    descTh: 'PrEP และทางเลือกใหม่อย่าง Lenacapavir',
    descEn: 'PrEP & Lenacapavir',
    tags: ['PrEP', 'Lenacapavir'],
    accentFrom: 'hsl(200, 85%, 55%)',
    borderColor: 'hsl(200, 85%, 55%)',
    badge: 'EPISODE 2',
    badgeIcon: '📖',
    isNew: true,
    duration: '5 นาที',
  },
  {
    id: 'prep-hunt',
    emoji: '💊',
    titleTh: 'หา PrEP ให้เจอ!',
    titleEn: 'Find the PrEP!',
    descTh: 'เกมสั้นเรียนรู้เรื่อง PrEP',
    descEn: 'Quick game about PrEP adherence',
    tags: ['Interactive', '3 นาที'],
    accentFrom: 'hsl(280, 70%, 60%)',
    borderColor: 'hsl(280, 70%, 60%)',
    badge: '🎮 GAME',
    badgeIcon: '🎮',
    isGame: true,
    duration: '3 นาที',
  },
  {
    id: 'prep-boys',
    emoji: '💕',
    titleTh: 'PrEP Boys: เลือกหนุ่มในฝัน',
    titleEn: 'PrEP Boys: Pick Your Crush',
    descTh: 'จีบหนุ่ม 4 สไตล์ แล้วหา PrEP ที่เหมาะกับเขา',
    descEn: 'Date 4 guys & match the right PrEP',
    tags: ['Dating Sim', 'PrEP Match'],
    accentFrom: 'hsl(333, 80%, 62%)',
    borderColor: 'hsl(333, 80%, 62%)',
    badge: '🎮 NEW EPISODE',
    badgeIcon: '💕',
    isGame: true,
    isNew: true,
    duration: '5 นาที',
  },
  {
    id: 'prep-fortune',
    emoji: '🔮',
    titleTh: 'ดวงโดน PrEP (ซินแสไซเบอร์)',
    titleEn: 'PrEP Fortune (Cyber Saju)',
    descTh: 'ดูดวงสนุกๆ ผูกวันเกิด+เวลาตกฟาก',
    descEn: 'Fun fortune-telling tied to your birth date',
    tags: ['Saju', 'Fortune'],
    accentFrom: 'hsl(0, 72%, 51%)',
    borderColor: 'hsl(45, 65%, 52%)',
    badge: '🔮 NEW GAME',
    badgeIcon: '🔮',
    isGame: true,
    isNew: true,
    duration: '2 นาที',
  },

export default function VirtualMode({ forceClinic, forceEp2 }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [showClinic, setShowClinic] = useState(!!forceClinic);
  const [view, setView] = useState<View>(forceEp2 ? 'ep2' : 'hub');

  const completed = useMemo(() => {
    const raw = localStorage.getItem('virtualCompleted');
    return raw ? JSON.parse(raw) as string[] : [];
  }, []);

  const completedCount = completed.length;
  const totalMissions = missions.length;
  const progressPct = totalMissions > 0 ? (completedCount / totalMissions) * 100 : 0;

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    (language === "th" ? "ฉัน" : "Me");

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

  if (view === 'prep-boys') {
    return (
      <div className="h-[calc(100dvh-3.5rem)] relative bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <button
          onClick={() => setView('hub')}
          className="absolute top-3 left-3 z-50 p-2 rounded-lg bg-background/80 backdrop-blur-sm text-foreground border border-border/30 shadow-sm"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <iframe
          src="/virtual/prep-boys/index.html"
          title="PrEP Boys"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen"
        />
      </div>
    );
  }

  // Hub view — V5 mission-based design
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-background" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">

        {/* Header with warm intro */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mx-auto">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Interactive Journey</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'th' ? 'สำรวจเส้นทางสุขภาพของคุณ' : 'Explore Your Health Path'}
          </h1>
          <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
            {language === 'th'
              ? 'เล่น เรียนรู้ แล้วเลือกสิ่งที่ดีสำหรับตัวคุณ'
              : 'Play, learn, and choose what\'s right for you'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="glass rounded-2xl p-4 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                {language === 'th' ? 'ความก้าวหน้า' : 'Your Progress'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {completedCount > 0 && <Star className="h-3 w-3 text-warning" />}
              <span className="text-xs font-bold text-primary">
                {completedCount}/{totalMissions}
              </span>
            </div>
          </div>
          <div className="h-2.5 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-[hsl(200,85%,55%)] to-[hsl(280,70%,60%)] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {completedCount > 0 && completedCount < totalMissions && (
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
              <Zap className="h-3 w-3 text-warning" />
              {language === 'th'
                ? `อีก ${totalMissions - completedCount} ภารกิจจะครบ!`
                : `${totalMissions - completedCount} more to complete!`}
            </p>
          )}
          {completedCount === totalMissions && totalMissions > 0 && (
            <p className="text-[10px] text-primary mt-2 font-semibold">
              🎉 {language === 'th' ? 'สำรวจครบทุกภารกิจแล้ว!' : 'All missions completed!'}
            </p>
          )}
        </div>

        {/* Mission cards */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-1">
            {language === 'th' ? '📋 ภารกิจทั้งหมด' : '📋 All Missions'}
          </p>

          {missions.map((m, idx) => {
            const isDone = completed.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  trackEvent('virtual_mission_start', { mission: m.id, source: '/virtual' });
                  setView(m.id as View);
                }}
                className="group w-full text-left relative overflow-hidden rounded-2xl border p-4 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${m.accentFrom}15, ${m.accentFrom}05)`,
                  borderColor: `${m.borderColor}30`,
                }}
              >
                {/* Status badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isDone && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/25">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-[10px] font-bold text-success">
                        {language === 'th' ? 'เสร็จ' : 'Done'}
                      </span>
                    </div>
                  )}
                  {m.isNew && !isDone && (
                    <div className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 animate-pulse">
                      <span className="text-[10px] font-bold text-primary">NEW</span>
                    </div>
                  )}
                  <span className="text-[9px] text-muted-foreground">{m.duration}</span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-3xl shrink-0 mt-0.5">{m.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      {m.badge}
                    </p>
                    <h3 className="text-sm font-bold text-foreground leading-snug mb-1">
                      {language === 'th' ? m.titleTh : m.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2.5">
                      {language === 'th' ? m.descTh : m.descEn}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            color: m.borderColor,
                            backgroundColor: `${m.accentFrom}15`,
                            borderColor: `${m.borderColor}30`,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: m.borderColor }}>
                      {m.isGame ? <Gamepad2 className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" />}
                      {isDone
                        ? (language === 'th' ? 'เล่นอีกครั้ง' : 'Play Again')
                        : m.isGame
                          ? (language === 'th' ? 'เล่นเลย' : 'Play Now')
                          : (language === 'th' ? 'เริ่มเรื่อง' : 'Start Story')
                      }
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conversion bridge */}
        <div className="glass rounded-2xl p-5 border border-primary/20 space-y-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground">
              {language === 'th' ? 'พร้อมลงมือทำจริง?' : 'Ready to take action?'}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === 'th' ? 'เลือกบริการที่เหมาะกับคุณ' : 'Choose the service that fits you'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 h-11 rounded-xl text-xs font-semibold"
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
              className="gap-1.5 h-11 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5"
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
              className="gap-1.5 h-11 rounded-xl text-xs col-span-2 border-border/50 font-semibold"
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

        {/* Trust footer */}
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
