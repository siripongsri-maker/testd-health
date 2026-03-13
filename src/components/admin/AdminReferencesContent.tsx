import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, BookOpen, Link2, ExternalLink, Pencil, Trash2,
  Search, RefreshCw, AlertTriangle, CheckCircle2,
} from "lucide-react";

interface Reference {
  id: string;
  title: string;
  organization: string;
  url: string | null;
  source_type: string;
  year: number | null;
  credibility_level: string;
  citation_short: string;
  citation_full: string | null;
  is_active: boolean;
  created_at: string;
}

interface PageLink {
  id: string;
  page_type: string;
  page_slug: string;
  section_key: string | null;
  citation_note: string | null;
  display_order: number;
  reference_id: string;
  created_at: string;
}

const SOURCE_TYPES = ["guideline", "report", "journal", "website", "toolkit", "factsheet"];
const CREDIBILITY_LEVELS = ["global_guidance", "national_guidance", "peer_reviewed", "harm_reduction_resource"];
const PAGE_TYPES = ["substance", "interaction", "harm_reduction", "hiv_selftest", "mental_health", "seo_landing"];

const credLabels: Record<string, string> = {
  global_guidance: "Global guidance",
  national_guidance: "National guidance",
  peer_reviewed: "Peer-reviewed",
  harm_reduction_resource: "Harm reduction",
};

const emptyRef = {
  title: "", organization: "", url: "", source_type: "guideline",
  year: new Date().getFullYear(), credibility_level: "global_guidance",
  citation_short: "", citation_full: "", is_active: true,
};

