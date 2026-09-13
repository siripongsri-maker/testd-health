import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { supabase } from "@/integrations/supabase/client";

const AdminDashboardContent = lazyWithRetry(() => import("@/components/admin/AdminDashboardContent"));
const BranchDashboardContent = lazyWithRetry(() => import("@/components/admin/BranchDashboardContent"));
const AdminKitOrdersContent = lazyWithRetry(() => import("@/components/admin/AdminKitOrdersContent"));
const AdminTrackingUploadContent = lazyWithRetry(() => import("@/components/admin/AdminTrackingUploadContent"));
const AdminKitDeliveryReportContent = lazyWithRetry(() => import("@/components/admin/AdminKitDeliveryReportContent"));
const AdminAnalyticsContent = lazyWithRetry(() => import("@/components/admin/AdminAnalyticsContent"));
const AdminBlogContent = lazyWithRetry(() => import("@/components/admin/AdminBlogContent"));
const AdminSeoArticlesContent = lazyWithRetry(() => import("@/components/admin/AdminSeoArticlesContent"));
import { AdminSeoHealthContent } from "@/components/admin/AdminSeoHealthContent";
import { AdminJsonLdCheckContent } from "@/components/admin/AdminJsonLdCheckContent";
const AdminLinkProspectsContent = lazyWithRetry(() => import("@/components/admin/AdminLinkProspectsContent"));
const AdminBacklinkMonitorContent = lazyWithRetry(() => import("@/components/admin/AdminBacklinkMonitorContent"));
const AdminDisavowWorkflowContent = lazyWithRetry(() => import("@/components/admin/AdminDisavowWorkflowContent"));
const AdminNotificationsContent = lazyWithRetry(() => import("@/components/admin/AdminNotificationsContent"));
const AdminUsersContent = lazyWithRetry(() => import("@/components/admin/AdminUsersContent").then(m => ({ default: m.AdminUsersContent })));
const AdminBranchStaffContent = lazyWithRetry(() => import("@/components/admin/AdminBranchStaffContent"));
const AdminSurveysContent = lazyWithRetry(() => import("@/components/admin/AdminSurveysContent"));
const AdminImportContent = lazyWithRetry(() => import("@/components/admin/AdminImportContent"));
const AdminQuickRegister = lazyWithRetry(() => import("@/components/admin/AdminQuickRegister"));
const AdminBookingContent = lazyWithRetry(() => import("@/components/admin/AdminBookingContent"));
const AdminTodayBoard = lazyWithRetry(() => import("@/components/admin/AdminTodayBoard"));
const AdminScheduleContent = lazyWithRetry(() => import("@/components/admin/AdminScheduleContent"));
const AdminTranslationsContent = lazyWithRetry(() => import("@/components/admin/AdminTranslationsContent").then(m => ({ default: m.AdminTranslationsContent })));
const AdminAbuseLogsContent = lazyWithRetry(() => import("@/components/admin/AdminAbuseLogsContent"));
const AdminAppUpdatesContent = lazyWithRetry(() => import("@/components/admin/AdminAppUpdatesContent"));
const AdminRewardsContent = lazyWithRetry(() => import("@/components/admin/AdminRewardsContent").then(m => ({ default: m.AdminRewardsContent })));
const AdminPartnerInvitesContent = lazyWithRetry(() => import("@/components/admin/AdminPartnerInvitesContent"));
const AdminSmsRelayContent = lazyWithRetry(() => import("@/components/admin/AdminSmsRelayContent"));
const AdminCreditBalancesContent = lazyWithRetry(() => import("@/components/admin/AdminCreditBalancesContent"));
const AdminCreditPurchasesContent = lazyWithRetry(() => import("@/components/admin/AdminCreditPurchasesContent"));
const AdminPairSessionsContent = lazyWithRetry(() => import("@/components/admin/AdminPairSessionsContent"));
const AdminAnonymousResponsesContent = lazyWithRetry(() => import("@/components/admin/AdminAnonymousResponsesContent"));
const AdminActivityLogsContent = lazyWithRetry(() => import("@/components/admin/AdminActivityLogsContent"));
const AdminExportCenterContent = lazyWithRetry(() => import("@/components/admin/AdminExportCenterContent"));
const AdminDiagnosticsContent = lazyWithRetry(() => import("@/components/admin/AdminDiagnosticsContent"));
const AdminSystemHealthContent = lazyWithRetry(() => import("@/components/admin/AdminSystemHealthContent"));
const AdminRouteHealthContent = lazyWithRetry(() => import("@/components/admin/AdminRouteHealthContent"));
const AdminGlyphQaContent = lazyWithRetry(() => import("@/components/admin/AdminGlyphQaContent"));
const AdminMilestonesContent = lazyWithRetry(() => import("@/components/admin/AdminMilestonesContent"));
const AdminUserChatsContent = lazyWithRetry(() => import("@/components/admin/AdminUserChatsContent"));
const AdminIPDocsContent = lazyWithRetry(() => import("@/components/admin/AdminIPDocsContent"));
const AdminAnalyticsOverview = lazyWithRetry(() => import("@/components/admin/AdminAnalyticsOverview"));
const AdminQueueBoardContent = lazyWithRetry(() => import("@/components/admin/AdminQueueBoardContent"));
const AdminHarmReductionContent = lazyWithRetry(() => import("@/components/admin/AdminHarmReductionContent").then(m => ({ default: m.AdminHarmReductionContent })));
const AdminSafetyPlannerContent = lazyWithRetry(() => import("@/components/admin/AdminSafetyPlannerContent"));
const AdminKnowledgeGraphContent = lazyWithRetry(() => import("@/components/admin/AdminKnowledgeGraphContent"));
const AdminContentGeneratorContent = lazyWithRetry(() => import("@/components/admin/AdminContentGeneratorContent"));
const AdminReferencesContent = lazyWithRetry(() => import("@/components/admin/AdminReferencesContent"));
const AdminDemographicsContent = lazyWithRetry(() => import("@/components/admin/AdminDemographicsContent"));
const AdminLanguageAnalyticsContent = lazyWithRetry(() => import("@/components/admin/AdminLanguageAnalyticsContent"));
const AdminOutreachContent = lazyWithRetry(() => import("@/components/admin/AdminOutreachContent"));
const AdminLanguageDictionaryContent = lazyWithRetry(() => import("@/components/admin/AdminLanguageDictionaryContent"));
const AdminClinicSettingsContent = lazyWithRetry(() => import("@/components/admin/AdminClinicSettingsContent"));
const AdminServicePathwaysContent = lazyWithRetry(() => import("@/components/admin/AdminServicePathwaysContent"));
const AdminFrontDeskContent = lazyWithRetry(() => import("@/components/admin/AdminFrontDeskContent"));
const AdminPdpaComplianceContent = lazyWithRetry(() => import("@/components/admin/AdminPdpaComplianceContent"));
const AdminAttributionContent = lazyWithRetry(() => import("@/components/admin/AdminAttributionContent"));
const AdminChemsexCardsContent = lazyWithRetry(() => import("@/components/admin/AdminChemsexCardsContent"));
const AdminAnonymousPrivacyContent = lazyWithRetry(() => import("@/components/admin/AdminAnonymousPrivacyContent"));

