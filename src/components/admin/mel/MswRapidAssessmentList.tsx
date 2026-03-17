import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, Plus, Eye, Download, MapPin, Users } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import MswRapidAssessmentForm from "./MswRapidAssessmentForm";

interface Assessment {
  id: string;
  email: string;
  survey_date: string;
  survey_time: string;
  venue_code: string;
  bangkok_area: string | null;
  pattaya_area: string | null;
  respondent_type: string;
  venue_type: string;
  msw_count_estimate: string;
  nationality_mix: string;
  created_at: string;
  [key: string]: any;
}

const MSW_COUNT_LABELS: Record<string, string> = {
  lt_5: "< 5",
  "5_10": "5–10",
  "11_20": "11–20",
  gt_20: "> 20",
};

export default function MswRapidAssessmentList() {
  const { language } = useLanguage();
  const isTh = language === "th";
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState<Assessment | null>(null);

  const { data: assessments, isLoading } = useQuery({
    queryKey: ["msw-rapid-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("msw_rapid_assessments" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as Assessment[];
    },
  });

  const exportCsv = () => {
    if (!assessments || assessments.length === 0) return;
    const headers = [
      "survey_date", "survey_time", "email", "venue_code", "bangkok_area", "pattaya_area",
      "respondent_type", "venue_type", "msw_count_estimate", "offsite_work_ratio",
      "nationality_mix", "foreign_groups", "language_skill", "other_primary_language",
      "health_info_language_priority", "health_info_channel", "created_at",
    ];
    const csvRows = [headers.join(",")];
    for (const a of assessments) {
      const row = headers.map((h) => {
        const val = a[h];
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
    a.download = `msw-rapid-assessment-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (showForm) {
    return <MswRapidAssessmentForm onClose={() => setShowForm(false)} />;
  }

  // Stats
  const total = assessments?.length || 0;
  const bkkCount = assessments?.filter((a) => a.venue_code === "bangkok").length || 0;
  const ptyCount = assessments?.filter((a) => a.venue_code === "pattaya_chonburi").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {isTh ? "แบบสอบถาม Peer Rapid MSW" : "Peer Rapid MSW Assessment"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isTh
              ? "ประเมินจำนวนโดยประมาณและลักษณะภาพรวมของ MSW"
              : "Estimate MSW count and characteristics"}
          </p>
        </div>
        <div className="flex gap-2">
          {total > 0 && (
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {isTh ? "ทำแบบสอบถาม" : "New Assessment"}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4" />
              {isTh ? "ทั้งหมด" : "Total"}
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {isTh ? "กรุงเทพฯ" : "Bangkok"}
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{bkkCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {isTh ? "พัทยา" : "Pattaya"}
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-foreground">{ptyCount}</p></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : total === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">{isTh ? "ยังไม่มีข้อมูลแบบสอบถาม" : "No assessments yet"}</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {isTh ? "เริ่มทำแบบสอบถาม" : "Start Assessment"}
            </Button>
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
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "พื้นที่" : "Area"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "สถานที่" : "Venue"}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{isTh ? "ผู้ให้ข้อมูล" : "Respondent"}</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">MSW #</th>
                    <th className="p-3 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {assessments?.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 whitespace-nowrap">{format(new Date(a.survey_date), "dd MMM yyyy")}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {a.venue_code === "bangkok" ? (isTh ? "กรุงเทพฯ" : "BKK") : (isTh ? "พัทยา" : "PTY")}
                        </Badge>
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          {a.bangkok_area || a.pattaya_area || ""}
                        </span>
                      </td>
                      <td className="p-3 text-xs">{a.venue_type}</td>
                      <td className="p-3 text-xs">{a.respondent_type}</td>
                      <td className="p-3 text-center font-medium">
                        {MSW_COUNT_LABELS[a.msw_count_estimate] || a.msw_count_estimate}
                      </td>
                      <td className="p-3">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewItem(a)}>
                          <Eye className="h-3.5 w-3.5" />
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

      {/* Detail drawer */}
      <Sheet open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isTh ? "รายละเอียดแบบสอบถาม" : "Assessment Details"}</SheetTitle>
          </SheetHeader>
          {viewItem && (
            <div className="mt-6 space-y-4">
              {[
                ["Email", viewItem.email],
                [isTh ? "วันที่" : "Date", viewItem.survey_date],
                [isTh ? "เวลา" : "Time", viewItem.survey_time],
                [isTh ? "พื้นที่" : "Venue Code", viewItem.venue_code === "bangkok" ? "กรุงเทพมหานคร" : "พัทยา ชลบุรี"],
                [isTh ? "ย่าน" : "Area", viewItem.bangkok_area || viewItem.pattaya_area || "—"],
                ["Peer Code", viewItem.bangkok_peer_code || viewItem.pattaya_peer_code || "—"],
                [isTh ? "ผู้ให้ข้อมูล" : "Respondent", viewItem.respondent_type],
                [isTh ? "ประเภทสถานที่" : "Venue Type", viewItem.venue_type],
                ["MSW #", MSW_COUNT_LABELS[viewItem.msw_count_estimate] || viewItem.msw_count_estimate],
                [isTh ? "สัดส่วนนอกสถานที่" : "Offsite Ratio", viewItem.offsite_work_ratio],
                [isTh ? "สัญชาติ" : "Nationality", viewItem.nationality_mix],
                [isTh ? "ต่างชาติ" : "Foreign Groups", Array.isArray(viewItem.foreign_groups) ? viewItem.foreign_groups.join(", ") : "—"],
                [isTh ? "ภาษา" : "Language", viewItem.language_skill],
                [isTh ? "ภาษาอื่น" : "Other Language", viewItem.other_primary_language || "—"],
                [isTh ? "ภาษาสุขภาพ" : "Health Info Lang", viewItem.health_info_language_priority],
                [isTh ? "ช่องทาง" : "Channel", viewItem.health_info_channel],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between border-b border-border pb-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
