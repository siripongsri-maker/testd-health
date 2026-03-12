import { ArrowRight, BookOpen, Shield, MessageCircle, ClipboardCheck } from "lucide-react";

interface RelatedLink {
  labelEn: string;
  labelTh: string;
  icon: React.ElementType;
  action: () => void;
}

interface Props {
  links: RelatedLink[];
  isEn: boolean;
  titleEn?: string;
  titleTh?: string;
}

/**
 * Internal knowledge graph links — connects related pages for SEO crawlers.
 */
export function RelatedContentLinks({
  links,
  isEn,
  titleEn = "Related",
  titleTh = "เนื้อหาที่เกี่ยวข้อง",
}: Props) {
  if (!links || links.length === 0) return null;

  return (
    <nav
      className="space-y-3"
      aria-label={isEn ? "Related content" : "เนื้อหาที่เกี่ยวข้อง"}
    >
      <h2 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">
        {isEn ? titleEn : titleTh}
      </h2>
      <div className="space-y-2">
        {links.map((link, i) => {
          const Icon = link.icon;
          return (
            <button
              key={i}
              className="w-full text-left rounded-2xl bg-card p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              style={{ boxShadow: "var(--hr-card-shadow)" }}
              onClick={link.action}
            >
              <div className="w-9 h-9 rounded-xl bg-hr-surface flex items-center justify-center flex-shrink-0">
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <span className="text-[14px] font-medium text-foreground flex-1">
                {isEn ? link.labelEn : link.labelTh}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Shorthand builder for common harm reduction links */
export function buildHarmReductionLinks(
  onNavigate: (tab: string) => void,
): { labelEn: string; labelTh: string; icon: React.ElementType; action: () => void }[] {
  return [
    {
      labelEn: "Safer Use Planner",
      labelTh: "วางแผนการใช้ให้ปลอดภัยขึ้น",
      icon: Shield,
      action: () => onNavigate("plan"),
    },
    {
      labelEn: "Talk to a Counselor",
      labelTh: "ปรึกษาผู้เชี่ยวชาญ",
      icon: MessageCircle,
      action: () => onNavigate("support"),
    },
    {
      labelEn: "Mental Health Screening",
      labelTh: "ตรวจสุขภาพจิต",
      icon: ClipboardCheck,
      action: () => onNavigate("check"),
    },
  ];
}
