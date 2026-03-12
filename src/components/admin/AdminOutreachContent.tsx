import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Search, ExternalLink, Mail, Globe, Building2,
  Calendar, ChevronDown, ChevronUp, X, Loader2, Link2,
  Filter
} from "lucide-react";

interface OutreachContact {
  id: string;
  organization_name: string;
  organization_type: string;
  website: string | null;
  country: string | null;
  region: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_role: string | null;
  target_asset: string | null;
  outreach_status: string;
  campaign_type: string | null;
  backlink_url: string | null;
  backlink_status: string;
  notes: string | null;
  date_contacted: string | null;
  date_responded: string | null;
  date_link_live: string | null;
  priority: string;
  created_at: string;
}

const ORG_TYPES = [
  { value: "global_health", label: "Global Health / UN" },
  { value: "ngo", label: "NGO / Community" },
  { value: "academic", label: "Academic / Research" },
  { value: "media", label: "Health Media" },
  { value: "community", label: "Community Group" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "identified", label: "Identified", color: "bg-muted text-muted-foreground" },
  { value: "researched", label: "Researched", color: "bg-blue-500/15 text-blue-700" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500/15 text-yellow-700" },
  { value: "in_conversation", label: "In Conversation", color: "bg-orange-500/15 text-orange-700" },
  { value: "agreed", label: "Agreed", color: "bg-green-500/15 text-green-700" },
  { value: "link_live", label: "Link Live", color: "bg-primary/15 text-primary" },
  { value: "declined", label: "Declined", color: "bg-destructive/15 text-destructive" },
  { value: "no_response", label: "No Response", color: "bg-muted text-muted-foreground" },
];

const CAMPAIGNS = [
  { value: "resource_inclusion", label: "Resource Inclusion" },
  { value: "co_branded_guide", label: "Co-branded Guide" },
  { value: "data_insight", label: "Data Insight" },
  { value: "expert_review", label: "Expert Review" },
  { value: "toolkit_share", label: "Toolkit Share" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

const ASSETS = [
  "Drug Combination Risk Checker",
  "Substance Knowledge Library",
  "Chemsex Safety Hub",
  "HIV Self-Test Guide",
  "Harm Reduction Quick Guides",
  "Youth Safe Support Page",
  "Public Health Explainers",
  "Bilingual Knowledge Pages",
];

const PRIORITIES = [
  { value: "high", label: "High", color: "bg-destructive/15 text-destructive" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/15 text-yellow-700" },
  { value: "low", label: "Low", color: "bg-muted text-muted-foreground" },
];

const emptyForm = (): Partial<OutreachContact> => ({
  organization_name: "",
  organization_type: "ngo",
  website: "",
  country: "",
  region: "",
  contact_name: "",
  contact_email: "",
  contact_role: "",
  target_asset: "",
  outreach_status: "identified",
  campaign_type: null,
  backlink_url: "",
  backlink_status: "none",
  notes: "",
  priority: "medium",
});

export default function AdminOutreachContent() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<OutreachContact>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("outreach_contacts").select("*").order("created_at", { ascending: false });
    if (data) setContacts(data as unknown as OutreachContact[]);
    setLoading(false);
  };

  const save = async () => {
    if (!form.organization_name?.trim()) { toast.error("Organization name required"); return; }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editingId) {
      const { error } = await supabase.from("outreach_contacts").update(payload).eq("id", editingId);
      if (error) toast.error("Save failed"); else toast.success("Updated");
    } else {
      const { error } = await supabase.from("outreach_contacts").insert(payload as any);
      if (error) toast.error("Save failed"); else toast.success("Contact added");
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    await load();
  };

  const deleteContact = async (id: string) => {
    if (!confirm(isEn ? "Delete this contact?" : "ลบผู้ติดต่อนี้?")) return;
    await supabase.from("outreach_contacts").delete().eq("id", id);
    toast.success("Deleted");
    await load();
  };

  const openEdit = (c: OutreachContact) => {
    setEditingId(c.id);
    setForm(c);
    setDialogOpen(true);
  };

  const filtered = contacts.filter(c => {
    if (statusFilter !== "all" && c.outreach_status !== statusFilter) return false;
    if (typeFilter !== "all" && c.organization_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.organization_name.toLowerCase().includes(q) ||
        c.contact_name?.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const stats = {
    total: contacts.length,
    contacted: contacts.filter(c => !["identified", "researched"].includes(c.outreach_status)).length,
    live: contacts.filter(c => c.backlink_status === "live").length,
    high: contacts.filter(c => c.priority === "high").length,
  };

  const statusColor = (s: string) => STATUSES.find(st => st.value === s)?.color || "";
  const priorityColor = (p: string) => PRIORITIES.find(pr => pr.value === p)?.color || "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">{isEn ? "Outreach & Backlinks" : "ติดต่อและ Backlinks"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEn ? "Manage authority-building partnerships" : "จัดการพาร์ทเนอร์สร้างความน่าเชื่อถือ"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm()); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {isEn ? "Add Contact" : "เพิ่มผู้ติดต่อ"}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? (isEn ? "Edit Contact" : "แก้ไข") : (isEn ? "Add Contact" : "เพิ่มผู้ติดต่อ")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Organization Name *" value={form.organization_name || ""} onChange={e => setForm({ ...form, organization_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.organization_type || "ngo"} onValueChange={v => setForm({ ...form, organization_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority || "medium"} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Website" value={form.website || ""} onChange={e => setForm({ ...form, website: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Country" value={form.country || ""} onChange={e => setForm({ ...form, country: e.target.value })} />
                <Input placeholder="Region" value={form.region || ""} onChange={e => setForm({ ...form, region: e.target.value })} />
              </div>
              <Input placeholder="Contact Name" value={form.contact_name || ""} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Email" value={form.contact_email || ""} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                <Input placeholder="Role" value={form.contact_role || ""} onChange={e => setForm({ ...form, contact_role: e.target.value })} />
              </div>
              <Select value={form.target_asset || ""} onValueChange={v => setForm({ ...form, target_asset: v })}>
                <SelectTrigger><SelectValue placeholder="Target Asset" /></SelectTrigger>
                <SelectContent>{ASSETS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.outreach_status || "identified"} onValueChange={v => setForm({ ...form, outreach_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.campaign_type || ""} onValueChange={v => setForm({ ...form, campaign_type: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Campaign Type" /></SelectTrigger>
                  <SelectContent>{CAMPAIGNS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Backlink URL" value={form.backlink_url || ""} onChange={e => setForm({ ...form, backlink_url: e.target.value })} />
              <Select value={form.backlink_status || "none"} onValueChange={v => setForm({ ...form, backlink_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Backlink</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="removed">Removed</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Notes" value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {isEn ? "Save" : "บันทึก"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isEn ? "Total Contacts" : "ผู้ติดต่อทั้งหมด", value: stats.total, icon: Building2 },
          { label: isEn ? "Contacted" : "ติดต่อแล้ว", value: stats.contacted, icon: Mail },
          { label: isEn ? "Links Live" : "ลิงก์ใช้งาน", value: stats.live, icon: Link2 },
          { label: isEn ? "High Priority" : "สำคัญ", value: stats.high, icon: Calendar },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isEn ? "Search..." : "ค้นหา..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEn ? "All Statuses" : "ทุกสถานะ"}</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEn ? "All Types" : "ทุกประเภท"}</SelectItem>
            {ORG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Contact list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{isEn ? "No contacts found" : "ไม่พบผู้ติดต่อ"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{c.organization_name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor(c.outreach_status)}`}>
                        {STATUSES.find(s => s.value === c.outreach_status)?.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {ORG_TYPES.find(t => t.value === c.organization_type)?.label}
                      </span>
                      {c.country && <span className="text-[10px] text-muted-foreground">{c.country}</span>}
                    </div>
                  </div>
                </div>
                {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expandedId === c.id && (
                <div className="px-4 pb-4 pt-0 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {c.contact_name && <div><span className="text-muted-foreground text-xs">Contact:</span> <span>{c.contact_name}</span></div>}
                    {c.contact_email && <div><span className="text-muted-foreground text-xs">Email:</span> <span>{c.contact_email}</span></div>}
                    {c.target_asset && <div><span className="text-muted-foreground text-xs">Target:</span> <span>{c.target_asset}</span></div>}
                    {c.campaign_type && <div><span className="text-muted-foreground text-xs">Campaign:</span> <span>{CAMPAIGNS.find(ct => ct.value === c.campaign_type)?.label}</span></div>}
                    {c.website && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Website:</span>{" "}
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {c.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {c.backlink_url && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground text-xs">Backlink:</span>{" "}
                        <a href={c.backlink_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          {c.backlink_url} <ExternalLink className="h-3 w-3" />
                        </a>
                        <Badge variant="outline" className="ml-2 text-[10px]">{c.backlink_status}</Badge>
                      </div>
                    )}
                  </div>
                  {c.notes && <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">{c.notes}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                      {isEn ? "Edit" : "แก้ไข"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteContact(c.id)}>
                      {isEn ? "Delete" : "ลบ"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
