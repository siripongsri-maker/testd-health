import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Save, RefreshCw, Play, Clock, Trash2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

type DisposalMethod = "delete" | "aggregate_then_delete" | "aggregate_only";

interface Settings {
  id: string;
  analytics_enabled: boolean;
  raw_retention_days: number;
  disposal_method: DisposalMethod;
  anonymous_id_rotation_days: number;
  store_referrer: boolean;
  store_user_agent: boolean;
  allow_user_optout: boolean;
  privacy_note_th: string | null;
  last_run_at: string | null;
  updated_at: string;
}

interface Job {
  id: string;
  status: string;
  records_processed: number;
  records_deleted: number;
  records_anonymized: number;
  started_at: string | null;
  completed_at: string | null;
}

const METHODS: { value: DisposalMethod; title: string; desc: string }[] = [
  { value: "delete", title: "ลบทิ้งอย่างเดียว", desc: "ลบข้อมูลดิบที่เกินระยะเวลาโดยไม่เก็บสรุป (ข้อมูลย้อนหลังจะหายไป)" },
  { value: "aggregate_then_delete", title: "สรุปเป็นรายวันแล้วลบข้อมูลดิบ (แนะนำ)", desc: "รวมยอดผู้เข้าชม/หน้าที่เปิด/เซสชันเป็นรายวัน แล้วลบเหตุการณ์ดิบทิ้ง" },
  { value: "aggregate_only", title: "สรุปแล้วกลบข้อมูลระบุตัวตนทางอ้อม", desc: "เก็บเหตุการณ์ไว้แต่ล้าง anonymous_id, session, referrer และ user agent" },
];

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }) : "—";

