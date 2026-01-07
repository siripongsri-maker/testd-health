import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeSelector } from "@/components/ThemeSelector";
import { getUserData, setUserData, resetUserData } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { ArrowLeft, Bell, Pill, Clock, Shield, Trash2, Languages, Palette } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [settings, setSettings] = useState(getUserData().notificationSettings);
  
  useEffect(() => {
    const data = getUserData();
    setSettings(data.notificationSettings);
  }, []);

  const updateSetting = (key: keyof typeof settings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setUserData({ notificationSettings: newSettings });
  };

  const handleReset = () => {
    if (confirm(t('settings.confirmReset'))) {
      resetUserData();
      toast.success("Data reset successfully");
      navigate("/");
    }
  };

  return (
    <>
      <PageContainer>
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{t('settings.title')}</h1>
        </div>
        
        {/* Theme */}
        <div className="mb-8 animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            {t('settings.theme') || 'Theme'}
          </h2>
          <ThemeSelector />
        </div>
        
        {/* Language */}
        <div className="mb-8 animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Languages className="h-5 w-5 text-primary" />
            {t('common.language')}
          </h2>
          <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
            <span className="font-medium text-foreground">ภาษา / Language</span>
            <LanguageToggle />
          </div>
        </div>
        
        {/* Notifications */}
        <div className="mb-8 animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {t('settings.notifications')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('settings.dailyPrep')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dailyPrep.desc')}</p>
                </div>
              </div>
              <Switch checked={settings.dailyPrep} onCheckedChange={(checked) => updateSetting("dailyPrep", checked)} />
            </div>
            
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('settings.ondemandPrep')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.ondemandPrep.desc')}</p>
                </div>
              </div>
              <Switch checked={settings.onDemandPrep} onCheckedChange={(checked) => updateSetting("onDemandPrep", checked)} />
            </div>
            
            <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Shield className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('settings.pepReminders')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.pepReminders.desc')}</p>
                </div>
              </div>
              <Switch checked={settings.pepDaily} onCheckedChange={(checked) => updateSetting("pepDaily", checked)} />
            </div>
          </div>
        </div>
        
        {/* Reminder Time */}
        <div className="mb-8 animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground">{t('settings.reminderTime')}</h2>
          <div className="rounded-xl bg-card border border-border p-4 shadow-card">
            <Label htmlFor="reminderTime" className="text-muted-foreground mb-2 block">{t('settings.defaultTime')}</Label>
            <Input id="reminderTime" type="time" value={settings.reminderTime} onChange={(e) => updateSetting("reminderTime", e.target.value)} className="h-14 text-lg" />
          </div>
        </div>
        
        {/* Data */}
        <div className="animate-slide-up">
          <h2 className="mb-4 text-lg font-bold text-foreground">{t('settings.data')}</h2>
          <Button variant="outline" className="w-full justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleReset}>
            <Trash2 className="h-5 w-5" />
            {t('settings.resetAll')}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">{t('settings.resetWarning')}</p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
