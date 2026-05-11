import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CalendarRange, Save } from "lucide-react";
import { toast } from "sonner";

interface BranchRow {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  advance_booking_days: number | null;
}

interface ServiceRow {
  id: string;
  slug: string;
  name_th: string;
  name_en: string;
  icon: string | null;
  advance_booking_days: number | null;
}

const DEFAULT = 30;
const MIN = 1;
const MAX = 365;

function clamp(v: number) {
  if (Number.isNaN(v)) return DEFAULT;
  return Math.max(MIN, Math.min(MAX, Math.round(v)));
}

export default function AdvanceBookingWindowCard() {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, s] = await Promise.all([
        supabase
          .from("booking_branches")
          .select("id, slug, name_th, name_en, advance_booking_days")
          .order("name_en"),
        supabase
          .from("booking_services")
          .select("id, slug, name_th, name_en, icon, advance_booking_days")
          .order("display_order"),
      ]);
      const br = (b.data as BranchRow[]) || [];
      const sv = (s.data as ServiceRow[]) || [];
      setBranches(br);
      setServices(sv);
      const init: Record<string, number> = {};
      br.forEach(r => { init[`b:${r.id}`] = r.advance_booking_days ?? DEFAULT; });
      sv.forEach(r => { init[`s:${r.id}`] = r.advance_booking_days ?? DEFAULT; });
      setDraft(init);
      setLoading(false);
    })();
  }, []);

  const save = async (kind: "b" | "s", id: string) => {
    const key = `${kind}:${id}`;
    const value = clamp(draft[key]);
    setSavingId(key);
    const table = kind === "b" ? "booking_branches" : "booking_services";
    const { error } = await supabase
      .from(table)
      .update({ advance_booking_days: value })
      .eq("id", id);
    if (error) {
      toast.error(isEn ? "Failed to save" : "บันทึกไม่สำเร็จ");
    } else {
      toast.success(isEn ? "Saved" : "บันทึกแล้ว");
      if (kind === "b") {
        setBranches(prev => prev.map(r => r.id === id ? { ...r, advance_booking_days: value } : r));
      } else {
        setServices(prev => prev.map(r => r.id === id ? { ...r, advance_booking_days: value } : r));
      }
      setDraft(d => ({ ...d, [key]: value }));
    }
    setSavingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const renderTable = (
    label: string,
    rows: Array<BranchRow | ServiceRow>,
    kind: "b" | "s"
  ) => (
    <div>
      <h3 className="text-sm font-semibold mb-2">{label}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isEn ? "Name" : "ชื่อ"}</TableHead>
            <TableHead className="w-24">Slug</TableHead>
            <TableHead className="w-36">{isEn ? "Days ahead" : "จองล่วงหน้า (วัน)"}</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const key = `${kind}:${r.id}`;
            const current = (kind === "b"
              ? (r as BranchRow).advance_booking_days
              : (r as ServiceRow).advance_booking_days) ?? DEFAULT;
            const dirty = draft[key] !== current;
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {kind === "s" && (r as ServiceRow).icon && (
                      <span className="text-base">{(r as ServiceRow).icon}</span>
                    )}
                    <span className="text-sm font-medium">{isEn ? r.name_en : r.name_th}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">{r.slug}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={MIN}
                    max={MAX}
                    value={draft[key] ?? DEFAULT}
                    onChange={(e) =>
                      setDraft(d => ({ ...d, [key]: Number(e.target.value) }))
                    }
                    className="h-8 w-24 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={dirty ? "default" : "ghost"}
                    disabled={!dirty || savingId === key}
                    onClick={() => save(kind, r.id)}
                    className="h-8"
                  >
                    {savingId === key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4" />
          {isEn ? "Advance Booking Window" : "ระยะเวลาจองล่วงหน้า"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          {isEn
            ? `Set how many days ahead users can book per branch and per service (1–${MAX}). The booking page uses the smaller of the two limits when both apply. Default ${DEFAULT}.`
            : `กำหนดจำนวนวันที่ผู้ใช้จองล่วงหน้าได้ แยกตามสาขาและบริการ (1–${MAX} วัน) หน้าจองจะใช้ค่าที่น้อยกว่าระหว่างสาขาและบริการที่เลือก ค่าเริ่มต้น ${DEFAULT} วัน`}
        </p>
        {renderTable(isEn ? "Branches" : "สาขา", branches, "b")}
        {renderTable(isEn ? "Services" : "บริการ", services, "s")}
      </CardContent>
    </Card>
  );
}
