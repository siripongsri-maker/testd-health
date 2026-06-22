import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { formatThaiId, isValidThaiId, normalizeThaiId } from "@/lib/thaiId";

type State =
  | { status: "loading" }
  | { status: "ready"; maskedName: string; alreadyFilled: boolean }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; reason: string };

export default function SelftestUpdateId() {
  const { token = "" } = useParams<{ token: string }>();
  const { language } = useLanguage();
  const isTh = language === "th";
  const [state, setState] = useState<State>({ status: "loading" });
  const [thaiId, setThaiId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cleanToken = token.replace(/[^a-fA-F0-9]/g, "").slice(0, 96);

  useEffect(() => {
    if (cleanToken.length < 32) {
      setState({ status: "error", reason: "invalid" });
      return;
    }
    let active = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke("selftest-submit-thai-id", {
        body: { token: cleanToken, mode: "lookup" },
      });
      if (!active) return;
      if (error || !data?.ok) {
        setState({ status: "error", reason: (data as any)?.error || "invalid" });
        return;
      }
      setState({ status: "ready", maskedName: data.masked_name || "", alreadyFilled: !!data.already_filled });
    })();
    return () => {
      active = false;
    };
  }, [cleanToken]);

  const onSubmit = async () => {
    setSubmitError(null);
    const v = normalizeThaiId(thaiId);
    if (!isValidThaiId(v)) {
      setSubmitError(isTh ? "เลขบัตรประชาชนไม่ถูกต้อง (13 หลัก)" : "Invalid Thai national ID (13 digits)");
      return;
    }
    setState({ status: "submitting" });
    const { data, error } = await supabase.functions.invoke("selftest-submit-thai-id", {
      body: { token: cleanToken, thai_id: v },
    });
    if (error || !data?.ok) {
      setSubmitError((data as any)?.message || (isTh ? "ส่งไม่สำเร็จ" : "Submission failed"));
      setState({ status: "ready", maskedName: "", alreadyFilled: false });
      return;
    }
    setState({ status: "done" });
  };

  if (state.status === "loading") {
    return (
      <PageContainer>
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </PageContainer>
    );
  }

  if (state.status === "error") {
    const msg =
      state.reason === "expired" ? (isTh ? "ลิงก์หมดอายุแล้ว" : "Link has expired") :
      state.reason === "already_used" ? (isTh ? "ลิงก์ถูกใช้งานแล้ว" : "Link already used") :
      (isTh ? "ลิงก์ไม่ถูกต้อง" : "Invalid link");
    return (
      <PageContainer>
        <Card className="max-w-md mx-auto mt-10">
          <CardContent className="py-10 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-medium">{msg}</p>
            <p className="text-sm text-muted-foreground">
              {isTh ? "กรุณาติดต่อเจ้าหน้าที่เพื่อขอลิงก์ใหม่ โทร +66 2 632 9501" : "Please contact staff for a new link. Tel +66 2 632 9501"}
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (state.status === "done") {
    return (
      <PageContainer>
        <Card className="max-w-md mx-auto mt-10">
          <CardContent className="py-10 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <p className="font-medium">{isTh ? "บันทึกเลขบัตรเรียบร้อย" : "Thai ID saved"}</p>
            <p className="text-sm text-muted-foreground">
              {isTh ? "ขอบคุณที่ช่วยอัปเดตข้อมูล 🙏" : "Thanks for updating your record 🙏"}
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isTh ? "อัปเดตเลขบัตรประชาชน" : "Update Thai National ID"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isTh
              ? "ระบบไม่ได้บันทึกเลขบัตรของคุณตอนยื่นคำขอชุดตรวจ HIV กรุณากรอกเพื่อให้คลินิกใช้ออกใบเสร็จและบันทึกผลตรวจได้"
              : "Your Thai national ID was not stored when you submitted your HIV test kit request. Please enter it so the clinic can complete your record."}
          </p>
          {state.status === "ready" && state.maskedName && (
            <p className="text-sm">
              <span className="text-muted-foreground">{isTh ? "ชื่อในระบบ: " : "Name on file: "}</span>
              <span className="font-medium">{state.maskedName}</span>
            </p>
          )}
          {state.status === "ready" && state.alreadyFilled && (
            <p className="text-sm text-amber-600">
              {isTh ? "⚠️ มีเลขบัตรในระบบแล้ว การส่งใหม่จะเขียนทับของเดิม" : "⚠️ A Thai ID is already on file. Submitting will overwrite it."}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="thai-id">{isTh ? "เลขบัตรประชาชน 13 หลัก" : "Thai National ID (13 digits)"}</Label>
            <Input
              id="thai-id"
              inputMode="numeric"
              autoComplete="off"
              placeholder="X-XXXX-XXXXX-XX-X"
              value={formatThaiId(thaiId) || thaiId}
              onChange={(e) => setThaiId(normalizeThaiId(e.target.value).slice(0, 13))}
              maxLength={17}
            />
          </div>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <Button
            onClick={onSubmit}
            disabled={state.status === "submitting" || normalizeThaiId(thaiId).length !== 13}
            className="w-full"
          >
            {state.status === "submitting" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{isTh ? "กำลังบันทึก..." : "Saving..."}</>
            ) : (
              isTh ? "ส่งข้อมูล" : "Submit"
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            🔒 {isTh ? "ข้อมูลของคุณจะถูกเก็บเป็นความลับและใช้เฉพาะการบริการทางการแพทย์" : "Your data is kept confidential and used only for medical service delivery."}
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
