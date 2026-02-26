import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Tab content components - lazy loaded
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

const TabLoader = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [userBranch, setUserBranch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get active tab from URL or default based on role
  const getDefaultTab = () => {
    if (isAdmin) return "dashboard";
    if (isModerator) return "kit-orders";
    return "dashboard";
  };

  const activeTab = searchParams.get("tab") || getDefaultTab();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  useEffect(() => {
    const checkAdmin = async () => {
      // Wait for auth to be determined - don't redirect immediately
      if (authLoading) {
        return;
      }

      if (!user) {
        navigate('/auth', { state: { from: '/admin' } });
        return;
      }

      // Check if user has admin role
      const { data: roleData } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin',
      });

      if (roleData) {
        setIsAdmin(true);
        setLoading(false);
      } else {
        // Check if user is a moderator (branch staff)
        const { data: modData } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator',
        });

        if (modData) {
          setIsModerator(true);
          
          // Get user's branch
          const { data: branchData } = await supabase
            .from('staff_branch_assignments')
            .select('branch')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (branchData) {
            setUserBranch(branchData.branch);
          }
          setLoading(false);
        } else {
          navigate('/dashboard');
          return;
        }
      }
    };

    checkAdmin();
  }, [user, authLoading, navigate]);

  // Set default tab for moderators after loading
  useEffect(() => {
    if (!loading && isModerator && !isAdmin && !searchParams.get("tab")) {
      setSearchParams({ tab: "kit-orders" });
    }
  }, [loading, isModerator, isAdmin, searchParams, setSearchParams]);

  if (loading || authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin && !isModerator) {
    return null;
  }

  // Define which tabs are visible based on role
  const canAccessTab = (tab: string) => {
    if (isAdmin) return true;
    // Moderators can access dashboard, kit-orders, quick-register, bookings, and today tabs
    return tab === "dashboard" || tab === "kit-orders" || tab === "quick-register" || tab === "bookings" || tab === "today" || tab === "schedule";
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        {/* Branch indicator for moderators */}
        {isModerator && !isAdmin && userBranch && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">
              {language === 'th' ? `สาขา: ${
                userBranch === 'silom' ? 'SWING สีลม' :
                userBranch === 'pattaya' ? 'SWING พัทยา' :
                userBranch === 'saphankwai' ? 'SWING สะพานควาย' :
                userBranch === 'petchakasem' ? 'SWING เพชรเกษม' : userBranch
              }` : `Branch: ${
                userBranch === 'silom' ? 'SWING Silom' :
                userBranch === 'pattaya' ? 'SWING Pattaya' :
                userBranch === 'saphankwai' ? 'SWING Saphan Kwai' :
                userBranch === 'petchakasem' ? 'SWING Phetkasem' : userBranch
              }`}
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">

          {canAccessTab("dashboard") && (
            <TabsContent value="dashboard" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                {isAdmin ? (
                  <AdminDashboardContent />
                ) : (
                  <BranchDashboardContent userBranch={userBranch} />
                )}
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("users") && (
            <TabsContent value="users" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminUsersContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("branch-staff") && (
            <TabsContent value="branch-staff" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminBranchStaffContent />
              </Suspense>
            </TabsContent>
          )}

          <TabsContent value="kit-orders" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminKitOrdersContent userBranch={userBranch} isModerator={isModerator && !isAdmin} />
            </Suspense>
          </TabsContent>

          {canAccessTab("quick-register") && (
            <TabsContent value="quick-register" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminQuickRegister userBranch={userBranch} />
              </Suspense>
            </TabsContent>
          )}


          {canAccessTab("notifications") && (
            <TabsContent value="notifications" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminNotificationsContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("analytics") && (
            <TabsContent value="analytics" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminAnalyticsContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("blog") && (
            <TabsContent value="blog" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminBlogContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("surveys") && (
            <TabsContent value="surveys" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminSurveysContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("import") && (
            <TabsContent value="import" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminImportContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("bookings") && (
            <TabsContent value="bookings" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminBookingContent userBranch={userBranch} />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("today") && (
            <TabsContent value="today" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminTodayBoard userBranch={userBranch} />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("schedule") && (
            <TabsContent value="schedule" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminScheduleContent />
              </Suspense>
            </TabsContent>
          )}

          {canAccessTab("translations") && (
            <TabsContent value="translations" className="mt-0">
              <Suspense fallback={<TabLoader />}>
                <AdminTranslationsContent />
              </Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
