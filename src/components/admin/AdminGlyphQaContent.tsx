import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ScanSearch, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  scanRoute,
  resultsToCsv,
  ISSUE_LABELS_TH,
  type PageScanResult,
} from "@/lib/glyphQa";

const DEFAULT_ROUTES: { path: string; label: string }[] = [
  { path: "/th", label: "หน้าแรก (ไทย)" },
  { path: "/en", label: "หน้าแรก (อังกฤษ)" },
  { path: "/hiv-selftest", label: "ขอชุดตรวจเอง" },
  { path: "/hiv-selftest?action=submit", label: "รายงานผลชุดตรวจ" },
  { path: "/clinic/book", label: "จองคิวคลินิก" },
  { path: "/my-appointments", label: "นัดหมายของฉัน" },
  { path: "/harm-reduction", label: "Harm Reduction" },
  { path: "/blog", label: "บทความ" },
  { path: "/support", label: "ศูนย์ช่วยเหลือ" },
  { path: "/rewards", label: "ของรางวัล" },
];

export default function AdminGlyphQaContent() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_ROUTES.map((r) => r.path));
  const [extra, setExtra] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<PageScanResult[]>([]);

  const routes = useMemo(() => {
    const custom = extra
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("/"))
      .map((p) => ({ path: p, label: "กำหนดเอง" }));
    return [...DEFAULT_ROUTES.filter((r) => selected.includes(r.path)), ...custom];
  }, [selected, extra]);

  const totalIssues = results.reduce((s, r) => s + r.issues.length, 0);

  const toggle = (path: string) =>
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));

  const run = async () => {
    if (!routes.length) {
      toast.error("เลือกอย่างน้อย 1 หน้า");
      return;
    }
    setRunning(true);
    setResults([]);
    setDone(0);
    const out: PageScanResult[] = [];
    for (const r of routes) {
      const res = await scanRoute(r.path, r.label);
      out.push(res);
      setResults([...out]);
      setDone(out.length);
    }
    setRunning(false);
    const issues = out.reduce((s, r) => s + r.issues.length, 0);
    toast.success(issues ? `พบปัญหา ${issues} รายการ` : "ไม่พบปัญหาการแสดงผล");
  };

  const scanCurrent = async () => {
    const { scanDocument } = await import("@/lib/glyphQa");
    const { issues, nodesScanned } = scanDocument(document);
    setResults([
      {
        path: window.location.pathname + window.location.search,
        label: "หน้าปัจจุบัน (admin)",
        ok: true,
        nodesScanned,
        issues,
        durationMs: 0,
      },
    ]);
    toast.success(issues.length ? `พบปัญหา ${issues.length} รายการ` : "หน้านี้ปกติ");
  };

  const downloadCsv = () => {
    const blob = new Blob([resultsToCsv(results)], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glyph-qa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" /> QA การแสดงผลตัวอักษร (Glyph QA)
          </CardTitle>
          <CardDescription>
            ตรวจหาปัญหาแบบเดียวกับที่เคยเจอ: ตัวอักษรละติน/ตัวเลขหาย, emoji แสดงเป็นกล่อง (tofu),
            อักขระเสีย (�) และข้อความที่มองไม่เห็น พร้อมสรุปว่าหน้าไหนมีปัญหา
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {DEFAULT_ROUTES.map((r) => (
              <label
                key={r.path}
                className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm cursor-pointer"
              >
                <Checkbox checked={selected.includes(r.path)} onCheckedChange={() => toggle(r.path)} />
                <span className="truncate">
                  {r.label} <span className="text-muted-foreground">{r.path}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">เพิ่ม path เอง (บรรทัดละ 1 รายการ ขึ้นต้นด้วย /)</p>
            <Textarea
              rows={3}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={"/th/blog/some-article\n/queue/silom"}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanSearch className="h-4 w-4 mr-2" />}
              เริ่มตรวจ {routes.length} หน้า
            </Button>
            <Button variant="outline" onClick={scanCurrent} disabled={running}>
              ตรวจหน้าปัจจุบัน
            </Button>
            <Button variant="outline" onClick={downloadCsv} disabled={!results.length}>
              <Download className="h-4 w-4 mr-2" /> ดาวน์โหลด CSV
            </Button>
          </div>

          {running && <Progress value={(done / Math.max(routes.length, 1)) * 100} />}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              รายงานผล
              <Badge variant={totalIssues ? "destructive" : "secondary"}>
                {totalIssues ? `${totalIssues} ปัญหา` : "ไม่พบปัญหา"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((r) => (
              <div key={r.path} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {r.issues.length || !r.ok ? (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-medium">{r.label || r.path}</span>
                    <span className="text-xs text-muted-foreground">{r.path}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.ok ? `${r.nodesScanned} nodes · ${r.durationMs}ms` : `ผิดพลาด: ${r.error}`}
                  </span>
                </div>

                {r.issues.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {r.issues.slice(0, 25).map((i, idx) => (
                      <div key={idx} className="rounded-lg bg-muted/40 p-2 text-xs space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive">{ISSUE_LABELS_TH[i.type]}</Badge>
                          {i.chars.length > 0 && (
                            <code className="px-1 rounded bg-background">{i.chars.join(" ")}</code>
                          )}
                        </div>
                        <p className="text-muted-foreground break-all">“{i.sample}”</p>
                        <p className="text-muted-foreground/70 break-all">{i.selector}</p>
                      </div>
                    ))}
                    {r.issues.length > 25 && (
                      <p className="text-xs text-muted-foreground">
                        และอีก {r.issues.length - 25} รายการ (ดูใน CSV)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