const AdminFeedbackOutcomesContent = lazyWithRetry(() => import("@/components/admin/AdminFeedbackOutcomesContent"));
const AdminCRMContent = lazyWithRetry(() => import("@/components/admin/crm/AdminCRMContent"));
const AdminYouthSurveyContent = lazyWithRetry(() => import("@/components/admin/AdminYouthSurveyContent"));
const AdminVirtualStoriesContent = lazyWithRetry(() => import("@/components/admin/AdminVirtualStoriesContent"));
const AdminConversionInsightsContent = lazyWithRetry(() => import("@/components/admin/AdminConversionInsightsContent"));
const AdminHarmReductionReportContent = lazyWithRetry(() => import("@/components/admin/AdminHarmReductionReportContent"));
const AdminMonthlyDrawContent = lazyWithRetry(() => import("@/components/admin/AdminMonthlyDrawContent").then(m => ({ default: m.AdminMonthlyDrawContent })));
const AdminSelftestResultsContent = lazyWithRetry(() => import("@/components/admin/AdminSelftestResultsContent"));
const AdminSelftestFollowupContent = lazyWithRetry(() => import("@/components/admin/AdminSelftestFollowupContent"));
const AdminSelftestMapContent = lazyWithRetry(() => import("@/components/admin/AdminSelftestMapContent"));
const AdminSelftestMissingIdContent = lazyWithRetry(() => import("@/components/admin/AdminSelftestMissingIdContent"));
const AdminPreServiceSurveysContent = lazyWithRetry(() => import("@/components/admin/AdminPreServiceHubContent"));
const AdminCounselorSupportContent = lazyWithRetry(() => import("@/components/admin/AdminCounselorSupportContent"));
const AdminDailyOpsContent = lazyWithRetry(() => import("@/components/admin/AdminDailyOpsContent"));
const AdminDailyBranchBriefContent = lazyWithRetry(() => import("@/components/admin/AdminDailyBranchBriefContent"));
const AdminConcernBriefContent = lazyWithRetry(() => import("@/components/admin/AdminConcernBriefContent"));
const AdminCounselingPayoutsContent = lazyWithRetry(() => import("@/components/admin/AdminCounselingPayoutsContent"));

