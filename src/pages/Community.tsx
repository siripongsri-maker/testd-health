import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { InfoCard } from "@/components/InfoCard";
import { Pill, TestTube, Heart, Shield, MessageCircle, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Community() {
  const { t, language } = useLanguage();

  const chatRooms = [
    { 
      slug: "prep-pep", 
      icon: Pill, 
      name: language === 'th' ? 'PrEP และ PEP' : 'PrEP & PEP',
      description: language === 'th' ? 'พูดคุยเรื่องยาป้องกัน' : 'Discuss prevention medications'
    },
    { 
      slug: "testing", 
      icon: TestTube, 
      name: language === 'th' ? 'การตรวจและผลตรวจ' : 'Testing & Results',
      description: language === 'th' ? 'แบ่งปันประสบการณ์การตรวจ' : 'Share testing experiences'
    },
    { 
      slug: "dating", 
      icon: Heart, 
      name: language === 'th' ? 'การเดตและความสัมพันธ์' : 'Dating & Relationships',
      description: language === 'th' ? 'พูดคุยเรื่องความสัมพันธ์อย่างปลอดภัย' : 'Talk about relationships safely'
    },
    { 
      slug: "harm-reduction", 
      icon: Shield, 
      name: language === 'th' ? 'การลดอันตราย' : 'Harm Reduction',
      description: language === 'th' ? 'สนับสนุนซึ่งกันและกัน' : 'Support each other'
    },
  ];

  return (
    <>
      <PageContainer>
        <PageHeader title={t('community.title')} subtitle={t('community.subtitle')} />

        <Card className="mb-6 p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('community.anonymousReminder')}</p>
              <p className="text-sm text-muted-foreground">{t('community.anonymousDesc')}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-3 animate-slide-up">
          {chatRooms.map((room) => (
            <InfoCard
              key={room.slug}
              icon={room.icon}
              title={room.name}
              description={room.description}
              to={`/community/chat/${room.slug}`}
            />
          ))}
        </div>

        <div className="mt-6">
          <button 
            onClick={() => window.location.href = '/community/interests'}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{t('community.manageInterests')}</span>
          </button>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
