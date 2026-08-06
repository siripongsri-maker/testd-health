import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CheckState = "idle" | "running" | "pass" | "warn" | "fail";

type CheckResult = {
  id: string;
  label: string;
  state: CheckState;
  detail?: string;
  ms?: number;
};

const TIMEOUT_MS = 12000;

async function timedFetch(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return { res, ms: Math.round(performance.now() - started) };
  } finally {
    clearTimeout(timer);
  }
}

function describeError(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `หมดเวลารอ (เกิน ${TIMEOUT_MS / 1000} วินาที) — เซิร์ฟเวอร์อาจไม่ตอบสนอง`;
  }
  if (err instanceof TypeError) {
    return "เชื่อมต่อไม่ได้ (network/CORS) — ตรวจอินเทอร์เน็ตหรือลิงก์เซิร์ฟเวอร์";
  }
  return err instanceof Error ? err.message : String(err);
}

const STATE_ICON: Record<CheckState, JSX.Element> = {
  idle: <span className="h-4 w-4 rounded-full border border-muted-foreground/40" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  fail: <XCircle className="h-4 w-4 text-destructive" />,
};

export function ConnectStatusCheck({ mcpUrl }: { mcpUrl: string }) {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [ranAt, setRanAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    const results: CheckResult[] = [];
    const push = (r: CheckResult) => {
      results.push(r);
      if (mounted.current) setChecks([...results]);
    };

    // 1. Reachability via the public OAuth protected-resource metadata document.
    let authServer: string | undefined;
    try {
      const { res, ms } = await timedFetch(`${mcpUrl}/.well-known/oauth-protected-resource`);
      if (res.ok) {
        const body = (await res.json()) as { authorization_servers?: string[] };
        authServer = body.authorization_servers?.[0];
        push({
          id: "reach",
          label: "เซิร์ฟเวอร์ตอบสนอง",
          state: "pass",
          ms,
          detail: "เชื่อมต่อกับ MCP server ได้สำเร็จ",
        });
      } else {
        push({
          id: "reach",
          label: "เซิร์ฟเวอร์ตอบสนอง",
          state: "fail",
          ms,
          detail: `เซิร์ฟเวอร์ตอบกลับสถานะ ${res.status} — ตรวจว่าลิงก์ถูกต้องและฟังก์ชันถูก deploy แล้ว`,
        });
      }
    } catch (err) {
      push({ id: "reach", label: "เซิร์ฟเวอร์ตอบสนอง", state: "fail", detail: describeError(err) });
    }

    // 2. Auth guard: an unauthenticated MCP call must be rejected with a 401 + WWW-Authenticate.
    try {
      const { res, ms } = await timedFetch(mcpUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "testd-status-check", version: "1.0.0" } },
        }),
      });
      if (res.status === 401 && res.headers.get("www-authenticate")) {
        push({
          id: "auth",
          label: "การยืนยันตัวตน (OAuth)",
          state: "pass",
          ms,
          detail: "เซิร์ฟเวอร์ขอให้ผู้ช่วย AI ล็อกอินอย่างถูกต้อง",
        });
      } else if (res.ok) {
        push({
          id: "auth",
          label: "การยืนยันตัวตน (OAuth)",
          state: "warn",
          ms,
          detail: "เซิร์ฟเวอร์ตอบโดยไม่ขอล็อกอิน — เปิดให้เรียกใช้ได้แบบสาธารณะ",
        });
      } else {
        push({
          id: "auth",
          label: "การยืนยันตัวตน (OAuth)",
          state: "fail",
          ms,
          detail: `ตอบกลับสถานะ ${res.status} แทน 401 — การตั้งค่า OAuth อาจไม่ถูกต้อง`,
        });
      }
    } catch (err) {
      push({ id: "auth", label: "การยืนยันตัวตน (OAuth)", state: "fail", detail: describeError(err) });
    }

    // 3. The authorization server discovery document the AI client will follow.
    if (authServer) {
      try {
        const base = authServer.replace(/\/$/, "");
        const { res, ms } = await timedFetch(`${base}/.well-known/oauth-authorization-server`);
        push({
          id: "as",
          label: "ระบบล็อกอินพร้อมใช้งาน",
          state: res.ok ? "pass" : "fail",
          ms,
          detail: res.ok
            ? "ผู้ช่วย AI จะลงทะเบียนและขอสิทธิ์เข้าใช้งานได้"
            : `ตอบกลับสถานะ ${res.status} — ระบบล็อกอินยังไม่พร้อม`,
        });
      } catch (err) {
        push({ id: "as", label: "ระบบล็อกอินพร้อมใช้งาน", state: "fail", detail: describeError(err) });
      }
    } else {
      push({
        id: "as",
        label: "ระบบล็อกอินพร้อมใช้งาน",
        state: "warn",
        detail: "ไม่พบข้อมูลระบบล็อกอินจากเซิร์ฟเวอร์",
      });
    }

    if (mounted.current) {
      setRanAt(new Date());
      setRunning(false);
      const status = results.some((r) => r.state === "fail")
        ? "fail"
        : results.some((r) => r.state === "warn")
          ? "warn"
          : "pass";
      onResultRef.current?.(status);
    }
  }, [mcpUrl]);

  useEffect(() => {
    if (autoRun) void run();
  }, [run, autoRun]);


  const hasFail = checks.some((c) => c.state === "fail");
  const hasWarn = checks.some((c) => c.state === "warn");
  const done = !running && checks.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">ตรวจสอบสถานะการเชื่อมต่อ</CardTitle>
          <CardDescription>
            ทดสอบว่าเซิร์ฟเวอร์ของแอปพร้อมให้ผู้ช่วย AI เชื่อมต่อหรือไม่
          </CardDescription>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void run()} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">{running ? "กำลังตรวจ…" : "ตรวจอีกครั้ง"}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {done && (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg border px-3 py-2 text-sm ${
              hasFail
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : hasWarn
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {hasFail
              ? "เชื่อมต่อไม่สำเร็จ — ดูรายละเอียดข้อผิดพลาดด้านล่าง แล้วกด “ตรวจอีกครั้ง”"
              : hasWarn
                ? "เชื่อมต่อได้ แต่มีข้อควรตรวจสอบด้านล่าง"
                : "พร้อมใช้งาน — ผู้ช่วย AI เชื่อมต่อกับแอปนี้ได้"}
          </div>
        )}

        <ul className="space-y-3">
          {(checks.length ? checks : [{ id: "init", label: "กำลังเริ่มตรวจสอบ…", state: "running" as CheckState }]).map(
            (check) => (
              <li key={check.id} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{STATE_ICON[check.state]}</span>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {check.label}
                    {typeof check.ms === "number" && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{check.ms} ms</span>
                    )}
                  </p>
                  {check.detail && <p className="text-xs text-muted-foreground">{check.detail}</p>}
                </div>
              </li>
            ),
          )}
        </ul>

        {ranAt && (
          <p className="text-xs text-muted-foreground">
            ตรวจล่าสุด {ranAt.toLocaleTimeString("th-TH")} · {mcpUrl}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ConnectStatusCheck;
