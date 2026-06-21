import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CalendarDays, CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { trackEvent } from "@/hooks/useAnalytics";

type ResolveState =
  | { status: "loading" }
  | { status: "ok"; request: { id: string; assigned_branch: string | null; self_reported_result: string | null; test_result: string | null; care_action: string | null } }
  | { status: "error"; reason: string };

const SWING_PHONE = "+66 2 632 9501";

export default function SelftestFollowup() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isTh = language === "th";
  const [state, setState] = useState<ResolveState>({ status: "loading" });

  useEffect(() => {
    const cleanToken = token.replace(/[^a-fA-F0-9]/g, "").slice(0, 96);
    if (cleanToken.length < 32) {
      setState({ status: "error", reason: "invalid" });
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("selftest-magic-resolve", {
          body: { token: cleanToken },
        });
        if (!active) return;
        if (error || !data?.request) {
          setState({ status: "error", reason: (data as any)?.error || "invalid" });
          trackEvent("selftest_followup_link_failed", { reason: (data as any)?.error || "invalid" });
          return;
        }
        setState({ status: "ok", request: data.request });
        trackEvent("selftest_followup_link_opened", { branch: data.request.assigned_branch || "unknown" });
      } catch (error) {
        if (!active) return;
        setState({ status: "error", reason: "server_error" });
        trackEvent("selftest_followup_link_failed", { reason: "server_error" });
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const result = state.status === "ok" ? state.request.self_reported_result || state.request.test_result : null;
  const bookingPath = useMemo(() => {
    const params = new URLSearchParams({ service: "hiv-testing", followup: "selftest" });
    if (state.status === "ok" && state.request.assigned_branch) params.set("branch", state.request.assigned_branch);
    return `/booking?${params.toString()}`;
  }, [state]);

  const copy = {
    title: isTh ? "ติดตามผลตรวจกับ SWING" : "Self-test follow-up with SWING",
    loading: isTh ? "กำลังตรวจสอบลิงก์..." : "Verifying your link...",
    okTitle: isTh ? "ทีม SWING พร้อมดูแลคุณต่อ" : "SWING is ready to support your next step",
    okBody: isTh
      ? "ลิงก์นี้ยืนยันเคสของคุณแบบปลอดภัยแล้ว เลือกนัดเข้าคลินิกฟรี หรือโทรหาเจ้าหน้าที่ได้ทันที"
      : "This secure link has matched your case. You can book a free clinic visit or call our team now.",
    invalidTitle: isTh ? "ลิงก์ไม่พร้อมใช้งาน" : "This link is not available",
    invalidBody: isTh
      ? "ลิงก์อาจหมดอายุหรือไม่ถูกต้อง กรุณาติดต่อมูลนิธิเพื่อนพนักงานบริการ (SWING) / testD เพื่อให้เจ้าหน้าที่ช่วยตรวจสอบ"
      : "The link may have expired or be invalid. Please contact SWING Foundation / testD so our team can help.",
    book: isTh ? "นัดคลินิก" : "Book clinic visit",
    call: isTh ? "โทรหา SWING" : "Call SWING",
    chat: isTh ? "แชทกับทีมงาน" : "Chat with our team",
    resultLabel: isTh ? "ผลที่ต้องติดตาม" : "Follow-up result",
    privacy: isTh ? "ไม่มีข้อมูลส่วนตัวอยู่ใน URL และไม่ต้องเข้าสู่ระบบแอดมิน" : "No personal details are exposed in the URL and no admin login is required.",
  };

  return (
    <PageContainer className="gradient-hero">
      <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center py-8">
        <Card className="w-full max-w-md border-border/60 bg-card/90 backdrop-blur-xl shadow-xl">
          <CardContent className="p-6 space-y-5 text-center">
            {state.status === "loading" && (
              <>
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
                <p className="text-sm text-muted-foreground">{copy.loading}</p>
              </>
            )}

            {state.status === "ok" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">{copy.okTitle}</h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">{copy.okBody}</p>
                </div>
                {result && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-muted-foreground">{copy.resultLabel}</span>
                    <Badge variant="secondary">{result}</Badge>
                  </div>
                )}
                <div className="grid gap-2">
                  <Button size="lg" className="gap-2" onClick={() => navigate(bookingPath)}>
                    <CalendarDays className="h-4 w-4" />
                    {copy.book}
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" asChild>
                    <a href="tel:+6626329501">
                      <Phone className="h-4 w-4" />
                      {copy.call} {SWING_PHONE}
                    </a>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">{copy.privacy}</p>
              </>
            )}

            {state.status === "error" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">{copy.invalidTitle}</h1>
                  <p className="text-sm leading-relaxed text-muted-foreground">{copy.invalidBody}</p>
                </div>
                <div className="grid gap-2">
                  <Button size="lg" className="gap-2" asChild>
                    <a href="tel:+6626329501">
                      <Phone className="h-4 w-4" />
                      {copy.call} {SWING_PHONE}
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/support-chat")}>
                    <MessageCircle className="h-4 w-4" />
                    {copy.chat}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}