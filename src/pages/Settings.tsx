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
import { ArrowLeft, Bell, Pill, Clock, Shield, Trash2, Languages, Palette, User, LogOut, ShieldCheck, Loader2, UserCircle, Building2, Link2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";
import { useVersionCheck } from "@/hooks/useVersionCheck";

function VersionDiagnostics() {
  const vs = useVersionCheck();
  return (
    <>
      <p>Version: {vs.currentVersion}</p>
      <p>Build: {vs.buildTime}</p>
      <p>Latest: {vs.latestVersion || 'checking...'}</p>
      <p>Update: {vs.updateAvailable ? (vs.isHardUpdate ? '⚠️ Hard update' : '🔄 Soft update') : '✅ Up to date'}</p>
      <p>SW: {vs.swStatus}</p>
      <p>Last check: {vs.lastCheckTime ? new Date(vs.lastCheckTime).toLocaleTimeString() : '-'}</p>
    </>
  );
}

// Helper to get linked providers from user identities
const getLinkedProviders = (user: any): string[] => {
  if (!user?.identities) return [];
  return user.identities.map((identity: any) => identity.provider);
};

export default function Settings() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [settings, setSettings] = useState(getUserData().notificationSettings);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isMeAnalyst, setIsMeAnalyst] = useState(false);
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
      checkMeAnalystStatus();
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

  const checkMeAnalystStatus = async () => {
    if (!user) return;
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'me_analyst',
    });
    setIsMeAnalyst(!!data);
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
              className="rounded-2xl glass-sm hover:glass h-10 w-10"
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
             <div className="rounded-2xl glass p-5">
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
            <div className="rounded-2xl glass p-5 space-y-4">
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
                
                {/* Show linked providers */}
                {(() => {
                  const linkedProviders = getLinkedProviders(user);
                  const hasGoogle = linkedProviders.includes('google');
                  const hasApple = linkedProviders.includes('apple');
                  const hasEmail = linkedProviders.includes('email');
                  
                  return (
                    <div className="space-y-3 mb-4">
                      {/* Email/Password status */}
                      {hasEmail && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="text-sm font-medium">
                              {language === 'th' ? 'อีเมล/รหัสผ่าน' : 'Email/Password'}
                            </span>
                          </div>
                          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Google status */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Google</span>
                        </div>
                        {hasGoogle ? (
                          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            {language === 'th' ? 'ยังไม่เชื่อมต่อ' : 'Not linked'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Apple status */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                            <svg className="h-4 w-4 text-background" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Apple</span>
                        </div>
                        {hasApple ? (
                          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            {language === 'th' ? 'เชื่อมต่อแล้ว' : 'Connected'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            {language === 'th' ? 'ยังไม่เชื่อมต่อ' : 'Not linked'}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Show link buttons only for unlinked providers */}
                      {(!hasGoogle || !hasApple) && (
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-3">
                            {language === 'th' 
                              ? 'เชื่อมต่อเพิ่มเติมเพื่อเข้าสู่ระบบได้ง่ายขึ้น' 
                              : 'Link additional accounts for easier sign-in'}
                          </p>
                          <SocialLoginButtons 
                            mode="link" 
                            onSuccess={() => {
                              toast.success(language === 'th' ? 'เชื่อมต่อบัญชีสำเร็จ!' : 'Account linked successfully!');
                              // Refresh the page to update the identities
                              window.location.reload();
                            }} 
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
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
          <div className="flex items-center justify-between rounded-2xl glass p-5">
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
          
          <div className="rounded-2xl glass divide-y divide-border/50">
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
          <div className="rounded-2xl glass p-5">
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
        </div>

        {/* Diagnostics */}
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {language === 'th' ? 'ข้อมูลระบบ' : 'Diagnostics'}
          </h2>
          <div className="rounded-2xl glass p-5 space-y-2 font-mono text-xs text-muted-foreground">
            <VersionDiagnostics />
          </div>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
