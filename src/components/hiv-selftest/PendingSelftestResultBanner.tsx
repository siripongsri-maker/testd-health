import { Link } from "react-router-dom";
import { ClipboardCheck, ArrowRight, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePendingSelftestResult } from "@/hooks/usePendingSelftestResult";

interface Props {
  /** Optional override target. Defaults to the inline submission flow. */
  to?: string;
  className?: string;
}

function formatDateLocale(iso: string | undefined, language: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(language === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string | undefined, language: string) {
  if (!status) return null;
  if (language === "th") {
    switch (status) {
      case "shipped":
        return "จัดส่งแล้ว";
      case "delivered":
        return "ถึงมือคุณแล้ว";
      case "received":
        return "รับชุดตรวจแล้ว";
      case "approved":
        return "อนุมัติแล้ว";
      default:
        return status;
    }
  }
  switch (status) {
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "received":
      return "Received";
    case "approved":
      return "Approved";
    default:
      return status;
  }
}

/**
 * Friendly, non-error reminder shown when the visitor has a self-test kit
 * waiting for a result to be submitted. Renders nothing if there is nothing
 * pending. Designed as a soft teal/amber chip — never red.
 */
export function PendingSelftestResultBanner({
  to = "/hiv-selftest?action=submit",
  className = "",
}: Props) {
  const { language } = useLanguage();
  const { hasPending, dbCount, hasLocalTimer, details } = usePendingSelftestResult();

  if (!hasPending) return null;

  const title = language === "th"
    ? "คุณมีชุดตรวจที่รอส่งผล"
    : dbCount > 1
      ? `You have ${dbCount} test kits waiting for results`
      : "You have a test kit waiting for results";

  const subtitle = language === "th"
    ? hasLocalTimer && dbCount === 0
      ? "อ่านผลเรียบร้อยแล้ว ส่งภาพผลตรวจเพื่อรับคำแนะนำต่อ"
      : "ส่งภาพผลตรวจเพื่อบันทึกในประวัติและรับคำแนะนำ"
    : hasLocalTimer && dbCount === 0
      ? "Ready to read your result? Submit a photo to get next steps."
      : "Submit your result photo to save it and get follow-up advice.";

  const cta = language === "th" ? "ส่งผลตรวจ" : "Submit result";

  const isTimerOnly = hasLocalTimer && dbCount === 0;
  const receivedDate = formatDateLocale(
    isTimerOnly ? details?.startedAt : details?.createdAt,
    language
  );
  const status = statusLabel(details?.status, language);

  const explanationTitle = language === "th" ? "กำลังรอผล หมายถึงอะไร?" : "What does "awaiting result" mean?";
  const explanationBody = language === "th"
    ? "ชุดตรวจอยู่ในมือคุณแล้ว แต่ระบบยังไม่ได้รับรูปผลตรวจจากคุณ"
    : "The test kit is with you, but we have not received your result photo yet.";
  const receivedLabel = language === "th"
    ? isTimerOnly ? "เริ่มจับเวลา:" : "รับชุดตรวจ:"
    : isTimerOnly ? "Timer started:" : "Received:";
  const actionLabel = language === "th"
    ? "ส่งผลได้ทันทีหลังอ่านผลเสร็จ (ประมาณ 15-20 นาทีหลังเจาะเลือด)"
    : "Submit as soon as you have read your result (about 15-20 minutes after taking the sample).";

  return (
    <div className={className}>
      <Link
        to={to}
        className="block group"
        aria-label={cta}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm px-4 py-3 hover:border-primary/50 hover:bg-primary/15 transition-all">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
            <span className="hidden sm:inline">{cta}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>

      <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 space-y-1">
            <p className="font-medium text-foreground">{explanationTitle}</p>
            <p>{explanationBody}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground/80">
              {receivedDate && (
                <span>
                  {receivedLabel} <span className="text-foreground">{receivedDate}</span>
                </span>
              )}
              {status && (
                <span>
                  {language === "th" ? "สถานะ:" : "Status:"} <span className="text-foreground">{status}</span>
                </span>
              )}
            </div>
            <p className="text-primary/90 font-medium">{actionLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
