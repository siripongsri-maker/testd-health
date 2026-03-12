import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Eye, Check, AlertTriangle, RotateCcw,
  FileText, Search, Shield, ChevronDown, ChevronUp, X
} from "lucide-react";

interface Substance {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  category: string;
}

interface ContentDraft {
  id: string;
  substance_a_slug: string;
  substance_b_slug: string;
  slug: string;
  status: string;
  title_en: string | null;
  title_th: string | null;
  ai_summary_en: string | null;
  ai_summary_th: string | null;
  summary_en: string | null;
  summary_th: string | null;
  why_risky_en: string | null;
  why_risky_th: string | null;
  seo_title_en: string | null;
  seo_title_th: string | null;
  meta_description_en: string | null;
  meta_description_th: string | null;
  possible_effects_en: string[] | null;
  possible_effects_th: string[] | null;
  warning_signs_en: string[] | null;
  warning_signs_th: string[] | null;
  harm_reduction_tips_en: string[] | null;
  harm_reduction_tips_th: string[] | null;
  emergency_signs_en: string[] | null;
  emergency_signs_th: string[] | null;
  faq_items_en: { question: string; answer: string }[] | null;
  faq_items_th: { question: string; answer: string }[] | null;
  quick_facts_en: { label: string; value: string }[] | null;
  quick_facts_th: { label: string; value: string }[] | null;
  recommended_source_types: string[] | null;
  citation_placeholders: { source_type: string; suggested_search: string }[] | null;
  authority_confidence_score: number | null;
  quality_flags: string[] | null;
  validation_passed: boolean | null;
  version: number;
  generated_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  revision_note: string | null;
  content_type: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft_generated: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  in_review: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  needs_revision: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  approved: "bg-green-500/15 text-green-700 border-green-500/30",
  published: "bg-primary/15 text-primary border-primary/30",
};

