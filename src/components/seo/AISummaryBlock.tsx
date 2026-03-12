import { Info } from "lucide-react";

interface Props {
  summaryEn: string;
  summaryTh: string;
  isEn: boolean;
}

/**
 * AI-readable summary block — placed near top of knowledge pages.
 * Helps AI search engines (ChatGPT, Perplexity, Gemini) extract key info.
 */
export function AISummaryBlock({ summaryEn, summaryTh, isEn }: Props) {
  return (
    <section
      className="rounded-2xl bg-hr-surface p-5 space-y-2"
      style={{ boxShadow: "var(--hr-card-shadow)" }}
      aria-label="AI Summary"
      data-ai-summary="true"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-hr-teal/10 flex items-center justify-center flex-shrink-0">
          <Info className="h-4 w-4 text-hr-teal" />
        </div>
        <h2 className="text-[13px] font-semibold text-foreground uppercase tracking-wider">
          {isEn ? "Summary" : "สรุป"}
        </h2>
      </div>
      <p className="text-[14px] text-muted-foreground leading-relaxed ml-[42px]">
        {isEn ? summaryEn : summaryTh}
      </p>
    </section>
  );
}
