import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download, Star, Heart, Sparkles } from "lucide-react";
import { getUserData } from "@/lib/store";

const SHAREABLE_ACHIEVEMENTS = [
  {
    id: 'wellness-champion',
    titleEn: 'Wellness Champion',
    titleTh: 'แชมป์สุขภาพ',
    messageEn: "I'm taking care of my health! 💪",
    messageTh: 'ฉันดูแลสุขภาพของตัวเอง! 💪',
    icon: Star,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'self-care-hero',
    titleEn: 'Self-Care Hero',
    titleTh: 'ฮีโร่ดูแลตัวเอง',
    messageEn: 'Prioritizing my well-being! ✨',
    messageTh: 'ให้ความสำคัญกับสุขภาวะของตัวเอง! ✨',
    icon: Heart,
    gradient: 'from-pink-400 to-rose-500',
  },
  {
    id: 'health-journey',
    titleEn: 'Health Journey',
    titleTh: 'เส้นทางสุขภาพ',
    messageEn: 'On my wellness journey! 🌟',
    messageTh: 'บนเส้นทางสุขภาวะของฉัน! 🌟',
    icon: Sparkles,
    gradient: 'from-teal-400 to-emerald-500',
  },
];

export default function ShareAchievements() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const userData = getUserData();

  const handleShare = async (platform: 'instagram' | 'facebook' | 'twitter') => {
    if (!selectedCard) return;

    const achievement = SHAREABLE_ACHIEVEMENTS.find((a) => a.id === selectedCard);
    if (!achievement) return;

    const message = language === 'th' ? achievement.messageTh : achievement.messageEn;
    const encodedMessage = encodeURIComponent(message + ' #testD #SelfCare');

    const urls: Record<string, string> = {
      instagram: 'https://www.instagram.com/',
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedMessage}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  const AchievementCard = ({ achievement }: { achievement: typeof SHAREABLE_ACHIEVEMENTS[0] }) => {
    const isSelected = selectedCard === achievement.id;
    const Icon = achievement.icon;

    return (
      <button
        onClick={() => setSelectedCard(achievement.id)}
        className={`w-full text-left transition-all ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
      >
        <Card
          ref={isSelected ? cardRef : null}
          className={`p-6 bg-gradient-to-br ${achievement.gradient} text-white overflow-hidden relative`}
        >
          <div className="absolute -right-4 -top-4 opacity-20">
            <Icon className="h-24 w-24" />
          </div>
          <div className="relative z-10">
            <Icon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-1">
              {language === 'th' ? achievement.titleTh : achievement.titleEn}
            </h3>
            <p className="text-white/90 text-sm">
              {language === 'th' ? achievement.messageTh : achievement.messageEn}
            </p>
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70">testD</span>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Star className="h-3 w-3" />
                  <span>Level {userData.level}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </button>
    );
  };

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('share.title')}</h1>
            <p className="text-muted-foreground">{t('share.subtitle')}</p>
          </div>
        </div>

        <Card className="p-4 mb-6 bg-muted/50">
          <p className="text-sm text-muted-foreground">{t('share.privacyNote')}</p>
        </Card>

        <div className="space-y-4 mb-8">
          {SHAREABLE_ACHIEVEMENTS.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>

        {selectedCard && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">
              {t('share.shareOn')}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShare('instagram')}
              >
                <span className="text-pink-500">IG</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShare('facebook')}
              >
                <span className="text-blue-600">FB</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShare('twitter')}
              >
                <span className="text-sky-500">X</span>
              </Button>
            </div>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
