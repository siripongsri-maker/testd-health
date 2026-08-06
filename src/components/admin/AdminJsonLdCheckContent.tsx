import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Code2,
  ShieldCheck,
} from "lucide-react";
import {
  buildArticleJsonLd,
  buildArticleBreadcrumbJsonLd,
  buildArticleFaqJsonLd,
  extractFaqsFromContent,
} from "@/lib/articleSeo";
import { canonicalPathFor } from "@/lib/seoLocalePrefix";

const BASE_URL = "https://testd.website";
const LOCALES = ["th", "en"] as const;
type Locale = (typeof LOCALES)[number];

interface ArticleRow {
  id: string;
  slug: string | null;
  title_th: string | null;
  title_en: string | null;
  excerpt_th: string | null;
  excerpt_en: string | null;
  content_th: string | null;
  content_en: string | null;
  cover_url: string | null;
  author_name: string | null;
  published_at: string | null;
  updated_at: string | null;
  category_id: string | null;
}

interface ReviewRow {
  article_id: string;
  locale: string;
  status: string;
  error_count: number;
  warning_count: number;
  confirmed_at: string;
}

type Issue = { level: "error" | "warn"; message: string };

interface CheckResult {
  key: string;
  articleId: string;
  slug: string;
  locale: Locale;
  title: string;
  url: string;
  blocks: Record<string, unknown>[];
  issues: Issue[];
}

/** Rich Results requirements for Article / BreadcrumbList / FAQPage. */
function validateBlocks(
  blocks: Record<string, unknown>[],
  ctx: { title: string; url: string },
): Issue[] {
  const issues: Issue[] = [];
  const article = blocks.find((b) => b["@type"] === "Article") as Record<string, any> | undefined;
  const breadcrumb = blocks.find((b) => b["@type"] === "BreadcrumbList") as Record<string, any> | undefined;
  const faq = blocks.find((b) => b["@type"] === "FAQPage") as Record<string, any> | undefined;

  if (!article) {
    issues.push({ level: "error", message: "ไม่มี Article schema" });
  } else {
    if (!article.headline) issues.push({ level: "error", message: "Article: ไม่มี headline" });
    else if (String(article.headline).length > 110)
      issues.push({ level: "error", message: "Article: headline ยาวเกิน 110 ตัวอักษร" });
    if (!article.description) issues.push({ level: "warn", message: "Article: ไม่มี description" });
    const image = Array.isArray(article.image) ? article.image[0] : article.image;
    if (!image) issues.push({ level: "error", message: "Article: ไม่มี image" });
    else if (!String(image).startsWith("https://"))
      issues.push({ level: "error", message: "Article: image ต้องเป็น URL แบบ https absolute" });
    else if (String(image).includes("/og-default.jpg"))
      issues.push({ level: "warn", message: "Article: ใช้ภาพ fallback (ยังไม่มีภาพปกจริง)" });
    if (!article.datePublished)
      issues.push({ level: "error", message: "Article: ไม่มี datePublished" });
    else if (Number.isNaN(Date.parse(String(article.datePublished))))
      issues.push({ level: "error", message: "Article: datePublished ไม่ใช่รูปแบบ ISO 8601" });
    if (article.dateModified && Number.isNaN(Date.parse(String(article.dateModified))))
      issues.push({ level: "error", message: "Article: dateModified ไม่ใช่รูปแบบ ISO 8601" });
    if (!article.author?.name) issues.push({ level: "error", message: "Article: ไม่มี author" });
    if (!article.publisher?.name) issues.push({ level: "error", message: "Article: ไม่มี publisher" });
    if (!article.publisher?.logo?.url)
      issues.push({ level: "warn", message: "Article: publisher ไม่มี logo" });
    if (article.url !== ctx.url)
      issues.push({ level: "error", message: `Article: url ไม่ตรงกับ canonical (${article.url})` });
    if (article.mainEntityOfPage?.["@id"] !== ctx.url)
      issues.push({ level: "error", message: "Article: mainEntityOfPage ไม่ตรงกับ canonical" });
    if (!article.inLanguage) issues.push({ level: "warn", message: "Article: ไม่มี inLanguage" });
    if (typeof article.wordCount === "number" && article.wordCount < 150)
      issues.push({ level: "warn", message: `เนื้อหาสั้นมาก (~${article.wordCount} คำ)` });
  }

  if (!breadcrumb) {
    issues.push({ level: "warn", message: "ไม่มี BreadcrumbList schema" });
  } else {
    const items = Array.isArray(breadcrumb.itemListElement) ? breadcrumb.itemListElement : [];
    if (items.length < 2)
      issues.push({ level: "warn", message: "BreadcrumbList: ต้องมีอย่างน้อย 2 ระดับ" });
    items.forEach((it: any, i: number) => {
      if (it.position !== i + 1)
        issues.push({ level: "error", message: `BreadcrumbList: position ไม่เรียงลำดับ (#${i + 1})` });
      if (!it.name) issues.push({ level: "error", message: `BreadcrumbList: ขาด name (#${i + 1})` });
      if (!it.item) issues.push({ level: "error", message: `BreadcrumbList: ขาด item URL (#${i + 1})` });
    });
  }

  if (faq) {
    const qs = Array.isArray(faq.mainEntity) ? faq.mainEntity : [];
    if (qs.length === 0) issues.push({ level: "error", message: "FAQPage: ไม่มีคำถาม" });
    qs.forEach((q: any, i: number) => {
      if (!q.name) issues.push({ level: "error", message: `FAQPage: ขาดคำถาม (#${i + 1})` });
      if (!q.acceptedAnswer?.text)
        issues.push({ level: "error", message: `FAQPage: ขาดคำตอบ (#${i + 1})` });
    });
  }

  return issues;
}

