import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { Printer, LayoutGrid, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
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
  const origin = typeof window !== "undefined" ? window.location.origin : "https://testd.website";
  const [qrUrl, setQrUrl] = useState(`${origin}/hiv-selftest?utm_source=care_card`);
  const [layout, setLayout] = useState<Layout>(6);
  const [duplex, setDuplex] = useState(true);
  const [cutMarks, setCutMarks] = useState(true);
  const [zoom, setZoom] = useState(0.42);

  const [exporting, setExporting] = useState<Layout | null>(null);

  const perSheet = useMemo(() => LAYOUTS[layout].cols * LAYOUTS[layout].rows, [layout]);

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

      console.log("[cc-export] renderer=html-to-image");
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


  return (
    <div className="min-h-screen bg-muted/30">
      <SEOHead title="พิมพ์การ์ดดูแลกัน · SWING" description="เทมเพลตพิมพ์การ์ดความรู้ A4" robots="noindex, nofollow" />

      {/* แถบควบคุม (ไม่ถูกพิมพ์) */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Link to="/admin?tab=mel-safe-spaces"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
              <div>
                <h1 className="text-lg font-bold">พิมพ์การ์ดดูแลกัน</h1>
                <p className="text-xs text-muted-foreground">A4 · {perSheet} ใบต่อแผ่น {duplex ? "· พิมพ์หน้า-หลัง" : "· เฉพาะด้านหน้า"}</p>
              </div>
            </div>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> สั่งพิมพ์ / บันทึก PDF
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <Label className="text-xs">ดาวน์โหลดไฟล์ PDF (แยกไฟล์ตามจำนวนใบต่อแผ่น)</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LAYOUTS) as unknown as Layout[]).map((k) => {
                const key = Number(k) as Layout;
                return (
                  <Button key={key} variant="outline" size="sm" className="gap-1.5" disabled={exporting !== null} onClick={() => exportPdf(key)}>
                    {exporting === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    PDF {key} ใบ/แผ่น
                  </Button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">ไฟล์จะใช้ลิงก์ QR และการตั้งค่าเส้นตัด/พิมพ์สองหน้าปัจจุบัน</p>
          </div>


          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">ลิงก์สำหรับ QR code</Label>
              <Input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="https://…" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { l: "ขอชุดตรวจ", u: `${origin}/hiv-selftest?utm_source=care_card` },
                  { l: "ควิซพื้นที่ปลอดภัย", u: `${origin}/safe-space/quiz?event=safespace` },
                  { l: "จองคลินิก", u: `${origin}/clinic/book?utm_source=care_card` },
                ].map((p) => (
                  <button key={p.l} onClick={() => setQrUrl(p.u)} className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70">{p.l}</button>
                ))}
              </div>
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
