import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Loader2, Plus, Eye, Download, FileText, Search, MapPin, Users, BarChart3, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import FieldNoteForm from "./FieldNoteForm";
import { cn } from "@/lib/utils";

interface FieldNote {
  id: string;
  visit_date: string;
  start_time: string;
  end_time: string;
  observer_name: string;
  city: string;
  area_name: string;
  venue_alias: string;
  estimated_msw_seen: number;
  estimated_offsite_clients: string;
  visible_nationality_ratio: string;
  info_sources: string[];
  estimated_msw_per_night_range: string;
  foreign_msw_ratio: string;
  main_nationality_groups: string;
  common_languages: string;
  communication_barrier_level: string;
  barrier_observation_note: string | null;
  project_implications: string[];
  internal_note: string | null;
  is_draft: boolean;
  created_at: string;
  [key: string]: any;
}

export default function FieldNotesDashboard() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState<FieldNote | null>(null);
  const [filterCity, setFilterCity] = useState("all");
  const [filterBarrier, setFilterBarrier] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notes, isLoading } = useQuery({
    queryKey: ["field-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_notes" as any)
        .select("*")
        .eq("is_draft", false)
        .order("visit_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as FieldNote[];
    },
  });

  // Filtered notes
  const filtered = useMemo(() => {
    if (!notes) return [];
    return notes.filter((n) => {
      if (filterCity !== "all" && n.city !== filterCity) return false;
      if (filterBarrier !== "all" && n.communication_barrier_level !== filterBarrier) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.observer_name.toLowerCase().includes(q) ||
          n.area_name.toLowerCase().includes(q) ||
          n.venue_alias.toLowerCase().includes(q) ||
          n.main_nationality_groups.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notes, filterCity, filterBarrier, searchQuery]);

  // Stats
  const total = notes?.length || 0;
  const bkkCount = notes?.filter((n) => n.city === "กรุงเทพมหานคร").length || 0;
  const ptyCount = notes?.filter((n) => n.city === "พัทยา ชลบุรี").length || 0;
  const highBarrierCount = notes?.filter((n) => n.communication_barrier_level === "มีมาก").length || 0;

  // Top implications
  const implicationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    notes?.forEach((n) => n.project_implications.forEach((imp) => { map[imp] = (map[imp] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [notes]);

  // Barrier distribution
  const barrierDist = useMemo(() => {
    const map: Record<string, number> = { "ไม่มี": 0, "มีบ้าง": 0, "มีมาก": 0 };
    notes?.forEach((n) => { if (map[n.communication_barrier_level] !== undefined) map[n.communication_barrier_level]++; });
    return map;
  }, [notes]);

  // Top nationality groups
  const topNationalities = useMemo(() => {
    const map: Record<string, number> = {};
    notes?.forEach((n) => {
      if (n.main_nationality_groups) {
        n.main_nationality_groups.split(/[,\s]+/).forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) map[trimmed] = (map[trimmed] || 0) + 1;
        });
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [notes]);

  // CSV Export
  const exportCsv = () => {
    if (!filtered.length) return;
    const headers = [
      "visit_date", "start_time", "end_time", "observer_name", "city", "area_name", "venue_alias",
      "estimated_msw_seen", "estimated_offsite_clients", "visible_nationality_ratio",
      "info_sources", "estimated_msw_per_night_range", "foreign_msw_ratio", "main_nationality_groups",
      "common_languages", "communication_barrier_level", "barrier_observation_note",
      "project_implications", "internal_note", "created_at",
    ];
    const csvRows = [headers.join(",")];
    for (const n of filtered) {
      const row = headers.map((h) => {
        const val = (n as any)[h];
        if (Array.isArray(val)) return `"${val.join("; ")}"`;
        if (val === null || val === undefined) return "";
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `field-notes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showForm) {
    return <FieldNoteForm onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{isTh ? "บันทึกภาคสนาม" : "Field Notes"}</h2>
          <p className="text-muted-foreground text-sm">{isTh ? "บันทึกการสังเกตจากการลงพื้นที่" : "Outreach observation records"}</p>
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" />CSV
            </Button>
          )}
          <Button size="sm" className="gap-2 min-h-[44px]" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />{isTh ? "บันทึกใหม่" : "New Note"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><FileText className="h-4 w-4" />{isTh ? "ทั้งหมด" : "Total"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" />{isTh ? "กรุงเทพฯ" : "BKK"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{bkkCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" />{isTh ? "พัทยา" : "PTY"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{ptyCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />{isTh ? "อุปสรรคมาก" : "High Barrier"}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-foreground">{highBarrierCount}</p></CardContent></Card>
      </div>

      {/* Analytics Section */}
      {total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Barrier Distribution */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "อุปสรรคด้านการสื่อสาร" : "Communication Barriers"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(barrierDist).map(([level, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{level}</span>
                      <span className="font-medium text-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          level === "ไม่มี" ? "bg-green-500" : level === "มีบ้าง" ? "bg-amber-500" : "bg-destructive"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Top Implications */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "ผลกระทบที่พบบ่อย" : "Common Implications"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {implicationCounts.length === 0 && <p className="text-xs text-muted-foreground">{isTh ? "ยังไม่มีข้อมูล" : "No data"}</p>}
              {implicationCounts.map(([imp, count]) => (
                <div key={imp} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground leading-tight line-clamp-2 flex-1">{imp}</span>
                  <Badge variant="secondary" className="shrink-0">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Nationality Groups */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">{isTh ? "กลุ่มสัญชาติที่พบบ่อย" : "Top Nationality Groups"}</CardTitle></CardHeader>
            <CardContent>
              {topNationalities.length === 0 && <p className="text-xs text-muted-foreground">{isTh ? "ยังไม่มีข้อมูล" : "No data"}</p>}
              <div className="flex flex-wrap gap-2">
                {topNationalities.map(([group, count]) => (
                  <Badge key={group} variant="outline" className="text-xs">
                    {group} <span className="ml-1 font-bold text-primary">({count})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isTh ? "ค้นหาชื่อ พื้นที่ สถานที่..." : "Search..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? "ทุกเมือง" : "All Cities"}</SelectItem>
            <SelectItem value="กรุงเทพมหานคร">{isTh ? "กรุงเทพฯ" : "Bangkok"}</SelectItem>
            <SelectItem value="พัทยา ชลบุรี">{isTh ? "พัทยา" : "Pattaya"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBarrier} onValueChange={setFilterBarrier}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isTh ? "ทุกระดับอุปสรรค" : "All Barriers"}</SelectItem>
            <SelectItem value="ไม่มี">ไม่มี</SelectItem>
            <SelectItem value="มีบ้าง">มีบ้าง</SelectItem>
            <SelectItem value="มีมาก">มีมาก</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{total === 0 ? (isTh ? "ยังไม่มีบันทึกภาคสนาม" : "No field notes yet") : (isTh ? "ไม่พบผลลัพธ์" : "No results found")}</p>
            {total === 0 && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />{isTh ? "เริ่มบันทึก" : "Start Note"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "วันที่" : "Date"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ช่วงเวลา" : "Time"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ผู้สังเกต" : "Observer"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "เมือง" : "City"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "พื้นที่" : "Area"}</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">MSW #</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">{isTh ? "อุปสรรค" : "Barrier"}</th>
                    <th className="p-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((n) => (
                    <tr key={n.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap">{format(new Date(n.visit_date), "dd MMM yyyy")}</td>
                      <td className="p-3 whitespace-nowrap text-xs">{n.start_time?.slice(0, 5)}–{n.end_time?.slice(0, 5)}</td>
                      <td className="p-3 text-xs">{n.observer_name}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {n.city === "กรุงเทพมหานคร" ? "BKK" : "PTY"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{n.area_name}</td>
                      <td className="p-3 text-center font-medium">{n.estimated_msw_seen}</td>
                      <td className="p-3 text-center">
                        <Badge variant={n.communication_barrier_level === "มีมาก" ? "destructive" : n.communication_barrier_level === "มีบ้าง" ? "secondary" : "outline"} className="text-xs">
                          {n.communication_barrier_level}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewItem(n)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isTh ? "รายละเอียดบันทึก" : "Field Note Details"}</SheetTitle>
          </SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4">
              {[
                [isTh ? "วันที่" : "Date", viewItem.visit_date],
                [isTh ? "เวลา" : "Time", `${viewItem.start_time?.slice(0, 5)} – ${viewItem.end_time?.slice(0, 5)}`],
                [isTh ? "ผู้สังเกต" : "Observer", viewItem.observer_name],
                [isTh ? "เมือง" : "City", viewItem.city],
                [isTh ? "พื้นที่" : "Area", viewItem.area_name],
                [isTh ? "สถานที่" : "Venue", viewItem.venue_alias],
                ["MSW #", viewItem.estimated_msw_seen],
                [isTh ? "ออกนอกสถานที่" : "Offsite", viewItem.estimated_offsite_clients],
                [isTh ? "สัญชาติ" : "Nationality", viewItem.visible_nationality_ratio],
                [isTh ? "แหล่งข้อมูล" : "Sources", viewItem.info_sources?.join(", ")],
                ["MSW/คืน", viewItem.estimated_msw_per_night_range],
                [isTh ? "ต่างชาติ" : "Foreign Ratio", viewItem.foreign_msw_ratio],
                [isTh ? "สัญชาติหลัก" : "Main Groups", viewItem.main_nationality_groups],
                [isTh ? "ภาษา" : "Languages", viewItem.common_languages],
                [isTh ? "อุปสรรค" : "Barrier", viewItem.communication_barrier_level],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value || "—"}</span>
                </div>
              ))}
              {viewItem.barrier_observation_note && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{isTh ? "ข้อสังเกตอุปสรรค" : "Barrier Notes"}</span>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{viewItem.barrier_observation_note}</p>
                </div>
              )}
              {viewItem.project_implications?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">{isTh ? "ผลกระทบโครงการ" : "Implications"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewItem.project_implications.map((imp, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{imp}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewItem.internal_note && (
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{isTh ? "บันทึกภายใน" : "Internal Note"}</span>
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{viewItem.internal_note}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
