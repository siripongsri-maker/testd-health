import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Target {
  id: string;
  path: string;
  label: string;
  enabled: boolean;
  expected_substring: string | null;
  last_checked_at: string | null;
  last_status_code: number | null;
  last_ok: boolean | null;
  last_error: string | null;
  consecutive_failures: number;
}

interface CheckRow {
  id: string;
  path: string;
  checked_at: string;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
}

interface DeployRow {
  id: string;
  detected_at: string;
  build_fingerprint: string;
  smoke_status: string;
  checked_count: number;
  failing_count: number;
  failing_paths: any;
  duration_ms: number | null;
}

export default function AdminRouteHealthContent() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [history, setHistory] = useState<CheckRow[]>([]);
  const [deploys, setDeploys] = useState<DeployRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [newPath, setNewPath] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes, hRes, dRes] = await Promise.all([
      supabase.from("route_health_targets").select("*").order("path"),
      supabase.from("route_health_checks").select("*").order("checked_at", { ascending: false }).limit(100),
      supabase.from("route_health_deploys" as any).select("*").order("detected_at", { ascending: false }).limit(20),
    ]);
    if (tRes.error) toast.error(tRes.error.message);
    else setTargets((tRes.data ?? []) as Target[]);
    if (hRes.error) toast.error(hRes.error.message);
    else setHistory((hRes.data ?? []) as CheckRow[]);
    if (!dRes.error) setDeploys(((dRes.data as any) ?? []) as DeployRow[]);
    setLoading(false);
  }, []);


  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("route-health-check", { body: {} });
      if (error) throw error;
      const failing = (data as any)?.failing ?? 0;
      if (failing > 0) toast.warning(`พบลิงก์ที่มีปัญหา ${failing} รายการ`);
      else toast.success(`ตรวจสอบครบ ${(data as any)?.checked ?? 0} ลิงก์ — ปกติทั้งหมด`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "ตรวจสอบล้มเหลว");
    } finally {
      setRunning(false);
    }
  };

  const runSmoke = async () => {
    setSmoking(true);
    try {
      const { data, error } = await supabase.functions.invoke("route-health-smoke", { body: { force: true } });
      if (error) throw error;
      const d: any = data;
      if (d?.skipped) toast.info("ยังไม่มี deploy ใหม่ — build เดิม");
      else if (d?.smoke_status === "pass") toast.success(`Smoke test ผ่าน (${d.checked} ลิงก์)`);
      else toast.error(`Smoke test ล้มเหลว: ${d?.failing} ลิงก์มีปัญหา`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Smoke test ล้มเหลว");
    } finally {
      setSmoking(false);
    }
  };

  const addTarget = async () => {

    if (!newPath.startsWith("/")) return toast.error("path ต้องขึ้นต้นด้วย /");
    const { error } = await supabase.from("route_health_targets").insert({
      path: newPath.trim(),
      label: newLabel.trim() || newPath.trim(),
    });
    if (error) return toast.error(error.message);
    setNewPath(""); setNewLabel("");
    toast.success("เพิ่มแล้ว");
    load();
  };

  const toggleEnabled = async (t: Target) => {
    const { error } = await supabase.from("route_health_targets").update({ enabled: !t.enabled }).eq("id", t.id);
    if (error) toast.error(error.message); else load();
  };

  const removeTarget = async (t: Target) => {
    if (!confirm(`ลบ ${t.path}?`)) return;
    const { error } = await supabase.from("route_health_targets").delete().eq("id", t.id);
    if (error) toast.error(error.message); else load();
  };

  const failingCount = targets.filter((t) => t.enabled && t.last_ok === false).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const lastDeploy = deploys[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold">Route Health</h2>
          <p className="text-sm text-muted-foreground">เฝ้าระวังลิงก์สำคัญ · ตรวจรายชั่วโมง + Smoke test อัตโนมัติทุก 5 นาทีหลัง deploy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runSmoke} disabled={smoking}>
            {smoking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            รัน Smoke test
          </Button>
          <Button onClick={runNow} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            ตรวจสอบเดี๋ยวนี้
          </Button>
        </div>
      </div>

      {lastDeploy && (
        <Card className={
          lastDeploy.smoke_status === "pass"
            ? "border-emerald-500/40 bg-emerald-500/5"
            : lastDeploy.smoke_status === "fail"
              ? "border-destructive/50 bg-destructive/5"
              : "border-border"
        }>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              {lastDeploy.smoke_status === "pass"
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <XCircle className="h-5 w-5 text-destructive" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  Deploy ล่าสุด: Smoke test {lastDeploy.smoke_status === "pass" ? "ผ่าน" : "ล้มเหลว"}
                  {" "}({lastDeploy.checked_count - lastDeploy.failing_count}/{lastDeploy.checked_count} ลิงก์ OK)
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  ตรวจพบเมื่อ {formatDistanceToNow(new Date(lastDeploy.detected_at), { addSuffix: true })}
                  {" · "}build: <code className="text-xs">{lastDeploy.build_fingerprint}</code>
                </p>
              </div>
            </div>
            {lastDeploy.failing_count > 0 && Array.isArray(lastDeploy.failing_paths) && (
              <ul className="text-sm text-destructive pl-8 list-disc">
                {lastDeploy.failing_paths.map((f: any, i: number) => (
                  <li key={i}><code>{f.path}</code> — {f.error ?? `HTTP ${f.status}`}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {failingCount > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">พบลิงก์มีปัญหา {failingCount} รายการ</p>
              <p className="text-sm text-muted-foreground">ดูรายละเอียดด้านล่าง</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>รายการลิงก์สำคัญ</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {targets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <Switch checked={t.enabled} onCheckedChange={() => toggleEnabled(t)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.label}</span>
                  <code className="text-xs text-muted-foreground">{t.path}</code>
                  <a href={`https://testd.website${t.path}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {t.last_checked_at && (
                  <div className="text-xs text-muted-foreground mt-1">
                    ตรวจล่าสุด {formatDistanceToNow(new Date(t.last_checked_at), { addSuffix: true })}
                    {t.last_status_code !== null && ` · HTTP ${t.last_status_code}`}
                    {t.last_error && ` · ${t.last_error}`}
                  </div>
                )}
              </div>
              {t.last_ok === true && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>}
              {t.last_ok === false && <Badge variant="destructive">FAIL ×{t.consecutive_failures}</Badge>}
              {t.last_ok === null && <Badge variant="outline">ยังไม่ตรวจ</Badge>}
              <Button size="icon" variant="ghost" onClick={() => removeTarget(t)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input placeholder="/some-path" value={newPath} onChange={(e) => setNewPath(e.target.value)} className="max-w-xs" />
            <Input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="max-w-xs" />
            <Button onClick={addTarget}><Plus className="h-4 w-4 mr-1" />เพิ่ม</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ประวัติการตรวจล่าสุด (100 รายการ)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[500px] overflow-auto text-sm">
            {history.map((h) => (
              <div key={h.id} className={`flex items-center gap-2 p-2 rounded ${h.ok ? "" : "bg-destructive/5"}`}>
                {h.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                <code className="text-xs">{h.path}</code>
                <span className="text-xs text-muted-foreground">{h.status_code ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{h.duration_ms}ms</span>
                {h.error && <span className="text-xs text-destructive truncate">{h.error}</span>}
                <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(h.checked_at), { addSuffix: true })}</span>
              </div>
            ))}
            {history.length === 0 && <p className="text-muted-foreground text-center py-8">ยังไม่มีประวัติ — กด "ตรวจสอบเดี๋ยวนี้"</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
