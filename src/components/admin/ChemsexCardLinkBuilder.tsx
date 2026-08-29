import { useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Printer, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { CHEMSEX_FACT_CARDS } from "@/data/chemsexFactCards";

const BASE_URL = "https://testd.website";

const SOURCES = [
  { value: "qr", label: "QR บนการ์ดพิมพ์ (src=qr)" },
  { value: "print", label: "สื่อสิ่งพิมพ์อื่น (src=print)" },
  { value: "internal", label: "ลิงก์ในเว็บ/แชท (src=internal)" },
];

function slugifyCampaign(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ChemsexCardLinkBuilder({ knownCampaigns = [] as string[] }) {
  const [campaignRaw, setCampaignRaw] = useState("");
  const [source, setSource] = useState("qr");
  const [lang, setLang] = useState<"th" | "en">("th");
  const [medium, setMedium] = useState("card");
  const [selected, setSelected] = useState<string[]>(CHEMSEX_FACT_CARDS.map((c) => c.slug));
  const printRef = useRef<HTMLDivElement>(null);

  const campaign = slugifyCampaign(campaignRaw);

  const buildUrl = (slug: string) => {
    const url = new URL(`${BASE_URL}/${lang}/chemsex-cards/${slug}`);
    url.searchParams.set("src", source);
    url.searchParams.set("utm_source", source === "qr" ? "qr" : source);
    url.searchParams.set("utm_medium", medium || "card");
    if (campaign) url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  };

  const rows = useMemo(
    () =>
      CHEMSEX_FACT_CARDS.filter((c) => selected.includes(c.slug)).map((c) => ({
        ...c,
        url: buildUrl(c.slug),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, campaign, source, lang, medium],
  );

  const toggle = (slug: string) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const copy = async (text: string, label = "คัดลอกลิงก์แล้ว") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const exportCsv = () => {
    const header = ["number", "slug", "title_th", "url"];
    const lines = rows.map((r) => [r.number, r.slug, `"${r.titleTh.replace(/"/g, '""')}"`, r.url].join(","));
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chemsex-card-links-${campaign || "no-campaign"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadQr = (slug: string, number: number) => {
    const canvas = document.querySelector<HTMLCanvasElement>(`canvas[data-qr-slug="${slug}"]`);
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `qr-${String(number).padStart(2, "0")}-${slug}-${campaign || "no-campaign"}.png`;
    a.click();
  };

  const printSheet = () => window.print();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" /> สร้างลิงก์ & QR ต่อรอบการพิมพ์
          </CardTitle>
          <CardDescription>
            ตั้งชื่อแคมเปญของรอบนี้ ระบบจะใส่ utm_campaign ให้ทุกการ์ด และตรวจตัวอย่างได้ก่อนสั่งพิมพ์
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>ชื่อแคมเปญ (utm_campaign)</Label>
              <Input
                value={campaignRaw}
                onChange={(e) => setCampaignRaw(e.target.value)}
                placeholder="เช่น pride-2026, silom-outreach-aug"
              />
              {campaign ? (
                <p className="text-xs text-muted-foreground">จะใช้เป็น: <code>{campaign}</code></p>
              ) : (
                <p className="text-xs text-destructive">ยังไม่ได้ตั้งชื่อแคมเปญ (ลิงก์จะไม่มี utm_campaign)</p>
              )}
              {knownCampaigns.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {knownCampaigns.slice(0, 8).map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setCampaignRaw(c)}
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>ช่องทาง</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ภาษาปลายทาง</Label>
              <Select value={lang} onValueChange={(v) => setLang(v as "th" | "en")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="th">ไทย (/th)</SelectItem>
                  <SelectItem value="en">อังกฤษ (/en)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>utm_medium</Label>
              <Input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="card" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(CHEMSEX_FACT_CARDS.map((c) => c.slug))}>
              เลือกทั้ง 20 ใบ
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelected([])}>ล้างการเลือก</Button>
            <Button variant="outline" size="sm" onClick={() => copy(rows.map((r) => r.url).join("\n"), "คัดลอกลิงก์ทั้งหมดแล้ว")} disabled={!rows.length}>
              <Copy className="h-4 w-4 mr-1" /> คัดลอกทุกลิงก์
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" /> ดาวน์โหลด CSV
            </Button>
            <Button size="sm" onClick={printSheet} disabled={!rows.length}>
              <Printer className="h-4 w-4 mr-1" /> พิมพ์แผ่น QR
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">เลือกแล้ว {rows.length} / {CHEMSEX_FACT_CARDS.length} ใบ</p>
        </CardContent>
      </Card>

      <div ref={printRef} className="chemsex-qr-sheet grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHEMSEX_FACT_CARDS.map((card) => {
          const isOn = selected.includes(card.slug);
          const url = buildUrl(card.slug);
          return (
            <Card key={card.slug} className={isOn ? "" : "opacity-50 no-print"}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox checked={isOn} onCheckedChange={() => toggle(card.slug)} className="mt-1 no-print" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">การ์ด #{card.number}</p>
                    <p className="text-sm font-medium leading-snug">{card.titleTh}</p>
                  </div>
                </div>
                <div className="flex justify-center bg-white rounded-md p-2">
                  <QRCodeCanvas value={url} size={132} level="M" includeMargin data-qr-slug={card.slug} />
                </div>
                <p className="text-[10px] break-all text-muted-foreground">{url}</p>
                <div className="flex gap-1 no-print">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => copy(url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadQr(card.slug, card.number)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .chemsex-qr-sheet, .chemsex-qr-sheet * { visibility: visible; }
          .chemsex-qr-sheet { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; padding: 10mm; }
          .chemsex-qr-sheet .no-print, .chemsex-qr-sheet .opacity-50 { display: none !important; }
        }
      `}</style>
    </div>
  );
}