// MEL modules
const MelServiceLedgerContent = lazyWithRetry(() => import("@/components/admin/mel/MelServiceLedgerContent"));
const MelIndicatorsContent = lazyWithRetry(() => import("@/components/admin/mel/MelIndicatorsContent"));
const MelOutreachEventsContent = lazyWithRetry(() => import("@/components/admin/mel/MelOutreachEventsContent"));
const MelTrainingContent = lazyWithRetry(() => import("@/components/admin/mel/MelTrainingContent"));
const MelSafeSpacesContent = lazyWithRetry(() => import("@/components/admin/mel/MelSafeSpacesContent"));
const MelPartnersContent = lazyWithRetry(() => import("@/components/admin/mel/MelPartnersContent"));
const MelPolicyContent = lazyWithRetry(() => import("@/components/admin/mel/MelPolicyContent"));
const MelEvaluationContent = lazyWithRetry(() => import("@/components/admin/mel/MelEvaluationContent"));
const MelReportingContent = lazyWithRetry(() => import("@/components/admin/mel/MelReportingContent"));
const AdminCounselorAccountsContent = lazyWithRetry(() => import("@/components/admin/AdminCounselorAccountsContent"));

const TabLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Tabs accessible by moderators (branch staff)
const MODERATOR_TABS = new Set(["dashboard", "kit-orders", "tracking-upload", "delivery-report", "selftest-results", "selftest-followup", "selftest-map", "selftest-missing-id", "quick-register", "bookings", "today", "schedule", "queue-board", "front-desk", "counselor-support", "daily-branch-brief", "concern-brief", "daily-ops"]);

// Tabs accessible by M&E Analyst (read-only analytics/reporting)
const ME_ANALYST_TABS = new Set([
  "dashboard",
  // Operations (read-only)
  "kit-orders", "selftest-results", "selftest-followup", "selftest-map", "bookings", "pair-sessions", "activity-logs",
  // Partner Network
  "partner-invites", "anonymous-responses",
  // SMS & Credits (read-only)
  "sms-relay", "credit-balances", "credit-purchases",
  // Reports
  "analytics", "analytics-overview", "export-center", "attribution", "chemsex-cards", "feedback-outcomes", "pre-service-surveys", "counselor-support", "daily-branch-brief", "concern-brief", "daily-ops",
  // MEL
  "mel-services", "mel-indicators", "mel-outreach", "mel-training",
  "mel-safe-spaces", "mel-partners", "mel-policy", "mel-evaluation", "mel-reporting",
  "youth-survey",
  "virtual-stories",
  "conversion-insights", "hr-report",
  // HR Service System
  "service-pathways",
  // System
  "system-health",
]);

const COUNSELOR_TABS = ["daily-ops", "counselor-support", "daily-branch-brief", "concern-brief", "queue-board"];

