import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Printer, LayoutGrid, ArrowLeft, Download, Loader2, Repeat } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format as formatDate } from "date-fns";
import { CareCardFront, CareCardBack } from "@/components/care-card/CareCardFaces";

type Layout = 4 | 6 | 8 | 9;

const LAYOUTS: Record<Layout, { cols: number; rows: number; label: string }> = {
  4: { cols: 2, rows: 2, label: "4 ใบ / แผ่น (A6 เต็มขนาด)" },
  6: { cols: 2, rows: 3, label: "6 ใบ / แผ่น (ย่อ ~67%)" },
  8: { cols: 2, rows: 4, label: "8 ใบ / แผ่น (ย่อ ~50%)" },
  9: { cols: 3, rows: 3, label: "9 ใบ / แผ่น (ย่อ ~65%)" },
};

const CARD_W = 105;

const CARD_H = 148;

function Sheet({
  layout,
  mirror,
  cutMarks,
  children,
}: {
  layout: Layout;
  mirror: boolean;
  cutMarks: boolean;
  children: (i: number) => React.ReactNode;
}) {
  const { cols, rows } = LAYOUTS[layout];
  const slotW = 210 / cols;
  const slotH = 297 / rows;
  const scale = Math.min(slotW / CARD_W, slotH / CARD_H);

  const slots = Array.from({ length: cols * rows }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // สลับคอลัมน์ในแต่ละแถวสำหรับด้านหลัง เพื่อให้ตรงกับด้านหน้าเวลาพิมพ์สองหน้า (พลิกด้านยาว)
    const srcIndex = mirror ? r * cols + (cols - 1 - c) : i;
    return srcIndex;
  });

  return (
    <div className="cc-sheet" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
      {slots.map((srcIndex, i) => (
        <div key={i} className={`cc-slot${cutMarks ? " cc-cut" : ""}`}>
          <div className="cc-scale" style={{ zoom: scale }}>{children(srcIndex)}</div>
        </div>
      ))}
    </div>
  );
}

