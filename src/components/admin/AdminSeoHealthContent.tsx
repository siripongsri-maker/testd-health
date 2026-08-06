import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
} from "lucide-react";

const BASE_URL = "https://testd.website";
const LOCALES = ["th", "en"] as const;

type Severity = "ok" | "warn" | "error";

type Check = {
  id: string;
  label: string;
  severity: Severity;
  detail: string;
  items?: string[];
};

type FileStatus = {
  name: string;
  path: string;
  ok: boolean;
  status: number | null;
  bytes: number;
  urlCount: number;
  text: string;
};

const SITEMAP_FILES = [
  { name: "sitemap.xml (index)", path: "/sitemap.xml" },
  { name: "sitemap-pages.xml", path: "/sitemap-pages.xml" },
  { name: "sitemap-images.xml", path: "/sitemap-images.xml" },
  { name: "robots.txt", path: "/robots.txt" },
];

function parseLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)).map((m) => m[1]);
}

function parseAlternates(xml: string): { href: string; hreflang: string }[] {
  return Array.from(
    xml.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"|href="([^"]+)"\s+hreflang="([^"]+)"/g),
  ).map((m) => ({
    hreflang: m[1] ?? m[4],
    href: m[2] ?? m[3],
  }));
}

/** Paths that must never be indexed if they appear in a sitemap. */
const FORBIDDEN_SEGMENTS = [
  "/admin",
  "/auth",
  "/dashboard",
  "/settings",
  "/queue-tv",
  "/go/",
  "/reset-password",
  "/forgot-password",
  "/my-appointments",
  "/guest-appointments",
  "/privacy-center",
];

