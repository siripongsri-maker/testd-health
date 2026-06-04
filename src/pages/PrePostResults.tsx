import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
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

const PRE_ID = "6e5918db-d70a-4d7d-b978-e6711f2a4779";
const POST_ID = "4a5e39ad-0b89-487b-9ff3-2b97a393cf38";

export default function PrePostResults() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = (th: string, en: string) => (language === "th" ? th : en);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrePostRow | null>(null);
  const [searched, setSearched] = useState(false);

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
              {renderScoreCard(t("Pre-test (ก่อน)", "Pre-test"), pre, result.pre_completed_at, PRE_ID)}
              {renderScoreCard(t("Post-test (หลัง)", "Post-test"), post, result.post_completed_at, POST_ID)}
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
