import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe2, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { nationalityLabel } from "@/components/common/NationalitySelect";

interface Row {
  nationality: string;
  selftest_requests: number;
  pre_service_surveys: number;
  total: number;
}

interface Props {
  start: string;
  end: string;
}

const FOCUS = new Set(["myanmar", "lao", "cambodian"]);

export function NationalityBreakdownCard({ start, end }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_nationality_analytics" as never, {
        p_start: start,
        p_end: end,
      } as never);
      if (error) throw error;
      setRows(
        ((data ?? []) as Row[]).map((r) => ({
          nationality: r.nationality,
          selftest_requests: Number(r.selftest_requests) || 0,
          pre_service_surveys: Number(r.pre_service_surveys) || 0,
          total: Number(r.total) || 0,
        })),
      );
    } catch (e) {
      console.error(e);
      toast.error("โหลดสถิติสัญชาติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    void load();
  }, [load]);

  const grand = rows.reduce((s, r) => s + r.total, 0);
  const answered = rows.filter((r) => r.nationality !== "unspecified").reduce((s, r) => s + r.total, 0);
  const focus = rows.filter((r) => FOCUS.has(r.nationality)).reduce((s, r) => s + r.total, 0);

  const exportCsv = () => {
    const header = "nationality,label,selftest_requests,pre_service_surveys,total\n";
    const body = rows
      .map((r) =>
        [r.nationality, nationalityLabel(r.nationality === "unspecified" ? null : r.nationality, "th"), r.selftest_requests, r.pre_service_surveys, r.total].join(","),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nationality-${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="print-block">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe2 className="h-4 w-4" /> สัญชาติ (สมัครใจ) – พม่า / ลาว / เขมร
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">รวมทั้งหมด</p>
            <p className="text-lg font-semibold">{grand.toLocaleString("th-TH")}</p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">ตอบสัญชาติ</p>
            <p className="text-lg font-semibold">
              {answered.toLocaleString("th-TH")}
              <span className="ml-1 text-xs text-muted-foreground">
                ({grand ? Math.round((answered / grand) * 100) : 0}%)
              </span>
            </p>
          </div>
          <div className="rounded-lg border p-2">
            <p className="text-xs text-muted-foreground">พม่า/ลาว/เขมร</p>
            <p className="text-lg font-semibold text-primary">{focus.toLocaleString("th-TH")}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2">สัญชาติ</th>
                <th className="py-2 text-right">ขอชุดตรวจ</th>
                <th className="py-2 text-right">แบบสอบถามก่อนบริการ</th>
                <th className="py-2 text-right">รวม</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.nationality}
                  className={`border-b last:border-0 ${FOCUS.has(r.nationality) ? "bg-primary/5" : ""}`}
                >
                  <td className="py-2 font-medium">
                    {r.nationality === "unspecified" ? "ไม่ระบุ" : nationalityLabel(r.nationality, "th")}
                  </td>
                  <td className="py-2 text-right">{r.selftest_requests.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right">{r.pre_service_surveys.toLocaleString("th-TH")}</td>
                  <td className="py-2 text-right font-semibold">{r.total.toLocaleString("th-TH")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          ฟิลด์สัญชาติเป็นแบบสมัครใจ ผู้รับบริการข้ามได้ และไม่ต้องแสดงเอกสารใด ๆ ใช้เพื่อวิเคราะห์การเข้าถึงในภาพรวมเท่านั้น
        </p>
      </CardContent>
    </Card>
  );
}