export default function CareCardPrint() {
  const [searchParams, setSearchParams] = useSearchParams();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://testd.website";
  const [baseUrl, setBaseUrl] = useState(`${origin}/safe-space/quiz`);
  const [sessionId, setSessionId] = useState(() => searchParams.get("session") || "none");
  const [eventCode, setEventCode] = useState(() => searchParams.get("event") || "safespace");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [sessionQuery, setSessionQuery] = useState("");
  const [layout, setLayout] = useState<Layout>(6);
  const [duplex, setDuplex] = useState(true);
  const [cutMarks, setCutMarks] = useState(true);
  const [zoom, setZoom] = useState(0.42);

  const [exporting, setExporting] = useState<Layout | null>(null);

  const { user, loading: authLoading } = useAuth();

  const { data: sessions } = useQuery({
    queryKey: ["care-card-support-sessions", user?.id || "anon"],
    enabled: !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_sessions")
        .select("id, session_date, session_title_th, location")
        .order("session_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // เผื่อกรณีอ่านรายการทั้งหมดไม่ได้ (สิทธิ์/ยังไม่ล็อกอิน) ให้ยืนยันเซสชันจาก URL ผ่านฟังก์ชันสาธารณะ
  const urlSessionId = searchParams.get("session");
  const { data: publicSession } = useQuery({
    queryKey: ["care-card-public-session", urlSessionId],
    enabled: !!urlSessionId && !(sessions || []).some((s: { id: string }) => s.id === urlSessionId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_safe_space_session_public", {
        p_session_id: urlSessionId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      return row
        ? {
            id: urlSessionId as string,
            session_date: (row as { session_date: string }).session_date,
            session_title_th: (row as { session_title_th: string | null }).session_title_th,
            location: (row as { location: string | null }).location,
          }
        : null;
    },
  });

  // ผูก QR กับเซสชัน เพื่อวัดผลว่าคนจากเซสชันไหนสแกนและตอบกลับ
  const qrUrl = useMemo(() => {
    try {
      const u = new URL(baseUrl, origin);
      u.searchParams.set("utm_source", "care_card");
      if (eventCode.trim()) u.searchParams.set("event", eventCode.trim());
      if (sessionId !== "none") u.searchParams.set("session", sessionId);
      return u.toString();
    } catch {
      return baseUrl;
    }
  }, [baseUrl, origin, eventCode, sessionId]);

  // เก็บเซสชันที่เลือกไว้ใน URL เพื่อให้ลิงก์จากหน้าแอดมินและหน้าพิมพ์ตรงกัน
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (sessionId === "none") next.delete("session");
    else next.set("session", sessionId);
    if (eventCode.trim()) next.set("event", eventCode.trim());
    else next.delete("event");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [eventCode, searchParams, sessionId, setSearchParams]);

  useEffect(() => {
    if (sessionId === "none") return;
    const s = (sessions || []).find((x: { id: string }) => x.id === sessionId);
    if (s) {
      const auto = `ss-${formatDate(new Date((s as { session_date: string }).session_date), "yyyyMMdd")}`;
      setEventCode((prev) => (prev === "safespace" || prev.startsWith("ss-") ? auto : prev));
    }
  }, [sessionId, sessions]);

  const perSheet = useMemo(() => LAYOUTS[layout].cols * LAYOUTS[layout].rows, [layout]);
  const selectedSession = useMemo(
    () => (sessions || []).find((s: { id: string }) => s.id === sessionId),
    [sessionId, sessions],
  );
  // มีรหัสเซสชันใน URL แต่หาไม่เจอในระบบ = การ์ด/ลิงก์เก่า
  const staleSession = !!sessions && sessionId !== "none" && !selectedSession;

  const sheetsFor = (l: Layout) => (
    <>
      <Sheet layout={l} mirror={false} cutMarks={cutMarks}>{() => <CareCardFront />}</Sheet>
      {duplex && (
        <div className="cc-gap">
          <Sheet layout={l} mirror cutMarks={cutMarks}>{() => <CareCardBack qrUrl={qrUrl} />}</Sheet>
        </div>
      )}
    </>
  );

  const sheets = sheetsFor(layout);

  const exportPdf = async (l: Layout) => {
    if (exporting) return;
    setExporting(l);
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;z-index:-1;";
    document.body.appendChild(host);
    const root = createRoot(host);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      root.render(<div className="cc-pdf-export">{sheetsFor(l)}</div>);
      await new Promise((r) => setTimeout(r, 800));
      await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;

      const nodes = Array.from(host.querySelectorAll<HTMLElement>(".cc-sheet"));
      if (!nodes.length) throw new Error("no sheet");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (let i = 0; i < nodes.length; i++) {
        const w = nodes[i].offsetWidth;
        const h = nodes[i].offsetHeight;
        const dataUrl = await toPng(nodes[i], {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          width: w,
          height: h,
          style: { margin: "0" },
        });
        if (i > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, 210, 296.5, undefined, "FAST");
      }

      pdf.save(`care-card-a4-${l}up${duplex ? "-duplex" : ""}.pdf`);
      toast.success(`ดาวน์โหลดไฟล์ PDF ${l} ใบ/แผ่น แล้ว`);
    } catch (e) {
      console.error(e);
      toast.error("สร้างไฟล์ PDF ไม่สำเร็จ ลองใช้ปุ่มสั่งพิมพ์แทน");
    } finally {
      root.unmount();
      host.remove();
      setExporting(null);
    }
  };


  const filteredSessions = (sessions || []).filter((s: { session_title_th: string | null; location: string | null; session_date: string }) => {
    const q = sessionQuery.trim().toLowerCase();
    if (!q) return true;
    return `${s.session_title_th || ""} ${s.location || ""} ${formatDate(new Date(s.session_date), "dd MMM yyyy")}`.toLowerCase().includes(q);
  });

  const pickSession = (id: string) => {
    setSessionId(id);
    setSwitcherOpen(false);
    toast.success("เปลี่ยนเซสชันแล้ว — QR จะผูกกับเซสชันนี้");
  };

  const openSessionPicker = () => {
    setSessionQuery("");
    setSwitcherOpen(true);
    if (!selectedSession) toast.info("รอผูกเซสชัน — เลือกกิจกรรมก่อนพิมพ์การ์ด");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <SEOHead title="พิมพ์การ์ดดูแลกัน · SWING" description="เทมเพลตพิมพ์การ์ดความรู้ A4" robots="noindex, nofollow" />

      <Dialog open={switcherOpen} onOpenChange={setSwitcherOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>เลือก / สลับเซสชัน</DialogTitle>
            <DialogDescription>เลือกกิจกรรมที่จะผูกกับ QR บนการ์ด เปลี่ยนได้ทันทีโดยไม่ต้องกลับหน้ารายการ</DialogDescription>
          </DialogHeader>
          <Input
            value={sessionQuery}
            onChange={(e) => setSessionQuery(e.target.value)}
            placeholder="ค้นหาชื่อกิจกรรม สถานที่ หรือวันที่"
            className="h-9"
          />
          {!sessionQuery.trim() && (sessions || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">ตัวเลือกล่าสุด</p>
              <div className="flex flex-wrap gap-1.5">
                {(sessions || []).slice(0, 3).map((s: { id: string; session_date: string; session_title_th: string | null }) => (
                  <Button key={`recent-${s.id}`} size="sm" variant={s.id === sessionId ? "default" : "outline"} className="text-xs" onClick={() => pickSession(s.id)}>
                    {formatDate(new Date(s.session_date), "dd MMM")} · {s.session_title_th || "ไม่มีชื่อ"}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-[45vh] overflow-y-auto space-y-1.5 pr-1">
            {filteredSessions.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">ไม่พบเซสชันที่ค้นหา</p>
            )}
            {filteredSessions.map((s: { id: string; session_date: string; session_title_th: string | null; location: string | null }) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pickSession(s.id)}
                className={`w-full text-left rounded-lg border p-3 transition hover:bg-accent ${s.id === sessionId ? "border-primary bg-primary/5" : ""}`}
              >
                <p className="text-sm font-medium">{s.session_title_th || "ไม่มีชื่อ"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(new Date(s.session_date), "dd MMM yyyy")}{s.location ? ` · ${s.location}` : ""}
                  {s.id === sessionId ? " · กำลังใช้อยู่" : ""}
                </p>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-1">
            <Link to="/admin?tab=mel-safe-spaces">
              <Button variant="ghost" size="sm" className="gap-1.5"><ArrowLeft className="h-3.5 w-3.5" /> หน้ารายการ</Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => setSwitcherOpen(false)}>ปิด</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* แถบควบคุม (ไม่ถูกพิมพ์) */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Link to="/admin?tab=mel-safe-spaces"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
              <div>
                <h1 className="text-lg font-bold">พิมพ์การ์ดดูแลกัน</h1>
                <p className="text-xs text-muted-foreground">A4 · {perSheet} ใบต่อแผ่น {duplex ? "· พิมพ์หน้า-หลัง" : "· เฉพาะด้านหน้า"}</p>
                <p className={`mt-1 text-xs font-medium ${selectedSession ? "text-primary" : "text-destructive"}`}>
                  {selectedSession
                    ? `ผูกเซสชัน: ${selectedSession.session_title_th || "ไม่มีชื่อ"} · ${formatDate(new Date(selectedSession.session_date), "dd MMM yyyy")}`
                    : "ยังไม่ได้ผูกเซสชัน — กรุณาเลือกเซสชันก่อนพิมพ์"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setSwitcherOpen(true)}>
                <Repeat className="h-4 w-4" /> {selectedSession ? "สลับเซสชัน" : "เลือกเซสชัน"}
              </Button>
              {selectedSession ? (
                <Button onClick={() => window.print()} className="gap-2">
                  <Printer className="h-4 w-4" /> สั่งพิมพ์ / บันทึก PDF
                </Button>
              ) : (
                <Button variant="secondary" className="gap-2" onClick={openSessionPicker}>
                  <Repeat className="h-4 w-4" /> รอผูกเซสชัน — เลือกเซสชันก่อนพิมพ์
                </Button>
              )}
            </div>
          </div>

          {!selectedSession && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                {staleSession ? "ไม่พบเซสชันนี้ (อาจถูกลบหรือหมดอายุ)" : "ยังไม่ได้ผูกเซสชัน"}
              </p>
              <p className="text-xs text-muted-foreground">
                {staleSession
                  ? "ลิงก์ที่เปิดมามีรหัสเซสชันที่ไม่มีอยู่ในระบบแล้ว การ์ดที่พิมพ์จะสแกนแล้วไม่ถูกนับเข้ากิจกรรม กรุณาเลือกเซสชันใหม่ก่อนพิมพ์"
                  : "QR บนการ์ดจะไม่ถูกนับเข้ากิจกรรมใด กรุณาเลือกเซสชันด้านล่าง หรือกดปุ่ม \"เลือกเซสชัน\" เพื่อเลือกจากรายการทั้งหมด"}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {(sessions || []).slice(0, 3).map((s: { id: string; session_date: string; session_title_th: string | null }) => (
                  <Button key={s.id} size="sm" variant="outline" className="text-xs" onClick={() => pickSession(s.id)}>
                    {formatDate(new Date(s.session_date), "dd MMM yyyy")} · {s.session_title_th || "ไม่มีชื่อ"}
                  </Button>
                ))}
                <Button size="sm" variant="secondary" className="text-xs gap-1.5" onClick={() => setSwitcherOpen(true)}>
                  <Repeat className="h-3.5 w-3.5" /> เลือกจากทั้งหมด
                </Button>
              </div>
            </div>
          )}



          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <Label className="text-xs">ดาวน์โหลดไฟล์ PDF (แยกไฟล์ตามจำนวนใบต่อแผ่น)</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LAYOUTS) as unknown as Layout[]).map((k) => {
                const key = Number(k) as Layout;
                if (!selectedSession) {
                  return (
                    <Button key={key} variant="outline" size="sm" className="gap-1.5 text-muted-foreground" onClick={openSessionPicker}>
                      <Repeat className="h-3.5 w-3.5" /> รอผูกเซสชัน · {key} ใบ/แผ่น
                    </Button>
                  );
                }
                return (
                  <Button key={key} variant="outline" size="sm" className="gap-1.5" disabled={exporting !== null} onClick={() => exportPdf(key)}>
                    {exporting === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    PDF {key} ใบ/แผ่น
                  </Button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {selectedSession ? "ไฟล์จะใช้ลิงก์ QR และการตั้งค่าเส้นตัด/พิมพ์สองหน้าปัจจุบัน" : "เลือกเซสชันก่อนจึงจะดาวน์โหลด PDF ได้"}
            </p>
          </div>



          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">ปลายทางของ QR code</Label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { l: "ควิซพื้นที่ปลอดภัย", u: `${origin}/safe-space/quiz` },
                  { l: "ขอชุดตรวจ", u: `${origin}/hiv-selftest` },
                  { l: "จองคลินิก", u: `${origin}/clinic/book` },
                ].map((p) => (
                  <button key={p.l} onClick={() => setBaseUrl(p.u)} className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70">{p.l}</button>
                ))}
              </div>

              <div className="grid gap-2 pt-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">ผูกกับเซสชัน</Label>
                  <Select value={sessionId} onValueChange={setSessionId}>
                    <SelectTrigger className={`h-9 text-xs ${!selectedSession ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ไม่ผูกเซสชัน</SelectItem>
                      {(sessions || []).map((s: { id: string; session_date: string; session_title_th: string | null; location: string | null }) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatDate(new Date(s.session_date), "dd MMM yyyy")} · {s.session_title_th || "ไม่มีชื่อ"}{s.location ? ` · ${s.location}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Event code</Label>
                  <Input className="h-9 text-xs" value={eventCode} onChange={(e) => setEventCode(e.target.value)} placeholder="safespace" />
                </div>
              </div>

              <p className="break-all rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">{qrUrl}</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">จำนวนต่อแผ่น</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(LAYOUTS) as unknown as Layout[]).map((k) => {
                    const key = Number(k) as Layout;
                    return (
                      <button
                        key={key}
                        onClick={() => setLayout(key)}
                        className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${layout === key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />{LAYOUTS[key].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-xs"><Switch checked={duplex} onCheckedChange={setDuplex} />พิมพ์สองหน้า (พลิกด้านยาว)</label>
                <label className="flex items-center gap-2 text-xs"><Switch checked={cutMarks} onCheckedChange={setCutMarks} />เส้นตัด</label>
                <label className="flex items-center gap-2 text-xs">
                  ย่อ/ขยายตัวอย่าง
                  <input type="range" min={0.2} max={0.8} step={0.02} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                </label>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            ตั้งค่าเครื่องพิมพ์: กระดาษ A4 · ขอบ “ไม่มี/None” · เปิด “พิมพ์พื้นหลังกราฟิก” · {duplex ? "เลือกพิมพ์ 2 หน้า แบบพลิกด้านยาว (Long edge)" : "พิมพ์หน้าเดียว"}
          </p>
        </div>
      </div>

      {/* ตัวอย่างบนหน้าจอ */}
      <div className="py-8 overflow-x-auto">
        <div className="mx-auto" style={{ width: `calc(210mm * ${zoom})` }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: "210mm", height: `calc(${duplex ? 602 : 297}mm)` }}>
            {sheets}
          </div>
        </div>
      </div>

      {/* เนื้อหาที่พิมพ์จริง (ซ่อนบนหน้าจอ) */}
      {typeof document !== "undefined" &&
        createPortal(<div className="cc-print-portal">{sheets}</div>, document.body)}

    </div>
  );
}