export default function AdminReferencesContent() {
  const { t } = useLanguage();
  const [refs, setRefs] = useState<Reference[]>([]);
  const [links, setLinks] = useState<PageLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editRef, setEditRef] = useState<any>(null);
  const [showRefDialog, setShowRefDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkForm, setLinkForm] = useState({ page_type: "substance", page_slug: "", reference_id: "", section_key: "", citation_note: "", display_order: 0 });
  const [tab, setTab] = useState("references");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: l }] = await Promise.all([
      supabase.from("hr_references").select("*").order("organization").order("title"),
      supabase.from("hr_page_reference_links").select("*").order("page_type").order("page_slug").order("display_order"),
    ]);
    if (r) setRefs(r as Reference[]);
    if (l) setLinks(l as PageLink[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveRef = async () => {
    if (!editRef?.title || !editRef?.organization || !editRef?.citation_short) {
      toast.error("Title, organization, and citation short are required");
      return;
    }
    const payload = {
      title: editRef.title,
      organization: editRef.organization,
      url: editRef.url || null,
      source_type: editRef.source_type,
      year: editRef.year || null,
      credibility_level: editRef.credibility_level,
      citation_short: editRef.citation_short,
      citation_full: editRef.citation_full || null,
      is_active: editRef.is_active,
    };

    if (editRef.id) {
      const { error } = await supabase.from("hr_references").update(payload).eq("id", editRef.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Reference updated");
    } else {
      const { error } = await supabase.from("hr_references").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Reference added");
    }
    setShowRefDialog(false);
    setEditRef(null);
    fetchData();
  };

  const deleteRef = async (id: string) => {
    if (!confirm("Delete this reference?")) return;
    await supabase.from("hr_references").delete().eq("id", id);
    toast.success("Reference deleted");
    fetchData();
  };

  const saveLink = async () => {
    if (!linkForm.page_slug || !linkForm.reference_id) {
      toast.error("Page slug and reference are required");
      return;
    }
    const { error } = await supabase.from("hr_page_reference_links").insert({
      page_type: linkForm.page_type,
      page_slug: linkForm.page_slug,
      reference_id: linkForm.reference_id,
      section_key: linkForm.section_key || null,
      citation_note: linkForm.citation_note || null,
      display_order: linkForm.display_order,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Reference linked to page");
    setShowLinkDialog(false);
    setLinkForm({ page_type: "substance", page_slug: "", reference_id: "", section_key: "", citation_note: "", display_order: 0 });
    fetchData();
  };

  const deleteLink = async (id: string) => {
    await supabase.from("hr_page_reference_links").delete().eq("id", id);
    toast.success("Link removed");
    fetchData();
  };

  const bulkAttach = async (refId: string, pageType: string, slugs: string[]) => {
    const inserts = slugs.map((slug, i) => ({
      page_type: pageType,
      page_slug: slug,
      reference_id: refId,
      display_order: i,
    }));
    const { error } = await supabase.from("hr_page_reference_links").insert(inserts);
    if (error) toast.error(error.message);
    else { toast.success(`Linked to ${slugs.length} pages`); fetchData(); }
  };

  const filtered = refs.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.organization.toLowerCase().includes(search.toLowerCase()) ||
    r.citation_short.toLowerCase().includes(search.toLowerCase())
  );

  // Find pages with no references
  const linkedSlugs = new Set(links.map(l => `${l.page_type}:${l.page_slug}`));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.references")}</h1>
          <p className="text-sm text-muted-foreground">Manage source citations across health knowledge pages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{refs.length}</p>
          <p className="text-xs text-muted-foreground">Total References</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{refs.filter(r => r.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{links.length}</p>
          <p className="text-xs text-muted-foreground">Page Links</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{new Set(links.map(l => `${l.page_type}:${l.page_slug}`)).size}</p>
          <p className="text-xs text-muted-foreground">Pages with Citations</p>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="references"><BookOpen className="h-4 w-4 mr-1" /> References</TabsTrigger>
          <TabsTrigger value="page-links"><Link2 className="h-4 w-4 mr-1" /> Page Links</TabsTrigger>
        </TabsList>

        <TabsContent value="references" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search references..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditRef({ ...emptyRef }); setShowRefDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Reference
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Citation</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.citation_short}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">{r.title}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.organization}</TableCell>
                    <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{r.source_type}</span></TableCell>
                    <TableCell><span className="text-xs">{credLabels[r.credibility_level] || r.credibility_level}</span></TableCell>
                    <TableCell className="text-sm">{r.year || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditRef(r); setShowRefDialog(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteRef(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No references found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="page-links" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowLinkDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Link Reference to Page
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-16">Del</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(l => {
                  const ref = refs.find(r => r.id === l.reference_id);
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted mr-1">{l.page_type}</span>
                        <span className="text-sm">{l.page_slug}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{l.section_key || "—"}</TableCell>
                      <TableCell className="text-sm">{ref?.citation_short || l.reference_id}</TableCell>
                      <TableCell className="text-sm">{l.display_order}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLink(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {links.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No page links yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reference Dialog */}
      <Dialog open={showRefDialog} onOpenChange={setShowRefDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRef?.id ? "Edit Reference" : "Add Reference"}</DialogTitle>
          </DialogHeader>
          {editRef && (
            <div className="space-y-4">
              <div><Label>Title *</Label><Input value={editRef.title} onChange={e => setEditRef({ ...editRef, title: e.target.value })} /></div>
              <div><Label>Organization *</Label><Input value={editRef.organization} onChange={e => setEditRef({ ...editRef, organization: e.target.value })} /></div>
              <div><Label>Citation Short *</Label><Input value={editRef.citation_short} onChange={e => setEditRef({ ...editRef, citation_short: e.target.value })} placeholder="e.g. WHO" /></div>
              <div><Label>URL</Label><Input value={editRef.url || ""} onChange={e => setEditRef({ ...editRef, url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Source Type</Label>
                  <Select value={editRef.source_type} onValueChange={v => setEditRef({ ...editRef, source_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Credibility</Label>
                  <Select value={editRef.credibility_level} onValueChange={v => setEditRef({ ...editRef, credibility_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CREDIBILITY_LEVELS.map(l => <SelectItem key={l} value={l}>{credLabels[l]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Year</Label><Input type="number" value={editRef.year || ""} onChange={e => setEditRef({ ...editRef, year: parseInt(e.target.value) || null })} /></div>
              <div><Label>Full Citation</Label><Textarea value={editRef.citation_full || ""} onChange={e => setEditRef({ ...editRef, citation_full: e.target.value })} rows={2} /></div>
              <Button className="w-full" onClick={saveRef}>Save Reference</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Page Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Link Reference to Page</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Page Type</Label>
              <Select value={linkForm.page_type} onValueChange={v => setLinkForm({ ...linkForm, page_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Page Slug *</Label><Input value={linkForm.page_slug} onChange={e => setLinkForm({ ...linkForm, page_slug: e.target.value })} placeholder="e.g. methamphetamine" /></div>
            <div>
              <Label>Reference *</Label>
              <Select value={linkForm.reference_id} onValueChange={v => setLinkForm({ ...linkForm, reference_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                <SelectContent>{refs.filter(r => r.is_active).map(r => <SelectItem key={r.id} value={r.id}>{r.citation_short} — {r.organization}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Section Key (optional)</Label><Input value={linkForm.section_key} onChange={e => setLinkForm({ ...linkForm, section_key: e.target.value })} placeholder="e.g. why_risky, emergency_signs" /></div>
            <div><Label>Display Order</Label><Input type="number" value={linkForm.display_order} onChange={e => setLinkForm({ ...linkForm, display_order: parseInt(e.target.value) || 0 })} /></div>
            <Button className="w-full" onClick={saveLink}>Link to Page</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
