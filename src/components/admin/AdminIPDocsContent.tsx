import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Shield, Users, Archive, FileDown, Clock, Target, Bookmark,
  CheckCircle2, AlertCircle, Edit3, Save, RefreshCw, Plus, Trash2,
  Copy, Eye, ChevronRight, Loader2, GaugeCircle, Scale, Fingerprint,
} from "lucide-react";
import { APP_VERSION } from "@/config/appVersion";

// ─── Types ────────────────────────────────────────────────────────
interface DocSection {
  id: string;
  section_key: string;
  title_en: string;
  title_th: string | null;
  content: Record<string, any>;
  status: string;
  updated_at: string;
}

interface Contributor {
  id: string;
  full_name: string;
  role: string;
  contribution_type: string | null;
  date_start: string | null;
  date_end: string | null;
  is_ip_owner: boolean;
  ownership_notes: string | null;
  created_at: string;
}

interface Evidence {
  id: string;
  title: string;
  category: string;
  description: string | null;
  document_date: string | null;
  version: string | null;
  tags: string[];
  related_module: string | null;
  proof_relevance: string | null;
  file_url: string | null;
  created_at: string;
}

interface ExportLog {
  id: string;
  export_type: string;
  doc_version: string | null;
  system_version: string | null;
  exported_at: string;
  notes: string | null;
}

// ─── Status helpers ───────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  ready: "bg-green-500/15 text-green-700 dark:text-green-400",
  needs_review: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  exported: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  needs_review: "Needs Review",
  exported: "Exported",
};

// ─── Feature inventory auto-generated from app structure ──────────
const AUTO_FEATURES = [
  { name: "HIV Self-Test Kit Request", desc: "NHSO-funded HIV self-test ordering with Thai ID verification, abuse detection, and shipping tracking", user: "Public", admin: "Kit Orders management", value: "Core health service delivery", ip: "Core Innovation", status: "Active" },
  { name: "Medication Tracker (PrEP/PEP)", desc: "Daily and on-demand PrEP adherence tracking, PEP emergency flow with countdown timers and weekly visualization", user: "Registered users", admin: "Analytics view", value: "Medication adherence improvement", ip: "Core Innovation", status: "Active" },
  { name: "Booking & Appointments", desc: "Multi-branch appointment scheduling with real-time slot availability, blackout management, self check-in/checkout", user: "Public + Registered", admin: "Branch timeline, today board, schedule", value: "Service access facilitation", ip: "Core Feature", status: "Active" },
  { name: "Educational Blog & Content", desc: "Bilingual health articles with rich text editor, categorization, likes, comments, and admin review workflow", user: "Public readers, community writers", admin: "Blog management, article review", value: "Health literacy improvement", ip: "Content Platform", status: "Active" },
  { name: "Survey System", desc: "Dynamic survey builder with multiple question types, consent management, analytics, and anonymous response collection", user: "Survey takers", admin: "Survey builder, analytics", value: "Data collection and M&E", ip: "Core Feature", status: "Active" },
  { name: "Gamification & Quests", desc: "XP system, leveling, badges, streaks, seasonal leaderboard, quest progression, and hall of fame", user: "Registered users", admin: "Rewards management", value: "User engagement and retention", ip: "Core Innovation", status: "Active" },
  { name: "Community Milestones", desc: "Collective community health goals with real-time progress tracking and group rewards", user: "All users", admin: "Milestone management", value: "Community motivation", ip: "Innovation", status: "Active" },
  { name: "Partner Invite Network", desc: "Peer-to-peer health testing invitations with SMS delivery, session tracking, booking attribution, and abuse monitoring", user: "Registered users", admin: "Invite management, pair sessions", value: "Peer outreach amplification", ip: "Core Innovation", status: "Active" },
  { name: "Community Chat", desc: "Topic-based chat rooms with real-time messaging, moderation, and anonymous participation", user: "Registered users", admin: "Chat moderation", value: "Peer support", ip: "Feature", status: "Active" },
  { name: "AI HIV Test Analysis", desc: "AI-powered rapid test strip image analysis using computer vision for result interpretation assistance", user: "Self-test users", admin: "Result review", value: "Accessibility improvement", ip: "Core Innovation", status: "Active" },
  { name: "Multi-language Translation", desc: "6-language support (TH, EN, KM, LO, VI, MY) with LLM-powered batch translation and database caching", user: "All users", admin: "Translation management", value: "Migrant population access", ip: "Innovation", status: "Active" },
  { name: "Analytics & Reporting", desc: "Event tracking, session analytics, daily summaries, funnel visualization, and CSV export with Thai encoding", user: "N/A", admin: "Full analytics dashboard", value: "Program monitoring", ip: "Feature", status: "Active" },
  { name: "Role-Based Admin Console", desc: "Multi-role admin system (super admin, moderator, M&E analyst) with branch-scoped access and 30+ management views", user: "N/A", admin: "Full operations suite", value: "Organizational management", ip: "Core Feature", status: "Active" },
  { name: "SMS Credits & Relay", desc: "Credit-based SMS delivery system for partner invitations with purchase tracking and balance management", user: "Credit purchasers", admin: "Credit & SMS management", value: "Communication infrastructure", ip: "Feature", status: "Active" },
  { name: "Notification System", desc: "In-app notifications with read tracking, expiry, targeted delivery, and bell indicator", user: "Registered users", admin: "Notification broadcast", value: "User engagement", ip: "Feature", status: "Active" },
  { name: "Health Profile", desc: "Personal health record for PrEP/PEP history, testing history, and side effect tracking", user: "Registered users", admin: "N/A", value: "Health continuity", ip: "Feature", status: "Active" },
];

