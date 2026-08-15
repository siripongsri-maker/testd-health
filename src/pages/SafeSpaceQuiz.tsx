import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { SAFE_SPACE_QUIZ, SAFE_SPACE_QUIZ_TOTAL } from "@/data/safeSpaceQuiz";
import { Heart, Loader2, MessageCircle, Phone, Sparkles } from "lucide-react";

type Answer = { q: number; category: string; answer: boolean; is_correct: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function SafeSpaceQuiz() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const eventCode = (params.get("event") || "safespace").trim().slice(0, 60);
  const sessionId = useMemo(() => {
    const s = params.get("session");
    return s && UUID_RE.test(s) ? s : null;
  }, [params]);
  const source = params.get("utm_source") || params.get("source") || null;
  const rawSession = params.get("session");

  // ตรวจสอบว่า QR ผูกกับกิจกรรมที่มีอยู่จริงหรือไม่ (QR เก่า/กิจกรรมถูกลบ = ไม่พบ)
  const [sessionCheck, setSessionCheck] = useState<"checking" | "valid" | "missing" | "invalid">(
    rawSession ? "checking" : "missing",
  );
  const [sessionLabel, setSessionLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!rawSession) {
      setSessionCheck("missing");
      return;
    }
    if (!sessionId) {
      setSessionCheck("invalid");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("get_safe_space_session_public", {
        p_session_id: sessionId,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setSessionCheck("invalid");
        return;
      }
      setSessionCheck("valid");
      setSessionLabel(
        `${row.session_title_th || "กิจกรรมพื้นที่ปลอดภัย"}${row.location ? ` · ${row.location}` : ""}`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [rawSession, sessionId]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [revealed, setRevealed] = useState<Answer | null>(null);

  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // นับจำนวนครั้งที่สแกน QR (เข้าหน้านี้) แยกตามเซสชัน — นับครั้งเดียวต่อ 1 แท็บ/ลิงก์
  const scanLogged = useRef(false);
  useEffect(() => {
    if (sessionCheck === "checking") return;
    if (scanLogged.current) return;
    scanLogged.current = true;
    const validSession = sessionCheck === "valid" ? sessionId : null;
    const key = `ss_qr_scan:${validSession || "none"}:${eventCode}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore storage errors */
    }
    let visitorKey: string | null = null;
    try {
      visitorKey = localStorage.getItem("anonymous_id");
    } catch {
      visitorKey = null;
    }
    void supabase.from("safe_space_qr_scans").insert({
      session_id: validSession,
      event_code: eventCode,
      source,
      path: window.location.pathname,
      visitor_key: visitorKey,
    });
  }, [sessionCheck, sessionId, eventCode, source]);

  const score = answers.filter((a) => a.is_correct).length;
  const progress = step === 1 ? 8 : step === 2 ? 8 + (answers.length / SAFE_SPACE_QUIZ_TOTAL) * 84 : 100;

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!nickname.trim()) e.nickname = "ใส่ชื่อเล่นสักหน่อยนะ";
    const n = Number(age);
    if (!age || Number.isNaN(n) || n < 15 || n > 99) e.age = "กรอกอายุระหว่าง 15 ถึง 99";
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^0\d{9}$/.test(cleanPhone)) e.phone = "กรอกเบอร์โทร 10 หลัก เช่น 0812345678";
    setErrors(e);
    if (Object.keys(e).length === 0) setStep(2);
  }

  function answer(value: boolean) {
    if (revealed) return;
    const item = SAFE_SPACE_QUIZ[index];
    const rec: Answer = {
      q: item.q,
      category: item.category,
      answer: value,
      is_correct: value === item.correct,
    };
    setAnswers((prev) => [...prev, rec]);
    setRevealed(rec);
  }

  function next() {
    setRevealed(null);
    if (index + 1 >= SAFE_SPACE_QUIZ_TOTAL) setStep(3);
    else setIndex((i) => i + 1);
  }

  async function save(outcome: "finished" | "to_test_kit") {
    setSaving(true);
    try {
      // สร้าง id ฝั่ง client เพราะผู้ร่วมกิจกรรมไม่ได้ล็อกอิน จึงอ่านข้อมูลกลับไม่ได้ตามนโยบายความปลอดภัย
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined;
      const { error } = await supabase
        .from("safe_space_quiz_responses")
        .insert({
          ...(newId ? { id: newId } : {}),
          event_code: eventCode,
          session_id: sessionCheck === "valid" ? sessionId : null,
          nickname: nickname.trim(),
          age: Number(age),
          phone: phone.replace(/\D/g, ""),
          answers: answers as unknown as never,
          score,
          total: SAFE_SPACE_QUIZ_TOTAL,
          outcome,
          source,
        });
      if (error) throw error;
      return newId;
    } catch (err) {
      console.error("[safe-space-quiz] save failed", err);
      toast({ title: "บันทึกไม่สำเร็จ ลองอีกครั้งนะ", variant: "destructive" });
      return undefined;
    } finally {
      setSaving(false);
    }
  }

  async function goTestKit() {
    const id = await save("to_test_kit");
    const qs = new URLSearchParams({ ref: "safespace-quiz", event: eventCode });
    if (sessionCheck === "valid" && sessionId) qs.set("session", sessionId);
    if (id) qs.set("rid", id);
    navigate(`/hiv-selftest?${qs.toString()}`);
  }

  async function finish() {
    const id = await save("finished");
    if (id) setDone(true);
  }

  const item = SAFE_SPACE_QUIZ[index];
  const wrong = answers.filter((a) => !a.is_correct);

  return (
    <div
      className="min-h-screen bg-background px-4 pt-6"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 9rem)" }}
    >
      <SEOHead
        title="ควิซพื้นที่ปลอดภัย"
        description="ควิซความรู้สั้น ๆ สำหรับกิจกรรมพื้นที่ปลอดภัยของ SWING"
        robots="noindex, nofollow"
      />

      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">ควิซพื้นที่ปลอดภัย</h1>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {step === 1 && "ขั้นที่ 1 จาก 3 : ทำความรู้จักกันก่อน"}
            {step === 2 && `ขั้นที่ 2 จาก 3 : ข้อ ${Math.min(index + 1, SAFE_SPACE_QUIZ_TOTAL)} จาก ${SAFE_SPACE_QUIZ_TOTAL}`}
            {step === 3 && "ขั้นที่ 3 จาก 3 : สรุปผล"}
          </p>
        </div>

        {/* ไม่แสดงชื่อกิจกรรม/Party บนหน้าควิซเพื่อความเป็นส่วนตัวของผู้ใช้ */}
        {sessionCheck === "valid" && sessionLabel && false && (
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
            เชื่อมกับกิจกรรม: {sessionLabel}
          </p>
        )}
        {sessionCheck === "missing" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">QR นี้ยังไม่ได้ผูกกับกิจกรรม</p>
            <p className="text-xs text-muted-foreground">
              คุณยังทำควิซต่อได้ตามปกติ แต่คำตอบจะไม่ถูกนับรวมเข้ากิจกรรมใด ๆ — แจ้งเจ้าหน้าที่ให้พิมพ์การ์ดชุดใหม่ที่ผูกกิจกรรมแล้ว
            </p>
          </div>
        )}
        {sessionCheck === "invalid" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-semibold text-destructive">ไม่พบกิจกรรมของ QR นี้ (อาจเป็นการ์ดเก่าหรือกิจกรรมถูกปิดแล้ว)</p>
            <p className="text-xs text-muted-foreground">
              ทำควิซต่อได้เลย ข้อมูลจะถูกบันทึกแบบไม่ผูกกิจกรรม หากต้องการนับเข้ากิจกรรมวันนี้ กรุณาสแกน QR จากการ์ดชุดล่าสุด
            </p>
          </div>
        )}



        {step === 1 && (
          <Card>
            <CardContent className="space-y-5 p-5">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-base">ชื่อเล่น</Label>
                <Input
                  id="nickname"
                  className="h-12 text-base"
                  value={nickname}
                  maxLength={40}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="เช่น มิ้นท์"
                />
                <p className="text-xs text-muted-foreground">ใส่ชื่อเล่นหรือชื่อสมมติก็ได้ ไม่ต้องใช้ชื่อจริง</p>
                {errors.nickname && <p className="text-xs text-destructive">{errors.nickname}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="age" className="text-base">อายุ</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={15}
                  max={99}
                  className="h-12 text-base"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="เช่น 24"
                />
                {errors.age && <p className="text-xs text-destructive">{errors.age}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">เบอร์โทร</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  className="h-12 text-base"
                  value={phone}
                  maxLength={12}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812345678"
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <p className="text-xs text-muted-foreground">
                ข้อมูลนี้เก็บไว้เพื่อส่งชุดตรวจและติดตามผลกิจกรรมเท่านั้น ไม่เปิดเผยต่อบุคคลอื่น
              </p>

              <Button className="h-12 w-full text-base" onClick={validateStep1}>
                เริ่มทำควิซ
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && item && (
          <Card>
            <CardContent className="space-y-5 p-5">
              <Badge variant="secondary" className="text-sm">หมวด {item.category}</Badge>
              <p className="text-lg font-semibold leading-relaxed text-foreground">{item.prompt}</p>

              {!revealed ? (
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-14 text-base" onClick={() => answer(true)}>จริง</Button>
                  <Button variant="outline" className="h-14 text-base" onClick={() => answer(false)}>
                    ไม่จริง
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border p-4 ${
                      revealed.is_correct ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40"
                    }`}
                  >
                    <p className="mb-2 font-semibold text-foreground">
                      {revealed.is_correct ? "ใช่เลย ตอบถูกแล้ว" : "ยังไม่ใช่นะ"}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.explanation}</p>
                  </div>
                  <Button className="h-12 w-full text-base" onClick={next}>
                    {index + 1 >= SAFE_SPACE_QUIZ_TOTAL ? "ดูสรุปผล" : "ข้อต่อไป"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && !done && (
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3 p-5 text-center">
                <Heart className="mx-auto h-8 w-8 text-primary" />
                <p className="text-2xl font-bold text-foreground">
                  ตอบถูก {score} จาก {SAFE_SPACE_QUIZ_TOTAL}
                </p>
                <p className="text-sm text-muted-foreground">
                  ทุกคะแนนคือความรู้ที่ได้กลับไป ขอบคุณที่ร่วมกิจกรรมกับเรานะ
                </p>
              </CardContent>
            </Card>

            {wrong.length > 0 && (
              <Card>
                <CardContent className="space-y-3 p-5">
                  <p className="font-semibold text-foreground">ทบทวนอีกนิด</p>
                  {wrong.map((a) => {
                    const it = SAFE_SPACE_QUIZ.find((x) => x.q === a.q)!;
                    return (
                      <div key={a.q} className="rounded-lg bg-muted/40 p-3">
                        <p className="text-sm font-medium text-foreground">{it.prompt}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          คำตอบคือ {it.correct ? "จริง" : "ไม่จริง"} : {it.explanation}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button className="h-14 w-full text-base" onClick={goTestKit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                ขอชุดตรวจ HIV
              </Button>
              <Button variant="outline" className="h-12 w-full text-base" onClick={finish} disabled={saving}>
                จบกิจกรรม
              </Button>
            </div>
          </div>
        )}

        {done && (
          <Card>
            <CardContent className="space-y-4 p-5 text-center">
              <Heart className="mx-auto h-8 w-8 text-primary" />
              <p className="text-xl font-bold text-foreground">ขอบคุณที่ร่วมกิจกรรมนะ</p>
              <p className="text-sm text-muted-foreground">
                ถ้าเปลี่ยนใจอยากได้ชุดตรวจ หรืออยากคุยกับเจ้าหน้าที่ SWING ทักมาได้ตลอดเลย
              </p>
              <div className="space-y-3 pt-1">
                <Button className="h-12 w-full text-base" onClick={() => navigate("/hiv-selftest")}>
                  ขอชุดตรวจภายหลัง
                </Button>
                <Button variant="outline" className="h-12 w-full text-base" onClick={() => navigate("/support-chat")}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  คุยกับเจ้าหน้าที่ SWING
                </Button>
                <a href="tel:+6626329501" className="block">
                  <Button variant="ghost" className="h-12 w-full text-base">
                    <Phone className="mr-2 h-4 w-4" />
                    โทร 02 632 9501
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
