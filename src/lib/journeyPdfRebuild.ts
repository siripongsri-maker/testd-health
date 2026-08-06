import { supabase } from "@/integrations/supabase/client";

export interface JourneyLiveStats {
  generatedAt: Date;
  rows: { label: string; labelTh: string; value: string }[];
}

const BKK = "Asia/Bangkok";

const countOf = async (
  table: string,
  build?: (q: any) => any
): Promise<number> => {
  try {
    let q: any = (supabase as any).from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  } catch {
    return 0;
  }
};

/** Pull the freshest counters so the regenerated PDF is provably not a stale copy. */
export async function fetchJourneyLiveStats(): Promise<JourneyLiveStats> {
  const [appointments, completed, claims, approved, paid, notifications, batches] = await Promise.all([
    countOf("appointments"),
    countOf("appointments", q => q.in("status", ["completed", "checked_out"])),
    countOf("counseling_payout_claims"),
    countOf("counseling_payout_claims", q => q.eq("status", "approved")),
    countOf("counseling_payout_claims", q => q.eq("status", "paid")),
    countOf("client_status_notifications"),
    countOf("counseling_payout_batches"),
  ]);

  const n = (v: number) => v.toLocaleString("en-US");

  return {
    generatedAt: new Date(),
    rows: [
      { label: "Appointments (total)", labelTh: "การนัดหมายทั้งหมด", value: n(appointments) },
      { label: "Completed / checked-out visits", labelTh: "เข้ารับบริการสำเร็จ", value: n(completed) },
      { label: "Travel allowance claims", labelTh: "คำขอค่าเดินทาง", value: n(claims) },
      { label: "Claims approved", labelTh: "อนุมัติแล้ว", value: n(approved) },
      { label: "Claims paid", labelTh: "โอนเงินแล้ว", value: n(paid) },
      { label: "Payout batches", labelTh: "รอบการโอน", value: n(batches) },
      { label: "Client SMS notifications queued", labelTh: "SMS แจ้งผู้รับบริการ", value: n(notifications) },
    ],
  };
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });

/** Version label derived from the generation moment in Bangkok time, e.g. v2026.08.07-0025 */
export function journeyVersionLabel(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BKK,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? "00";
  return `v${g("year")}.${g("month")}.${g("day")}-${g("hour")}${g("minute")}`;
}

function buildCoverElement(opts: {
  title: string;
  subtitle: string;
  stats: JourneyLiveStats;
  version: string;
  isTh: boolean;
  width: number;
  height: number;
}) {
  const { title, subtitle, stats, version, isTh, width, height } = opts;
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;background:#ffffff;color:#111827;padding:64px;box-sizing:border-box;font-family:'Noto Sans Thai','Sarabun',system-ui,-apple-system,'Segoe UI',sans-serif;`;
  const stamp = stats.generatedAt.toLocaleString(isTh ? "th-TH" : "en-GB", { timeZone: BKK });

  el.innerHTML = `
    <div style="border-bottom:4px solid #c0275e;padding-bottom:20px;margin-bottom:32px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:20px;color:#c0275e;font-weight:700;letter-spacing:1px;">testD × SWING</div>
        <div style="font-size:20px;color:#111827;font-weight:700;border:2px solid #c0275e;border-radius:999px;padding:6px 18px;">${version}</div>
      </div>
      <div style="font-size:44px;font-weight:800;margin-top:8px;line-height:1.25;">${title}</div>
      <div style="font-size:22px;color:#4b5563;margin-top:10px;">${subtitle}</div>
    </div>
    <div style="font-size:20px;color:#111827;font-weight:700;margin-bottom:14px;">
      ${isTh ? "ข้อมูล ณ เวลาที่สร้างไฟล์" : "Live data at generation time"}
    </div>
    <div style="font-size:18px;color:#6b7280;margin-bottom:24px;">
      ${isTh ? "สร้างเมื่อ" : "Generated"} ${stamp} (${isTh ? "เวลาไทย" : "Asia/Bangkok"}) · ${isTh ? "เวอร์ชัน" : "Version"} ${version}
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:22px;">
      ${stats.rows
        .map(
          (r, i) => `<tr style="background:${i % 2 ? "#f9fafb" : "#ffffff"};">
            <td style="padding:14px 18px;border:1px solid #e5e7eb;">${isTh ? r.labelTh : r.label}</td>
            <td style="padding:14px 18px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">${r.value}</td>
          </tr>`
        )
        .join("")}
    </table>
    <div style="position:absolute;left:64px;right:64px;bottom:48px;font-size:16px;color:#9ca3af;">
      ${isTh
        ? "ไฟล์นี้ถูกสร้างใหม่จากระบบพร้อมตัวเลขล่าสุด — หน้าถัดไปคือภาพขั้นตอนของ Journey"
        : "Regenerated from the live system — the following pages are the journey step captures."}
    </div>
  `;
  return el;
}

