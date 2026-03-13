import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Building2, Phone, Clock, MapPin, Link2, AlertTriangle, ListChecks, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClinicSettings {
  id: string;
  clinic_key: string;
  clinic_name: string;
  clinic_phone: string;
  clinic_address: string | null;
  internal_booking_path: string;
  clinic_hours: string | null;
  updated_at: string;
}

interface AuditLog {
  id: string;
  component: string;
  original_link: string;
  action_taken: string;
  created_at: string;
}

interface ServiceRow {
  id: string;
  slug: string;
  name_en: string;
  name_th: string;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export default function AdminClinicSettingsContent() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, auditRes, svcRes] = await Promise.all([
      supabase.from("clinic_settings" as any).select("*").eq("clinic_key", "swing_main").single(),
      supabase.from("clinic_link_audit" as any).select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("booking_services").select("id, slug, name_en, name_th, icon, is_active, display_order").order("display_order"),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data as any);
    if (auditRes.data) setAuditLogs(auditRes.data as any);
    if (svcRes.data) setServiceRows(svcRes.data as ServiceRow[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("clinic_settings" as any)
      .update({
        clinic_name: settings.clinic_name,
        clinic_phone: settings.clinic_phone,
        clinic_address: settings.clinic_address,
        internal_booking_path: settings.internal_booking_path,
        clinic_hours: settings.clinic_hours,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", settings.id);

    if (error) {
      toast.error(isEn ? "Failed to save" : "บันทึกไม่สำเร็จ");
    } else {
      toast.success(isEn ? "Settings saved" : "บันทึกสำเร็จ");
    }
    setSaving(false);
  };

  const toggleServiceActive = async (svc: ServiceRow) => {
    setTogglingId(svc.id);
    const { error } = await supabase
      .from("booking_services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (error) {
      toast.error(isEn ? "Failed to update" : "อัปเดตไม่สำเร็จ");
    } else {
      setServiceRows(prev => prev.map(s => s.id === svc.id ? { ...s, is_active: !s.is_active } : s));
      toast.success(isEn ? "Service updated" : "อัปเดตบริการแล้ว");
    }
    setTogglingId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{isEn ? "SWING Clinic Settings" : "ตั้งค่าคลินิก SWING"}</h2>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {isEn ? "Clinic Configuration" : "การตั้งค่าคลินิก"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />{isEn ? "Clinic Name" : "ชื่อคลินิก"}</Label>
                <Input value={settings.clinic_name} onChange={(e) => setSettings({ ...settings, clinic_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{isEn ? "Phone Number" : "เบอร์โทรศัพท์"}</Label>
                <Input value={settings.clinic_phone} onChange={(e) => setSettings({ ...settings, clinic_phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{isEn ? "Address" : "ที่อยู่"}</Label>
                <Input value={settings.clinic_address || ""} onChange={(e) => setSettings({ ...settings, clinic_address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Link2 className="h-3 w-3" />{isEn ? "Internal Booking Path" : "เส้นทางจอง"}</Label>
                <Input value={settings.internal_booking_path} onChange={(e) => setSettings({ ...settings, internal_booking_path: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{isEn ? "Clinic Hours" : "เวลาทำการ"}</Label>
                <Input value={settings.clinic_hours || ""} onChange={(e) => setSettings({ ...settings, clinic_hours: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="mt-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEn ? "Save Changes" : "บันทึก"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Service Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" />
            {isEn ? "Clinic Service Visibility" : "การแสดงผลบริการคลินิก"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            {isEn
              ? "Services shown on /clinic and /booking pages. Toggle to show or hide from users."
              : "บริการที่แสดงบนหน้า /clinic และ /booking สลับเพื่อแสดงหรือซ่อนจากผู้ใช้"}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>{isEn ? "Service" : "บริการ"}</TableHead>
                <TableHead className="w-20">{isEn ? "Slug" : "Slug"}</TableHead>
                <TableHead className="w-20 text-center">{isEn ? "Visible" : "แสดงผล"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceRows.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell className="text-xs text-muted-foreground">{svc.display_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{svc.icon}</span>
                      <div>
                        <p className="text-sm font-medium">{isEn ? svc.name_en : svc.name_th}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{svc.slug}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={togglingId === svc.id}
                      onClick={() => toggleServiceActive(svc)}
                      className="h-8 w-8 p-0"
                    >
                      {togglingId === svc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : svc.is_active ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Link Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            {isEn ? "Clinic Link Audit Log" : "บันทึกการตรวจสอบลิงก์คลินิก"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{isEn ? "No blocked external links detected." : "ไม่พบลิงก์ภายนอกที่ถูกบล็อก"}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isEn ? "Component" : "คอมโพเนนต์"}</TableHead>
                  <TableHead>{isEn ? "Original Link" : "ลิงก์เดิม"}</TableHead>
                  <TableHead>{isEn ? "Action" : "การดำเนินการ"}</TableHead>
                  <TableHead>{isEn ? "Time" : "เวลา"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-mono">{log.component}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{log.original_link}</TableCell>
                    <TableCell className="text-xs">{log.action_taken}</TableCell>
                    <TableCell className="text-xs">{format(new Date(log.created_at), "dd/MM HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
