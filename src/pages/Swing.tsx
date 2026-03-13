import { useState, useEffect } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useAnalytics";
import swingLogo from "@/assets/swing-logo.png";
import {
  CalendarDays, Phone, MessageCircle, ChevronRight, Loader2,
  Shield, Heart, Clock, MapPin, TestTube, Pill, Stethoscope,
  Brain, HeartHandshake, Package, Syringe, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string | null;
  description_en: string | null;
  icon: string;
  display_order: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  TestTube, Pill, Shield, Brain, HeartHandshake, Package, Stethoscope, Syringe, RefreshCw,
  "test-tube": TestTube,
  "pill": Pill,
  "shield": Shield,
  "brain": Brain,
  "heart-handshake": HeartHandshake,
  "package": Package,
  "stethoscope": Stethoscope,
  "syringe": Syringe,
  "refresh-cw": RefreshCw,
};

const CATEGORY_COLORS: Record<string, string> = {
  "hiv-testing": "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  "syphilis-testing": "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  "sti-screening": "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  "prep-daily": "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  "prep-on-demand": "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  "pep": "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400",
  "hepc-testing": "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  "harm-reduction-counseling": "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400",
  "mental-health-support": "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  "self-test-support": "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400",
  "followup-consultation": "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
};

function getIconComponent(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || TestTube;
}

function getColorClass(slug: string): string {
  return CATEGORY_COLORS[slug] || "bg-primary/10 text-primary";
}

export default function Swing() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isEn = language === "en";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("booking_services")
        .select("id, slug, name_th, name_en, description_th, description_en, icon, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (data) setServices(data as Service[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleServiceClick = (slug: string) => {
    trackEvent("clinic_service_selected", { service: slug, source: "clinic_page" });
    if (slug === "self-test-support") {
      navigate("/hiv-selftest");
    } else {
      navigate(`/booking?service=${slug}`);
    }
  };

  const handleCallback = () => {
    trackEvent("clinic_callback_requested", { source: "clinic_page" });
    navigate("/support-chat");
  };

  const loc = (th: string | null | undefined, en: string | null | undefined) =>
    isEn ? (en || th || "") : (th || en || "");

  // Featured services: first 4 by display order
  const featured = services.slice(0, 4);
  const remaining = services.slice(4);

  if (loading) {
    return (
      <>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageContainer>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <PageContainer>
        <div className="max-w-lg mx-auto space-y-6">
          {/* Hero */}
          <div className="text-center space-y-3">
            <img src={swingLogo} alt="SWING Clinic" className="h-14 mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">SWING Clinic</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isEn
                ? "Friendly, non-judgmental health services for everyone. Your privacy and safety come first."
                : "บริการสุขภาพที่เป็นมิตรและไม่ตัดสิน สำหรับทุกคน ความเป็นส่วนตัวและความปลอดภัยของคุณสำคัญที่สุด"}
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => navigate("/booking")}
              className="h-auto flex-col gap-1.5 py-3 rounded-2xl"
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-medium">{isEn ? "Book" : "จองบริการ"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleCallback}
              className="h-auto flex-col gap-1.5 py-3 rounded-2xl"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs font-medium">{isEn ? "Chat" : "แชท"}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("tel:+6626329501")}
              className="h-auto flex-col gap-1.5 py-3 rounded-2xl"
            >
              <Phone className="h-5 w-5" />
              <span className="text-xs font-medium">{isEn ? "Call" : "โทร"}</span>
            </Button>
          </div>

          {/* Trust banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                {isEn
                  ? "All services are confidential, non-judgmental, and LGBTQ+ friendly."
                  : "ทุกบริการเป็นความลับ ไม่ตัดสิน และเป็นมิตรกับ LGBTQ+"}
              </div>
            </CardContent>
          </Card>

          {/* Featured services */}
          {featured.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                {isEn ? "Popular Services" : "บริการยอดนิยม"}
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {featured.map((svc) => {
                  const Icon = getIconComponent(svc.icon);
                  const colorClass = getColorClass(svc.slug);
                  return (
                    <Card
                      key={svc.id}
                      className="cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-primary/30 active:scale-[0.98]"
                      onClick={() => handleServiceClick(svc.slug)}
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colorClass)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground leading-tight">
                            {loc(svc.name_th, svc.name_en)}
                          </h3>
                          {(svc.description_th || svc.description_en) && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {loc(svc.description_th, svc.description_en)}
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                            {isEn ? "Book" : "จอง"}
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* All services */}
          {remaining.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                {isEn ? "All Services" : "บริการทั้งหมด"}
              </h2>
              <div className="space-y-2">
                {remaining.map((svc) => {
                  const Icon = getIconComponent(svc.icon);
                  const colorClass = getColorClass(svc.slug);
                  return (
                    <Card
                      key={svc.id}
                      className="cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-primary/30 active:scale-[0.98]"
                      onClick={() => handleServiceClick(svc.slug)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", colorClass)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">
                            {loc(svc.name_th, svc.name_en)}
                          </h3>
                          {(svc.description_th || svc.description_en) && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {loc(svc.description_th, svc.description_en)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {services.length === 0 && !loading && (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                {isEn ? "Services are being updated. Please check back soon." : "กำลังอัปเดตบริการ กรุณากลับมาใหม่ในเร็วๆ นี้"}
              </CardContent>
            </Card>
          )}

          {/* Contact & Info */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">
              {isEn ? "Contact & Hours" : "ติดต่อและเวลาทำการ"}
            </h2>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground font-medium">
                    {isEn ? "+66 2 632 9501" : "02 632 9501"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {isEn ? "Mon–Fri 10:00–18:00" : "จ–ศ 10:00–18:00"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {isEn ? "Multiple branches in Bangkok" : "หลายสาขาในกรุงเทพฯ"}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{isEn ? "Everyone is welcome" : "ทุกคนยินดีต้อนรับ"}</p>
                    <p>{isEn ? "LGBTQ+ friendly • Confidential" : "เป็นมิตรกับ LGBTQ+ • เป็นความลับ"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <Button
            onClick={() => navigate("/booking")}
            className="w-full rounded-2xl h-12 text-base gap-2"
          >
            <CalendarDays className="h-5 w-5" />
            {isEn ? "Book a Visit" : "จองนัดหมาย"}
          </Button>
        </div>
      </PageContainer>
      <BottomNav />
    </>
  );
}