export default function AdminContentGeneratorContent() {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const [substances, setSubstances] = useState<Substance[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [subA, setSubA] = useState("");
  const [subB, setSubB] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<ContentDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedDraft, setEditedDraft] = useState<Partial<ContentDraft>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  useEffect(() => {
    loadSubstances();
    loadDrafts();
  }, []);

  const loadSubstances = async () => {
    const { data } = await supabase.from("hr_substances").select("id,slug,name_en,name_th,category").order("name_en");
    if (data) setSubstances(data);
  };

  const loadDrafts = async () => {
    const { data } = await supabase.from("hr_content_drafts").select("*").order("created_at", { ascending: false });
    if (data) setDrafts(data as unknown as ContentDraft[]);
  };

  const generateContent = async () => {
    if (!subA || !subB || subA === subB) {
      toast.error("Select two different substances");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-hr-content", {
        body: { substance_a_slug: subA, substance_b_slug: subB },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Content draft generated successfully");
      await loadDrafts();
      if (data?.draft) setSelectedDraft(data.draft);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (draftId: string, newStatus: string) => {
    setSaving(true);
    const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "in_review") updates.reviewed_at = new Date().toISOString();
    if (newStatus === "approved") updates.approved_at = new Date().toISOString();
    if (newStatus === "published") updates.published_at = new Date().toISOString();

    const { error } = await supabase.from("hr_content_drafts").update(updates).eq("id", draftId);
    if (error) toast.error("Failed to update status");
    else {
      toast.success(`Status updated to ${newStatus}`);
      await loadDrafts();
      if (selectedDraft?.id === draftId) setSelectedDraft({ ...selectedDraft!, status: newStatus } as ContentDraft);
    }
    setSaving(false);
  };

  const saveEdits = async () => {
    if (!selectedDraft) return;
    setSaving(true);
    const { error } = await supabase.from("hr_content_drafts").update({ ...editedDraft, updated_at: new Date().toISOString() }).eq("id", selectedDraft.id);
    if (error) toast.error("Save failed");
    else {
      toast.success("Draft saved");
      setEditMode(false);
      await loadDrafts();
      const { data } = await supabase.from("hr_content_drafts").select("*").eq("id", selectedDraft.id).single();
      if (data) setSelectedDraft(data as unknown as ContentDraft);
    }
    setSaving(false);
  };

  const regenerate = async () => {
    if (!selectedDraft) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-hr-content", {
        body: {
          substance_a_slug: selectedDraft.substance_a_slug,
          substance_b_slug: selectedDraft.substance_b_slug,
        },
      });
      if (error) throw error;
      toast.success("New version generated");
      await loadDrafts();
      if (data?.draft) setSelectedDraft(data.draft);
    } catch (err: any) {
      toast.error(err.message || "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  };

  const filteredDrafts = drafts.filter(d => statusFilter === "all" || d.status === statusFilter);

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const renderArrayField = (label: string, items: string[] | null, editKey?: string) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {editMode && editKey ? (
        <Textarea
          value={(editedDraft[editKey as keyof ContentDraft] as string[] || items || []).join("\n")}
          onChange={e => setEditedDraft({ ...editedDraft, [editKey]: e.target.value.split("\n").filter(Boolean) })}
          rows={4}
          className="text-sm"
        />
      ) : (
        <ul className="space-y-1">
          {(items || []).map((item, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-muted-foreground mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
          {(!items || items.length === 0) && <p className="text-sm text-muted-foreground italic">Not generated</p>}
        </ul>
      )}
    </div>
  );

  const renderTextField = (label: string, value: string | null, editKey?: string) => (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      {editMode && editKey ? (
        <Textarea
          value={(editedDraft[editKey as keyof ContentDraft] as string) ?? value ?? ""}
          onChange={e => setEditedDraft({ ...editedDraft, [editKey]: e.target.value })}
          rows={3}
          className="text-sm"
        />
      ) : (
        <p className="text-sm">{value || <span className="italic text-muted-foreground">Not generated</span>}</p>
      )}
    </div>
  );

  const SectionHeader = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center justify-between w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
    >
      {label}
      {expandedSection === id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{isEn ? "AI Content Generator" : "ตัวสร้างเนื้อหา AI"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEn ? "Generate and review harm reduction content drafts" : "สร้างและตรวจสอบร่างเนื้อหาลดอันตราย"}
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {isEn ? "Generate New Content" : "สร้างเนื้อหาใหม่"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={subA} onValueChange={setSubA}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={isEn ? "Substance A" : "สารที่ A"} />
              </SelectTrigger>
              <SelectContent>
                {substances.map(s => (
                  <SelectItem key={s.slug} value={s.slug}>{isEn ? s.name_en : s.name_th}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="self-center text-muted-foreground font-bold">+</span>
            <Select value={subB} onValueChange={setSubB}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={isEn ? "Substance B" : "สารที่ B"} />
              </SelectTrigger>
              <SelectContent>
                {substances.filter(s => s.slug !== subA).map(s => (
                  <SelectItem key={s.slug} value={s.slug}>{isEn ? s.name_en : s.name_th}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateContent} disabled={generating || !subA || !subB}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isEn ? "Generate" : "สร้าง"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drafts List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{isEn ? "Content Drafts" : "ร่างเนื้อหา"}</h3>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEn ? "All statuses" : "ทุกสถานะ"}</SelectItem>
                <SelectItem value="draft_generated">{isEn ? "Draft" : "ร่าง"}</SelectItem>
                <SelectItem value="in_review">{isEn ? "In Review" : "กำลังตรวจ"}</SelectItem>
                <SelectItem value="needs_revision">{isEn ? "Needs Revision" : "ต้องแก้ไข"}</SelectItem>
                <SelectItem value="approved">{isEn ? "Approved" : "อนุมัติแล้ว"}</SelectItem>
                <SelectItem value="published">{isEn ? "Published" : "เผยแพร่แล้ว"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredDrafts.map(draft => (
              <button
                key={draft.id}
                onClick={() => { setSelectedDraft(draft); setEditMode(false); setEditedDraft({}); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDraft?.id === draft.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-sm font-medium truncate">{isEn ? draft.title_en : draft.title_th || draft.slug}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[draft.status] || ""}`}>
                    {draft.status.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">v{draft.version}</span>
                  {!draft.validation_passed && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                </div>
              </button>
            ))}
            {filteredDrafts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isEn ? "No drafts found" : "ไม่พบร่าง"}
              </p>
            )}
          </div>
        </div>

        {/* Draft Detail */}
        <div className="lg:col-span-2">
          {selectedDraft ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">
                    {isEn ? selectedDraft.title_en : selectedDraft.title_th || selectedDraft.slug}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDraft(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedDraft.status] || ""}`}>
                    {selectedDraft.status.replace("_", " ")}
                  </span>
                  {selectedDraft.authority_confidence_score != null && (
                    <span className="text-xs text-muted-foreground">
                      Confidence: {Math.round((selectedDraft.authority_confidence_score || 0) * 100)}%
                    </span>
                  )}
                  {selectedDraft.quality_flags && selectedDraft.quality_flags.length > 0 && (
                    <span className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {selectedDraft.quality_flags.length} {isEn ? "warnings" : "คำเตือน"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {!editMode ? (
                    <Button size="sm" variant="outline" onClick={() => { setEditMode(true); setEditedDraft({}); }}>
                      <FileText className="h-3.5 w-3.5 mr-1" /> {isEn ? "Edit" : "แก้ไข"}
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={saveEdits} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                        {isEn ? "Save" : "บันทึก"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setEditedDraft({}); }}>
                        {isEn ? "Cancel" : "ยกเลิก"}
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={generating}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> {isEn ? "Regenerate" : "สร้างใหม่"}
                  </Button>
                  {selectedDraft.status === "draft_generated" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(selectedDraft.id, "in_review")}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> {isEn ? "Start Review" : "เริ่มตรวจสอบ"}
                    </Button>
                  )}
                  {selectedDraft.status === "in_review" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(selectedDraft.id, "approved")}>
                        <Check className="h-3.5 w-3.5 mr-1" /> {isEn ? "Approve" : "อนุมัติ"}
                      </Button>
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" onClick={() => updateStatus(selectedDraft.id, "needs_revision")}>
                        {isEn ? "Needs Revision" : "ต้องแก้ไข"}
                      </Button>
                    </>
                  )}
                  {selectedDraft.status === "approved" && (
                    <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => updateStatus(selectedDraft.id, "published")}>
                      <Shield className="h-3.5 w-3.5 mr-1" /> {isEn ? "Publish" : "เผยแพร่"}
                    </Button>
                  )}
                </div>

                {/* Quality flags */}
                {selectedDraft.quality_flags && selectedDraft.quality_flags.length > 0 && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-1">
                    <p className="text-xs font-semibold text-orange-700">{isEn ? "Quality Warnings" : "คำเตือนคุณภาพ"}</p>
                    {selectedDraft.quality_flags.map((f, i) => (
                      <p key={i} className="text-xs text-orange-600">• {f}</p>
                    ))}
                  </div>
                )}

                {/* Content sections */}
                <Tabs defaultValue="en" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="en">English</TabsTrigger>
                    <TabsTrigger value="th">ไทย</TabsTrigger>
                  </TabsList>

                  {(["en", "th"] as const).map(lang => (
                    <TabsContent key={lang} value={lang} className="space-y-3 mt-3">
                      <SectionHeader id="summary" label={lang === "en" ? "Summary & AI Block" : "สรุปและบล็อก AI"} />
                      {expandedSection === "summary" && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                          {renderTextField("Title", selectedDraft[`title_${lang}`], editMode ? `title_${lang}` : undefined)}
                          {renderTextField("AI Summary", selectedDraft[`ai_summary_${lang}`], editMode ? `ai_summary_${lang}` : undefined)}
                          {renderTextField("Summary", selectedDraft[`summary_${lang}`], editMode ? `summary_${lang}` : undefined)}
                        </div>
                      )}

                      <SectionHeader id="risk" label={lang === "en" ? "Risk & Effects" : "ความเสี่ยงและผลกระทบ"} />
                      {expandedSection === "risk" && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                          {renderTextField("Why Risky", selectedDraft[`why_risky_${lang}`], editMode ? `why_risky_${lang}` : undefined)}
                          {renderArrayField(lang === "en" ? "Possible Effects" : "ผลที่อาจเกิดขึ้น", selectedDraft[`possible_effects_${lang}`], editMode ? `possible_effects_${lang}` : undefined)}
                          {renderArrayField(lang === "en" ? "Warning Signs" : "สัญญาณเตือน", selectedDraft[`warning_signs_${lang}`], editMode ? `warning_signs_${lang}` : undefined)}
                        </div>
                      )}

                      <SectionHeader id="harm" label={lang === "en" ? "Harm Reduction & Emergency" : "การลดอันตรายและฉุกเฉิน"} />
                      {expandedSection === "harm" && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                          {renderArrayField(lang === "en" ? "Harm Reduction Tips" : "เคล็ดลับลดอันตราย", selectedDraft[`harm_reduction_tips_${lang}`], editMode ? `harm_reduction_tips_${lang}` : undefined)}
                          {renderArrayField(lang === "en" ? "Emergency Signs" : "สัญญาณฉุกเฉิน", selectedDraft[`emergency_signs_${lang}`], editMode ? `emergency_signs_${lang}` : undefined)}
                        </div>
                      )}

                      <SectionHeader id="seo" label="SEO & FAQ" />
                      {expandedSection === "seo" && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                          {renderTextField("SEO Title", selectedDraft[`seo_title_${lang}`], editMode ? `seo_title_${lang}` : undefined)}
                          {renderTextField("Meta Description", selectedDraft[`meta_description_${lang}`], editMode ? `meta_description_${lang}` : undefined)}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FAQ Items</p>
                            {(selectedDraft[`faq_items_${lang}`] || []).map((faq, i) => (
                              <div key={i} className="p-2 rounded bg-muted/50 space-y-1">
                                <p className="text-sm font-medium">Q: {faq.question}</p>
                                <p className="text-sm text-muted-foreground">A: {faq.answer}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <SectionHeader id="citations" label={lang === "en" ? "Citations & Sources" : "การอ้างอิง"} />
                      {expandedSection === "citations" && (
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                              {lang === "en" ? "Recommended Sources" : "แหล่งข้อมูลที่แนะนำ"}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {(selectedDraft.recommended_source_types || []).map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                          {(selectedDraft.citation_placeholders || []).map((c: any, i) => (
                            <div key={i} className="text-xs p-2 rounded bg-muted/50">
                              <span className="font-medium">{c.source_type}:</span>{" "}
                              <span className="text-muted-foreground">{c.suggested_search}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center space-y-2">
                <Sparkles className="h-8 w-8 mx-auto opacity-30" />
                <p className="text-sm">{isEn ? "Select a draft or generate new content" : "เลือกร่างหรือสร้างเนื้อหาใหม่"}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
