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
  ChevronDown, Languages, ShieldAlert, RefreshCw, Gift, Heart,
  MessageSquare, CreditCard, Wallet, Link2, UserCheck,
  Activity, Wrench, Monitor, FileDown, Target, Fingerprint, ListOrdered,
  Network, Sparkles, Globe,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAdminRole } from "@/hooks/useAdminRole";

interface MenuItemDef {
  tab: string;
  icon: LucideIcon;
  labelKey: string;
  /** Only visible to super admin */
  adminOnly?: boolean;
  /** Also visible to me_analyst */
  meAnalyst?: boolean;
}

interface MenuGroup {
  labelKey: string;
  items: MenuItemDef[];
}

const menuGroups: MenuGroup[] = [
  {
    labelKey: "admin.main",
    items: [
      { tab: "dashboard", icon: LayoutDashboard, labelKey: "admin.dashboard", meAnalyst: true },
    ],
  },
  {
    labelKey: "admin.operations",
    items: [
      { tab: "kit-orders", icon: Package, labelKey: "admin.kitOrders", meAnalyst: true },
      { tab: "bookings", icon: CalendarDays, labelKey: "admin.bookings", meAnalyst: true },
      { tab: "today", icon: Clipboard, labelKey: "admin.today" },
      { tab: "schedule", icon: Clock, labelKey: "admin.schedule" },
      { tab: "queue-board", icon: ListOrdered, labelKey: "admin.queueBoard" },
    ],
  },
  {
    labelKey: "admin.partnerNetwork",
    items: [
      { tab: "partner-invites", icon: Heart, labelKey: "admin.partnerInvites", adminOnly: true, meAnalyst: true },
      { tab: "pair-sessions", icon: Link2, labelKey: "admin.pairSessions", adminOnly: true, meAnalyst: true },
      { tab: "anonymous-responses", icon: UserCheck, labelKey: "admin.anonymousResponses", adminOnly: true, meAnalyst: true },
    ],
  },
  {
    labelKey: "admin.smsCredits",
    items: [
      { tab: "sms-relay", icon: MessageSquare, labelKey: "admin.smsRelay", adminOnly: true, meAnalyst: true },
      { tab: "credit-balances", icon: Wallet, labelKey: "admin.creditBalances", adminOnly: true, meAnalyst: true },
      { tab: "credit-purchases", icon: CreditCard, labelKey: "admin.creditPurchases", adminOnly: true, meAnalyst: true },
    ],
  },
  {
    labelKey: "admin.people",
    items: [
      { tab: "users", icon: Users, labelKey: "admin.users", adminOnly: true },
      { tab: "branch-staff", icon: Building2, labelKey: "admin.branchStaff", adminOnly: true },
      { tab: "quick-register", icon: UserPlus, labelKey: "admin.quickRegister" },
      { tab: "abuse-logs", icon: ShieldAlert, labelKey: "admin.abuseLogs", adminOnly: true },
    ],
  },
  {
    labelKey: "admin.content",
    items: [
      { tab: "blog", icon: FileText, labelKey: "admin.blog", adminOnly: true },
      { tab: "surveys", icon: ClipboardList, labelKey: "admin.surveys", adminOnly: true },
      { tab: "rewards", icon: Gift, labelKey: "admin.rewards", adminOnly: true },
      { tab: "milestones", icon: Target, labelKey: "admin.milestones", adminOnly: true },
      { tab: "notifications", icon: Bell, labelKey: "admin.notifications", adminOnly: true },
      { tab: "user-chats", icon: MessageSquare, labelKey: "admin.userChats", adminOnly: true },
      { tab: "translations", icon: Languages, labelKey: "admin.translations", adminOnly: true },
    ],
  },
  {
    labelKey: "admin.reports",
    items: [
      { tab: "analytics", icon: BarChart3, labelKey: "admin.analytics", adminOnly: true, meAnalyst: true },
      { tab: "analytics-overview", icon: BarChart3, labelKey: "admin.analyticsOverview", adminOnly: true, meAnalyst: true },
      { tab: "export-center", icon: FileDown, labelKey: "admin.exportCenter", adminOnly: true, meAnalyst: true },
      { tab: "activity-logs", icon: Activity, labelKey: "admin.activityLogs", adminOnly: true, meAnalyst: true },
    ],
  },
  {
    labelKey: "admin.harmReduction",
    items: [
      { tab: "harm-reduction", icon: Heart, labelKey: "admin.harmReductionDashboard", adminOnly: true, meAnalyst: true },
      { tab: "knowledge-graph", icon: Network, labelKey: "admin.knowledgeGraph", adminOnly: true },
      { tab: "content-generator", icon: Sparkles, labelKey: "admin.contentGenerator", adminOnly: true },
      { tab: "references", icon: BookOpen, labelKey: "admin.references", adminOnly: true },
      { tab: "outreach", icon: Globe, labelKey: "admin.outreach", adminOnly: true },
    ],
  },
  {
    labelKey: "admin.adminTools",
    items: [
      { tab: "diagnostics", icon: Wrench, labelKey: "admin.diagnostics", adminOnly: true },
      { tab: "import", icon: FileUp, labelKey: "admin.import", adminOnly: true },
      { tab: "app-updates", icon: RefreshCw, labelKey: "admin.appUpdates", adminOnly: true },
      { tab: "system-health", icon: Monitor, labelKey: "admin.systemHealth", adminOnly: true, meAnalyst: true },
      { tab: "ip-docs", icon: Fingerprint, labelKey: "admin.ipDocs", adminOnly: true },
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
  const { isAdmin, isMeAnalyst } = useAdminRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('admin.logout'));
    navigate("/");
  };

  const handleTabClick = (tab: string) => {
    setSearchParams({ tab });
  };

  const canSeeItem = (item: MenuItemDef) => {
    if (isAdmin) return true;
    if (isMeAnalyst && item.meAnalyst) return true;
    if (item.adminOnly) return false;
    return true; // moderator sees non-adminOnly items
  };

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(canSeeItem),
    }))
    .filter(group => group.items.length > 0);

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
              <h2 className="font-semibold text-sidebar-foreground text-sm">
                testD Console
              </h2>
              <p className="text-[10px] text-sidebar-foreground/60">
                {isMeAnalyst ? 'M&E Analytics' : 'Operations Dashboard'}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredGroups.map((group) => {
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
