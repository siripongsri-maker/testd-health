import { useLanguage } from "@/lib/i18n";
import { useSearchParams } from "react-router-dom";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Shield, Home, LogOut, LayoutDashboard, Clock, Package,
  CalendarDays, Clipboard, Users, Building2, UserPlus,
  Bell, BarChart3, FileText, ClipboardList, FileUp,
  ChevronDown, Languages, ShieldAlert, RefreshCw, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MenuItemDef {
  tab: string;
  icon: React.ElementType;
  labelKey: string;
}

interface MenuGroup {
  labelKey: string;
  items: MenuItemDef[];
}

const menuGroups: MenuGroup[] = [
  {
    labelKey: "admin.main",
    items: [
      { tab: "dashboard", icon: LayoutDashboard, labelKey: "admin.dashboard" },
    ],
  },
  {
    labelKey: "admin.people",
    items: [
      { tab: "users", icon: Users, labelKey: "admin.users" },
      { tab: "branch-staff", icon: Building2, labelKey: "admin.branchStaff" },
      { tab: "quick-register", icon: UserPlus, labelKey: "admin.quickRegister" },
    ],
  },
  {
    labelKey: "admin.appointments",
    items: [
      { tab: "bookings", icon: CalendarDays, labelKey: "admin.bookings" },
      { tab: "today", icon: Clipboard, labelKey: "admin.today" },
      { tab: "schedule", icon: Clock, labelKey: "admin.schedule" },
      { tab: "abuse-logs", icon: ShieldAlert, labelKey: "admin.abuseLogs" },
    ],
  },
  {
    labelKey: "admin.content",
    items: [
      { tab: "blog", icon: FileText, labelKey: "admin.blog" },
      { tab: "surveys", icon: ClipboardList, labelKey: "admin.surveys" },
    ],
  },
  {
    labelKey: "admin.operations",
    items: [
      { tab: "kit-orders", icon: Package, labelKey: "admin.kitOrders" },
      { tab: "notifications", icon: Bell, labelKey: "admin.notifications" },
      { tab: "analytics", icon: BarChart3, labelKey: "admin.analytics" },
      { tab: "import", icon: FileUp, labelKey: "admin.import" },
      { tab: "translations", icon: Languages, labelKey: "admin.translations" },
    ],
  },
  {
    labelKey: "admin.settings",
    items: [
      { tab: "app-updates", icon: RefreshCw, labelKey: "admin.appUpdates" },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('admin.logout'));
    navigate("/");
  };

  const handleTabClick = (tab: string) => {
    setSearchParams({ tab });
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
                {t('admin.panel')}
              </h2>
              <p className="text-xs text-sidebar-foreground/60">
                {t('admin.manageSystem')}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const groupHasActive = group.items.some((i) => i.tab === activeTab);

          return collapsed ? (
            <SidebarGroup key={group.labelKey}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.tab}>
                      <SidebarMenuButton
                        tooltip={t(item.labelKey)}
                        onClick={() => handleTabClick(item.tab)}
                        isActive={activeTab === item.tab}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <Collapsible
              key={group.labelKey}
              defaultOpen={groupHasActive || group.labelKey === "admin.main"}
              className="group/collapsible"
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                    <span>{t(group.labelKey)}</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.tab}>
                          <SidebarMenuButton
                            onClick={() => handleTabClick(item.tab)}
                            isActive={activeTab === item.tab}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span>{t(item.labelKey)}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        {/* Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/")}
                  tooltip={collapsed ? t('admin.backToApp') : undefined}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span>{t('admin.backToApp')}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span>{t('admin.logout')}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