export function AdminJsonLdCheckContent() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewRow>>({});
  const [ranAt, setRanAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "ok" | "unconfirmed">("all");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<CheckResult | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    const { data } = await supabase
      .from("seo_jsonld_reviews")
      .select("article_id, locale, status, error_count, warning_count, confirmed_at");
    const map: Record<string, ReviewRow> = {};
    (data ?? []).forEach((r: any) => {
      map[`${r.article_id}:${r.locale}`] = r as ReviewRow;
    });
    setReviews(map);
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: articles, error }, { data: categories }] = await Promise.all([
        supabase
          .from("blog_articles")
          .select(
            "id, slug, title_th, title_en, excerpt_th, excerpt_en, content_th, content_en, cover_url, author_name, published_at, updated_at, category_id",
          )
          .eq("status", "published")
          .order("published_at", { ascending: false }),
        supabase.from("blog_categories").select("id, name_th, name_en"),
      ]);
      if (error) throw error;

      const catMap = new Map<string, { th: string; en: string }>();
      (categories ?? []).forEach((c: any) =>
        catMap.set(c.id, { th: c.name_th, en: c.name_en }),
      );

      const next: CheckResult[] = [];
      for (const raw of (articles ?? []) as ArticleRow[]) {
        if (!raw.slug) continue;
        for (const locale of LOCALES) {
          const title = (locale === "th" ? raw.title_th : raw.title_en) ?? "";
          const content = locale === "th" ? raw.content_th : raw.content_en;
          const description = (locale === "th" ? raw.excerpt_th : raw.excerpt_en) ?? "";
          if (!title) continue; // ไม่มีฉบับภาษานี้ — ไม่ต้องตรวจ
          const canonicalPath = `/info/article/${raw.slug}`;
          const url = `${BASE_URL}${canonicalPathFor(canonicalPath, locale)}`;
          const categoryName = raw.category_id
            ? catMap.get(raw.category_id)?.[locale] ?? null
            : null;

          const blocks: Record<string, unknown>[] = [
            buildArticleJsonLd({
              title,
              description,
              canonicalPath,
              content,
              coverUrl: raw.cover_url,
              authorName: raw.author_name,
              publishedAt: raw.published_at,
              updatedAt: raw.updated_at,
              categoryName,
              language: locale,
            }),
            buildArticleBreadcrumbJsonLd({
              title,
              canonicalPath,
              categoryName,
              language: locale,
            }),
          ];
          const faqBlock = buildArticleFaqJsonLd(extractFaqsFromContent(content));
          if (faqBlock) blocks.push(faqBlock);

          next.push({
            key: `${raw.id}:${locale}`,
            articleId: raw.id,
            slug: raw.slug,
            locale,
            title,
            url,
            blocks,
            issues: validateBlocks(blocks, { title, url }),
          });
        }
      }

      setResults(next);
      setRanAt(new Date());
      await loadReviews();
      const errs = next.filter((r) => r.issues.some((i) => i.level === "error")).length;
      toast.success(
        errs === 0
          ? `ตรวจครบ ${next.length} รายการ — ไม่พบข้อผิดพลาด`
          : `ตรวจครบ ${next.length} รายการ — พบข้อผิดพลาด ${errs} รายการ`,
      );
    } catch (e) {
      console.error(e);
      toast.error("ตรวจสอบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [loadReviews]);

  useEffect(() => {
    void run();
  }, [run]);

  const summary = useMemo(() => {
    const errors = results.filter((r) => r.issues.some((i) => i.level === "error"));
    const warns = results.filter(
      (r) => !r.issues.some((i) => i.level === "error") && r.issues.length > 0,
    );
    const ok = results.filter((r) => r.issues.length === 0);
    const confirmed = results.filter((r) => reviews[r.key]?.status === "confirmed");
    return { errors, warns, ok, confirmed };
  }, [results, reviews]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (q && !(r.slug.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)))
        return false;
      const hasError = r.issues.some((i) => i.level === "error");
      if (filter === "error") return hasError;
      if (filter === "warn") return !hasError && r.issues.length > 0;
      if (filter === "ok") return r.issues.length === 0;
      if (filter === "unconfirmed") return reviews[r.key]?.status !== "confirmed";
      return true;
    });
  }, [results, filter, search, reviews]);

  const confirmOne = async (r: CheckResult) => {
    setConfirming(r.key);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("seo_jsonld_reviews").upsert(
        {
          article_id: r.articleId,
          locale: r.locale,
          status: r.issues.some((i) => i.level === "error") ? "needs_fix" : "confirmed",
          error_count: r.issues.filter((i) => i.level === "error").length,
          warning_count: r.issues.filter((i) => i.level === "warn").length,
          snapshot: r.blocks as unknown as never,
          confirmed_by: auth.user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        },
        { onConflict: "article_id,locale" },
      );
      if (error) throw error;
      await loadReviews();
      toast.success("บันทึกการคอนเฟิร์มแล้ว");
    } catch (e) {
      console.error(e);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setConfirming(null);
    }
  };

  const confirmAllClean = async () => {
    const clean = results.filter(
      (r) => r.issues.every((i) => i.level !== "error") && reviews[r.key]?.status !== "confirmed",
    );
    if (clean.length === 0) {
      toast.info("ไม่มีรายการที่รอคอนเฟิร์ม");
      return;
    }
    setConfirming("all");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const rows = clean.map((r) => ({
        article_id: r.articleId,
        locale: r.locale,
        status: "confirmed",
        error_count: 0,
        warning_count: r.issues.length,
        snapshot: r.blocks as unknown as never,
        confirmed_by: auth.user?.id ?? null,
        confirmed_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("seo_jsonld_reviews")
        .upsert(rows, { onConflict: "article_id,locale" });
      if (error) throw error;
      await loadReviews();
      toast.success(`คอนเฟิร์มแล้ว ${rows.length} รายการ`);
    } catch (e) {
      console.error(e);
      toast.error("คอนเฟิร์มแบบกลุ่มไม่สำเร็จ");
    } finally {
      setConfirming(null);
    }
  };

  const copyJson = (r: CheckResult) => {
    navigator.clipboard.writeText(JSON.stringify(r.blocks, null, 2));
    toast.success("คัดลอก JSON-LD แล้ว");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="h-4 w-4" />
              ตรวจสอบ JSON-LD ของบทความ (Rich Results)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              ตรวจ Article / BreadcrumbList / FAQPage ของทุกบทความที่เผยแพร่ ทั้งภาษาไทยและอังกฤษ
              {ranAt && ` · ตรวจล่าสุด ${ranAt.toLocaleString("th-TH")}`}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={confirmAllClean} disabled={loading || !!confirming}>
              {confirming === "all" ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-1 h-4 w-4" />
              )}
              คอนเฟิร์มที่ผ่านทั้งหมด
            </Button>
            <Button size="sm" onClick={run} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              รันเช็คข้อผิดพลาด
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "ตรวจทั้งหมด", value: results.length, tone: "text-foreground" },
              { label: "ผ่าน", value: summary.ok.length, tone: "text-emerald-600" },
              { label: "คำเตือน", value: summary.warns.length, tone: "text-amber-600" },
              { label: "ข้อผิดพลาด", value: summary.errors.length, tone: "text-destructive" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border p-3">
                <div className={`text-2xl font-semibold ${s.tone}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            คอนเฟิร์มแล้ว {summary.confirmed.length} / {results.length} รายการ
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", "ทั้งหมด"],
              ["error", "ข้อผิดพลาด"],
              ["warn", "คำเตือน"],
              ["ok", "ผ่าน"],
              ["unconfirmed", "ยังไม่คอนเฟิร์ม"],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาจากชื่อบทความหรือ slug…"
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent>
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> กำลังตรวจสอบ…
            </div>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ไม่มีรายการตามเงื่อนไข</p>
          ) : (
            <ScrollArea className="h-[560px] pr-3">
              <div className="space-y-2">
                {visible.map((r) => {
                  const errors = r.issues.filter((i) => i.level === "error");
                  const warns = r.issues.filter((i) => i.level === "warn");
                  const review = reviews[r.key];
                  return (
                    <div key={r.key} className="rounded-xl border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {errors.length > 0 ? (
                              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                            ) : warns.length > 0 ? (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            )}
                            <span className="truncate text-sm font-medium">{r.title}</span>
                            <Badge variant="outline" className="uppercase">{r.locale}</Badge>
                            {review?.status === "confirmed" && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">คอนเฟิร์มแล้ว</Badge>
                            )}
                            {review?.status === "needs_fix" && (
                              <Badge variant="destructive">ต้องแก้ไข</Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{r.url}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setPreview(r)}>
                            <Code2 className="mr-1 h-3.5 w-3.5" /> ดู JSON-LD
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => copyJson(r)}>
                            <Copy className="mr-1 h-3.5 w-3.5" /> คัดลอก
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a
                              href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(r.url)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Rich Results
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            variant={review?.status === "confirmed" ? "outline" : "default"}
                            disabled={confirming === r.key}
                            onClick={() => confirmOne(r)}
                          >
                            {confirming === r.key ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                            )}
                            คอนเฟิร์ม
                          </Button>
                        </div>
                      </div>
                      {r.issues.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {r.issues.map((i, idx) => (
                            <li
                              key={idx}
                              className={`text-xs ${i.level === "error" ? "text-destructive" : "text-amber-600"}`}
                            >
                              • {i.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate text-sm">
              JSON-LD · {preview?.title} ({preview?.locale.toUpperCase()})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre dir="ltr" className="whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
              {preview ? JSON.stringify(preview.blocks, null, 2) : ""}
            </pre>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            {preview && (
              <>
                <Button variant="outline" size="sm" onClick={() => copyJson(preview)}>
                  <Copy className="mr-1 h-4 w-4" /> คัดลอก
                </Button>
                <Button size="sm" asChild>
                  <a
                    href={`https://validator.schema.org/#url=${encodeURIComponent(preview.url)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="mr-1 h-4 w-4" /> Schema.org Validator
                  </a>
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
