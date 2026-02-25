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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MenuItemDef {
  tab: string;
  icon: React.ElementType;
  labelTh: string;
  labelEn: string;
}

interface MenuGroup {
  labelTh: string;
  labelEn: string;
  items: MenuItemDef[];
}

const menuGroups: MenuGroup[] = [
  {
    labelTh: "หลัก",
    labelEn: "Main",
    items: [
      { tab: "dashboard", icon: LayoutDashboard, labelTh: "ภาพรวม", labelEn: "Dashboard" },
    ],
  },
  {
    labelTh: "ผู้ใช้งาน",
    labelEn: "People",
    items: [
      { tab: "users", icon: Users, labelTh: "ผู้ใช้", labelEn: "Users" },
      { tab: "branch-staff", icon: Building2, labelTh: "สาขา", labelEn: "Branch Staff" },
      { tab: "quick-register", icon: UserPlus, labelTh: "ลงทะเบียน", labelEn: "Quick Register" },
    ],
  },
  {
    labelTh: "นัดหมาย",
    labelEn: "Appointments",
    items: [
      { tab: "bookings", icon: CalendarDays, labelTh: "นัดหมาย", labelEn: "Bookings" },
      { tab: "today", icon: Clipboard, labelTh: "วันนี้", labelEn: "Today" },
      { tab: "schedule", icon: Clock, labelTh: "ตารางเวลา", labelEn: "Schedule" },
    ],
  },
  {
    labelTh: "เนื้อหา",
    labelEn: "Content",
    items: [
      { tab: "blog", icon: FileText, labelTh: "บทความ", labelEn: "Blog" },
      { tab: "surveys", icon: ClipboardList, labelTh: "แบบสำรวจ", labelEn: "Surveys" },
    ],
  },
  {
    labelTh: "ระบบ",
    labelEn: "Operations",
    items: [
      { tab: "kit-orders", icon: Package, labelTh: "ชุดตรวจ", labelEn: "Kit Orders" },
      { tab: "notifications", icon: Bell, labelTh: "แจ้งเตือน", labelEn: "Notifications" },
      { tab: "analytics", icon: BarChart3, labelTh: "สถิติ", labelEn: "Analytics" },
      { tab: "import", icon: FileUp, labelTh: "นำเข้า", labelEn: "Import" },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(language === "th" ? "ออกจากระบบแล้ว" : "Logged out");
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
                {language === "th" ? "ผู้ดูแลระบบ" : "Admin Panel"}
              </h2>
              <p className="text-xs text-sidebar-foreground/60">
                {language === "th" ? "จัดการระบบ" : "Manage system"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => {
          const groupHasActive = group.items.some((i) => i.tab === activeTab);

          return collapsed ? (
            // In collapsed mode, show flat icons without groups
            <SidebarGroup key={group.labelEn}>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.tab}>
                      <SidebarMenuButton
                        tooltip={language === "th" ? item.labelTh : item.labelEn}
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
              key={group.labelEn}
              defaultOpen={groupHasActive || group.labelEn === "Main"}
              className="group/collapsible"
            >
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
                    <span>{language === "th" ? group.labelTh : group.labelEn}</span>
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
                            <span>{language === "th" ? item.labelTh : item.labelEn}</span>
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
                  tooltip={collapsed ? (language === "th" ? "หน้าหลัก" : "Home") : undefined}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span>{language === "th" ? "กลับหน้าหลัก" : "Back to App"}</span>
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
            <span>{language === "th" ? "ออกจากระบบ" : "Logout"}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
