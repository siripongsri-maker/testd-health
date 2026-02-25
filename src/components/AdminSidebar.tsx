import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/lib/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Shield, Home, LogOut, LayoutDashboard, Clock, Package, CalendarDays, Clipboard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { language } = useLanguage();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(language === 'th' ? 'ออกจากระบบแล้ว' : 'Logged out');
    navigate('/');
  };

  return (
    <Sidebar 
      className={collapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sidebar-foreground">
                {language === 'th' ? 'ผู้ดูแลระบบ' : 'Admin Panel'}
              </h2>
              <p className="text-xs text-sidebar-foreground/60">
                {language === 'th' ? 'จัดการระบบ' : 'Manage system'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { to: '/admin?tab=dashboard', icon: LayoutDashboard, labelTh: 'ภาพรวม', labelEn: 'Dashboard' },
                { to: '/admin?tab=schedule', icon: Clock, labelTh: 'เวลาทำการ & ปิดรับนัด', labelEn: 'Schedule & Blackout' },
                { to: '/admin?tab=bookings', icon: CalendarDays, labelTh: 'นัดหมาย', labelEn: 'Bookings' },
                { to: '/admin?tab=today', icon: Clipboard, labelTh: 'วันนี้', labelEn: 'Today' },
                { to: '/admin?tab=kit-orders', icon: Package, labelTh: 'ชุดตรวจ', labelEn: 'Orders' },
                { to: '/admin?tab=users', icon: Users, labelTh: 'ผู้ใช้', labelEn: 'Users' },
              ].map(item => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={collapsed ? (language === 'th' ? item.labelTh : item.labelEn) : undefined}
                  >
                    <NavLink
                      to={item.to}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span>{language === 'th' ? item.labelTh : item.labelEn}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={collapsed ? (language === 'th' ? 'หน้าหลัก' : 'Home') : undefined}
                >
                  <NavLink
                    to="/"
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                  >
                    <Home className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span>{language === 'th' ? 'กลับหน้าหลัก' : 'Back to App'}</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button 
          variant="ghost" 
          className={`w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent ${collapsed ? 'px-2' : ''}`}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span>{language === 'th' ? 'ออกจากระบบ' : 'Logout'}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
