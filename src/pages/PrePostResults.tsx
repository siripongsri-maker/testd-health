import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "sonner";

interface PrePostRow {
  pre_score: number | null;
  pre_total: number | null;
  pre_completed_at: string | null;
  post_score: number | null;
  post_total: number | null;
  post_completed_at: string | null;
  matched_name: string | null;
}

const SURVEY_ID = "6e5918db-d70a-4d7d-b978-e6711f2a4779";

export default function PrePostResults() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isAdmin, isMeAnalyst } = useAdminRole();
  const canExport = isAdmin || isMeAnalyst;
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrePostRow | null>(null);
  const [searched, setSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingFull, setExportingFull] = useState(false);
  const [testResponseId, setTestResponseId] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testingNotify, setTestingNotify] = useState(false);

  const handleTestNotify = async () => {
    const respId = testResponseId.trim();
    if (!respId) {
      toast.error(t("กรอก Response ID", "Enter a Response ID"));
      return;
    }
    setTestingNotify(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "notify-pre-post-submission",
        {
          body: {
            response_id: respId,
            test_mode: true,
            ...(testEmail.trim() ? { to_override: testEmail.trim() } : {}),
          },
        },
      );
      if (error) throw error;
      const res = data as { sent?: boolean; to?: string; skipped?: string; status?: number; error?: string };
      if (res?.sent) {
        toast.success(t(`ส่งอีเมลทดสอบไปยัง ${res.to} แล้ว`, `Test email sent to ${res.to}`));
      } else {
        toast.error(
          t("ส่งไม่สำเร็จ: ", "Send failed: ") + (res?.skipped || res?.error || `HTTP ${res?.status ?? "?"}`),
        );
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || t("เกิดข้อผิดพลาด", "Something went wrong"));
    } finally {
      setTestingNotify(false);
    }
  };

  const handleExportFull = async () => {
    setExportingFull(true);
    try {
      const { data, error } = await supabase.rpc("export_pre_post_full" as any);
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      if (rows.length === 0) {
        toast.info(t("ยังไม่มีข้อมูล", "No data yet"));
        return;
      }
      const headers = [
        "response_id",
        "attempt",
        "respondent_name",
        "completed_at",
        "question_order",
        "question_text_th",
        "question_text_en",
        "question_type",
        "answer_text",
        "answer_options_text",
        "answer_rating",
      ];
      const esc = (v: unknown) => {
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const wm = `\u200B\u200C\u200D\uFEFF${new Date().toISOString()}\u200B`;
      const csv =
        "\uFEFF" +
        headers.join(",") + "\n" +
        rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n") +
        `\n#${wm}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pre-post-full-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("ส่งออกสำเร็จ", "Export complete"));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message === "forbidden"
        ? t("ไม่มีสิทธิ์เข้าถึง", "Not authorized")
        : t("ส่งออกไม่สำเร็จ", "Export failed"));
    } finally {
      setExportingFull(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("export_pre_post_results" as any);
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      if (rows.length === 0) {
        toast.info(t("ยังไม่มีข้อมูล", "No data yet"));
        return;
      }
      const headers = [
        "matched_name",
        "pre_score",
        "pre_total",
        "pre_completed_at",
        "post_score",
        "post_total",
        "post_completed_at",
        "score_delta",
      ];
      const esc = (v: unknown) => {
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      // Zero-width Unicode watermark (per export protection policy)
      const wm = `\u200B\u200C\u200D\uFEFF${new Date().toISOString()}\u200B`;
      const csv =
        "\uFEFF" + // BOM for Excel
        headers.join(",") + "\n" +
        rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n") +
        `\n#${wm}\n`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pre-post-results-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("ส่งออกสำเร็จ", "Export complete"));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message === "forbidden"
        ? t("ไม่มีสิทธิ์เข้าถึง", "Not authorized")
        : t("ส่งออกไม่สำเร็จ", "Export failed"));
    } finally {
      setExporting(false);
    }
  };


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t("กรุณากรอกชื่อ", "Please enter a name"));
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data, error } = await supabase.rpc("get_pre_post_score", { p_name: trimmed });
      if (error) throw error;
      const row = (data as PrePostRow[] | null)?.[0] ?? null;
      setResult(row);
    } catch (err) {
      console.error(err);
      toast.error(t("เกิดข้อผิดพลาด", "Something went wrong"));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const pre = result?.pre_score;
  const post = result?.post_score;
  const total = result?.post_total ?? result?.pre_total ?? 10;
  const delta = pre != null && post != null ? post - pre : null;

  const renderScoreCard = (
    label: string,
    score: number | null | undefined,
    completed: string | null | undefined,
    surveyId: string,
  ) => (
    <Card className="p-5 space-y-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      {score == null ? (
        <>
          <div className="text-2xl font-bold text-muted-foreground">
            {t("ยังไม่มีผล", "Not taken yet")}
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(`/surveys/${surveyId}`)}>
            {t("ทำแบบทดสอบ", "Take it now")}
          </Button>
        </>
      ) : (
        <>
          <div className="text-4xl font-bold text-foreground">
            {score}<span className="text-xl text-muted-foreground"> / {total}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {completed ? new Date(completed).toLocaleString(language === "th" ? "th-TH" : "en-US") : ""}
          </div>
        </>
      )}
    </Card>
  );

  return (
    <>
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/surveys")} aria-label={t("กลับ", "Back")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("ผลก่อน-หลัง", "Pre / Post Results")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "กรอกชื่อเดียวกับที่ใช้ในแบบทดสอบเพื่อดูคะแนนของคุณ",
                "Enter the same name you used in the tests to see your score",
              )}
            </p>
          </div>
        </div>

        <Card className="p-5 mb-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <Label htmlFor="name">{t("ชื่อ", "Name")}</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("ชื่อที่ใช้ในแบบทดสอบ", "Name used in the tests")}
                maxLength={100}
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">{t("ค้นหา", "Search")}</span>
              </Button>
            </div>
          </form>
        </Card>

        {canExport && (
          <Card className="p-4 mb-6 space-y-3 border-dashed">
            <div>
              <div className="text-sm font-medium text-foreground">
                {t("ส่งออกข้อมูลภายใน", "Internal export")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "ดาวน์โหลด CSV สำหรับทีมไปวิเคราะห์ต่อ (เฉพาะเจ้าหน้าที่)",
                  "Download CSV for the team to review (staff only)",
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExport} disabled={exporting} variant="outline" size="sm">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="ml-2">{t("คะแนน Pre/Post (จับคู่)", "Paired Pre/Post scores")}</span>
              </Button>
              <Button onClick={handleExportFull} disabled={exportingFull} variant="outline" size="sm">
                {exportingFull ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                <span className="ml-2">{t("คำตอบทั้งหมด (ทุกข้อ)", "All answers (full sheet)")}</span>
              </Button>
            </div>
          </Card>
        )}

        {searched && !loading && !result && (
          <Card className="p-6 text-center text-muted-foreground">
            {t(
              "ไม่พบผลลัพธ์สำหรับชื่อนี้ ตรวจสอบการสะกดให้ตรงกับที่กรอกในแบบทดสอบ",
              "No results for this name. Make sure the spelling matches what you entered in the test.",
            )}
          </Card>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderScoreCard(t("Pre-test (ก่อน)", "Pre-test"), pre, result.pre_completed_at, SURVEY_ID)}
              {renderScoreCard(t("Post-test (หลัง)", "Post-test"), post, result.post_completed_at, SURVEY_ID)}
            </div>

            {delta != null && (
              <Card className="p-6 text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {t("คะแนนเปลี่ยนแปลง", "Score change")}
                </div>
                <div
                  className={`flex items-center justify-center gap-2 text-4xl font-bold ${
                    delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {delta > 0 ? <TrendingUp className="h-8 w-8" /> : delta < 0 ? <TrendingDown className="h-8 w-8" /> : <Minus className="h-8 w-8" />}
                  {delta > 0 ? `+${delta}` : delta}
                </div>
                <div className="text-sm text-muted-foreground">
                  {delta > 0
                    ? t("เก่งขึ้น! คุณตอบถูกมากขึ้น", "Improved! You answered more correctly.")
                    : delta < 0
                    ? t("คะแนนลดลงเล็กน้อย ลองทบทวนเนื้อหาอีกครั้ง", "Slight drop — try reviewing the content again.")
                    : t("คะแนนเท่าเดิม", "Same score as before.")}
                </div>
              </Card>
            )}
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
}
