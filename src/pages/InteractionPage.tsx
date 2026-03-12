import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Shield, MessageCircle, BookOpen, Phone,
  AlertTriangle, ShieldAlert, ShieldCheck, HelpCircle,
  Activity, Zap, Heart, Info,
} from "lucide-react";
import {
  SEOHead, buildMedicalPageJsonLd, buildFaqJsonLd,
  AISummaryBlock, QuickFactsCard, FAQSection, SourcesCard,
  RelatedContentLinks,
} from "@/components/seo";
import type { FAQItem } from "@/components/seo";
import { trackEvent } from "@/hooks/useAnalytics";

/* ── Risk meta ── */
const riskMeta: Record<string, {
  labelEn: string; labelTh: string;
  badgeBg: string; badgeText: string;
  cardBg: string;
  Icon: React.ElementType;
}> = {
  critical: { labelEn: "Critical risk", labelTh: "ความเสี่ยงวิกฤต", badgeBg: "bg-hr-risk-critical/15", badgeText: "text-hr-risk-critical", cardBg: "bg-hr-risk-critical/[0.06]", Icon: ShieldAlert },
  high: { labelEn: "High risk", labelTh: "ความเสี่ยงสูง", badgeBg: "bg-hr-risk-high/12", badgeText: "text-hr-risk-high", cardBg: "bg-hr-risk-high/[0.06]", Icon: AlertTriangle },
  moderate: { labelEn: "Caution", labelTh: "ควรระวัง", badgeBg: "bg-hr-risk-caution/15", badgeText: "text-hr-risk-high-caution", cardBg: "bg-hr-risk-caution/[0.08]", Icon: Shield },
  low: { labelEn: "Lower relative risk", labelTh: "ความเสี่ยงต่ำกว่าเมื่อเทียบกัน", badgeBg: "bg-hr-risk-low/15", badgeText: "text-hr-risk-low", cardBg: "bg-hr-risk-low/[0.06]", Icon: ShieldCheck },
  unknown: { labelEn: "Limited evidence", labelTh: "ข้อมูลยังจำกัด", badgeBg: "bg-hr-risk-unknown/12", badgeText: "text-hr-risk-unknown", cardBg: "bg-hr-surface", Icon: HelpCircle },
};

interface SubstanceRow { id: string; name_en: string; name_th: string; slug: string; icon: string; }
interface InteractionRow {
  id: string; risk_level: string;
  summary_en: string | null; summary_th: string | null;
  why_risky_en: string | null; why_risky_th: string | null;
  possible_effects_en: string[] | null; possible_effects_th: string[] | null;
  warning_signs_en: string[] | null; warning_signs_th: string[] | null;
  harm_reduction_tips_en: string[] | null; harm_reduction_tips_th: string[] | null;
  emergency_signs_en: string[] | null; emergency_signs_th: string[] | null;
  description_en: string | null; description_th: string | null;
  interaction_type: string | null;
  substance_a_id: string; substance_b_id: string;
}
interface RelatedInteraction {
  slug: string; nameEn: string; nameTh: string; riskLevel: string;
}

