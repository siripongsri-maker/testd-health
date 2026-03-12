import { BookOpen, ExternalLink } from "lucide-react";

interface Source {
  name: string;
  url?: string;
}

const DEFAULT_SOURCES: Source[] = [
  { name: "World Health Organization (WHO) — Harm Reduction Guidelines", url: "https://www.who.int/health-topics/drugs-psychoactive-substances" },
  { name: "European Monitoring Centre for Drugs and Drug Addiction (EMCDDA)", url: "https://www.emcdda.europa.eu" },
  { name: "UNODC — Drug Safety and Harm Reduction", url: "https://www.unodc.org" },
  { name: "National Institutes of Health (NIH) — Pharmacology Resources", url: "https://nida.nih.gov" },
];

interface Props {
  sources?: Source[];
  isEn: boolean;
}

/**
 * Citation/sources card for credibility and AI trust.
 */
export function SourcesCard({ sources, isEn }: Props) {
  const displaySources = sources && sources.length > 0 ? sources : DEFAULT_SOURCES;

  return (
    <section
      className="rounded-2xl bg-hr-surface p-5 space-y-3"
      style={{ boxShadow: "var(--hr-card-shadow)" }}
      aria-label="Sources"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
          {isEn ? "Sources & References" : "แหล่งข้อมูลอ้างอิง"}
        </h2>
      </div>
      <ul className="space-y-2 ml-[42px]">
        {displaySources.map((src, i) => (
          <li key={i} className="text-[12px] text-muted-foreground leading-relaxed">
            {src.url ? (
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-hr-teal transition-colors inline-flex items-center gap-1"
              >
                {src.name}
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
              </a>
            ) : (
              src.name
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
