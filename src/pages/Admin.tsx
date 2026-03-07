import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";

const AdminDashboardContent = lazy(() => import("@/components/admin/AdminDashboardContent"));
const BranchDashboardContent = lazy(() => import("@/components/admin/BranchDashboardContent"));
const AdminKitOrdersContent = lazy(() => import("@/components/admin/AdminKitOrdersContent"));
const AdminAnalyticsContent = lazy(() => import("@/components/admin/AdminAnalyticsContent"));
const AdminBlogContent = lazy(() => import("@/components/admin/AdminBlogContent"));
const AdminNotificationsContent = lazy(() => import("@/components/admin/AdminNotificationsContent"));
const AdminUsersContent = lazy(() => import("@/components/admin/AdminUsersContent").then(m => ({ default: m.AdminUsersContent })));
const AdminBranchStaffContent = lazy(() => import("@/components/admin/AdminBranchStaffContent"));
const AdminSurveysContent = lazy(() => import("@/components/admin/AdminSurveysContent"));
const AdminImportContent = lazy(() => import("@/components/admin/AdminImportContent"));
const AdminQuickRegister = lazy(() => import("@/components/admin/AdminQuickRegister"));
const AdminBookingContent = lazy(() => import("@/components/admin/AdminBookingContent"));
const AdminTodayBoard = lazy(() => import("@/components/admin/AdminTodayBoard"));
const AdminScheduleContent = lazy(() => import("@/components/admin/AdminScheduleContent"));
const AdminTranslationsContent = lazy(() => import("@/components/admin/AdminTranslationsContent").then(m => ({ default: m.AdminTranslationsContent })));
const AdminAbuseLogsContent = lazy(() => import("@/components/admin/AdminAbuseLogsContent"));
const AdminAppUpdatesContent = lazy(() => import("@/components/admin/AdminAppUpdatesContent"));
const AdminRewardsContent = lazy(() => import("@/components/admin/AdminRewardsContent").then(m => ({ default: m.AdminRewardsContent })));
const AdminPartnerInvitesContent = lazy(() => import("@/components/admin/AdminPartnerInvitesContent"));

// New modules
const AdminSmsRelayContent = lazy(() => import("@/components/admin/AdminSmsRelayContent"));
const AdminCreditBalancesContent = lazy(() => import("@/components/admin/AdminCreditBalancesContent"));
const AdminCreditPurchasesContent = lazy(() => import("@/components/admin/AdminCreditPurchasesContent"));
const AdminPairSessionsContent = lazy(() => import("@/components/admin/AdminPairSessionsContent"));
const AdminAnonymousResponsesContent = lazy(() => import("@/components/admin/AdminAnonymousResponsesContent"));
const AdminActivityLogsContent = lazy(() => import("@/components/admin/AdminActivityLogsContent"));
const AdminExportCenterContent = lazy(() => import("@/components/admin/AdminExportCenterContent"));
const AdminDiagnosticsContent = lazy(() => import("@/components/admin/AdminDiagnosticsContent"));
const AdminSystemHealthContent = lazy(() => import("@/components/admin/AdminSystemHealthContent"));

const TabLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Tabs accessible by moderators (branch staff)
const MODERATOR_TABS = new Set(["dashboard", "kit-orders", "quick-register", "bookings", "today", "schedule"]);

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get("tab") || (isAdmin ? "dashboard" : "kit-orders");
  const handleTabChange = (value: string) => setSearchParams({ tab: value });

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      if (!user) { navigate('/auth', { state: { from: '/admin' } }); return; }

      const { data: roleData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (roleData) { setIsAdmin(true); setLoading(false); return; }

      const { data: modData } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' });
      if (modData) {
        setIsModerator(true);
        const { data: branchData } = await supabase.from('staff_branch_assignments').select('branch').eq('user_id', user.id).maybeSingle();
        if (branchData) setUserBranch(branchData.branch);
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    };
    checkAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!loading && isModerator && !isAdmin && !searchParams.get("tab")) {
      setSearchParams({ tab: "kit-orders" });
    }
  }, [loading, isModerator, isAdmin, searchParams, setSearchParams]);

  if (loading || authLoading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  if (!isAdmin && !isModerator) return null;

  const canAccess = (tab: string) => isAdmin || MODERATOR_TABS.has(tab);

  const renderTab = (tabKey: string, component: React.ReactNode) => {
    if (!canAccess(tabKey)) return null;
    return (
      <TabsContent value={tabKey} className="mt-0">
        <Suspense fallback={<TabLoader />}>{component}</Suspense>
      </TabsContent>
    );
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        {isModerator && !isAdmin && userBranch && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">
              {language === 'th' ? `สาขา: ${userBranch}` : `Branch: ${userBranch}`}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Main */}
          {renderTab("dashboard", isAdmin ? <AdminDashboardContent /> : <BranchDashboardContent userBranch={userBranch} />)}

          {/* Operations */}
          {renderTab("kit-orders", <AdminKitOrdersContent userBranch={userBranch} isModerator={isModerator && !isAdmin} />)}
          {renderTab("bookings", <AdminBookingContent userBranch={userBranch} />)}
          {renderTab("today", <AdminTodayBoard userBranch={userBranch} />)}
          {renderTab("schedule", <AdminScheduleContent />)}

          {/* Partner Network */}
          {renderTab("partner-invites", <AdminPartnerInvitesContent />)}
          {renderTab("pair-sessions", <AdminPairSessionsContent />)}
          {renderTab("anonymous-responses", <AdminAnonymousResponsesContent />)}

          {/* SMS & Credits */}
          {renderTab("sms-relay", <AdminSmsRelayContent />)}
          {renderTab("credit-balances", <AdminCreditBalancesContent />)}
          {renderTab("credit-purchases", <AdminCreditPurchasesContent />)}

          {/* People */}
          {renderTab("users", <AdminUsersContent />)}
          {renderTab("branch-staff", <AdminBranchStaffContent />)}
          {renderTab("quick-register", <AdminQuickRegister userBranch={userBranch} />)}
          {renderTab("abuse-logs", <AdminAbuseLogsContent />)}

          {/* Content */}
          {renderTab("blog", <AdminBlogContent />)}
          {renderTab("surveys", <AdminSurveysContent />)}
          {renderTab("rewards", <AdminRewardsContent />)}
          {renderTab("notifications", <AdminNotificationsContent />)}
          {renderTab("translations", <AdminTranslationsContent />)}

          {/* Reports */}
          {renderTab("analytics", <AdminAnalyticsContent />)}
          {renderTab("export-center", <AdminExportCenterContent />)}
          {renderTab("activity-logs", <AdminActivityLogsContent />)}

          {/* Admin Tools */}
          {renderTab("diagnostics", <AdminDiagnosticsContent />)}
          {renderTab("import", <AdminImportContent />)}
          {renderTab("app-updates", <AdminAppUpdatesContent />)}
          {renderTab("system-health", <AdminSystemHealthContent />)}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