/* ── Section card (reused from drawer) ── */
function DetailSection({ icon: Icon, title, items, iconBg, variant = "list" }: {
  icon: React.ElementType; title: string; items: string[]; iconBg: string; variant?: "list" | "chips";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card p-5 space-y-3" style={{ boxShadow: "var(--hr-card-shadow)" }}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
      </div>
      {variant === "chips" ? (
        <div className="flex flex-wrap gap-2 ml-12">
          {items.map((item, i) => (
            <span key={i} className="text-[13px] px-3 py-1.5 rounded-full bg-hr-surface text-muted-foreground border border-hr-divider">{item}</span>
          ))}
        </div>
      ) : (
        <ul className="ml-12 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-[14px] text-muted-foreground leading-relaxed flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InteractionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isEn } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [interaction, setInteraction] = useState<InteractionRow | null>(null);
  const [substanceA, setSubstanceA] = useState<SubstanceRow | null>(null);
  const [substanceB, setSubstanceB] = useState<SubstanceRow | null>(null);
  const [related, setRelated] = useState<RelatedInteraction[]>([]);

  useEffect(() => {
    if (!slug) return;
    loadInteraction(slug);
  }, [slug]);

  async function loadInteraction(s: string) {
    setLoading(true);
    // Fetch all substances to match slugs
    const { data: substances } = await supabase.from("hr_substances").select("id,name_en,name_th,slug,icon").eq("is_active", true);
    if (!substances) { setLoading(false); return; }

    // Parse slug: "substance-a-substance-b" — find best match
    const slugParts = s.split("-");
    let foundA: SubstanceRow | null = null;
    let foundB: SubstanceRow | null = null;

    // Try every split point
    for (let i = 1; i < slugParts.length; i++) {
      const slugA = slugParts.slice(0, i).join("-");
      const slugB = slugParts.slice(i).join("-");
      const matchA = substances.find(sub => sub.slug === slugA);
      const matchB = substances.find(sub => sub.slug === slugB);
      if (matchA && matchB) {
        foundA = matchA;
        foundB = matchB;
        break;
      }
    }

    if (!foundA || !foundB) { setLoading(false); return; }

    // Ensure consistent ordering (alphabetical by slug)
    if (foundA.slug > foundB.slug) [foundA, foundB] = [foundB, foundA];

    setSubstanceA(foundA);
    setSubstanceB(foundB);

    // Fetch interaction (check both orderings)
    const { data: interactions } = await supabase
      .from("hr_substance_interactions")
      .select("*")
      .or(`and(substance_a_id.eq.${foundA.id},substance_b_id.eq.${foundB.id}),and(substance_a_id.eq.${foundB.id},substance_b_id.eq.${foundA.id})`);

    const ix = interactions?.[0] || null;
    setInteraction(ix);

    // Track
    trackEvent("seo_interaction_page_view", { slug: s, risk: ix?.risk_level });

    // Fetch related interactions
    if (ix) {
      const { data: relatedRows } = await supabase
        .from("hr_substance_interactions")
        .select("id,substance_a_id,substance_b_id,risk_level")
        .neq("id", ix.id)
        .or(`substance_a_id.eq.${foundA.id},substance_b_id.eq.${foundA.id},substance_a_id.eq.${foundB.id},substance_b_id.eq.${foundB.id}`)
        .limit(6);

      if (relatedRows) {
        const relItems: RelatedInteraction[] = relatedRows.map(r => {
          const aMatch = substances.find(sub => sub.id === r.substance_a_id);
          const bMatch = substances.find(sub => sub.id === r.substance_b_id);
          const slugs = [aMatch?.slug, bMatch?.slug].filter(Boolean).sort();
          return {
            slug: slugs.join("-"),
            nameEn: `${aMatch?.name_en || "?"} + ${bMatch?.name_en || "?"}`,
            nameTh: `${aMatch?.name_th || "?"} + ${bMatch?.name_th || "?"}`,
            riskLevel: r.risk_level,
          };
        });
        setRelated(relItems);
      }
    }
    setLoading(false);
  }

  const nameA = isEn ? substanceA?.name_en : substanceA?.name_th;
  const nameB = isEn ? substanceB?.name_en : substanceB?.name_th;
  const comboTitle = `${nameA || "?"} + ${nameB || "?"}`;
  const risk = riskMeta[interaction?.risk_level || "unknown"] || riskMeta.unknown;
  const RiskIcon = risk.Icon;

  // Dynamic FAQ
  const faqs: FAQItem[] = substanceA && substanceB ? [
    {
      questionEn: `What happens if you mix ${substanceA.name_en} and ${substanceB.name_en}?`,
      questionTh: `ผสม${substanceA.name_th}กับ${substanceB.name_th}จะเป็นอย่างไร?`,
      answerEn: interaction?.summary_en || `Mixing ${substanceA.name_en} and ${substanceB.name_en} may increase health risks. Consult a harm reduction professional for personalized advice.`,
      answerTh: interaction?.summary_th || `การผสม${substanceA.name_th}กับ${substanceB.name_th}อาจเพิ่มความเสี่ยงต่อสุขภาพ ปรึกษาผู้เชี่ยวชาญด้านการลดอันตรายเพื่อคำแนะนำเฉพาะ`,
    },
    {
      questionEn: `Is mixing ${substanceA.name_en} and ${substanceB.name_en} dangerous?`,
      questionTh: `การใช้${substanceA.name_th}ร่วมกับ${substanceB.name_th}อันตรายไหม?`,
      answerEn: interaction?.why_risky_en || `The combination may increase risks. Check the risk level and warning signs on this page.`,
      answerTh: interaction?.why_risky_th || `การใช้ร่วมกันอาจเพิ่มความเสี่ยง ดูระดับความเสี่ยงและสัญญาณเตือนในหน้านี้`,
    },
    {
      questionEn: `What are overdose signs for ${substanceA.name_en} and ${substanceB.name_en}?`,
      questionTh: `อาการ Overdose จาก${substanceA.name_th}กับ${substanceB.name_th}มีอะไรบ้าง?`,
      answerEn: interaction?.emergency_signs_en?.join(". ") || "Seek emergency help if someone becomes unconscious, has difficulty breathing, or shows signs of seizures.",
      answerTh: interaction?.emergency_signs_th?.join(". ") || "ขอความช่วยเหลือฉุกเฉินหากมีคนหมดสติ หายใจลำบาก หรือมีอาการชัก",
    },
  ] : [];

  // Quick facts
  const quickFacts = interaction ? [
    { labelEn: "Combination", labelTh: "คู่สาร", valueEn: `${substanceA?.name_en} + ${substanceB?.name_en}`, valueTh: `${substanceA?.name_th} + ${substanceB?.name_th}` },
    { labelEn: "Risk Level", labelTh: "ระดับความเสี่ยง", valueEn: risk.labelEn, valueTh: risk.labelTh },
    ...(interaction.emergency_signs_en?.length ? [{
      labelEn: "Key Emergency Signs", labelTh: "สัญญาณฉุกเฉินสำคัญ",
      valueEn: interaction.emergency_signs_en.slice(0, 3).join(", "),
      valueTh: (interaction.emergency_signs_th || interaction.emergency_signs_en).slice(0, 3).join(", "),
    }] : []),
  ] : [];

  const pageTitle = loading ? "Loading..." : `${substanceA?.name_en} + ${substanceB?.name_en} Interaction Risk`;
  const metaDesc = interaction?.summary_en
    || `Learn the risks of mixing ${substanceA?.name_en} and ${substanceB?.name_en}, including warning signs, harm reduction advice, and when to seek help.`;

  const BASE_URL = "https://testd-health.lovable.app";

  return (
    <PageContainer className="pb-24">
      {!loading && substanceA && substanceB && (
        <SEOHead
          title={`${pageTitle} | Harm Reduction Guide | testD`}
          description={metaDesc}
          canonicalPath={`/interaction/${slug}`}
          lang={isEn ? "en" : "th"}
          alternateLanguages={[
            { lang: "th", path: `/interaction/${slug}` },
            { lang: "en", path: `/interaction/${slug}` },
          ]}
          jsonLd={[
            buildMedicalPageJsonLd({
              name: pageTitle,
              description: metaDesc,
              url: `${BASE_URL}/interaction/${slug}`,
              about: `Drug interaction risks between ${substanceA.name_en} and ${substanceB.name_en}`,
            }),
            ...(faqs.length > 0 ? [buildFaqJsonLd(faqs.map(f => ({ question: f.questionEn, answer: f.answerEn })))] : []),
          ]}
        />
      )}

      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span className="text-[14px]">{isEn ? "Back" : "กลับ"}</span>
      </button>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : !interaction || !substanceA || !substanceB ? (
        <div className="rounded-2xl bg-card p-8 text-center space-y-3" style={{ boxShadow: "var(--hr-card-shadow)" }}>
          <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <h1 className="text-lg font-semibold text-foreground">{isEn ? "Interaction not found" : "ไม่พบข้อมูลคู่สาร"}</h1>
          <p className="text-sm text-muted-foreground">{isEn ? "Try using the interaction checker instead." : "ลองใช้เครื่องมือตรวจสอบปฏิกิริยาระหว่างสารแทน"}</p>
          <Button variant="outline" onClick={() => navigate("/harm-reduction")}>{isEn ? "Go to Interaction Checker" : "ไปหน้าเช็กปฏิกิริยา"}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* H1 + Badge */}
          <div className="space-y-3">
            <h1 className="text-[22px] sm:text-[28px] font-semibold text-foreground leading-snug">
              {comboTitle}
              <span className="block text-[14px] font-normal text-muted-foreground mt-1">
                {isEn ? "Interaction Risk" : "ความเสี่ยงเมื่อใช้ร่วมกัน"}
              </span>
            </h1>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ${risk.badgeBg} ${risk.badgeText}`}>
              <RiskIcon className="h-3.5 w-3.5" />
              {isEn ? risk.labelEn : risk.labelTh}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-2xl bg-hr-surface p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {isEn
                ? "This information is provided for harm reduction and health education. Lower relative risk does not mean no risk."
                : "ข้อมูลนี้จัดทำเพื่อการลดอันตรายและการดูแลสุขภาพ ความเสี่ยงที่ต่ำกว่าไม่ได้หมายความว่าไม่มีความเสี่ยง"}
            </p>
          </div>

          {/* AI Summary */}
          {(interaction.summary_en || interaction.summary_th) && (
            <AISummaryBlock
              summaryEn={interaction.summary_en || ""}
              summaryTh={interaction.summary_th || ""}
              isEn={isEn}
            />
          )}

          {/* Quick Facts */}
          <QuickFactsCard facts={quickFacts} isEn={isEn} />

          {/* Why risky */}
          {(interaction.why_risky_en || interaction.why_risky_th) && (
            <div className="rounded-2xl bg-card p-5 space-y-3" style={{ boxShadow: "var(--hr-card-shadow)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-hr-risk-high/10 flex items-center justify-center">
                  <AlertTriangle className="h-[18px] w-[18px] text-hr-risk-high" />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">
                  {isEn ? "Why this combination may increase risk" : "ทำไมคู่นี้จึงเพิ่มความเสี่ยง"}
                </h2>
              </div>
              <p className="ml-12 text-[14px] text-muted-foreground leading-relaxed">
                {isEn ? interaction.why_risky_en : interaction.why_risky_th}
              </p>
            </div>
          )}

          {/* Possible effects */}
          <DetailSection
            icon={Activity}
            title={isEn ? "Possible effects" : "ผลกระทบที่อาจเกิดขึ้น"}
            items={(isEn ? interaction.possible_effects_en : interaction.possible_effects_th) || []}
            iconBg="bg-hr-blue/10 text-hr-blue"
            variant="chips"
          />

          {/* Warning signs */}
          <DetailSection
            icon={Zap}
            title={isEn ? "Signs to watch for" : "อาการที่ควรสังเกต"}
            items={(isEn ? interaction.warning_signs_en : interaction.warning_signs_th) || []}
            iconBg="bg-hr-risk-high-caution/10 text-hr-risk-high-caution"
          />

          {/* Harm reduction */}
          <DetailSection
            icon={Shield}
            title={isEn ? "Ways to reduce harm" : "วิธีลดความเสี่ยงเบื้องต้น"}
            items={(isEn ? interaction.harm_reduction_tips_en : interaction.harm_reduction_tips_th) || []}
            iconBg="bg-hr-teal/10 text-hr-teal"
          />

          {/* Emergency signs */}
          {((isEn ? interaction.emergency_signs_en : interaction.emergency_signs_th) || []).length > 0 && (
            <div className={`rounded-2xl p-5 space-y-3 ${risk.cardBg}`} style={{ boxShadow: "var(--hr-card-shadow)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-hr-risk-critical/15 flex items-center justify-center">
                  <ShieldAlert className="h-[18px] w-[18px] text-hr-risk-critical" />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">
                  {isEn ? "When to get urgent help" : "เมื่อไหร่ควรขอความช่วยเหลือทันที"}
                </h2>
              </div>
              <ul className="ml-12 space-y-1.5">
                {((isEn ? interaction.emergency_signs_en : interaction.emergency_signs_th) || []).map((s, i) => (
                  <li key={i} className="text-[14px] text-foreground leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-hr-risk-critical mt-2 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
              <div className="ml-12 pt-2">
                <p className="text-[13px] text-muted-foreground italic">
                  {isEn
                    ? "If something feels off, it's okay to ask for help early. You don't need to wait until things get worse."
                    : "หากรู้สึกผิดปกติ ขอความช่วยเหลือได้เลย ไม่ต้องรอจนอาการแย่ลง"}
                </p>
              </div>
            </div>
          )}

          {/* FAQ */}
          {faqs.length > 0 && <FAQSection faqs={faqs} isEn={isEn} />}

          {/* Related combinations */}
          {related.length > 0 && (
            <nav className="space-y-3" aria-label={isEn ? "Related combinations" : "คู่สารที่เกี่ยวข้อง"}>
              <h2 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">
                {isEn ? "Related Combinations" : "คู่สารที่เกี่ยวข้อง"}
              </h2>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => {
                  const rm = riskMeta[r.riskLevel] || riskMeta.unknown;
                  return (
                    <button
                      key={r.slug}
                      onClick={() => navigate(`/interaction/${r.slug}`)}
                      className={`text-[13px] px-3 py-2 rounded-xl ${rm.badgeBg} ${rm.badgeText} font-medium transition-all hover:shadow-md active:scale-[0.97]`}
                    >
                      {isEn ? r.nameEn : r.nameTh}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Substance links */}
          <nav className="space-y-3" aria-label={isEn ? "Learn about substances" : "เรียนรู้เกี่ยวกับสาร"}>
            <h2 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">
              {isEn ? "Learn About These Substances" : "เรียนรู้เกี่ยวกับสารเหล่านี้"}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[substanceA, substanceB].map(sub => sub && (
                <button
                  key={sub.id}
                  onClick={() => navigate(`/substance/${sub.slug}`)}
                  className="rounded-2xl bg-card p-4 flex items-center gap-3 transition-all hover:shadow-md active:scale-[0.97]"
                  style={{ boxShadow: "var(--hr-card-shadow)" }}
                >
                  <span className="text-xl">{sub.icon}</span>
                  <span className="text-[14px] font-medium text-foreground">{isEn ? sub.name_en : sub.name_th}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Sources */}
          <SourcesCard isEn={isEn} />

          {/* CTA Actions */}
          <div className="space-y-3 pt-2">
            <Button
              className="w-full rounded-xl h-12 text-[15px] bg-hr-teal hover:bg-hr-teal/90 text-white"
              onClick={() => { trackEvent("seo_interaction_cta_counselor"); navigate("/harm-reduction"); }}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {isEn ? "Talk to a Counselor" : "ปรึกษาผู้เชี่ยวชาญ"}
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 text-[15px] border-hr-divider"
              onClick={() => navigate("/harm-reduction")}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {isEn ? "Use Interaction Checker" : "ใช้เครื่องมือเช็กปฏิกิริยา"}
            </Button>
            {(interaction?.risk_level === "critical" || interaction?.risk_level === "high") && (
              <a href="tel:1669" className="flex items-center justify-center gap-2 w-full rounded-xl h-12 text-[15px] bg-hr-risk-critical/10 text-hr-risk-critical font-medium hover:bg-hr-risk-critical/15 transition-colors">
                <Phone className="h-4 w-4" />
                {isEn ? "Emergency: Call 1669" : "ฉุกเฉิน: โทร 1669"}
              </a>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
