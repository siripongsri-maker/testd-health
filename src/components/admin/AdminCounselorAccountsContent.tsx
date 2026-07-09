import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { HeartHandshake, Plus, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Branch { id: string; name_th: string; name_en: string }
interface Counselor {
  user_id: string;
  full_name: string;
  nickname: string | null;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  email?: string | null;
}

const TX = (th: string, en: string, lang: string) => (lang === "th" ? th : en);

export default function AdminCounselorAccountsContent() {
  const { language } = useLanguage();
  const tx = (th: string, en: string) => TX(th, en, language);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openReset, setOpenReset] = useState<Counselor | null>(null);
  const [saving, setSaving] = useState(false);

  // create form
  const [cFullName, setCFullName] = useState("");
  const [cNickname, setCNickname] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cBranch, setCBranch] = useState("");
  const [cActive, setCActive] = useState(true);

  const [resetPwd, setResetPwd] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: br }, { data: cp }] = await Promise.all([
      supabase.from("booking_branches").select("id, name_th, name_en").order("name_th"),
      (supabase as any).from("counselor_profiles").select("*").order("created_at", { ascending: false }),
    ]);
    setBranches((br as Branch[]) ?? []);
    setRows((cp as Counselor[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const branchName = (id: string | null) => {
    if (!id) return "—";
    const b = branches.find((x) => x.id === id);
    return b ? (language === "th" ? b.name_th : b.name_en) : id.slice(0, 8);
  };

  const resetCreateForm = () => {
    setCFullName(""); setCNickname(""); setCEmail(""); setCPassword(""); setCBranch(""); setCActive(true);
  };

  const createCounselor = async () => {
    if (!cFullName || !cEmail || !cPassword || !cBranch) {
      toast.error(tx("กรุณากรอกข้อมูลให้ครบ", "Please complete all fields"));
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-counselor-account", {
      body: {
        action: "create",
        email: cEmail.trim().toLowerCase(),
        password: cPassword,
        full_name: cFullName.trim(),
        nickname: cNickname.trim() || undefined,
        branch_id: cBranch,
        is_active: cActive,
      },
    });
    setSaving(false);
    if (error || (data && (data as any).error)) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(tx("สร้างบัญชีสำเร็จ", "Counselor account created"));
    setOpenCreate(false);
    resetCreateForm();
    load();
  };

  const toggleActive = async (row: Counselor, next: boolean) => {
    const { data, error } = await supabase.functions.invoke("manage-counselor-account", {
      body: { action: "update", user_id: row.user_id, is_active: next },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(next ? tx("เปิดใช้งานแล้ว", "Activated") : tx("ปิดการใช้งานแล้ว", "Deactivated"));
    load();
  };

  const changeBranch = async (row: Counselor, branch_id: string) => {
    const { data, error } = await supabase.functions.invoke("manage-counselor-account", {
      body: { action: "update", user_id: row.user_id, branch_id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(tx("อัปเดตสาขาแล้ว", "Branch updated"));
    load();
  };

  const submitReset = async () => {
    if (!openReset || !resetPwd) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("manage-counselor-account", {
      body: { action: "reset_password", user_id: openReset.user_id, password: resetPwd },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
      return;
    }
    toast.success(tx("รีเซ็ตรหัสผ่านแล้ว", "Password reset"));
    setOpenReset(null); setResetPwd("");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-primary" />
            {tx("บัญชีนักให้คำปรึกษา", "Counselor Accounts")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {tx(
              "สร้างและจัดการบัญชีนักให้คำปรึกษาที่ใช้ Counselor Support",
              "Create and manage counselor accounts used on the Counselor Support page",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tx("รีเฟรช", "Refresh")}
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {tx("เพิ่มนักให้คำปรึกษา", "Add counselor")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tx("รายชื่อนักให้คำปรึกษา", "Counselors")} ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {tx("ยังไม่มีบัญชีนักให้คำปรึกษา", "No counselors yet")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tx("ชื่อ", "Name")}</TableHead>
                    <TableHead>{tx("ชื่อเล่น", "Nickname")}</TableHead>
                    <TableHead>{tx("สาขา", "Branch")}</TableHead>
                    <TableHead>{tx("สถานะ", "Status")}</TableHead>
                    <TableHead className="text-right">{tx("การจัดการ", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.nickname || "—"}</TableCell>
                      <TableCell>
                        <Select value={r.branch_id ?? ""} onValueChange={(v) => changeBranch(r, v)}>
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue placeholder={branchName(r.branch_id)} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {language === "th" ? b.name_th : b.name_en}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r, v)} />
                          <Badge variant={r.is_active ? "default" : "secondary"}>
                            {r.is_active ? tx("ใช้งาน", "Active") : tx("ปิดใช้งาน", "Inactive")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setOpenReset(r)}>
                          <KeyRound className="h-4 w-4 mr-1" />
                          {tx("รีเซ็ตรหัสผ่าน", "Reset password")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={(v) => { setOpenCreate(v); if (!v) resetCreateForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx("เพิ่มนักให้คำปรึกษา", "Add counselor")}</DialogTitle>
            <DialogDescription>
              {tx("บัญชีนี้จะเข้าถึงได้เฉพาะหน้า Counselor Support ของสาขาที่กำหนด",
                  "This account can only access the Counselor Support page for its branch.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{tx("ชื่อ-นามสกุล", "Full name")}</Label>
              <Input value={cFullName} onChange={(e) => setCFullName(e.target.value)} />
            </div>
            <div>
              <Label>{tx("ชื่อเล่น", "Nickname")}</Label>
              <Input value={cNickname} onChange={(e) => setCNickname(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
            </div>
            <div>
              <Label>{tx("รหัสผ่าน", "Password")}</Label>
              <Input type="text" value={cPassword} onChange={(e) => setCPassword(e.target.value)} placeholder="min 8 chars" />
            </div>
            <div>
              <Label>{tx("สาขา", "Branch")}</Label>
              <Select value={cBranch} onValueChange={setCBranch}>
                <SelectTrigger><SelectValue placeholder={tx("เลือกสาขา", "Select branch")} /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {language === "th" ? b.name_th : b.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={cActive} onCheckedChange={setCActive} />
              <span className="text-sm">{tx("เปิดใช้งานทันที", "Active immediately")}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{tx("ยกเลิก", "Cancel")}</Button>
            <Button onClick={createCounselor} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tx("สร้างบัญชี", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!openReset} onOpenChange={(v) => { if (!v) { setOpenReset(null); setResetPwd(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx("รีเซ็ตรหัสผ่าน", "Reset password")}</DialogTitle>
            <DialogDescription>{openReset?.full_name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{tx("รหัสผ่านใหม่", "New password")}</Label>
            <Input type="text" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} placeholder="min 8 chars" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenReset(null); setResetPwd(""); }}>{tx("ยกเลิก", "Cancel")}</Button>
            <Button onClick={submitReset} disabled={saving || resetPwd.length < 8}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tx("บันทึก", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
