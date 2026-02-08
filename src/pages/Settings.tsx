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
import { ProfileSettings } from "@/components/ProfileSettings";

import { getUserData, setUserData, resetUserData } from "@/lib/store";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Bell, Pill, Clock, Shield, Trash2, Languages, Palette, User, LogOut, ShieldCheck, Loader2, UserCircle, Building2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export default function Settings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState(getUserData().notificationSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [userBranch, setUserBranch] = useState<string | null>(null);
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
      checkModeratorStatus();
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

  const checkModeratorStatus = async () => {
    if (!user) return;
    const { data: modData } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'moderator',
    });
    setIsModerator(!!modData);
    
    if (modData) {
      // Get branch assignment
      const { data: branchData } = await supabase
        .from('staff_branch_assignments')
        .select('branch')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserBranch(branchData?.branch || null);
    }
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
      toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out successfully');
      navigate("/auth");
    }
  };

  return (
    <>
      <PageContainer>
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/")}
            className="rounded-xl hover:bg-muted/80 h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('settings.title')}</h1>
        </div>
        
        {/* Profile Settings */}
        {user && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              {language === 'th' ? 'โปรไฟล์' : 'Profile'}
            </h2>
            <div className="rounded-2xl bg-card border border-border/50 p-5">
              <ProfileSettings />
            </div>
          </div>
        )}

        {/* Account */}
        {user && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('settings.account')}
            </h2>
            <div className="rounded-2xl bg-card border border-border/50 p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <User className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('settings.loggedInAs')}</p>
                  <p className="font-medium text-foreground truncate">{user.email}</p>
                </div>
                {isAdmin && (
                  <Badge className="gap-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              {isModerator && !isAdmin && (
                <Badge className="gap-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                  <Building2 className="h-3 w-3" />
                  {userBranch === 'silom' ? 'Silom Staff' : userBranch === 'pattaya' ? 'Pattaya Staff' : 'Staff'}
                </Badge>
              )}
              </div>
              
              {/* Admin Section */}
              {(isAdmin || isModerator) ? (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-3 rounded-xl h-12"
                  onClick={() => navigate('/admin')}
                >
                  {isAdmin ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                  {isAdmin 
                    ? (language === 'th' ? 'แดชบอร์ดผู้ดูแล' : 'Admin Dashboard')
                    : (language === 'th' ? 'จัดการสาขา' : 'Branch Management')
                  }
                </Button>
              ) : adminRequest ? (
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{language === 'th' ? 'คำขอเป็นผู้ดูแล' : 'Admin Request'}</span>
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
                  className="w-full justify-start gap-3 rounded-xl h-12"
                  onClick={() => setShowAdminRequest(true)}
                >
                  <Shield className="h-5 w-5" />
                  {language === 'th' ? 'ขอเป็นผู้ดูแลระบบ' : 'Request Admin Access'}
                </Button>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-medium">{language === 'th' ? 'เหตุผลที่ต้องการเป็นผู้ดูแล' : 'Why do you want admin access?'}</p>
                  <Textarea
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    placeholder={language === 'th' ? 'อธิบายเหตุผล...' : 'Explain your reason...'}
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdminRequest(false)}
                      className="rounded-lg"
                    >
                      {language === 'th' ? 'ยกเลิก' : 'Cancel'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitAdminRequest}
                      disabled={submittingRequest || !adminReason.trim()}
                      className="rounded-lg"
                    >
                      {submittingRequest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {language === 'th' ? 'ส่งคำขอ' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Link Social Accounts Section */}
              <div className="pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {language === 'th' ? 'เชื่อมต่อบัญชีโซเชียล' : 'Link Social Accounts'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {language === 'th' 
                    ? 'เชื่อมต่อ Google หรือ Apple เพื่อเข้าสู่ระบบได้ง่ายขึ้น' 
                    : 'Link Google or Apple for easier sign-in'}
                </p>
                <SocialLoginButtons 
                  mode="link" 
                  onSuccess={() => {
                    toast.success(language === 'th' ? 'เชื่อมต่อบัญชีสำเร็จ!' : 'Account linked successfully!');
                  }} 
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 rounded-xl h-12 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                {t('settings.logout')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Theme */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t('settings.theme') || 'Theme'}
          </h2>
          <ThemeSelector />
        </div>
        
        {/* Language */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Languages className="h-4 w-4" />
            {t('common.language')}
          </h2>
          <div className="flex items-center justify-between rounded-2xl bg-card border border-border/50 p-5">
            <span className="font-medium text-foreground">ภาษา / Language</span>
            <LanguageToggle />
          </div>
        </div>
        
        {/* Notifications */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t('settings.notifications')}
          </h2>
          
          <div className="rounded-2xl bg-card border border-border/50 divide-y divide-border/50">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('settings.dailyPrep')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dailyPrep.desc')}</p>
                </div>
              </div>
              <Switch checked={settings.dailyPrep} onCheckedChange={(checked) => updateSetting("dailyPrep", checked)} />
            </div>
            
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{t('settings.ondemandPrep')}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.ondemandPrep.desc')}</p>
                </div>
              </div>
              <Switch checked={settings.onDemandPrep} onCheckedChange={(checked) => updateSetting("onDemandPrep", checked)} />
            </div>
            
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.reminderTime')}</h2>
          <div className="rounded-2xl bg-card border border-border/50 p-5">
            <Label htmlFor="reminderTime" className="text-muted-foreground mb-3 block text-sm">{t('settings.defaultTime')}</Label>
            <Input 
              id="reminderTime" 
              type="time" 
              value={settings.reminderTime} 
              onChange={(e) => updateSetting("reminderTime", e.target.value)} 
              className="h-12 text-lg rounded-xl" 
            />
          </div>
        </div>
        

        {/* Data */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('settings.data')}</h2>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 rounded-xl h-12 text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950/30" 
            onClick={handleReset}
          >
            <Trash2 className="h-5 w-5" />
            {t('settings.resetAll')}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">{t('settings.resetWarning')}</p>
          <p className="mt-6 text-[10px] text-muted-foreground/50 text-center font-mono">
            Build: 2025-02-04-v2
          </p>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
