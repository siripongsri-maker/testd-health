import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, Link2, BookOpen, Trash2, Edit, ArrowRight,
  Network, FileText, ExternalLink, Loader2,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
interface KGEntity {
  id: string; entity_type: string; slug: string;
  name_th: string; name_en: string;
  summary_th: string | null; summary_en: string | null;
  status: string; source_table: string | null; source_id: string | null;
  created_at: string;
}
interface KGRelation {
  id: string; from_entity_id: string; to_entity_id: string;
  relation_type: string; strength: number | null; notes: string | null;
}
interface KGSource {
  id: string; title: string; publisher: string | null;
  url: string | null; source_type: string | null; authority_score: number | null;
}

const ENTITY_TYPES = [
  "substance", "substance_category", "interaction_pair",
  "risk", "symptom", "withdrawal_symptom",
  "short_term_effect", "long_term_effect", "mental_health_effect",
  "sexual_health_concern", "prevention_action", "emergency_sign",
  "support_service", "educational_topic", "faq",
] as const;

const RELATION_TYPES = [
  "causes", "increases_risk_of", "interacts_with",
  "may_lead_to", "linked_to", "supports",
  "treated_by", "prevented_by", "related_to",
  "contraindicated_with", "category_of", "has_symptom",
] as const;

/* ── Main component ── */
export function AdminKnowledgeGraphContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [tab, setTab] = useState("entities");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Network className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{isEn ? "Knowledge Graph" : "กราฟความรู้"}</h2>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="entities">{isEn ? "Entities" : "เอนทิตี"}</TabsTrigger>
          <TabsTrigger value="relations">{isEn ? "Relations" : "ความสัมพันธ์"}</TabsTrigger>
          <TabsTrigger value="sources">{isEn ? "Sources" : "แหล่งอ้างอิง"}</TabsTrigger>
        </TabsList>

        <TabsContent value="entities"><EntitiesTab isEn={isEn} /></TabsContent>
        <TabsContent value="relations"><RelationsTab isEn={isEn} /></TabsContent>
        <TabsContent value="sources"><SourcesTab isEn={isEn} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Entities Tab ── */
