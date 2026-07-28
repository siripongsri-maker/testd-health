import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Brain, Loader2, Pill, ShieldAlert, Eye, HeartPulse } from "lucide-react";

interface Props {
  clientId: string | null | undefined;
  tx: (th: string, en: string) => string;
}

interface HrContext {
  has_data: boolean;
  screening: {
    id: string;
    status: string | null;
    risk_level: string | null;
    recommendations: string[] | null;
    completed_at: string | null;
    created_at: string | null;
  } | null;
  mental_health: Record<string, unknown> | null;
  sexual_health: Record<string, unknown> | null;
  substance_use: Record<string, unknown> | null;
  harm_history: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  referrals: { id: string; referral_type: string; status: string; priority: string; risk_level: string | null; created_at: string }[];
  screening_count: number;
}

const riskTone = (level: string | null | undefined) =>
  level === "critical" || level === "high"
    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
    : level === "moderate"
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200";

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs text-foreground/90 space-y-0.5">{children}</div>
    </div>
  );
}

export default function ClientHrContextPanel({ clientId, tx }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ctx, setCtx] = useState<HrContext | null>(null);

  useEffect(() => {
    if (!revealed || !clientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const { data, error } = await supabase.rpc("get_client_hr_context", {
        _client_id: clientId,
        _reason: "pre_counselling_review",
      });
      if (cancelled) return;
      if (error) setError(error.message);
      else setCtx(data as unknown as HrContext);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [revealed, clientId]);

  if (!clientId) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
        <HeartPulse className="h-3.5 w-3.5" />
        {tx(
          "เคสไม่ระบุตัวตน — ไม่สามารถเชื่อมข้อมูล Harm Reduction ได้",
          "Anonymous case — harm reduction context cannot be linked",
        )}
      </div>
    );
  }

  if (!revealed) {
    return (
      <div className="rounded-md border border-teal-200 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/20 p-3 flex items-center justify-between gap-3">
        <div className="text-xs">
          <div className="font-semibold flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5 text-teal-600" />
            {tx("บริบท Harm Reduction", "Harm reduction context")}
          </div>
          <p className="text-muted-foreground mt-0.5">
            {tx(
              "ข้อมูลอ่อนไหว — การเปิดดูจะถูกบันทึกลง audit log ตาม PDPA",
              "Sensitive data — every reveal is written to the PDPA audit log",
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setRevealed(true)}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          {tx("เปิดดู", "Reveal")}
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-md border p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {tx("กำลังโหลดข้อมูล…", "Loading…")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-3 text-xs text-rose-700 dark:text-rose-300">
        {tx("ไม่สามารถเข้าถึงข้อมูลนี้ได้", "Not authorized or failed to load")}: {error}
      </div>
    );
  }

  if (!ctx?.has_data) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {tx("ผู้รับบริการยังไม่เคยทำแบบคัดกรอง Harm Reduction", "This client has no harm reduction screening yet")}
      </div>
    );
  }

  const mh = ctx.mental_health as Record<string, number | string | null> | null;
  const sh = ctx.sexual_health as Record<string, string | boolean | null> | null;
  const su = ctx.substance_use as Record<string, unknown> | null;
  const hh = ctx.harm_history as Record<string, boolean | null> | null;
  const harmFlags = hh
    ? (["overdose", "panic", "blackout", "crash", "injury"] as const).filter((k) => hh[k])
    : [];

  return (
    <div className="rounded-md border border-teal-200 dark:border-teal-800 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <HeartPulse className="h-4 w-4 text-teal-600" />
        <span className="text-xs font-bold">{tx("บริบท Harm Reduction", "Harm reduction context")}</span>
        <Badge className={`text-[10px] ${riskTone(ctx.screening?.risk_level)}`}>
          {tx("ความเสี่ยง", "Risk")}: {ctx.screening?.risk_level || "—"}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {tx("คัดกรองทั้งหมด", "Screenings")}: {ctx.screening_count}
        </Badge>
        {ctx.screening?.completed_at && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(ctx.screening.completed_at).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Row icon={<Brain className="h-3 w-3" />} label={tx("สุขภาพจิต (PHQ-4)", "Mental health (PHQ-4)")}>
          {mh ? (
            <>
              <div>{tx("วิตกกังวล", "Anxiety")}: {String(mh.anxiety_level ?? "—")}</div>
              <div>{tx("ซึมเศร้า", "Depression")}: {String(mh.depression_level ?? "—")}</div>
              <div>{tx("เหงา", "Loneliness")}: {String(mh.loneliness_level ?? "—")}</div>
              <div>{tx("การนอน", "Sleep")}: {String(mh.sleep_issues_level ?? "—")}</div>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>

        <Row icon={<Pill className="h-3 w-3" />} label={tx("การใช้สาร", "Substance use")}>
          {su ? (
            <>
              <div className="break-words">
                {Array.isArray(su.substances) && (su.substances as string[]).length
                  ? (su.substances as string[]).join(", ")
                  : tx("ไม่ระบุ", "Not specified")}
              </div>
              <div>{tx("ความถี่", "Frequency")}: {String(su.frequency ?? "—")}</div>
              <div className="flex gap-1 flex-wrap pt-0.5">
                {su.mixing ? <Badge variant="outline" className="text-[9px]">{tx("ผสมสาร", "Mixing")}</Badge> : null}
                {su.injection_use ? <Badge variant="outline" className="text-[9px]">{tx("ฉีด", "Injecting")}</Badge> : null}
                {su.slam_use ? <Badge variant="outline" className="text-[9px]">Slam</Badge> : null}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>

        <Row icon={<Activity className="h-3 w-3" />} label={tx("สุขภาพทางเพศ", "Sexual health")}>
          {sh ? (
            <>
              <div>{tx("ถุงยาง", "Condom")}: {String(sh.condom_use ?? "—")}</div>
              <div>PrEP: {String(sh.prep_use ?? "—")}</div>
              <div>{tx("ตรวจ HIV ล่าสุด", "Last HIV test")}: {String(sh.last_hiv_test ?? "—")}</div>
              <div>{tx("ประวัติ STI", "STI history")}: {sh.sti_history ? tx("มี", "Yes") : tx("ไม่มี", "No")}</div>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Row>

        <Row icon={<ShieldAlert className="h-3 w-3" />} label={tx("เหตุการณ์อันตราย", "Harm events")}>
          {harmFlags.length ? (
            <div className="flex gap-1 flex-wrap">
              {harmFlags.map((f) => (
                <Badge key={f} className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                  {f}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">{tx("ไม่มีรายงาน", "None reported")}</span>
          )}
        </Row>
      </div>

      {!!ctx.screening?.recommendations?.length && (
        <div className="text-xs">
          <span className="font-semibold">{tx("คำแนะนำจากระบบ", "System recommendations")}: </span>
          <span className="text-muted-foreground">{ctx.screening.recommendations.join(" · ")}</span>
        </div>
      )}

      {!!ctx.referrals?.length && (
        <div className="text-xs">
          <span className="font-semibold">{tx("คำขอปรึกษาที่เชื่อมโยง", "Linked support requests")}: </span>
          <span className="text-muted-foreground">
            {ctx.referrals.slice(0, 3).map((r) => `${r.referral_type} (${r.status})`).join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}
