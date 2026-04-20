import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { fetchUicVisitStats, getClientSeedId, type UicVisitStats } from "@/lib/clientSeed";
import { RotateCw, Sparkles, Calendar, Eye, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Stats provided after UIC lookup. If null, component will fetch seed-only stats. */
  uicStats?: UicVisitStats | null;
  uicValue?: string;
  className?: string;
}

/**
 * Top-of-page status banner showing whether this is a returning client.
 * Priority: UIC stats (if 13-digit + matched) > seed-only stats (anonymous device history).
 */
export function VisitStatusBanner({ uicStats, uicValue, className }: Props) {
  const { language } = useLanguage();
  const [seedStats, setSeedStats] = useState<UicVisitStats | null>(null);

  // Fetch seed-only stats on mount (anonymous device history)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seed = getClientSeedId();
      const result = await fetchUicVisitStats(null, seed);
      if (!cancelled) setSeedStats(result);
    })();
    return () => { cancelled = true; };
  }, []);

  // Prefer UIC stats when available (more authoritative)
  const stats = uicStats ?? seedStats;
  const source: 'uic' | 'seed' | 'none' = uicStats ? 'uic' : seedStats ? 'seed' : 'none';

  if (!stats) return null;

  const isReturning = stats.is_repeat || stats.visit_count > 0 || stats.assessment_count > 0;
  const visitNumber = stats.visit_count + 1;
  const assessmentNumber = stats.assessment_count + 1;

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return null; }
  };

  if (!isReturning) {
    // New user — subtle welcome banner
    return (
      <div className={cn(
        "rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 flex items-center gap-3",
        className
      )}>
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">
            ⭐ {language === 'th' ? 'ผู้ใช้ใหม่ — Visit ครั้งแรก' : 'New visitor — First visit'}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {language === 'th'
              ? 'ยินดีต้อนรับ! กรุณากรอกแบบประเมินเพื่อช่วยให้บริการของเราดียิ่งขึ้น'
              : 'Welcome! Please complete the form to help us improve our services.'}
          </div>
        </div>
      </div>
    );
  }

  // Returning client — prominent banner
  const lastDate = formatDate(stats.last_assessment_at);

  return (
    <div className={cn(
      "rounded-2xl border-2 border-warning/40 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent p-4 shadow-sm",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
          <RotateCw className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
              🔁 {language === 'th' ? 'กลับมารับบริการอีกครั้ง' : 'Returning client'}
              <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-semibold">
                {language === 'th' ? `Visit ครั้งที่ ${visitNumber}` : `Visit #${visitNumber}`}
              </span>
            </div>
            {source === 'seed' && !uicValue && (
              <div className="text-[11px] text-muted-foreground mt-1">
                {language === 'th'
                  ? 'พบจากอุปกรณ์นี้ — กรอก UIC เพื่อดูประวัติเต็ม'
                  : 'Detected from this device — enter UIC to see full history'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-foreground/80">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {language === 'th'
                  ? `เคย visit ${stats.visit_count} ครั้ง`
                  : `${stats.visit_count} prior visit${stats.visit_count !== 1 ? 's' : ''}`}
              </span>
            </div>
            {stats.assessment_count > 0 && (
              <div className="flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {language === 'th'
                    ? `ทำ assessment ${stats.assessment_count} ครั้ง (รอบนี้ครั้งที่ ${assessmentNumber})`
                    : `${stats.assessment_count} prior assessment${stats.assessment_count !== 1 ? 's' : ''} (this is #${assessmentNumber})`}
                </span>
              </div>
            )}
            {lastDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {language === 'th' ? `ล่าสุด: ${lastDate}` : `Last: ${lastDate}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
