/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TestTube, Bell, ArrowRight } from "lucide-react";
import { SelfCareShop } from "@/components/SelfCareShop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

  return (
    <>
      <PageContainer>
        <PageHeader title={t('selfCare.title')} subtitle={t('selfCare.subtitle')} />

        {/* HIV Self-Test Kit Banner */}
         <Button
          variant="ghost"
          className="h-auto sm:h-auto w-full whitespace-normal p-5 mb-6 text-left glass glass-shine hover:shadow-soft transition-all duration-200 rounded-2xl"
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
         </Button>

        <SelfCareShop language={language} />

        {/* Reminders */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4" />
            {t('selfCare.reminders')}
          </h2>

          <Card className="divide-y divide-border/50 rounded-2xl glass">
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
