import { Clock, ShieldCheck } from "lucide-react";

interface Props {
  lastReviewed?: string;
  sourceBasis?: string;
  reviewedBy?: string;
  isEn: boolean;
}

/**
 * "Last reviewed" metadata badge for high-stakes health pages.
 * Adds trust signals near references section.
 */
export function LastReviewedBadge({ lastReviewed, sourceBasis, reviewedBy, isEn }: Props) {
  if (!lastReviewed && !sourceBasis) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 rounded-xl bg-muted/40 border border-border/50">
      {lastReviewed && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>
            {isEn ? "Last reviewed: " : "ตรวจทานล่าสุด: "}
            <span className="font-medium text-foreground/80">{lastReviewed}</span>
          </span>
        </div>
      )}
      {sourceBasis && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 flex-shrink-0" />
          <span>{sourceBasis}</span>
        </div>
      )}
      {reviewedBy && (
        <div className="text-[11px] text-muted-foreground">
          {isEn ? "Reviewed by: " : "ตรวจสอบโดย: "}
          <span className="font-medium">{reviewedBy}</span>
        </div>
      )}
    </div>
  );
}
