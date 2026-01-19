import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/lib/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  Shield, 
  Package, 
  BarChart3, 
  FileText, 
  Home,
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const adminNavItems = [
  { 
    title: { en: "Dashboard", th: "แดชบอร์ด" }, 
    url: "/admin", 
    icon: Shield,
    exact: true
  },
  { 
    title: { en: "Kit Orders", th: "จัดการออร์เดอร์" }, 
    url: "/admin/kit-orders", 
    icon: Package 
  },
  { 
    title: { en: "Analytics", th: "วิเคราะห์ข้อมูล" }, 
    url: "/admin/analytics", 
    icon: BarChart3 
  },
  { 
    title: { en: "Blog", th: "จัดการบทความ" }, 
    url: "/admin/blog", 
    icon: FileText 
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const currentPath = location.pathname;

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

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
          <SidebarGroupLabel>
            {language === 'th' ? 'เมนูหลัก' : 'Main Menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url, item.exact)}
                    tooltip={collapsed ? item.title[language as 'en' | 'th'] : undefined}
                  >
                    <NavLink 
                      to={item.url} 
                      end={item.exact}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <span>{item.title[language as 'en' | 'th']}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            {language === 'th' ? 'ลัด' : 'Quick Links'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
                      <span>{language === 'th' ? 'หน้าหลัก' : 'Back to App'}</span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  tooltip={collapsed ? (language === 'th' ? 'ตั้งค่า' : 'Settings') : undefined}
                >
                  <NavLink 
                    to="/settings" 
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span>{language === 'th' ? 'ตั้งค่า' : 'Settings'}</span>
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
