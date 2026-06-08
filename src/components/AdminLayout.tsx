import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useLanguage } from "@/lib/i18n";
import { Shield } from "lucide-react";
import { useStaffGovernance } from "@/hooks/useStaffGovernance";
import { SessionTimeoutDialog } from "@/components/pdpa/SessionTimeoutDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBrowserSecurity } from "@/hooks/useBrowserSecurity";
import { RouteHealthBanner } from "@/components/admin/RouteHealthBanner";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isTimedOut, isStaff } = useStaffGovernance();
  useBrowserSecurity();

  const handleReLogin = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { state: { from: '/admin' } });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sticky top-0 z-10">
            <SidebarTrigger className="shrink-0" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm text-muted-foreground">
                {t('admin.mode')}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>

      {/* Staff session timeout */}
      {isStaff && <SessionTimeoutDialog open={isTimedOut} onReLogin={handleReLogin} />}
    </SidebarProvider>
  );
}
