import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
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
const AdminSmsRelayContent = lazy(() => import("@/components/admin/AdminSmsRelayContent"));
const AdminCreditBalancesContent = lazy(() => import("@/components/admin/AdminCreditBalancesContent"));
const AdminCreditPurchasesContent = lazy(() => import("@/components/admin/AdminCreditPurchasesContent"));
const AdminPairSessionsContent = lazy(() => import("@/components/admin/AdminPairSessionsContent"));
const AdminAnonymousResponsesContent = lazy(() => import("@/components/admin/AdminAnonymousResponsesContent"));
const AdminActivityLogsContent = lazy(() => import("@/components/admin/AdminActivityLogsContent"));
const AdminExportCenterContent = lazy(() => import("@/components/admin/AdminExportCenterContent"));
const AdminDiagnosticsContent = lazy(() => import("@/components/admin/AdminDiagnosticsContent"));
const AdminSystemHealthContent = lazy(() => import("@/components/admin/AdminSystemHealthContent"));
const AdminMilestonesContent = lazy(() => import("@/components/admin/AdminMilestonesContent"));
const AdminUserChatsContent = lazy(() => import("@/components/admin/AdminUserChatsContent"));
const AdminIPDocsContent = lazy(() => import("@/components/admin/AdminIPDocsContent"));

const TabLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Tabs accessible by moderators (branch staff)
const MODERATOR_TABS = new Set(["dashboard", "kit-orders", "quick-register", "bookings", "today", "schedule"]);

// Tabs accessible by M&E Analyst (read-only analytics/reporting)
const ME_ANALYST_TABS = new Set([
  "dashboard",
  // Operations (read-only)
  "kit-orders", "bookings", "pair-sessions", "activity-logs",
  // Partner Network
  "partner-invites", "anonymous-responses",
  // SMS & Credits (read-only)
  "sms-relay", "credit-balances", "credit-purchases",
  // Reports
  "analytics", "export-center",
  // System
  "system-health",
]);

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { isAdmin, isModerator, isMeAnalyst, userBranch, loading, role } = useAdminRole();

  const defaultTab = isAdmin ? "dashboard" : isMeAnalyst ? "dashboard" : "kit-orders";
  const activeTab = searchParams.get("tab") || defaultTab;
  const handleTabChange = (value: string) => setSearchParams({ tab: value });

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate('/auth', { state: { from: '/admin' } });
    }
  }, [loading, role, navigate]);

  useEffect(() => {
    if (!loading && isModerator && !isAdmin && !searchParams.get("tab")) {
      setSearchParams({ tab: "kit-orders" });
    }
    if (!loading && isMeAnalyst && !searchParams.get("tab")) {
      setSearchParams({ tab: "dashboard" });
    }
  }, [loading, isModerator, isMeAnalyst, isAdmin, searchParams, setSearchParams]);

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  if (!role) return null;

  const canAccess = (tab: string) => {
    if (isAdmin) return true;
    if (isMeAnalyst) return ME_ANALYST_TABS.has(tab);
    if (isModerator) return MODERATOR_TABS.has(tab);
    return false;
  };

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

        {isMeAnalyst && (
          <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {language === 'th' ? '🔍 โหมดดูข้อมูลเท่านั้น — M&E Analyst' : '🔍 Read-only mode — M&E Analyst'}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* Main */}
          {renderTab("dashboard", isAdmin || isMeAnalyst ? <AdminDashboardContent /> : <BranchDashboardContent userBranch={userBranch} />)}

          {/* Operations */}
          {renderTab("kit-orders", <AdminKitOrdersContent userBranch={userBranch} isModerator={(isModerator && !isAdmin) || isMeAnalyst} />)}
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
          {renderTab("milestones", <AdminMilestonesContent />)}
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
          {renderTab("ip-docs", <AdminIPDocsContent />)}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
