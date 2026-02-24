import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import testdLogo from "@/assets/testd-logo.png";
import {
  Home, Calendar, ClipboardList, BookOpen, Heart, MessageCircle,
  TestTube, Trophy, Settings, ShieldCheck, LogIn, LogOut, Menu,
  User, ChevronLeft, Package, Users, Building2, Bell, BarChart3,
  FileText, FileUp, UserPlus, CalendarDays,
} from "lucide-react";

interface NavItem {
  icon: React.ElementType;
  labelTh: string;
  labelEn: string;
  path: string;
}

const publicNav: NavItem[] = [
  { icon: Home, labelTh: "หน้าแรก", labelEn: "Home", path: "/" },
  { icon: TestTube, labelTh: "ขอชุดตรวจ", labelEn: "Self Test", path: "/hiv-selftest" },
  { icon: Calendar, labelTh: "จองนัดหมาย", labelEn: "Book Appointment", path: "/booking" },
  { icon: CalendarDays, labelTh: "นัดหมายของฉัน", labelEn: "My Appointments", path: "/my-appointments" },
  { icon: ClipboardList, labelTh: "แบบประเมิน", labelEn: "Surveys", path: "/surveys" },
  { icon: BookOpen, labelTh: "เรื่องน่ารู้", labelEn: "Learn", path: "/info" },
  { icon: MessageCircle, labelTh: "ขอคำปรึกษา", labelEn: "Counselor", path: "/community" },
  { icon: Heart, labelTh: "ดูแลตัวเอง", labelEn: "Self Care", path: "/self-care" },
  { icon: Trophy, labelTh: "ภารกิจ", labelEn: "Quests", path: "/quests" },
];

const adminNav: NavItem[] = [
  { icon: ShieldCheck, labelTh: "แดชบอร์ด", labelEn: "Dashboard", path: "/admin?tab=dashboard" },
  { icon: Package, labelTh: "ชุดตรวจ", labelEn: "Orders", path: "/admin?tab=kit-orders" },
  { icon: CalendarDays, labelTh: "นัดหมาย", labelEn: "Bookings", path: "/admin?tab=bookings" },
  { icon: Users, labelTh: "ผู้ใช้", labelEn: "Users", path: "/admin?tab=users" },
  { icon: Building2, labelTh: "สาขา", labelEn: "Branch", path: "/admin?tab=branch-staff" },
  { icon: Bell, labelTh: "แจ้งเตือน", labelEn: "Notify", path: "/admin?tab=notifications" },
  { icon: BarChart3, labelTh: "สถิติ", labelEn: "Stats", path: "/admin?tab=analytics" },
  { icon: FileText, labelTh: "บทความ", labelEn: "Blog", path: "/admin?tab=blog" },
  { icon: ClipboardList, labelTh: "แบบสำรวจ", labelEn: "Surveys", path: "/admin?tab=surveys" },
  { icon: UserPlus, labelTh: "ลงทะเบียน", labelEn: "Register", path: "/admin?tab=quick-register" },
  { icon: FileUp, labelTh: "นำเข้า", labelEn: "Import", path: "/admin?tab=import" },
];

const staffNav: NavItem[] = [
  { icon: Package, labelTh: "ชุดตรวจ", labelEn: "Orders", path: "/admin?tab=kit-orders" },
  { icon: CalendarDays, labelTh: "นัดหมาย", labelEn: "Bookings", path: "/admin?tab=bookings" },
  { icon: UserPlus, labelTh: "ลงทะเบียน", labelEn: "Register", path: "/admin?tab=quick-register" },
];

function isNavActive(item: NavItem, pathname: string, search: string) {
  if (item.path.includes("?")) {
    const [base, qs] = item.path.split("?");
    return pathname === base && search.includes(qs);
  }
  return pathname === item.path;
}

function SidebarNavItems({ items, language, pathname, search, onNavigate }: {
  items: NavItem[];
  language: string;
  pathname: string;
  search: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const active = isNavActive(item, pathname, search);
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              active
                ? "bg-primary/12 text-primary border-l-[3px] border-primary pl-[9px]"
                : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
            <span className={cn(active && "font-semibold text-[15px]")}>
              {language === "th" ? item.labelTh : item.labelEn}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppLayout({ children, hideNav }: AppLayoutProps) {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) { setIsAdmin(false); setIsModerator(false); return; }
      const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (admin) { setIsAdmin(true); return; }
      const { data: mod } = await supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" });
      if (mod) setIsModerator(true);
    };
    if (!authLoading) checkRoles();
  }, [user, authLoading]);

  const handleNav = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("testd-user-data");
    navigate("/auth");
    setSheetOpen(false);
  };

  const roleItems = isAdmin ? adminNav : isModerator ? staffNav : [];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-2 border-b border-border/40">
        <img src={testdLogo} alt="testD" className="h-10 w-auto" />
      </div>

      {/* Main nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {language === "th" ? "เมนูหลัก" : "Main Menu"}
          </p>
          <SidebarNavItems
            items={publicNav}
            language={language}
            pathname={location.pathname}
            search={location.search}
            onNavigate={handleNav}
          />
        </div>

        {roleItems.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {language === "th" ? "ผู้ดูแลระบบ" : "Admin"}
            </p>
            <SidebarNavItems
              items={roleItems}
              language={language}
              pathname={location.pathname}
              search={location.search}
              onNavigate={handleNav}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-3 py-4 space-y-2">
        <div className="px-3">
          <LanguageToggle />
        </div>
        {user ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {language === "th" ? "ออกจากระบบ" : "Log out"}
          </button>
        ) : (
          <button
            onClick={() => handleNav("/auth")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <LogIn className="h-[18px] w-[18px]" />
            {language === "th" ? "เข้าสู่ระบบ" : "Log in"}
          </button>
        )}
        <p className="text-[10px] text-muted-foreground/50 text-center">testD v2.0</p>
      </div>
    </div>
  );

  if (hideNav) {
    return <>{children}</>;
  }

  // --- Desktop: fixed sidebar + content ---
  if (!isMobile) {
    return (
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <aside className="fixed top-0 left-0 bottom-0 w-[270px] z-30 bg-background/70 backdrop-blur-2xl border-r border-border/30 shadow-glass">
          {sidebarContent}
        </aside>

        {/* Main area */}
        <div className="flex-1 ml-[270px] min-h-screen">
          {/* Minimal top bar */}
          <header className="sticky top-0 z-20 h-12 flex items-center justify-end gap-2 px-4 bg-background/60 backdrop-blur-xl border-b border-border/20">
            <NotificationBell />
            <LanguageToggle />
            {user ? (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
                <User className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
                <LogIn className="h-4 w-4 mr-1" />
                {language === "th" ? "เข้าสู่ระบบ" : "Log in"}
              </Button>
            )}
          </header>

          <main className="relative">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // --- Mobile: top bar + sheet ---
  return (
    <div className="min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-3 bg-background/60 backdrop-blur-xl border-b border-border/20 safe-top">
        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <img src={testdLogo} alt="testD" className="h-7 w-auto" />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LanguageToggle />
          {user ? (
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => navigate("/settings")}>
              <User className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-full text-xs px-2 h-8" onClick={() => navigate("/auth")}>
              <LogIn className="h-3.5 w-3.5 mr-1" />
              {language === "th" ? "เข้า" : "Login"}
            </Button>
          )}
        </div>
      </header>

      <main className="relative">
        {children}
      </main>
    </div>
  );
}
