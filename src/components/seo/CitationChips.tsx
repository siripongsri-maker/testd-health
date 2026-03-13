import { ExternalLink } from "lucide-react";

interface CitationChip {
  label: string;
  url?: string;
  credibilityLevel?: string;
}

interface Props {
  chips: CitationChip[];
  isEn: boolean;
}

const levelColors: Record<string, string> = {
  global_guidance: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  national_guidance: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  peer_reviewed: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  harm_reduction_resource: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

/**
 * Compact citation chips for inline source attribution.
 * Placed below key risk/warning sections.
 */
export function CitationChips({ chips, isEn }: Props) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
        {isEn ? "Sources" : "อ้างอิง"}
      </span>
      {chips.map((chip, i) => {
        const colorClass = levelColors[chip.credibilityLevel || ""] || "bg-muted text-muted-foreground";
        const Tag = chip.url ? "a" : "span";
        const linkProps = chip.url
          ? { href: chip.url, target: "_blank" as const, rel: "noopener noreferrer" }
          : {};

        return (
          <Tag
            key={i}
            {...linkProps}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors hover:opacity-80 ${colorClass}`}
          >
            {chip.label}
            {chip.url && <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-60" />}
          </Tag>
        );
      })}
    </div>
  );
}
