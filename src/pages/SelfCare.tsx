import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { TestTube, Heart, Shield, ExternalLink, Bell, Package, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SelfCareItem {
  id: string;
  icon: React.ElementType;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  link: string;
}

const SELF_CARE_ITEMS: SelfCareItem[] = [
  {
    id: 'hiv-test',
    icon: TestTube,
    titleEn: 'HIV Self-Test Kit',
    titleTh: 'ชุดตรวจ HIV ด้วยตัวเอง',
    descEn: 'Quick, private, and accurate home testing',
    descTh: 'ตรวจที่บ้านได้ รวดเร็วและแม่นยำ',
    link: 'https://shopee.co.th/search?keyword=hiv%20self%20test',
  },
  {
    id: 'condoms',
    icon: Heart,
    titleEn: 'Condoms',
    titleTh: 'ถุงยางอนามัย',
    descEn: 'Essential protection, discreet delivery',
    descTh: 'ป้องกันพื้นฐาน จัดส่งอย่างลับ',
    link: 'https://shopee.co.th/search?keyword=condoms',
  },
  {
    id: 'harm-reduction',
    icon: Shield,
    titleEn: 'Harm Reduction Set',
    titleTh: 'ชุดลดอันตราย',
    descEn: 'Lubricants and safer use supplies',
    descTh: 'เจลหล่อลื่นและอุปกรณ์ปลอดภัย',
    link: 'https://shopee.co.th/search?keyword=lubricant',
  },
];

interface Reminder {
  reminder_type: string;
  enabled: boolean;
}

export default function SelfCare() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Record<string, boolean>>({
    hiv_test: true,
    condom_refill: true,
    harm_reduction: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('self_care_reminders')
        .select('reminder_type, enabled')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const reminderMap: Record<string, boolean> = {};
        data.forEach((r) => {
          reminderMap[r.reminder_type] = r.enabled;
        });
        setReminders((prev) => ({ ...prev, ...reminderMap }));
      }
      setLoading(false);
    };

    fetchReminders();
  }, [user]);

  const toggleReminder = async (type: string, enabled: boolean) => {
    setReminders((prev) => ({ ...prev, [type]: enabled }));

    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('self_care_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', type)
        .single();

      if (existing) {
        await supabase
          .from('self_care_reminders')
          .update({ enabled })
          .eq('id', existing.id);
      } else {
        await supabase.from('self_care_reminders').insert({
          user_id: user.id,
          reminder_type: type,
          enabled,
        });
      }

      toast.success(enabled ? t('selfCare.reminderEnabled') : t('selfCare.reminderDisabled'));
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const openLink = (link: string) => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('selfCare.title')}</h1>
          <p className="text-muted-foreground">{t('selfCare.subtitle')}</p>
        </div>

        {/* HIV Self-Test Kit Banner */}
        <Card 
          className="p-4 mb-6 cursor-pointer bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-colors"
          onClick={() => navigate('/hiv-selftest')}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <TestTube className="h-7 w-7 text-primary" />
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
        </Card>

        {/* Products */}
        <div className="space-y-3 mb-8">
          {SELF_CARE_ITEMS.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground">
                    {language === 'th' ? item.titleTh : item.titleEn}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'th' ? item.descTh : item.descEn}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLink(item.link)}
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    {t('selfCare.orderNow')}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Reminders */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{t('selfCare.reminders')}</h2>
          </div>

          <Card className="divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">{t('selfCare.hivTestReminder')}</p>
                <p className="text-sm text-muted-foreground">{t('selfCare.hivTestReminderDesc')}</p>
              </div>
              <Switch
                checked={reminders.hiv_test}
                onCheckedChange={(v) => toggleReminder('hiv_test', v)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">{t('selfCare.condomReminder')}</p>
                <p className="text-sm text-muted-foreground">{t('selfCare.condomReminderDesc')}</p>
              </div>
              <Switch
                checked={reminders.condom_refill}
                onCheckedChange={(v) => toggleReminder('condom_refill', v)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">{t('selfCare.harmReductionReminder')}</p>
                <p className="text-sm text-muted-foreground">{t('selfCare.harmReductionReminderDesc')}</p>
              </div>
              <Switch
                checked={reminders.harm_reduction}
                onCheckedChange={(v) => toggleReminder('harm_reduction', v)}
              />
            </div>
          </Card>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
