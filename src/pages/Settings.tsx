import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeSelector } from "@/components/ThemeSelector";
import { getUserData, setUserData, resetUserData } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Pill, Clock, Shield, Trash2, Languages, Palette, User, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState(getUserData().notificationSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRequest, setAdminRequest] = useState<{ status: string } | null>(null);
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  
  useEffect(() => {
    const data = getUserData();
    setSettings(data.notificationSettings);
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      checkAdminRequest();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    setIsAdmin(!!data);
  };

  const checkAdminRequest = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('admin_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();
    setAdminRequest(data);
  };

  const submitAdminRequest = async () => {
    if (!user) return;
    setSubmittingRequest(true);
    try {
      const { error } = await supabase.from('admin_requests').insert({
        user_id: user.id,
        email: user.email || '',
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
        reason: adminReason,
      });
      if (error) throw error;
      toast.success(language === 'th' ? 'ส่งคำขอสำเร็จ' : 'Request submitted');
      setShowAdminRequest(false);
      setAdminReason("");
      checkAdminRequest();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

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

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged out successfully");
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
        
        {/* Account */}
        {user && (
          <div className="mb-8 animate-slide-up">
            <h2 className="mb-4 text-lg font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t('settings.account')}
            </h2>
            <div className="rounded-xl bg-card border border-border p-4 shadow-card space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
                  <User className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t('settings.loggedInAs')}</p>
                  <p className="font-medium text-foreground">{user.email}</p>
                </div>
                {isAdmin && (
                  <Badge variant="default" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>
              
              {/* Admin Section */}
              {isAdmin ? (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => navigate('/admin')}
                >
                  <Shield className="h-5 w-5" />
                  {language === 'th' ? 'แดชบอร์ดผู้ดูแล' : 'Admin Dashboard'}
                </Button>
              ) : adminRequest ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{language === 'th' ? 'คำขอเป็นผู้ดูแล' : 'Admin Request'}</span>
                  </div>
                  <Badge variant={adminRequest.status === 'pending' ? 'secondary' : adminRequest.status === 'approved' ? 'default' : 'destructive'}>
                    {adminRequest.status === 'pending' 
                      ? (language === 'th' ? 'รอพิจารณา' : 'Pending')
                      : adminRequest.status === 'approved'
                      ? (language === 'th' ? 'อนุมัติแล้ว' : 'Approved')
                      : (language === 'th' ? 'ไม่อนุมัติ' : 'Rejected')
                    }
                  </Badge>
                </div>
              ) : !showAdminRequest ? (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3"
                  onClick={() => setShowAdminRequest(true)}
                >
                  <Shield className="h-5 w-5" />
                  {language === 'th' ? 'ขอเป็นผู้ดูแลระบบ' : 'Request Admin Access'}
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">{language === 'th' ? 'เหตุผลที่ต้องการเป็นผู้ดูแล' : 'Why do you want admin access?'}</p>
                  <Textarea
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    placeholder={language === 'th' ? 'อธิบายเหตุผล...' : 'Explain your reason...'}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdminRequest(false)}
                    >
                      {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitAdminRequest}
                      disabled={submittingRequest || !adminReason.trim()}
                    >
                      {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {language === 'th' ? 'ส่งคำขอ' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                {t('settings.logout')}
              </Button>
            </div>
          </div>
        )}
        
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
