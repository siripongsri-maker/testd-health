import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/AdminLayout";
import { useLanguage } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, BarChart3, FileText, Loader2, LayoutDashboard, Bell, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Tab content components - lazy loaded
import { Suspense, lazy } from "react";

const AdminDashboardContent = lazy(() => import("@/components/admin/AdminDashboardContent"));
const AdminKitOrdersContent = lazy(() => import("@/components/admin/AdminKitOrdersContent"));
const AdminAnalyticsContent = lazy(() => import("@/components/admin/AdminAnalyticsContent"));
const AdminBlogContent = lazy(() => import("@/components/admin/AdminBlogContent"));
const AdminNotificationsContent = lazy(() => import("@/components/admin/AdminNotificationsContent"));
const AdminUsersContent = lazy(() => import("@/components/admin/AdminUsersContent").then(m => ({ default: m.AdminUsersContent })));

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
  const [loading, setLoading] = useState(true);

  // Get active tab from URL or default to "dashboard"
  const activeTab = searchParams.get("tab") || "dashboard";

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

      if (!roleData) {
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 py-3">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'ภาพรวม' : 'Dashboard'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'ผู้ใช้' : 'Users'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="kit-orders" className="flex items-center gap-2 py-3">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'ชุดตรวจ' : 'Orders'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 py-3">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'แจ้งเตือน' : 'Notify'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'สถิติ' : 'Stats'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">
                {language === 'th' ? 'บทความ' : 'Blog'}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminDashboardContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="users" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminUsersContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="kit-orders" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminKitOrdersContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminNotificationsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminAnalyticsContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="blog" className="mt-0">
            <Suspense fallback={<TabLoader />}>
              <AdminBlogContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
