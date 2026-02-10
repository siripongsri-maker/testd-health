import { useState, useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload, FileSpreadsheet, Play, Eye, Loader2, CheckCircle2, AlertTriangle, Download, Database, FileSearch
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  insertedIds: string[];
  updatedIds: string[];
  csvType?: "bangkok" | "pattaya_reach" | "unknown";
}

export default function AdminImportContent() {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("silom");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"idle" | "dry_run" | "import">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);
  const [dbVerified, setDbVerified] = useState<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setDbVerified(null);
    }
  };

  const csvTypeLabel = (type?: string) => {
    if (type === "bangkok") return language === "th" ? "Bangkok Form (Google Form)" : "Bangkok Form (Google Form)";
    if (type === "pattaya_reach") return language === "th" ? "Pattaya Reach" : "Pattaya Reach";
    return language === "th" ? "ไม่ทราบ" : "Unknown";
  };

  const runImport = async (dryRun: boolean) => {
    if (!selectedFile) {
      toast.error(language === "th" ? "กรุณาเลือกไฟล์ CSV" : "Please select a CSV file");
      return;
    }

    setLoading(true);
    setMode(dryRun ? "dry_run" : "import");
    setResult(null);
    setDbVerified(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const formData = new FormData();
      formData.append("csv", selectedFile);
      formData.append("dry_run", dryRun.toString());
      formData.append("branch", selectedBranch);

      const response = await supabase.functions.invoke("import-existing-selftest-csv", {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || "Import failed");
      }

      const data = response.data;
      if (!data.success) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data.result);
      setIsDryRun(data.dry_run);

      if (!dryRun && data.result) {
        const allIds = [...(data.result.insertedIds || []), ...(data.result.updatedIds || [])];
        if (allIds.length > 0) {
          const { count } = await supabase
            .from("hiv_selftest_requests")
            .select("*", { count: "exact", head: true })
            .in("id", allIds.slice(0, 100));
          setDbVerified(count || 0);
        }

        toast.success(
          language === "th"
            ? `นำเข้าสำเร็จ — สถิติอัปเดตแล้ว`
            : `Import complete — stats updated`
        );

        window.dispatchEvent(new CustomEvent("selftest-import-complete"));
      } else if (dryRun) {
        toast.info(
          language === "th" ? "ตรวจสอบเสร็จ (ยังไม่บันทึก)" : "Dry run complete (no data saved)"
        );
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "Import failed");
    } finally {
      setLoading(false);
      setMode("idle");
    }
  };

  const downloadErrorReport = () => {
    if (!result?.errors.length) return;
    const csv = "Row,Reason\n" + result.errors.map(e =>
      `${e.row},"${e.reason.replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {language === "th" ? "นำเข้าข้อมูล HIV Self-test (CSV)" : "Import HIV Self-test Data (CSV)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === "th"
              ? "รองรับ 2 รูปแบบ: Bangkok Form (Google Form) และ Pattaya Reach — ตรวจจับอัตโนมัติ"
              : "Supports 2 formats: Bangkok Form (Google Form) and Pattaya Reach — auto-detected"}
          </p>

          {/* Branch selector */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium shrink-0">
              {language === "th" ? "สาขา:" : "Branch:"}
            </Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="silom">Silom (Bangkok)</SelectItem>
                <SelectItem value="pattaya">Pattaya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedFile ? selectedFile.name : language === "th" ? "เลือกไฟล์ CSV" : "Select CSV file"}
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Action buttons */}
          {selectedFile && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => runImport(true)}
                disabled={loading}
              >
                {loading && mode === "dry_run" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {language === "th" ? "ตรวจสอบ (Dry Run)" : "Dry Run"}
              </Button>
              <Button
                onClick={() => runImport(false)}
                disabled={loading}
              >
                {loading && mode === "import" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {language === "th" ? "นำเข้าข้อมูล" : "Import"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDryRun ? (
                <Eye className="h-5 w-5 text-blue-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {isDryRun
                ? language === "th" ? "ผลการตรวจสอบ (Dry Run)" : "Dry Run Results"
                : language === "th" ? "ผลการนำเข้า" : "Import Results"
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CSV Type indicator */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
              <FileSearch className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {language === "th" ? "รูปแบบ CSV ที่ตรวจพบ:" : "Auto-detected CSV type:"}
              </span>
              <Badge variant="secondary" className="text-xs">
                {csvTypeLabel(result.csvType)}
              </Badge>
              {result.csvType === "pattaya_reach" && (
                <span className="text-xs text-muted-foreground">
                  ({language === "th" ? "ไม่มีเบอร์โทร/Line/ที่อยู่ — ใช้ Thai ID เท่านั้น" : "No phone/Line/address — Thai ID only"})
                </span>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "th" ? "ทั้งหมด" : "Total"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 text-center">
                <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                <div className="text-xs text-muted-foreground">
                  {isDryRun ? (language === "th" ? "จะเพิ่มใหม่" : "Will Insert") : (language === "th" ? "เพิ่มใหม่" : "Inserted")}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
                <div className="text-xs text-muted-foreground">
                  {isDryRun ? (language === "th" ? "จะอัปเดต" : "Will Update") : (language === "th" ? "อัปเดต" : "Updated")}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "th" ? "ข้าม" : "Skipped"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10 text-center">
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-muted-foreground">
                  {language === "th" ? "ข้อผิดพลาด" : "Errors"}
                </div>
              </div>
            </div>

            {/* DB verification */}
            {!isDryRun && dbVerified !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  DB verified: {dbVerified} records confirmed in database
                </span>
              </div>
            )}

            {/* Error list */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {language === "th" ? "รายละเอียดข้อผิดพลาด / แถวที่ข้าม" : "Error Details / Skipped Rows"}
                  </h4>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="h-3 w-3 mr-1" />
                    {language === "th" ? "ดาวน์โหลด" : "Download"}
                  </Button>
                </div>
                <ScrollArea className="h-48 rounded border p-2">
                  {result.errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="flex gap-2 text-xs py-1 border-b last:border-0">
                      <Badge variant="outline" className="shrink-0">Row {err.row}</Badge>
                      <span className="text-muted-foreground">{err.reason}</span>
                    </div>
                  ))}
                  {result.errors.length > 50 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ... and {result.errors.length - 50} more errors. Download the full report.
                    </p>
                  )}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
