import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { ArrowRight, BookOpen, Zap, Shield, AlertTriangle, Heart, Brain, Activity } from "lucide-react";

interface KnowledgeEntity {
  id: string;
  entity_type: string;
  slug: string;
  name_th: string;
  name_en: string;
  summary_th: string | null;
  summary_en: string | null;
}

interface RelatedItem {
  entity: KnowledgeEntity;
  relation_type: string;
  strength: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  substance: Activity,
  risk: AlertTriangle,
  symptom: Zap,
  prevention_action: Shield,
  mental_health_effect: Brain,
  support_service: Heart,
  educational_topic: BookOpen,
  emergency_sign: AlertTriangle,
};

const RELATION_LABELS: Record<string, { en: string; th: string }> = {
  causes: { en: "Can cause", th: "อาจทำให้เกิด" },
  increases_risk_of: { en: "Increases risk of", th: "เพิ่มความเสี่ยง" },
  interacts_with: { en: "Interacts with", th: "มีปฏิกิริยากับ" },
  may_lead_to: { en: "May lead to", th: "อาจนำไปสู่" },
  linked_to: { en: "Related to", th: "เกี่ยวข้องกับ" },
  supports: { en: "Supports", th: "สนับสนุน" },
  treated_by: { en: "Treated by", th: "รักษาโดย" },
  prevented_by: { en: "Prevented by", th: "ป้องกันโดย" },
  related_to: { en: "Related to", th: "เกี่ยวข้อง" },
  contraindicated_with: { en: "Avoid with", th: "หลีกเลี่ยงร่วมกับ" },
  category_of: { en: "Category", th: "หมวดหมู่" },
  has_symptom: { en: "Symptom", th: "อาการ" },
};

interface Props {
  entitySlug: string;
  maxItems?: number;
  titleEn?: string;
  titleTh?: string;
}

export function RelatedKnowledge({ entitySlug, maxItems = 6, titleEn = "Related Knowledge", titleTh = "ความรู้ที่เกี่ยวข้อง" }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isEn = language === "en";
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelated();
  }, [entitySlug]);

  async function loadRelated() {
    setLoading(true);
    // Find entity by slug
    const { data: entity } = await supabase
      .from("hr_knowledge_entities")
      .select("id")
      .eq("slug", entitySlug)
      .eq("status", "published")
      .maybeSingle();

    if (!entity) { setLoading(false); return; }

    // Get relations (both directions)
    const { data: outRels } = await supabase
      .from("hr_knowledge_relations")
      .select("to_entity_id, relation_type, strength")
      .eq("from_entity_id", entity.id)
      .order("strength", { ascending: false })
      .limit(maxItems);

    const { data: inRels } = await supabase
      .from("hr_knowledge_relations")
      .select("from_entity_id, relation_type, strength")
      .eq("to_entity_id", entity.id)
      .order("strength", { ascending: false })
      .limit(maxItems);

    const entityIds = new Set<string>();
    const relMap: Record<string, { relation_type: string; strength: number }> = {};

    (outRels || []).forEach(r => {
      entityIds.add(r.to_entity_id);
      relMap[r.to_entity_id] = { relation_type: r.relation_type, strength: r.strength || 5 };
    });
    (inRels || []).forEach(r => {
      if (!entityIds.has(r.from_entity_id)) {
        entityIds.add(r.from_entity_id);
        relMap[r.from_entity_id] = { relation_type: r.relation_type, strength: r.strength || 5 };
      }
    });

    if (entityIds.size === 0) { setItems([]); setLoading(false); return; }

    const { data: entities } = await supabase
      .from("hr_knowledge_entities")
      .select("id, entity_type, slug, name_th, name_en, summary_th, summary_en")
      .in("id", Array.from(entityIds))
      .eq("status", "published");

    const result: RelatedItem[] = (entities || [])
      .map(e => ({
        entity: e,
        relation_type: relMap[e.id]?.relation_type || "related_to",
        strength: relMap[e.id]?.strength || 5,
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, maxItems);

    setItems(result);
    setLoading(false);
  }

  function handleClick(item: KnowledgeEntity) {
    if (item.entity_type === "substance") navigate(`/substance/${item.slug}`);
    else if (item.entity_type === "interaction_pair") navigate(`/interaction/${item.slug}`);
    else if (item.entity_type === "educational_topic") navigate(`/harm-reduction`);
    else if (item.entity_type === "support_service") navigate(`/harm-reduction`);
    // Other types stay on page (informational)
  }

  if (loading || items.length === 0) return null;

  return (
    <nav className="space-y-3" aria-label={isEn ? "Related knowledge" : "ความรู้ที่เกี่ยวข้อง"}>
      <h2 className="text-[12px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">
        {isEn ? titleEn : titleTh}
      </h2>
      <div className="space-y-2">
        {items.map(({ entity, relation_type }) => {
          const Icon = ICON_MAP[entity.entity_type] || BookOpen;
          const rel = RELATION_LABELS[relation_type] || RELATION_LABELS.related_to;
          return (
            <button
              key={entity.id}
              onClick={() => handleClick(entity)}
              className="w-full text-left rounded-2xl bg-card p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
              style={{ boxShadow: "var(--hr-card-shadow)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-hr-surface flex items-center justify-center flex-shrink-0">
                <Icon className="h-[18px] w-[18px] text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[14px] font-medium text-foreground block truncate">
                  {isEn ? entity.name_en : entity.name_th}
                </span>
                <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">
                  {isEn ? rel.en : rel.th}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