function EntitiesTab({ isEn }: { isEn: boolean }) {
  const [entities, setEntities] = useState<KGEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KGEntity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("hr_knowledge_entities").select("*").order("created_at", { ascending: false }).limit(200);
    if (filterType !== "all") q = q.eq("entity_type", filterType as any);
    if (search) q = q.or(`name_en.ilike.%${search}%,name_th.ilike.%${search}%`);
    const { data } = await q;
    setEntities(data || []);
    setLoading(false);
  }, [filterType, search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: Partial<KGEntity>) => {
    if (editing) {
      await supabase.from("hr_knowledge_entities").update({
        name_en: form.name_en, name_th: form.name_th,
        summary_en: form.summary_en, summary_th: form.summary_th,
        entity_type: form.entity_type, slug: form.slug, status: form.status,
        updated_at: new Date().toISOString(),
      } as any).eq("id", editing.id);
      toast.success("Entity updated");
    } else {
      await supabase.from("hr_knowledge_entities").insert({
        name_en: form.name_en!, name_th: form.name_th!,
        summary_en: form.summary_en, summary_th: form.summary_th,
        entity_type: form.entity_type, slug: form.slug!, status: form.status || "draft",
      } as any);
      toast.success("Entity created");
    }
    setDialogOpen(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isEn ? "Delete this entity?" : "ลบเอนทิตีนี้?")) return;
    await supabase.from("hr_knowledge_entities").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const statusColor = (s: string) => s === "published" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isEn ? "Search entities..." : "ค้นหา..."} className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEn ? "All Types" : "ทุกประเภท"}</SelectItem>
            {ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />{isEn ? "Add" : "เพิ่ม"}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">{entities.length} {isEn ? "entities" : "เอนทิตี"}</div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "Name" : "ชื่อ"}</TableHead>
                <TableHead>{isEn ? "Type" : "ประเภท"}</TableHead>
                <TableHead>{isEn ? "Status" : "สถานะ"}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map(e => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{isEn ? e.name_en : e.name_th}</div>
                    <div className="text-xs text-muted-foreground">{e.slug}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{e.entity_type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(e.status)}`}>{e.status}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(e); setDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EntityDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} isEn={isEn} />
    </div>
  );
}

/* ── Entity Dialog ── */
function EntityDialog({ open, onClose, onSave, initial, isEn }: {
  open: boolean; onClose: () => void; onSave: (f: Partial<KGEntity>) => void; initial: KGEntity | null; isEn: boolean;
}) {
  const [form, setForm] = useState<Partial<KGEntity>>({});
  useEffect(() => {
    setForm(initial ? { ...initial } : { entity_type: "risk", status: "draft" });
  }, [initial, open]);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? (isEn ? "Edit Entity" : "แก้ไขเอนทิตี") : (isEn ? "New Entity" : "เอนทิตีใหม่")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={form.entity_type || ""} onValueChange={v => set("entity_type", v)}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>{ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="slug" value={form.slug || ""} onChange={e => set("slug", e.target.value)} />
          <Input placeholder="Name (EN)" value={form.name_en || ""} onChange={e => set("name_en", e.target.value)} />
          <Input placeholder="Name (TH)" value={form.name_th || ""} onChange={e => set("name_th", e.target.value)} />
          <Textarea placeholder="Summary (EN)" value={form.summary_en || ""} onChange={e => set("summary_en", e.target.value)} rows={2} />
          <Textarea placeholder="Summary (TH)" value={form.summary_th || ""} onChange={e => set("summary_th", e.target.value)} rows={2} />
          <Select value={form.status || "draft"} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isEn ? "Cancel" : "ยกเลิก"}</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name_en || !form.slug}>{isEn ? "Save" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Relations Tab ── */
function RelationsTab({ isEn }: { isEn: boolean }) {
  const [relations, setRelations] = useState<(KGRelation & { from_name?: string; to_name?: string })[]>([]);
  const [entities, setEntities] = useState<{ id: string; name_en: string; name_th: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rels }, { data: ents }] = await Promise.all([
      supabase.from("hr_knowledge_relations").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("hr_knowledge_entities").select("id, name_en, name_th").limit(500),
    ]);
    const entMap = new Map((ents || []).map(e => [e.id, e]));
    setEntities(ents || []);
    setRelations((rels || []).map(r => ({
      ...r,
      from_name: isEn ? entMap.get(r.from_entity_id)?.name_en : entMap.get(r.from_entity_id)?.name_th,
      to_name: isEn ? entMap.get(r.to_entity_id)?.name_en : entMap.get(r.to_entity_id)?.name_th,
    })));
    setLoading(false);
  }, [isEn]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (from: string, to: string, type: string, strength: number) => {
    await supabase.from("hr_knowledge_relations").insert({
      from_entity_id: from, to_entity_id: to,
      relation_type: type as any, strength,
    });
    toast.success("Relation added");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hr_knowledge_relations").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">{relations.length} {isEn ? "relations" : "ความสัมพันธ์"}</div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />{isEn ? "Add" : "เพิ่ม"}</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "From" : "จาก"}</TableHead>
                <TableHead>{isEn ? "Relation" : "ความสัมพันธ์"}</TableHead>
                <TableHead>{isEn ? "To" : "ถึง"}</TableHead>
                <TableHead>{isEn ? "Str" : "ค่า"}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {relations.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.from_name || r.from_entity_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.relation_type.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell className="text-sm">{r.to_name || r.to_entity_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.strength}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <RelationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleAdd} entities={entities} isEn={isEn} />
    </div>
  );
}

/* ── Relation Dialog ── */
function RelationDialog({ open, onClose, onSave, entities, isEn }: {
  open: boolean; onClose: () => void;
  onSave: (from: string, to: string, type: string, strength: number) => void;
  entities: { id: string; name_en: string; name_th: string }[]; isEn: boolean;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("related_to");
  const [strength, setStrength] = useState(5);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEn ? "Add Relation" : "เพิ่มความสัมพันธ์"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger><SelectValue placeholder={isEn ? "From entity" : "จากเอนทิตี"} /></SelectTrigger>
            <SelectContent className="max-h-60">
              {entities.map(e => <SelectItem key={e.id} value={e.id}>{isEn ? e.name_en : e.name_th}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RELATION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger><SelectValue placeholder={isEn ? "To entity" : "ถึงเอนทิตี"} /></SelectTrigger>
            <SelectContent className="max-h-60">
              {entities.map(e => <SelectItem key={e.id} value={e.id}>{isEn ? e.name_en : e.name_th}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground">{isEn ? "Strength (1-10)" : "ความแข็ง (1-10)"}</label>
            <Input type="number" min={1} max={10} value={strength} onChange={e => setStrength(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isEn ? "Cancel" : "ยกเลิก"}</Button>
          <Button onClick={() => onSave(from, to, type, strength)} disabled={!from || !to}>{isEn ? "Add" : "เพิ่ม"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Sources Tab ── */
function SourcesTab({ isEn }: { isEn: boolean }) {
  const [sources, setSources] = useState<KGSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("hr_knowledge_sources").select("*").order("created_at", { ascending: false });
    setSources(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (form: Partial<KGSource>) => {
    await supabase.from("hr_knowledge_sources").insert({
      title: form.title!, publisher: form.publisher,
      url: form.url, source_type: form.source_type || "guideline",
      authority_score: form.authority_score || 5,
    });
    toast.success("Source added");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hr_knowledge_sources").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">{sources.length} {isEn ? "sources" : "แหล่งอ้างอิง"}</div>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />{isEn ? "Add" : "เพิ่ม"}</Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "Title" : "ชื่อ"}</TableHead>
                <TableHead>{isEn ? "Publisher" : "ผู้จัดทำ"}</TableHead>
                <TableHead>{isEn ? "Score" : "คะแนน"}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{s.title}</div>
                    {s.url && <a href={s.url} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1"><ExternalLink className="h-3 w-3" />{isEn ? "Link" : "ลิงก์"}</a>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.publisher || "—"}</TableCell>
                  <TableCell className="text-sm">{s.authority_score}/10</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SourceDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleAdd} isEn={isEn} />
    </div>
  );
}

/* ── Source Dialog ── */
function SourceDialog({ open, onClose, onSave, isEn }: {
  open: boolean; onClose: () => void; onSave: (f: Partial<KGSource>) => void; isEn: boolean;
}) {
  const [form, setForm] = useState<Partial<KGSource>>({ authority_score: 5 });
  useEffect(() => { if (open) setForm({ authority_score: 5 }); }, [open]);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEn ? "Add Source" : "เพิ่มแหล่งอ้างอิง"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Title" value={form.title || ""} onChange={e => set("title", e.target.value)} />
          <Input placeholder="Publisher (e.g. WHO)" value={form.publisher || ""} onChange={e => set("publisher", e.target.value)} />
          <Input placeholder="URL" value={form.url || ""} onChange={e => set("url", e.target.value)} />
          <Select value={form.source_type || "guideline"} onValueChange={v => set("source_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="guideline">Guideline</SelectItem>
              <SelectItem value="peer_reviewed">Peer-reviewed</SelectItem>
              <SelectItem value="ngo_report">NGO Report</SelectItem>
              <SelectItem value="government">Government</SelectItem>
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground">{isEn ? "Authority Score (1-10)" : "คะแนนความน่าเชื่อถือ (1-10)"}</label>
            <Input type="number" min={1} max={10} value={form.authority_score || 5} onChange={e => set("authority_score", Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{isEn ? "Cancel" : "ยกเลิก"}</Button>
          <Button onClick={() => onSave(form)} disabled={!form.title}>{isEn ? "Add" : "เพิ่ม"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AdminKnowledgeGraphContent;