export default function AdminAnonymousPrivacyContent() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, j, c] = await Promise.all([
      (supabase as any).from("anonymous_data_settings").select("*").maybeSingle(),
      (supabase as any).from("anonymization_jobs").select("*").eq("target_table", "analytics_events").order("created_at", { ascending: false }).limit(10),
      (supabase as any).from("analytics_events").select("id", { count: "exact", head: true }),
    ]);
    if (s.error) toast.error("โหลดการตั้งค่าไม่สำเร็จ: " + s.error.message);
    setSettings(s.data ?? null);
    setJobs(j.data ?? []);
    setEventCount(typeof c.count === "number" ? c.count : null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (p: Partial<Settings>) => setSettings((prev) => (prev ? { ...prev, ...p } : prev));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("anonymous_data_settings")
      .update({
        analytics_enabled: settings.analytics_enabled,
        raw_retention_days: settings.raw_retention_days,
        disposal_method: settings.disposal_method,
        anonymous_id_rotation_days: settings.anonymous_id_rotation_days,
        store_referrer: settings.store_referrer,
        store_user_agent: settings.store_user_agent,
        allow_user_optout: settings.allow_user_optout,
        privacy_note_th: settings.privacy_note_th,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error("บันทึกไม่สำเร็จ: " + error.message);
    else { toast.success("บันทึกการตั้งค่าแล้ว"); load(); }
  };

  const run = async () => {
    setRunning(true);
    const { data, error } = await (supabase as any).rpc("run_anonymous_data_retention");
    setRunning(false);
    if (error) { toast.error("ประมวลผลไม่สำเร็จ: " + error.message); return; }
    const r = data as any;
    toast.success(`ประมวลผลแล้ว: ตรวจ ${r?.processed ?? 0} รายการ • ลบ ${r?.deleted ?? 0} • กลบ ${r?.anonymized ?? 0}`);
    load();
  };

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>;

  if (!settings) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        ไม่พบการตั้งค่า หรือบัญชีของคุณไม่มีสิทธิ์ดูหน้านี้ (เฉพาะผู้ดูแลระบบ)
      </CardContent></Card>
    );
  }

  const cutoffDate = new Date(Date.now() - settings.raw_retention_days * 86400000);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> ความเป็นส่วนตัว: ข้อมูลแบบไม่ระบุตัวตน
          </h2>
          <p className="text-sm text-muted-foreground">
            กำหนดว่าจะเก็บสถิติการใช้งานอะไร นานแค่ไหน และเมื่อครบกำหนดจะลบหรือทำให้เป็นข้อมูลสรุป
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> รีเฟรช</Button>
          <Button size="sm" onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> บันทึก</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">เหตุการณ์ดิบทั้งหมด</p>
          <p className="text-2xl font-semibold">{eventCount?.toLocaleString("th-TH") ?? "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">ข้อมูลก่อนวันที่นี้จะถูกจัดการ</p>
          <p className="text-2xl font-semibold">{cutoffDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">ประมวลผลล่าสุด</p>
          <p className="text-base font-medium flex items-center gap-1"><Clock className="h-4 w-4" /> {fmt(settings.last_run_at)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">สิ่งที่เก็บ</CardTitle>
          <CardDescription>ทุกรายการเป็นข้อมูลแบบไม่ระบุตัวตน ไม่มีชื่อ เบอร์โทร หรือเลขบัตรประชาชน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "analytics_enabled" as const, label: "เปิดการเก็บสถิติแบบไม่ระบุตัวตน", desc: "ปิดเมื่อไม่ต้องการเก็บข้อมูลการใช้งานใหม่" },
            { key: "store_referrer" as const, label: "เก็บที่มาของลิงก์ (referrer)", desc: "ใช้วิเคราะห์ว่าผู้ใช้มาจากช่องทางไหน" },
            { key: "store_user_agent" as const, label: "เก็บ user agent", desc: "เพิ่มความเสี่ยงต่อการระบุตัวทางอ้อม แนะนำให้ปิด" },
            { key: "allow_user_optout" as const, label: "ให้ผู้ใช้ปฏิเสธการเก็บข้อมูลได้", desc: "แสดงตัวเลือกไม่เก็บสถิติในหน้าเว็บผู้ใช้" },
          ].map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4 border-b last:border-0 pb-3 last:pb-0">
              <div>
                <Label className="text-sm">{row.label}</Label>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch checked={settings[row.key]} onCheckedChange={(v) => patch({ [row.key]: v } as Partial<Settings>)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ระยะเวลาเก็บข้อมูล</CardTitle>
          <CardDescription>ข้อมูลดิบที่เก่ากว่ากำหนดจะถูกจัดการตามวิธีด้านล่าง</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>เก็บข้อมูลดิบ (วัน)</Label>
            <Input type="number" min={7} max={3650} value={settings.raw_retention_days}
              onChange={(e) => patch({ raw_retention_days: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">แนะนำ 180 วัน (ประมาณ 6 เดือน)</p>
          </div>
          <div className="space-y-1.5">
            <Label>หมุนรหัสผู้ใช้แบบไม่ระบุตัวตน (วัน)</Label>
            <Input type="number" min={1} max={3650} value={settings.anonymous_id_rotation_days}
              onChange={(e) => patch({ anonymous_id_rotation_days: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">ยิ่งสั้น ยิ่งลดโอกาสเชื่อมโยงพฤติกรรมข้ามช่วงเวลา</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">วิธีจัดการเมื่อครบกำหนด</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={settings.disposal_method} onValueChange={(v) => patch({ disposal_method: v as DisposalMethod })} className="space-y-2">
            {METHODS.map((m) => (
              <label key={m.value} htmlFor={`m-${m.value}`} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value={m.value} id={`m-${m.value}`} className="mt-1" />
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {m.value === "delete" ? <Trash2 className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />} {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label>ข้อความแจ้งผู้ใช้ (ภาษาไทย)</Label>
            <Textarea rows={2} value={settings.privacy_note_th ?? ""} onChange={(e) => patch({ privacy_note_th: e.target.value })} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> บันทึกการตั้งค่า</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={running}><Play className="h-4 w-4 mr-1" /> ประมวลผลตามนโยบายตอนนี้</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการประมวลผลข้อมูล</AlertDialogTitle>
                  <AlertDialogDescription>
                    ระบบจะจัดการข้อมูลก่อนวันที่ {cutoffDate.toLocaleDateString("th-TH")} ด้วยวิธี “{METHODS.find((m) => m.value === settings.disposal_method)?.title}” การลบไม่สามารถย้อนกลับได้
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={run}>ยืนยัน</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <span className="text-xs text-muted-foreground">บันทึกการตั้งค่าก่อนกดประมวลผล</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">ประวัติการประมวลผล</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>เริ่ม</TableHead><TableHead>เสร็จ</TableHead><TableHead>สถานะ</TableHead>
                <TableHead className="text-right">ตรวจ</TableHead><TableHead className="text-right">ลบ</TableHead><TableHead className="text-right">กลบ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">ยังไม่มีประวัติ</TableCell></TableRow>
              )}
              {jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="text-xs">{fmt(j.started_at)}</TableCell>
                  <TableCell className="text-xs">{fmt(j.completed_at)}</TableCell>
                  <TableCell><Badge variant={j.status === "completed" ? "secondary" : "outline"}>{j.status}</Badge></TableCell>
                  <TableCell className="text-right">{j.records_processed}</TableCell>
                  <TableCell className="text-right">{j.records_deleted}</TableCell>
                  <TableCell className="text-right">{j.records_anonymized}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