/**
 * Rebuild a journey PDF: a freshly rendered cover page with live counters,
 * followed by the current journey page captures. Returns a Blob for download.
 */
export async function regenerateJourneyPdf(opts: {
  title: string;
  subtitle: string;
  pngDir: string;
  pages: number;
  isTh: boolean;
  onProgress?: (done: number, total: number) => void;
}): Promise<{ blob: Blob; version: string; generatedAt: Date }> {
  const { title, subtitle, pngDir, pages, isTh, onProgress } = opts;
  const [{ default: jsPDF }, { default: html2canvas }, stats] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
    fetchJourneyLiveStats(),
  ]);

  const first = await loadImage(`${pngDir}/page-01.png?ts=${Date.now()}`);
  const width = first.naturalWidth;
  const height = first.naturalHeight;

  const version = journeyVersionLabel(stats.generatedAt);

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    compress: true,
  });

  const cover = buildCoverElement({ title, subtitle, stats, version, isTh, width, height });

  document.body.appendChild(cover);
  try {
    const canvas = await html2canvas(cover, { scale: 1, backgroundColor: "#ffffff", logging: false });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, width, height);
  } finally {
    cover.remove();
  }
  onProgress?.(1, pages + 1);

  const headerH = Math.round(height * 0.032);
  const footerH = Math.round(height * 0.032);
  const fontFamily = "'Noto Sans Thai','Sarabun',system-ui,-apple-system,'Segoe UI',sans-serif";
  const stampText = stats.generatedAt.toLocaleString(isTh ? "th-TH" : "en-GB", { timeZone: BKK });

  for (let page = 1; page <= pages; page++) {
    const src = `${pngDir}/page-${String(page).padStart(2, "0")}.png?ts=${Date.now()}`;
    const img = page === 1 ? first : await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Fit the capture between the header and footer bands, keeping aspect ratio.
    const availH = height - headerH - footerH;
    const scale = Math.min(width / img.naturalWidth, availH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.drawImage(img, (width - drawW) / 2, headerH + (availH - drawH) / 2, drawW, drawH);

    // Header band: document title + version
    ctx.fillStyle = "#c0275e";
    ctx.fillRect(0, 0, width, headerH);
    ctx.fillStyle = "#ffffff";
    const hFont = Math.round(headerH * 0.46);
    ctx.font = `600 ${hFont}px ${fontFamily}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`testD × SWING — ${title}`, Math.round(width * 0.02), headerH / 2);
    ctx.textAlign = "right";
    ctx.fillText(version, width - Math.round(width * 0.02), headerH / 2);

    // Footer band: generated date/time + page numbering
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, height - footerH, width, footerH);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(0, height - footerH, width, 2);
    ctx.fillStyle = "#4b5563";
    const fFont = Math.round(footerH * 0.42);
    ctx.font = `400 ${fFont}px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.fillText(
      `${isTh ? "สร้างเมื่อ" : "Generated"} ${stampText} (${isTh ? "เวลาไทย" : "Asia/Bangkok"})`,
      Math.round(width * 0.02),
      height - footerH / 2
    );
    ctx.textAlign = "center";
    ctx.fillText(version, width / 2, height - footerH / 2);
    ctx.textAlign = "right";
    ctx.fillText(
      `${isTh ? "หน้า" : "Page"} ${page + 1} / ${pages + 1}`,
      width - Math.round(width * 0.02),
      height - footerH / 2
    );

    pdf.addPage([width, height], width >= height ? "landscape" : "portrait");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, width, height);
    onProgress?.(page + 1, pages + 1);
  }

  pdf.setProperties({
    title: `${title} — ${version}`,
    subject: subtitle,
    creator: "testD Console",
    keywords: `journey,${version},${stats.generatedAt.toISOString()}`,
  });

  return pdf.output("blob");
}

