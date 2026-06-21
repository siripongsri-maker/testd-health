import { Link } from "react-router-dom";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePendingSelftestResult } from "@/hooks/usePendingSelftestResult";

interface Props {
  /** Optional override target. Defaults to the inline submission flow. */
  to?: string;
  className?: string;
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
  const { hasPending, dbCount, hasLocalTimer } = usePendingSelftestResult();

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

  return (
    <Link
      to={to}
      className={`block group ${className}`}
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
  );
}
