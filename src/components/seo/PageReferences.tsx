import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ExternalLink, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CitationChips } from "./CitationChips";
import { LastReviewedBadge } from "./LastReviewedBadge";

interface Reference {
  id: string;
  title: string;
  organization: string;
  url: string | null;
  source_type: string;
  year: number | null;
  credibility_level: string;
  citation_short: string;
}

interface PageReferenceLink {
  id: string;
  section_key: string | null;
  citation_note: string | null;
  display_order: number;
  reference: Reference;
}

interface Props {
  pageType: string;
  pageSlug: string;
  isEn: boolean;
  /** Override last reviewed text */
  lastReviewed?: string;
  /** Override source basis text */
  sourceBasis?: string;
  /** Show inline chips for a specific section */
  sectionKey?: string;
  /** Render mode */
  mode?: "full" | "chips" | "inline-cue";
  /** Max chips to show in chip mode */
  maxChips?: number;
}

const credibilityLabels: Record<string, { en: string; th: string }> = {
  global_guidance: { en: "Global guidance", th: "แนวทางระดับโลก" },
  national_guidance: { en: "National guidance", th: "แนวทางระดับชาติ" },
  peer_reviewed: { en: "Peer-reviewed", th: "ผ่านการตรวจสอบ" },
  harm_reduction_resource: { en: "Harm reduction", th: "ลดอันตราย" },
};

/**
 * PageReferences — fetches and displays references for a given page.
 * Three modes:
 * - "full": Collapsible references card at page bottom
 * - "chips": Inline citation chips for a section
 * - "inline-cue": Small "Sources" label
 */
export function PageReferences({
  pageType,
  pageSlug,
  isEn,
  lastReviewed,
  sourceBasis,
  sectionKey,
  mode = "full",
  maxChips = 3,
}: Props) {
  const [refs, setRefs] = useState<PageReferenceLink[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const query = supabase
        .from("hr_page_reference_links")
        .select(`
          id, section_key, citation_note, display_order,
          reference:reference_id (
            id, title, organization, url, source_type,
            year, credibility_level, citation_short
          )
        `)
        .eq("page_type", pageType)
        .eq("page_slug", pageSlug)
        .order("display_order", { ascending: true });

      if (sectionKey && mode === "chips") {
        query.eq("section_key", sectionKey);
      }

      const { data } = await query;
      if (!cancelled && data) {
        // Type assertion since Supabase returns joined data
        setRefs(data as unknown as PageReferenceLink[]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [pageType, pageSlug, sectionKey, mode]);

  if (loading || refs.length === 0) {
    // For chip/cue mode, return null if no data
    if (mode !== "full") return null;
    if (loading) return null;
    return null;
  }

  // Mode: chips — show compact citation chips
  if (mode === "chips") {
    const chips = refs.slice(0, maxChips).map(r => ({
      label: r.reference.citation_short,
      url: r.reference.url || undefined,
      credibilityLevel: r.reference.credibility_level,
    }));
    return <CitationChips chips={chips} isEn={isEn} />;
  }

  // Mode: inline-cue — subtle source label
  if (mode === "inline-cue") {
    const orgs = [...new Set(refs.map(r => r.reference.organization))].slice(0, 3);
    return (
      <p className="text-[11px] text-muted-foreground/60 mt-2 flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        {isEn
          ? `Based on ${orgs.join(", ")} guidance`
          : `อ้างอิงจากแนวทาง ${orgs.join(", ")}`}
      </p>
    );
  }

  // Mode: full — collapsible references card
  return (
    <div className="space-y-3">
      {(lastReviewed || sourceBasis) && (
        <LastReviewedBadge
          lastReviewed={lastReviewed}
          sourceBasis={sourceBasis}
          isEn={isEn}
        />
      )}

      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="rounded-2xl bg-card border border-border/50 overflow-hidden"
          style={{ boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04)" }}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground">
                    {isEn ? "References" : "แหล่งอ้างอิง"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {isEn
                      ? `${refs.length} source${refs.length !== 1 ? "s" : ""} used on this page`
                      : `${refs.length} แหล่งข้อมูลที่ใช้ในหน้านี้`}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-3">
              {refs.map((ref) => {
                const r = ref.reference;
                const credLabel = credibilityLabels[r.credibility_level];
                return (
                  <div key={ref.id} className="flex items-start gap-3 group">
                    <div className="w-1 h-1 rounded-full bg-muted-foreground/30 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start gap-2">
                        <p className="text-[12px] text-foreground/90 leading-relaxed flex-1">
                          {r.title}
                          {r.year && <span className="text-muted-foreground ml-1">({r.year})</span>}
                        </p>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                            title={isEn ? "Open source" : "เปิดแหล่งข้อมูล"}
                          >
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{r.organization}</span>
                        {credLabel && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                            {isEn ? credLabel.en : credLabel.th}
                          </span>
                        )}
                      </div>
                      {ref.citation_note && (
                        <p className="text-[10px] text-muted-foreground/70 italic">{ref.citation_note}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              <p className="text-[10px] text-muted-foreground/50 pt-2 border-t border-border/30">
                {isEn
                  ? "These references support the information on this page. testD content is for harm reduction education only."
                  : "แหล่งอ้างอิงเหล่านี้สนับสนุนข้อมูลในหน้านี้ เนื้อหา testD มีไว้เพื่อการศึกษาด้านการลดอันตรายเท่านั้น"}
              </p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