// ─── Main Component ───────────────────────────────────────────────
export default function AdminIPDocsContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [sections, setSections] = useState<DocSection[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [exportLogs, setExportLogs] = useState<ExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // ─── Data loading ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [secRes, conRes, eviRes, expRes] = await Promise.all([
      supabase.from("ip_document_sections").select("*").order("section_key"),
      supabase.from("ip_contributors").select("*").order("is_ip_owner", { ascending: false }),
      supabase.from("ip_evidence").select("*").order("created_at", { ascending: false }),
      supabase.from("ip_export_logs").select("*").order("exported_at", { ascending: false }).limit(50),
    ]);
    if (secRes.data) setSections(secRes.data as DocSection[]);
    if (conRes.data) setContributors(conRes.data as Contributor[]);
    if (eviRes.data) setEvidence(eviRes.data as Evidence[]);
    if (expRes.data) setExportLogs(expRes.data as ExportLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Section helpers ──────────────────────────────────────────
  const getSection = (key: string) => sections.find(s => s.section_key === key);

  const startEditing = (key: string) => {
    const sec = getSection(key);
    if (sec) {
      setEditContent(JSON.stringify(sec.content, null, 2));
      setEditingSection(key);
    }
  };

  const saveSection = async (key: string, newStatus?: string) => {
    setSaving(true);
    try {
      const parsed = JSON.parse(editContent);
      const { error } = await supabase.from("ip_document_sections").update({
        content: parsed,
        status: newStatus || getSection(key)?.status || "draft",
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }).eq("section_key", key);
      if (error) throw error;
      toast.success("Section saved");
      setEditingSection(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSaving(false);
  };

  const updateSectionStatus = async (key: string, status: string) => {
    await supabase.from("ip_document_sections").update({
      status,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    }).eq("section_key", key);
    loadData();
    toast.success(`Status updated to ${STATUS_LABELS[status]}`);
  };

  // ─── Contributor CRUD ─────────────────────────────────────────
  const [showAddContributor, setShowAddContributor] = useState(false);
  const [newContributor, setNewContributor] = useState({ full_name: "", role: "", contribution_type: "", is_ip_owner: false, ownership_notes: "" });

  const addContributor = async () => {
    if (!newContributor.full_name || !newContributor.role) return toast.error("Name and role required");
    const { error } = await supabase.from("ip_contributors").insert({
      ...newContributor,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Contributor added");
    setShowAddContributor(false);
    setNewContributor({ full_name: "", role: "", contribution_type: "", is_ip_owner: false, ownership_notes: "" });
    loadData();
  };

  const deleteContributor = async (id: string) => {
    await supabase.from("ip_contributors").delete().eq("id", id);
    loadData();
    toast.success("Removed");
  };

  // ─── Evidence CRUD ────────────────────────────────────────────
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [newEvidence, setNewEvidence] = useState({ title: "", category: "screenshot", description: "", related_module: "", proof_relevance: "" });

  const addEvidence = async () => {
    if (!newEvidence.title) return toast.error("Title required");
    const { error } = await supabase.from("ip_evidence").insert({
      ...newEvidence,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Evidence added");
    setShowAddEvidence(false);
    setNewEvidence({ title: "", category: "screenshot", description: "", related_module: "", proof_relevance: "" });
    loadData();
  };

  const deleteEvidence = async (id: string) => {
    await supabase.from("ip_evidence").delete().eq("id", id);
    loadData();
  };

  // ─── Export ───────────────────────────────────────────────────
  const exportDocument = async (type: string) => {
    const section = getSection(type === "copyright" ? "copyright_dossier" : type === "trademark" ? "trademark_prep" : type === "license" ? "license_agreement" : "system_summary");
    const content = section?.content || {};
    
    let text = "";
    if (type === "full_dossier") {
      text = generateFullDossier();
    } else if (type === "copyright") {
      text = generateCopyrightPack(content);
    } else if (type === "trademark") {
      text = generateTrademarkPack(content);
    } else if (type === "license") {
      text = generateLicenseDraft(content);
    } else {
      text = generateSummaryOnePager();
    }

    // Download as text file
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `testD_${type}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // Log export
    await supabase.from("ip_export_logs").insert({
      export_type: type,
      doc_version: "1.0",
      system_version: APP_VERSION,
      exported_by: user?.id,
    });
    loadData();
    toast.success("Document exported");
  };

  // ─── Document generators ─────────────────────────────────────
  const generateFullDossier = () => {
    const sys = getSection("system_summary")?.content || {};
    const copy = getSection("copyright_dossier")?.content || {};
    const tech = getSection("technical_summary")?.content || {};
    return `
═══════════════════════════════════════════════════════════
  testD — INTELLECTUAL PROPERTY DOCUMENTATION DOSSIER
═══════════════════════════════════════════════════════════

Generated: ${new Date().toISOString()}
System Version: ${APP_VERSION}

─── 1. SYSTEM SUMMARY ─────────────────────────────────────
Product Name: ${sys.product_name || "testD"}
Tagline (TH): ${sys.tagline_th || "คนเทสต์ดีอยู่ที่นี่"}
Purpose: ${sys.purpose || ""}
Target Users: ${sys.target_users || ""}
Public Health Use: ${sys.public_health_use || ""}
Languages: ${(sys.languages || []).join(", ")}
Branches: ${sys.branches || ""}

Main Modules:
${(sys.main_modules || []).map((m: string, i: number) => `  ${i + 1}. ${m}`).join("\n")}

Innovation Highlights:
${(sys.innovation_highlights || []).map((h: string) => `  • ${h}`).join("\n")}

Privacy & Security: ${sys.privacy_approach || ""}

─── 2. COPYRIGHT INFORMATION ──────────────────────────────
Software Title: ${copy.software_title || ""}
Creation Objective: ${copy.creation_objective || ""}
Originality Statement: ${copy.originality_statement || ""}
Creator / IP Owner: ${copy.creator_name || "Siripong Srichau"}
Organization (Licensee): ${copy.organization || "SWING Foundation"}

─── 3. TECHNICAL ARCHITECTURE ─────────────────────────────
Frontend: ${tech.frontend || ""}
Backend: ${tech.backend || ""}
Database: ${tech.database || ""}
Authentication: ${tech.authentication || ""}
Analytics: ${tech.analytics || ""}
Multilingual: ${tech.multilingual || ""}
Security: ${tech.security || ""}

APIs & Integrations:
${(tech.apis || []).map((a: string) => `  • ${a}`).join("\n")}

─── 4. FEATURE INVENTORY ─────────────────────────────────
${AUTO_FEATURES.map((f, i) => `${i + 1}. ${f.name}
   ${f.desc}
   User: ${f.user} | Admin: ${f.admin}
   IP Category: ${f.ip} | Status: ${f.status}`).join("\n\n")}

─── 5. CONTRIBUTORS ──────────────────────────────────────
${contributors.map(c => `• ${c.full_name} — ${c.role}
  ${c.contribution_type || ""}
  IP Owner: ${c.is_ip_owner ? "YES" : "No"}
  ${c.ownership_notes || ""}`).join("\n\n")}

═══════════════════════════════════════════════════════════
  This document was auto-generated by testD IP Documentation Center
  For internal use only. Not legal advice.
═══════════════════════════════════════════════════════════
`.trim();
  };

  const generateCopyrightPack = (content: Record<string, any>) => `
═══════════════════════════════════════════════════════════
  testD — COPYRIGHT REGISTRATION SUPPORT DOSSIER
═══════════════════════════════════════════════════════════

Software Title: ${content.software_title || "testD - Digital Sexual Health Platform"}
Creator / Author: ${content.creator_name || "Siripong Srichau"}
Organization: ${content.organization || "SWING Foundation (licensee/operator)"}

Creation Objective:
${content.creation_objective || ""}

Originality Statement:
${content.originality_statement || ""}

Module Summary:
${AUTO_FEATURES.map((f, i) => `  ${i + 1}. ${f.name}: ${f.desc}`).join("\n")}

This document supports software copyright registration under Thai law.
Generated: ${new Date().toISOString()}
`.trim();

  const generateTrademarkPack = (content: Record<string, any>) => {
    const marks = content.marks || [];
    return `
═══════════════════════════════════════════════════════════
  testD — TRADEMARK PREPARATION SHEET
═══════════════════════════════════════════════════════════

${marks.map((m: any, i: number) => `
Mark ${i + 1}: ${m.name}
Type: ${m.type}
Slogan: ${m.slogan}
Intended Use: ${m.intended_use}
Target Audience: ${m.target_audience}
Service Category: ${m.service_category}
First Use: ${m.first_use_date}
Language Variants: ${(m.language_variants || []).join(", ")}
Filing Notes: ${m.filing_notes}
`).join("\n")}

Generated: ${new Date().toISOString()}
`.trim();
  };

  const generateLicenseDraft = (content: Record<string, any>) => `
═══════════════════════════════════════════════════════════
  SOFTWARE LICENSE AGREEMENT — DRAFT
═══════════════════════════════════════════════════════════

LICENSOR: ${content.licensor || "Siripong Srichau"} ("Creator / IP Owner")
LICENSEE: ${content.licensee || "SWING Foundation"} ("Organization")

1. GRANT OF LICENSE
The Licensor grants the Licensee a ${content.license_type || "non-exclusive"} license to use the software known as "testD" for the following purposes:
${(content.permitted_uses || []).map((u: string) => `   • ${u}`).join("\n")}

2. MODIFICATION
${content.modification_allowed ? "The Licensee is permitted to modify the software for operational purposes." : "The Licensee may not modify the software without prior written consent."}

3. SUBLICENSING
${content.sublicensing_allowed ? "Sublicensing is permitted with written approval." : "Sublicensing is not permitted."}

4. TERRITORY
${content.territory || "Thailand"}

5. DURATION
${content.duration || "Perpetual (subject to termination clause)"}

6. TERMINATION
${content.termination_conditions || "Material breach with 30-day cure period; mutual written agreement"}

7. ATTRIBUTION
${content.attribution_clause || ""}

8. DISCLAIMER
This document is an operational template and does not constitute legal advice.
Both parties are advised to seek independent legal counsel before execution.

Generated: ${new Date().toISOString()}
`.trim();

  const generateSummaryOnePager = () => {
    const sys = getSection("system_summary")?.content || {};
    return `
testD — System Summary One-Pager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product: ${sys.product_name || "testD"}
Tagline: ${sys.tagline_th || "คนเทสต์ดีอยู่ที่นี่"}

${sys.purpose || ""}

Target Users: ${sys.target_users || ""}
Languages: ${(sys.languages || []).join(", ")}
Creator: Siripong Srichau
Operator: SWING Foundation

Key Features: ${AUTO_FEATURES.length} modules
Innovation Highlights:
${(sys.innovation_highlights || []).map((h: string) => `• ${h}`).join("\n")}

Generated: ${new Date().toISOString()}
`.trim();
  };

  // ─── Readiness Score ──────────────────────────────────────────
  const readyCount = sections.filter(s => s.status === "ready" || s.status === "exported").length;
  const totalSections = sections.length || 1;
  const readinessScore = Math.round((readyCount / totalSections) * 100);
  const hasContributors = contributors.length >= 2;
  const hasEvidence = evidence.length >= 1;
  const bonusScore = Math.min(100, readinessScore + (hasContributors ? 10 : 0) + (hasEvidence ? 10 : 0));

  // ─── Render helpers ───────────────────────────────────────────
  const SectionStatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );

  const SectionCard = ({ sectionKey, icon: Icon, children }: { sectionKey: string; icon: React.ElementType; children: React.ReactNode }) => {
    const sec = getSection(sectionKey);
    if (!sec) return null;
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{sec.title_en}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <SectionStatusBadge status={sec.status} />
              <Select value={sec.status} onValueChange={(v) => updateSectionStatus(sectionKey, v)}>
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => startEditing(sectionKey)}>
                <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            </div>
          </div>
          {sec.title_th && <CardDescription>{sec.title_th}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Fingerprint className="h-6 w-6 text-primary" />
            IP Documentation Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Intellectual property documentation for testD platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">IP Readiness Score</p>
            <div className="flex items-center gap-2">
              <Progress value={bonusScore} className="w-24 h-2" />
              <span className="text-sm font-bold text-primary">{bonusScore}%</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Section editor dialog */}
      <Dialog open={!!editingSection} onOpenChange={(o) => !o && setEditingSection(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Section: {getSection(editingSection || "")?.title_en}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[55vh]">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[50vh] font-mono text-sm"
            />
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
            <Button onClick={() => saveSection(editingSection!)} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button variant="default" onClick={() => saveSection(editingSection!, "ready")} disabled={saving}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Save & Mark Ready
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { v: "overview", l: "Overview", i: GaugeCircle },
            { v: "summary", l: "System Summary", i: FileText },
            { v: "features", l: "Features", i: Target },
            { v: "technical", l: "Technical", i: Shield },
            { v: "copyright", l: "Copyright", i: Bookmark },
            { v: "trademark", l: "Trademark", i: Scale },
            { v: "contributors", l: "Contributors", i: Users },
            { v: "evidence", l: "Evidence", i: Archive },
            { v: "license", l: "License", i: FileText },
            { v: "exports", l: "Exports", i: FileDown },
            { v: "history", l: "History", i: Clock },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v} className="text-xs gap-1.5 px-3">
              <t.i className="h-3.5 w-3.5" /> {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── OVERVIEW ────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <GaugeCircle className="h-10 w-10 text-primary" />
                  <div>
                    <p className="text-3xl font-bold text-primary">{bonusScore}%</p>
                    <p className="text-xs text-muted-foreground">IP Readiness Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-3xl font-bold">{sections.length}</p>
                <p className="text-xs text-muted-foreground">Documentation Sections</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => {
                    const count = sections.filter(s => s.status === k).length;
                    if (!count) return null;
                    return <span key={k} className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[k]}`}>{count} {v}</span>;
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="text-3xl font-bold">{AUTO_FEATURES.length}</p>
                <p className="text-xs text-muted-foreground">Documented Features</p>
                <p className="text-xs text-muted-foreground mt-1">{contributors.length} contributors · {evidence.length} evidence items</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Section Completion Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.map(sec => (
                  <div key={sec.id} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <span className="text-sm">{sec.title_en}</span>
                    <div className="flex items-center gap-2">
                      <SectionStatusBadge status={sec.status} />
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setActiveTab(
                        sec.section_key === "system_summary" ? "summary" :
                        sec.section_key === "feature_inventory" ? "features" :
                        sec.section_key === "technical_summary" ? "technical" :
                        sec.section_key === "copyright_dossier" ? "copyright" :
                        sec.section_key === "trademark_prep" ? "trademark" :
                        sec.section_key === "license_agreement" ? "license" :
                        "history"
                      )}>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick export buttons */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Quick Export</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: "full_dossier", label: "Full IP Dossier" },
                  { type: "copyright", label: "Copyright Pack" },
                  { type: "trademark", label: "Trademark Prep" },
                  { type: "license", label: "License Draft" },
                  { type: "summary", label: "One-Pager Summary" },
                ].map(e => (
                  <Button key={e.type} variant="outline" size="sm" onClick={() => exportDocument(e.type)}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> {e.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SYSTEM SUMMARY ──────────────────────────────────── */}
        <TabsContent value="summary" className="mt-4">
          <SectionCard sectionKey="system_summary" icon={FileText}>
            {(() => {
              const c = getSection("system_summary")?.content || {};
              return (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Product Name</p><p className="font-medium">{c.product_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Tagline (TH)</p><p className="font-medium">{c.tagline_th}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Purpose</p><p>{c.purpose}</p></div>
                  <div><p className="text-xs text-muted-foreground">Target Users</p><p>{c.target_users}</p></div>
                  <div><p className="text-xs text-muted-foreground">Public Health Use</p><p>{c.public_health_use}</p></div>
                  <Separator />
                  <div><p className="text-xs text-muted-foreground mb-1">Main Modules</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {(c.main_modules || []).map((m: string, i: number) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Languages</p><p>{(c.languages || []).join(", ")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Branches</p><p>{c.branches}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground mb-1">Innovation Highlights</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {(c.innovation_highlights || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Privacy & Security Approach</p><p>{c.privacy_approach}</p></div>
                </div>
              );
            })()}
          </SectionCard>
        </TabsContent>

        {/* ── FEATURES ────────────────────────────────────────── */}
        <TabsContent value="features" className="mt-4 space-y-4">
          <SectionCard sectionKey="feature_inventory" icon={Target}>
            <div className="text-xs text-muted-foreground mb-3">
              Auto-generated from current app structure · {AUTO_FEATURES.length} features documented
            </div>
          </SectionCard>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium">#</th>
                      <th className="text-left p-3 font-medium">Feature</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">User</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">IP Category</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUTO_FEATURES.map((f, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3">
                          <p className="font-medium">{f.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.desc}</p>
                        </td>
                        <td className="p-3 text-xs hidden md:table-cell">{f.user}</td>
                        <td className="p-3 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${f.ip === "Core Innovation" ? "bg-primary/15 text-primary" : f.ip === "Innovation" ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground"}`}>
                            {f.ip}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400">{f.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TECHNICAL ───────────────────────────────────────── */}
        <TabsContent value="technical" className="mt-4">
          <SectionCard sectionKey="technical_summary" icon={Shield}>
            {(() => {
              const c = getSection("technical_summary")?.content || {};
              return (
                <div className="space-y-3 text-sm">
                  {["frontend", "backend", "database", "authentication", "analytics", "notifications", "multilingual", "security"].map(key => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground capitalize">{key}</p>
                      <p>{c[key] || "—"}</p>
                    </div>
                  ))}
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">APIs & Integrations</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {(c.apis || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </SectionCard>
        </TabsContent>

        {/* ── COPYRIGHT ───────────────────────────────────────── */}
        <TabsContent value="copyright" className="mt-4">
          <SectionCard sectionKey="copyright_dossier" icon={Bookmark}>
            {(() => {
              const c = getSection("copyright_dossier")?.content || {};
              return (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Software Title</p><p className="font-medium">{c.software_title}</p></div>
                    <div><p className="text-xs text-muted-foreground">Creator / IP Owner</p><p className="font-medium text-primary">{c.creator_name}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Organization (Licensee)</p><p>{c.organization}</p></div>
                  <Separator />
                  <div><p className="text-xs text-muted-foreground">Creation Objective</p><p>{c.creation_objective}</p></div>
                  <div><p className="text-xs text-muted-foreground">Originality Statement</p><p className="italic">{c.originality_statement}</p></div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => exportDocument("copyright")}>
                      <FileDown className="h-3.5 w-3.5 mr-1" /> Export Copyright Pack
                    </Button>
                  </div>
                </div>
              );
            })()}
          </SectionCard>
        </TabsContent>

        {/* ── TRADEMARK ───────────────────────────────────────── */}
        <TabsContent value="trademark" className="mt-4">
          <SectionCard sectionKey="trademark_prep" icon={Scale}>
            {(() => {
              const c = getSection("trademark_prep")?.content || {};
              const marks = c.marks || [];
              return (
                <div className="space-y-4">
                  {marks.map((m: any, i: number) => (
                    <Card key={i} className="border-border/30">
                      <CardContent className="pt-4 space-y-3 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div><p className="text-xs text-muted-foreground">Mark Name</p><p className="font-bold text-lg">{m.name}</p></div>
                          <div><p className="text-xs text-muted-foreground">Type</p><p>{m.type}</p></div>
                        </div>
                        <div><p className="text-xs text-muted-foreground">Slogan / Wordmark</p><p className="font-medium">{m.slogan}</p></div>
                        <div><p className="text-xs text-muted-foreground">Intended Use</p><p>{m.intended_use}</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div><p className="text-xs text-muted-foreground">Service Category</p><p>{m.service_category}</p></div>
                          <div><p className="text-xs text-muted-foreground">First Use Date</p><p>{m.first_use_date}</p></div>
                        </div>
                        <div><p className="text-xs text-muted-foreground">Language Variants</p><p>{(m.language_variants || []).join(", ")}</p></div>
                        <div><p className="text-xs text-muted-foreground">Filing Notes</p><p className="italic">{m.filing_notes}</p></div>
                      </CardContent>
                    </Card>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => exportDocument("trademark")}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Export Trademark Prep
                  </Button>
                </div>
              );
            })()}
          </SectionCard>
        </TabsContent>

        {/* ── CONTRIBUTORS ────────────────────────────────────── */}
        <TabsContent value="contributors" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Creator & Contributor Log
            </h3>
            <Button size="sm" onClick={() => setShowAddContributor(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Contributor
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            ⚠️ This log distinguishes between contributors and IP owners. Contributing to the project does not automatically confer IP ownership.
          </div>

          {contributors.map(c => (
            <Card key={c.id} className={`border-border/50 ${c.is_ip_owner ? "ring-1 ring-primary/30" : ""}`}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 text-sm flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base">{c.full_name}</p>
                      {c.is_ip_owner && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">IP Owner</span>}
                    </div>
                    <p className="text-muted-foreground">{c.role}</p>
                    {c.contribution_type && <p><span className="text-xs text-muted-foreground">Contribution:</span> {c.contribution_type}</p>}
                    {c.ownership_notes && <p className="text-xs italic text-muted-foreground">{c.ownership_notes}</p>}
                    {(c.date_start || c.date_end) && (
                      <p className="text-xs text-muted-foreground">
                        {c.date_start || "—"} → {c.date_end || "present"}
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => deleteContributor(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add contributor dialog */}
          <Dialog open={showAddContributor} onOpenChange={setShowAddContributor}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Contributor</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Full name" value={newContributor.full_name} onChange={e => setNewContributor(p => ({ ...p, full_name: e.target.value }))} />
                <Input placeholder="Role (e.g. Developer, Designer)" value={newContributor.role} onChange={e => setNewContributor(p => ({ ...p, role: e.target.value }))} />
                <Input placeholder="Contribution type" value={newContributor.contribution_type} onChange={e => setNewContributor(p => ({ ...p, contribution_type: e.target.value }))} />
                <Textarea placeholder="Ownership notes" value={newContributor.ownership_notes} onChange={e => setNewContributor(p => ({ ...p, ownership_notes: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newContributor.is_ip_owner} onChange={e => setNewContributor(p => ({ ...p, is_ip_owner: e.target.checked }))} />
                  Is IP Owner
                </label>
                <Button onClick={addContributor} className="w-full">Add Contributor</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── EVIDENCE ────────────────────────────────────────── */}
        <TabsContent value="evidence" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" /> Evidence Archive
            </h3>
            <Button size="sm" onClick={() => setShowAddEvidence(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Evidence
            </Button>
          </div>

          {evidence.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground text-sm">No evidence items yet. Add screenshots, release notes, or other proof-of-creation materials.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {evidence.map(e => (
                <Card key={e.id} className="border-border/50">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div className="flex items-start justify-between">
                      <p className="font-medium">{e.title}</p>
                      <Button variant="ghost" size="sm" className="text-destructive h-6" onClick={() => deleteEvidence(e.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs"><span className="px-1.5 py-0.5 rounded bg-muted">{e.category}</span></p>
                    {e.description && <p className="text-muted-foreground text-xs">{e.description}</p>}
                    {e.related_module && <p className="text-xs">Module: {e.related_module}</p>}
                    {e.proof_relevance && <p className="text-xs italic text-muted-foreground">Relevance: {e.proof_relevance}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={showAddEvidence} onOpenChange={setShowAddEvidence}>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Evidence Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Title" value={newEvidence.title} onChange={e => setNewEvidence(p => ({ ...p, title: e.target.value }))} />
                <Select value={newEvidence.category} onValueChange={v => setNewEvidence(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {["screenshot", "architecture", "release_note", "changelog", "concept_note", "policy_draft", "source_snapshot", "other"].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Description" value={newEvidence.description} onChange={e => setNewEvidence(p => ({ ...p, description: e.target.value }))} />
                <Input placeholder="Related module" value={newEvidence.related_module} onChange={e => setNewEvidence(p => ({ ...p, related_module: e.target.value }))} />
                <Input placeholder="Proof relevance" value={newEvidence.proof_relevance} onChange={e => setNewEvidence(p => ({ ...p, proof_relevance: e.target.value }))} />
                <Button onClick={addEvidence} className="w-full">Add Evidence</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── LICENSE ──────────────────────────────────────────── */}
        <TabsContent value="license" className="mt-4">
          <SectionCard sectionKey="license_agreement" icon={FileText}>
            {(() => {
              const c = getSection("license_agreement")?.content || {};
              return (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <p className="text-xs text-muted-foreground">Licensor (IP Owner)</p>
                      <p className="font-bold text-primary">{c.licensor}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Licensee (Organization)</p>
                      <p className="font-bold">{c.licensee}</p>
                    </div>
                  </div>
                  <Separator />
                  <div><p className="text-xs text-muted-foreground">License Type</p><p>{c.license_type}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Permitted Uses</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {(c.permitted_uses || []).map((u: string, i: number) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Modification Allowed</p><p>{c.modification_allowed ? "Yes" : "No"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Sublicensing Allowed</p><p>{c.sublicensing_allowed ? "Yes" : "No"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Territory</p><p>{c.territory}</p></div>
                    <div><p className="text-xs text-muted-foreground">Duration</p><p>{c.duration}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Termination Conditions</p><p>{c.termination_conditions}</p></div>
                  <div><p className="text-xs text-muted-foreground">Attribution Clause</p><p className="italic">{c.attribution_clause}</p></div>
                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={() => exportDocument("license")}>
                      <FileDown className="h-3.5 w-3.5 mr-1" /> Export License Draft
                    </Button>
                  </div>
                </div>
              );
            })()}
          </SectionCard>
        </TabsContent>

        {/* ── EXPORTS ─────────────────────────────────────────── */}
        <TabsContent value="exports" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="h-5 w-5 text-primary" /> Export Center
              </CardTitle>
              <CardDescription>Generate and download IP documentation bundles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { type: "full_dossier", title: "Full IP Dossier", desc: "Complete intellectual property documentation package" },
                  { type: "copyright", title: "Copyright Pack", desc: "Copyright registration support dossier" },
                  { type: "trademark", title: "Trademark Prep", desc: "Trademark filing preparation sheet" },
                  { type: "license", title: "License Draft", desc: "Software license agreement template" },
                  { type: "summary", title: "One-Pager Summary", desc: "Quick system overview for presentations" },
                ].map(e => (
                  <Card key={e.type} className="border-border/30 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => exportDocument(e.type)}>
                    <CardContent className="pt-4">
                      <p className="font-medium text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{e.desc}</p>
                      <Button variant="outline" size="sm" className="mt-3 w-full">
                        <FileDown className="h-3.5 w-3.5 mr-1" /> Download .txt
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── HISTORY ─────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <SectionCard sectionKey="version_history" icon={Clock}>
            <p className="text-sm text-muted-foreground">Current system version: <span className="font-mono font-medium">{APP_VERSION}</span></p>
          </SectionCard>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export History</CardTitle>
            </CardHeader>
            <CardContent>
              {exportLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No exports yet</p>
              ) : (
                <div className="space-y-2">
                  {exportLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 text-sm">
                      <div>
                        <p className="font-medium">{log.export_type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">v{log.doc_version} · sys {log.system_version}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{new Date(log.exported_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