function BranchLabel({ branchId }: { branchId: string }) {
  const { language } = useLanguage();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branchId);
    supabase
      .from('booking_branches')
      .select('name_th, name_en')
      .eq(isUuid ? 'id' : 'slug', branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active || !data) return;
        setName(language === 'th' ? (data as any).name_th : ((data as any).name_en || (data as any).name_th));
      });
    return () => { active = false; };
  }, [branchId, language]);

  // สำรอง: ถ้าหาชื่อสาขาไม่เจอ ให้แสดงรหัส/slug แทน เพื่อไม่ให้ค้างที่ "กำลังโหลด…"
  const label = name ?? branchId;

  return <>{language === 'th' ? `สาขา: ${label}` : `Branch: ${label}`}</>;
}

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { isAdmin, isModerator, isMeAnalyst, userBranch, loading, role } = useAdminRole();
  const isCounselor = role === 'counselor';

  const defaultTab = isAdmin ? "dashboard" : isMeAnalyst ? "dashboard" : isCounselor ? "daily-ops" : "kit-orders";
  const activeTab = searchParams.get("tab") || defaultTab;
  const handleTabChange = (value: string) => setSearchParams({ tab: value });

  useEffect(() => {
    if (loading) return;
    if (!role) {
      navigate('/auth', { state: { from: '/admin' } });
    }
  }, [loading, role, navigate]);

  useEffect(() => {
    if (loading) return;
    // Counselors are locked to the counselor-support tab
    if (isCounselor && !COUNSELOR_TABS.includes(searchParams.get("tab") || "")) {
      setSearchParams({ tab: "daily-ops" });
      return;
    }
    if (isModerator && !isAdmin && !searchParams.get("tab")) {
      setSearchParams({ tab: "kit-orders" });
    }
    if (isMeAnalyst && !searchParams.get("tab")) {
      setSearchParams({ tab: "dashboard" });
    }
  }, [loading, isModerator, isMeAnalyst, isAdmin, isCounselor, searchParams, setSearchParams]);

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  if (!role) return null;

  const canAccess = (tab: string) => {
    if (isAdmin) return true;
    if (isCounselor) return COUNSELOR_TABS.includes(tab);
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
        {(isModerator || isCounselor) && !isAdmin && userBranch && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">
              <BranchLabel branchId={userBranch} />
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
          {renderTab("tracking-upload", <AdminTrackingUploadContent />)}
          {renderTab("delivery-report", <AdminKitDeliveryReportContent />)}
          {renderTab("selftest-results", <AdminSelftestResultsContent />)}
          {renderTab("selftest-followup", <AdminSelftestFollowupContent />)}
          {renderTab("selftest-map", <AdminSelftestMapContent />)}
          {renderTab("selftest-missing-id", <AdminSelftestMissingIdContent />)}
          {renderTab("bookings", <AdminBookingContent userBranch={userBranch} />)}
          {renderTab("today", <AdminTodayBoard userBranch={userBranch} />)}
          {renderTab("schedule", <AdminScheduleContent />)}
          {renderTab("queue-board", <AdminQueueBoardContent userBranch={userBranch} lockBranch={isCounselor || isModerator} />)}

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
          {renderTab("counselor-accounts", <AdminCounselorAccountsContent />)}
          {renderTab("branch-staff", <AdminBranchStaffContent />)}
          {renderTab("quick-register", <AdminQuickRegister userBranch={userBranch} />)}
          {renderTab("abuse-logs", <AdminAbuseLogsContent />)}

          {/* Content */}
          {renderTab("blog", <AdminBlogContent />)}
          {renderTab("seo-articles", <AdminSeoArticlesContent />)}
          {renderTab("seo-health", <AdminSeoHealthContent />)}
          {renderTab("jsonld-check", <AdminJsonLdCheckContent />)}
          {renderTab("link-prospects", <AdminLinkProspectsContent />)}
          {renderTab("backlinks", <AdminBacklinkMonitorContent />)}
          {renderTab("disavow", <AdminDisavowWorkflowContent />)}
          {renderTab("surveys", <AdminSurveysContent />)}
          {renderTab("rewards", <AdminRewardsContent />)}
          {renderTab("monthly-draw", <AdminMonthlyDrawContent />)}
          {renderTab("milestones", <AdminMilestonesContent />)}
          {renderTab("user-chats", <AdminUserChatsContent />)}
          {renderTab("notifications", <AdminNotificationsContent />)}
          {renderTab("translations", <AdminTranslationsContent />)}

          {/* Reports */}
          {renderTab("analytics", <AdminAnalyticsContent />)}
          {renderTab("analytics-overview", <AdminAnalyticsOverview />)}
          {renderTab("attribution", <AdminAttributionContent />)}
          {renderTab("chemsex-cards", <AdminChemsexCardsContent />)}
          {renderTab("feedback-outcomes", <AdminFeedbackOutcomesContent />)}
          {renderTab("pre-service-surveys", <AdminPreServiceSurveysContent />)}
          {renderTab("daily-ops", <AdminDailyOpsContent />)}
          {renderTab("counselor-support", <AdminCounselorSupportContent />)}
          {renderTab("daily-branch-brief", <AdminDailyBranchBriefContent />)}
          {renderTab("concern-brief", <AdminConcernBriefContent />)}
          {renderTab("counseling-payouts", <AdminCounselingPayoutsContent />)}
          {renderTab("export-center", <AdminExportCenterContent />)}
          {renderTab("activity-logs", <AdminActivityLogsContent />)}

          {/* Admin Tools */}
          {renderTab("diagnostics", <AdminDiagnosticsContent />)}
          {renderTab("import", <AdminImportContent />)}
          {renderTab("app-updates", <AdminAppUpdatesContent />)}
          {renderTab("system-health", <AdminSystemHealthContent />)}
          {renderTab("route-health", <AdminRouteHealthContent />)}
          {renderTab("glyph-qa", <AdminGlyphQaContent />)}
          {renderTab("ip-docs", <AdminIPDocsContent />)}
          {renderTab("harm-reduction", <AdminHarmReductionContent />)}
          {renderTab("safety-planner", <AdminSafetyPlannerContent />)}
          {renderTab("knowledge-graph", <AdminKnowledgeGraphContent />)}
          {renderTab("content-generator", <AdminContentGeneratorContent />)}
          {renderTab("references", <AdminReferencesContent />)}
          {renderTab("outreach", <AdminOutreachContent />)}
          {renderTab("demographics", <AdminDemographicsContent />)}
          {renderTab("language-analytics", <AdminLanguageAnalyticsContent />)}
          {renderTab("language-dictionary", <AdminLanguageDictionaryContent />)}
          {renderTab("clinic-settings", <AdminClinicSettingsContent />)}
          {renderTab("service-pathways", <AdminServicePathwaysContent />)}
          {renderTab("front-desk", <AdminFrontDeskContent userBranch={userBranch} />)}
          {renderTab("client-crm", <AdminCRMContent />)}
          {renderTab("youth-survey", <AdminYouthSurveyContent />)}
          {renderTab("virtual-stories", <AdminVirtualStoriesContent />)}
          {renderTab("conversion-insights", <AdminConversionInsightsContent />)}
          {renderTab("hr-report", <AdminHarmReductionReportContent />)}

          {/* Compliance */}
          {renderTab("pdpa-compliance", <AdminPdpaComplianceContent />)}
          {renderTab("anonymous-privacy", <AdminAnonymousPrivacyContent />)}


          {/* MEL */}
          {renderTab("mel-services", <MelServiceLedgerContent />)}
          {renderTab("mel-indicators", <MelIndicatorsContent />)}
          {renderTab("mel-outreach", <MelOutreachEventsContent />)}
          {renderTab("mel-training", <MelTrainingContent />)}
          {renderTab("mel-safe-spaces", <MelSafeSpacesContent />)}
          {renderTab("mel-partners", <MelPartnersContent />)}
          {renderTab("mel-policy", <MelPolicyContent />)}
          {renderTab("mel-evaluation", <MelEvaluationContent />)}
          {renderTab("mel-reporting", <MelReportingContent />)}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
