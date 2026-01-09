import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TestTube, Heart, Shield, ExternalLink, Bell, Package, ArrowRight, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Fallback images
import loveKitImg from "@/assets/love-kit.jpg";
import selfKitImg from "@/assets/self-kit.jpg";
import safeKitImg from "@/assets/safe-kit.jpg";

interface SelfCareItem {
  id: string;
  icon: React.ElementType;
  fallbackImage: string;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  link: string;
}

const SELF_CARE_ITEMS: SelfCareItem[] = [
  {
    id: 'condoms',
    icon: Heart,
    fallbackImage: loveKitImg,
    titleEn: 'Love Kit - Condoms',
    titleTh: 'Love Kit - ถุงยางอนามัย',
    descEn: 'Essential protection, discreet delivery',
    descTh: 'ป้องกันพื้นฐาน จัดส่งอย่างลับ',
    link: 'https://shopee.co.th/swingthailand/48800599211',
  },
  {
    id: 'hiv-test',
    icon: TestTube,
    fallbackImage: selfKitImg,
    titleEn: 'Self Kit - HIV Self-Test',
    titleTh: 'Self Kit - ชุดตรวจ HIV ด้วยตัวเอง',
    descEn: 'Quick, private, and accurate home testing',
    descTh: 'ตรวจที่บ้านได้ รวดเร็วและแม่นยำ',
    link: 'https://shopee.co.th/swingthailand/43777530134',
  },
  {
    id: 'harm-reduction',
    icon: Shield,
    fallbackImage: safeKitImg,
    titleEn: 'Safe Kit - Harm Reduction Set',
    titleTh: 'Safe Kit - ชุดลดอันตราย',
    descEn: 'Lubricants and safer use supplies',
    descTh: 'เจลหล่อลื่นและอุปกรณ์ปลอดภัย',
    link: 'https://shopee.co.th/swingthailand/55553565341',
  },
];

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
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(true);

  const fetchShopeeImages = async (forceRefresh = false) => {
    setImagesLoading(true);
    try {
      const products = SELF_CARE_ITEMS.map(item => ({
        id: item.id,
        link: item.link,
      }));

      const { data, error } = await supabase.functions.invoke('scrape-shopee-images', {
        body: { products, forceRefresh },
      });

      if (error) {
        console.error('Error fetching Shopee images:', error);
        if (forceRefresh) {
          toast.error(language === 'th' ? 'ไม่สามารถโหลดรูปภาพได้' : 'Failed to load images');
        }
      } else if (data?.success && data?.images) {
        setProductImages(data.images);
        if (forceRefresh) {
          toast.success(language === 'th' ? 'อัปเดตรูปภาพแล้ว' : 'Images updated');
        }
      }
    } catch (error) {
      console.error('Error fetching Shopee images:', error);
    } finally {
      setImagesLoading(false);
    }
  };

  // Fetch Shopee product images on mount (uses cache)
  useEffect(() => {
    fetchShopeeImages(false);
  }, []);

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
        <PageHeader title={t('selfCare.title')} subtitle={t('selfCare.subtitle')} />

        {/* HIV Self-Test Kit Banner */}
        <Card 
          className="p-5 mb-6 cursor-pointer bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-200 rounded-2xl"
          onClick={() => navigate('/hiv-selftest')}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <TestTube className="h-7 w-7 text-primary-foreground" />
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

        {/* Products Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {language === 'th' ? 'สินค้าแนะนำ' : 'Recommended Products'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchShopeeImages(true)}
            disabled={imagesLoading}
            className="gap-2 rounded-lg text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${imagesLoading ? 'animate-spin' : ''}`} />
            {language === 'th' ? 'รีเฟรช' : 'Refresh'}
          </Button>
        </div>

        {/* Product Cards */}
        <div className="space-y-4 mb-8">
          {SELF_CARE_ITEMS.map((item, index) => (
            <Card 
              key={item.id} 
              className="overflow-hidden rounded-2xl border-border/50 hover:shadow-lg transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex">
                <div className="w-28 h-28 shrink-0 bg-muted/30 relative overflow-hidden">
                  {imagesLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  <img 
                    src={productImages[item.id] || item.fallbackImage} 
                    alt={item.titleEn}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {language === 'th' ? item.titleTh : item.titleEn}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'th' ? item.descTh : item.descEn}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLink(item.link)}
                    className="gap-2 w-fit mt-3 rounded-lg text-xs h-8"
                  >
                    <Package className="h-3.5 w-3.5" />
                    {t('selfCare.orderNow')}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Reminders */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4" />
            {t('selfCare.reminders')}
          </h2>

          <Card className="divide-y divide-border/50 rounded-2xl border-border/50">
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-foreground">{t('selfCare.hivTestReminder')}</p>
                <p className="text-sm text-muted-foreground">{t('selfCare.hivTestReminderDesc')}</p>
              </div>
              <Switch
                checked={reminders.hiv_test}
                onCheckedChange={(v) => toggleReminder('hiv_test', v)}
              />
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-foreground">{t('selfCare.condomReminder')}</p>
                <p className="text-sm text-muted-foreground">{t('selfCare.condomReminderDesc')}</p>
              </div>
              <Switch
                checked={reminders.condom_refill}
                onCheckedChange={(v) => toggleReminder('condom_refill', v)}
              />
            </div>
            <div className="flex items-center justify-between p-5">
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
