import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Search, BookOpen, Loader2, Save } from "lucide-react";

interface DictEntry {
  id: string;
  term_original: string;
  term_recommended: string;
  notes: string | null;
  category: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: "substance", label: "Substance / สาร" },
  { value: "health", label: "Health / สุขภาพ" },
  { value: "demographic", label: "Demographic / กลุ่มประชากร" },
  { value: "behavior", label: "Behavior / พฤติกรรม" },
  { value: "general", label: "General / ทั่วไป" },
];

export default function AdminLanguageDictionaryContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [entries, setEntries] = useState<DictEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  // New entry form
  const [newOriginal, setNewOriginal] = useState("");
  const [newRecommended, setNewRecommended] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [adding, setAdding] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hr_language_dictionary")
      .select("*")
      .order("category")
      .order("term_original");
    setEntries((data as DictEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async () => {
    if (!newOriginal.trim() || !newRecommended.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("hr_language_dictionary").insert({
      term_original: newOriginal.trim(),
      term_recommended: newRecommended.trim(),
      notes: newNotes.trim() || null,
      category: newCategory,
    });
    if (error) {
      toast.error("Failed to add entry");
    } else {
      toast.success("Entry added");
      setNewOriginal("");
      setNewRecommended("");
      setNewNotes("");
      await fetchEntries();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("hr_language_dictionary").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Deleted");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.term_original.toLowerCase().includes(q) || e.term_recommended.toLowerCase().includes(q);
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const catColor: Record<string, string> = {
    substance: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    health: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    demographic: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
    behavior: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    general: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isEn ? "Language Safety Dictionary" : "พจนานุกรมภาษาปลอดภัย"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Manage stigma-free terminology guidelines (WHO/UNAIDS aligned)"
              : "จัดการแนวทางการใช้คำที่ไม่ตีตรา (ตามมาตรฐาน WHO/UNAIDS)"}
          </p>
        </div>
      </div>

      {/* Add new entry */}
      <Card className="border border-primary/20">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {isEn ? "Add terminology guideline" : "เพิ่มแนวทางการใช้คำ"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{isEn ? "Original term (avoid)" : "คำเดิม (ควรหลีกเลี่ยง)"}</label>
              <Input value={newOriginal} onChange={(e) => setNewOriginal(e.target.value)} placeholder="e.g. ยาเสพติด" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{isEn ? "Recommended term" : "คำที่แนะนำ"}</label>
              <Input value={newRecommended} onChange={(e) => setNewRecommended(e.target.value)} placeholder="e.g. สารออกฤทธิ์" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{isEn ? "Notes" : "หมายเหตุ"}</label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder={isEn ? "Reference or context" : "อ้างอิงหรือบริบท"} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{isEn ? "Category" : "หมวดหมู่"}</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={adding || !newOriginal.trim() || !newRecommended.trim()}>
            {adding ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
            {isEn ? "Add" : "เพิ่ม"}
          </Button>
        </CardContent>
      </Card>

      {/* Filter / search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isEn ? "Search terms..." : "ค้นหาคำ..."} />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isEn ? "All categories" : "ทุกหมวด"}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isEn ? "Avoid" : "ควรหลีกเลี่ยง"}</TableHead>
                <TableHead>{isEn ? "Recommended" : "คำที่แนะนำ"}</TableHead>
                <TableHead className="hidden sm:table-cell">{isEn ? "Notes" : "หมายเหตุ"}</TableHead>
                <TableHead>{isEn ? "Category" : "หมวด"}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {isEn ? "No entries found" : "ไม่พบรายการ"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-destructive/80 line-through text-sm">{entry.term_original}</TableCell>
                    <TableCell className="text-sm text-foreground font-medium">{entry.term_recommended}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{entry.notes || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${catColor[entry.category || "general"] || catColor.general}`}>
                        {entry.category || "general"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        {isEn
          ? "Based on WHO harm reduction communication standards and UNAIDS terminology guidelines"
          : "อ้างอิงตามมาตรฐานการสื่อสารลดอันตรายของ WHO และแนวทางการใช้คำของ UNAIDS"}
      </p>
    </div>
  );
}