export function AdminSeoHealthContent() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const loaded: FileStatus[] = [];
      for (const f of SITEMAP_FILES) {
        try {
          const res = await fetch(`${f.path}?t=${Date.now()}`, { cache: "no-store" });
          const text = res.ok ? await res.text() : "";
          loaded.push({
            name: f.name,
            path: f.path,
            ok: res.ok && text.length > 0,
            status: res.status,
            bytes: text.length,
            urlCount: f.path.endsWith(".xml") ? parseLocs(text).length : 0,
            text,
          });
        } catch {
          loaded.push({
            name: f.name,
            path: f.path,
            ok: false,
            status: null,
            bytes: 0,
            urlCount: 0,
            text: "",
          });
        }
      }
      setFiles(loaded);

      const byPath = Object.fromEntries(loaded.map((f) => [f.path, f]));
      const index = byPath["/sitemap.xml"];
      const pages = byPath["/sitemap-pages.xml"];
      const images = byPath["/sitemap-images.xml"];
      const robots = byPath["/robots.txt"];
      const next: Check[] = [];

      // 1. Files generated
      const missing = loaded.filter((f) => !f.ok).map((f) => `${f.path} (HTTP ${f.status ?? "n/a"})`);
      next.push({
        id: "files",
        label: "ไฟล์ sitemap / robots ถูกสร้างครบ",
        severity: missing.length ? "error" : "ok",
        detail: missing.length
          ? `ไม่พบ ${missing.length} ไฟล์ — ตัวสร้าง sitemap อาจไม่ได้รันตอน build`
          : `ครบทั้ง ${loaded.length} ไฟล์`,
        items: missing,
      });

      // 2. Index links both child sitemaps
      const indexLocs = index ? parseLocs(index.text) : [];
      const missingChild = ["/sitemap-pages.xml", "/sitemap-images.xml"].filter(
        (p) => !indexLocs.some((l) => l.endsWith(p)),
      );
      next.push({
        id: "index",
        label: "sitemap index อ้างถึง sitemap ย่อยครบ",
        severity: missingChild.length ? "error" : "ok",
        detail: missingChild.length
          ? "sitemap.xml ไม่ได้ลิงก์ sitemap ย่อยบางไฟล์"
          : `ลิงก์ครบ ${indexLocs.length} ไฟล์`,
        items: missingChild,
      });

      // 3. URL correctness in pages sitemap
      const pageLocs = pages ? parseLocs(pages.text) : [];
      const badUrls: string[] = [];
      const noLocale: string[] = [];
      const wrongHost: string[] = [];
      const forbidden: string[] = [];
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const loc of pageLocs) {
        if (seen.has(loc)) dupes.push(loc);
        seen.add(loc);
        let u: URL | null = null;
        try {
          u = new URL(loc);
        } catch {
          badUrls.push(loc);
          continue;
        }
        if (u.origin !== BASE_URL) wrongHost.push(loc);
        if (!LOCALES.some((l) => u!.pathname === `/${l}` || u!.pathname.startsWith(`/${l}/`))) {
          noLocale.push(loc);
        }
        const stripped = u.pathname.replace(/^\/(th|en)/, "") || "/";
        if (FORBIDDEN_SEGMENTS.some((s) => stripped === s || stripped.startsWith(s))) {
          forbidden.push(loc);
        }
      }
      next.push({
        id: "urls",
        label: "URL ที่เผยแพร่ถูกต้อง",
        severity: badUrls.length || wrongHost.length ? "error" : noLocale.length ? "warn" : "ok",
        detail:
          badUrls.length || wrongHost.length || noLocale.length
            ? `พบ URL ผิดรูปแบบ ${badUrls.length} · โดเมนผิด ${wrongHost.length} · ไม่มี /th หรือ /en ${noLocale.length}`
            : `ตรวจแล้ว ${pageLocs.length} URL ไม่พบปัญหา`,
        items: [...badUrls, ...wrongHost, ...noLocale].slice(0, 30),
      });
      next.push({
        id: "dupes",
        label: "ไม่มี URL ซ้ำ",
        severity: dupes.length ? "error" : "ok",
        detail: dupes.length ? `พบ URL ซ้ำ ${dupes.length} รายการ` : "ไม่พบรายการซ้ำ",
        items: dupes.slice(0, 30),
      });
      next.push({
        id: "forbidden",
        label: "ไม่มีหน้าภายใน (admin/auth) อยู่ใน sitemap",
        severity: forbidden.length ? "error" : "ok",
        detail: forbidden.length
          ? `พบหน้าที่ไม่ควรถูก index ${forbidden.length} รายการ`
          : "ไม่พบหน้าภายใน",
        items: forbidden.slice(0, 30),
      });

      // 4. hreflang pairing (each /th URL should have an /en twin and vice versa)
      const alts = pages ? parseAlternates(pages.text) : [];
      const thSet = new Set(pageLocs.filter((l) => l.includes(`${BASE_URL}/th`)));
      const enSet = new Set(pageLocs.filter((l) => l.includes(`${BASE_URL}/en`)));
      const unpaired: string[] = [];
      thSet.forEach((l) => {
        if (!enSet.has(l.replace(`${BASE_URL}/th`, `${BASE_URL}/en`))) unpaired.push(l);
      });
      enSet.forEach((l) => {
        if (!thSet.has(l.replace(`${BASE_URL}/en`, `${BASE_URL}/th`))) unpaired.push(l);
      });
      const hasXDefault = alts.some((a) => a.hreflang === "x-default");
      next.push({
        id: "hreflang",
        label: "คู่ภาษา TH/EN และ hreflang ครบ",
        severity: unpaired.length ? "warn" : hasXDefault ? "ok" : "warn",
        detail: unpaired.length
          ? `มี ${unpaired.length} URL ที่ไม่มีคู่ภาษาอีกด้าน`
          : hasXDefault
            ? `จับคู่ครบ ${thSet.size} คู่ พร้อม x-default`
            : "ไม่พบ x-default ใน sitemap",
        items: unpaired.slice(0, 30),
      });

      // 5. robots.txt sanity
      const robotsText = robots?.text ?? "";
      const blocksAll = /^\s*Disallow:\s*\/\s*$/im.test(robotsText);
      const allowsSomething = /^\s*Allow:\s*\//im.test(robotsText);
      next.push({
        id: "robots",
        label: "robots.txt ไม่บล็อกทั้งเว็บ",
        severity: !robots?.ok ? "error" : blocksAll ? "error" : allowsSomething ? "ok" : "warn",
        detail: !robots?.ok
          ? "อ่าน robots.txt ไม่ได้"
          : blocksAll
            ? "พบ Disallow: / — บล็อก crawler ทั้งเว็บไซต์"
            : "อนุญาตให้ crawler เข้าถึงได้ตามปกติ",
      });

      // 6. Image sitemap coverage vs published articles
      const imageLocs = images ? parseLocs(images.text) : [];
      const { data: articles } = await supabase
        .from("blog_articles")
        .select("slug, cover_url")
        .eq("status", "published");
      const published: { slug: string | null; cover_url: string | null }[] = articles ?? [];
      const missingFromSitemap = published
        .filter((a) => a.slug && !pageLocs.some((l) => l.endsWith(`/info/article/${a.slug}`)))
        .map((a) => `/info/article/${a.slug}`);
      next.push({
        id: "coverage",
        label: "บทความที่เผยแพร่อยู่ใน sitemap ครบ",
        severity: missingFromSitemap.length ? "error" : "ok",
        detail: missingFromSitemap.length
          ? `มี ${missingFromSitemap.length} บทความที่เผยแพร่แล้วแต่ยังไม่อยู่ใน sitemap (รัน build ใหม่)`
          : `ครบทั้ง ${published.length} บทความ`,
        items: missingFromSitemap.slice(0, 30),
      });
      const noCover = published.filter((a) => !a.cover_url).map((a) => a.slug ?? "(ไม่มี slug)");
      next.push({
        id: "images",
        label: "รูปปกบทความถูกจัดทำดัชนี",
        severity: noCover.length ? "warn" : "ok",
        detail: noCover.length
          ? `${imageLocs.length} URL ในรูปแบบ image sitemap · ขาดรูปปก ${noCover.length} บทความ`
          : `${imageLocs.length} URL พร้อมรูปปกครบทุกบทความ`,
        items: noCover.slice(0, 30),
      });

      setChecks(next);
      setRanAt(new Date());
    } catch (e) {
      toast.error("ตรวจสอบไม่สำเร็จ: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const errors = checks.filter((c) => c.severity === "error").length;
  const warns = checks.filter((c) => c.severity === "warn").length;

  const copyReport = () => {
    const report = checks
      .map(
        (c) =>
          `[${c.severity.toUpperCase()}] ${c.label}\n  ${c.detail}` +
          (c.items?.length ? `\n  - ${c.items.join("\n  - ")}` : ""),
      )
      .join("\n\n");
    navigator.clipboard.writeText(report);
    toast.success("คัดลอกรายงานแล้ว");
  };

  const icon = (s: Severity) =>
    s === "ok" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
    ) : s === "warn" ? (
      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive shrink-0" />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">SEO Health Check</h2>
          <p className="text-xs text-muted-foreground">
            สถานะการสร้าง sitemap/robots และความถูกต้องของ URL ที่เผยแพร่
            {ranAt && ` · ตรวจล่าสุด ${ranAt.toLocaleTimeString("th-TH")}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyReport} disabled={!checks.length}>
            <Copy className="h-4 w-4 mr-1" /> คัดลอกรายงาน
          </Button>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            ตรวจใหม่
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ผ่าน</p>
            <p className="text-2xl font-bold text-emerald-500">
              {checks.length - errors - warns}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ควรแก้</p>
            <p className="text-2xl font-bold text-amber-500">{warns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">ผิดพลาด</p>
            <p className="text-2xl font-bold text-destructive">{errors}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ไฟล์ที่เผยแพร่</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {files.map((f) => (
            <div
              key={f.path}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                {f.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="truncate">{f.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary">HTTP {f.status ?? "—"}</Badge>
                {f.path.endsWith(".xml") && <Badge variant="outline">{f.urlCount} URL</Badge>}
                <a href={f.path} target="_blank" rel="noreferrer">
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ผลการตรวจ</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[520px] pr-2">
            <div className="space-y-2">
              {loading && !checks.length && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              {checks.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    {icon(c.severity)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">{c.detail}</p>
                      {c.items && c.items.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {c.items.map((it) => (
                            <li
                              key={it}
                              className="text-[11px] font-mono text-muted-foreground break-all"
                            >
                              {it}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSeoHealthContent;
