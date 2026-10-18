/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { SEOHead } from "@/components/seo/SEOHead";
import { usePageLocale } from "@/components/seo/LocaleRouter";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BlogCategory, fetchCategories, localePath } from "@/lib/blogTaxonomy";
import { extractFaq, FaqItem } from "@/lib/articleFaq";
import { cn } from "@/lib/utils";

interface Row extends FaqItem {
  slug: string;
  title: string;
  categoryId: string | null;
}

/** Thailand figures cited from Department of Disease Control reports used in our articles. */
const DDC_STATS = [
  { value: "8,124", label: "ผู้ติดเชื้อ HIV รายใหม่ต่อปี" },
  { value: "3,958", label: "รายใหม่ในเยาวชนอายุ 15–24 ปี" },
  { value: "565,598", label: "ผู้ที่อยู่กับเชื้อ HIV ในไทย" },
  { value: "32,700", label: "ผู้ป่วยซิฟิลิสที่รายงาน" },
  { value: "17,456", label: "ผู้ป่วยหนองในที่รายงาน" },
];

export default function InfoFaq() {
  const locale = usePageLocale();
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    (async () => {
      const [cats, { data }] = await Promise.all([
        fetchCategories(),
        supabase
          .from("blog_articles")
          .select("slug, title_th, content_th, category_id")
          .eq("status", "published")
          .order("view_count", { ascending: false }),
      ]);
      const seen = new Set<string>();
      const out: Row[] = [];
      for (const a of data ?? []) {
        for (const f of extractFaq(a.content_th)) {
          const key = f.question.replace(/\s+/g, "");
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ ...f, slug: a.slug, title: a.title_th, categoryId: a.category_id });
        }
      }
      setCategories(cats);
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!cat || r.categoryId === cat) &&
        (!t || r.question.toLowerCase().includes(t) || r.answer.toLowerCase().includes(t)),
    );
  }, [rows, q, cat]);

  const jsonLd = rows.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: rows.slice(0, 60).map((r) => ({
          "@type": "Question",
          name: r.question,
          acceptedAnswer: { "@type": "Answer", text: r.answer },
        })),
      }
    : undefined;

  return (
    <>
      <SEOHead
        title="คำถามที่พบบ่อยเรื่อง HIV, PrEP, PEP และ STI"
        description="รวมคำถามที่พบบ่อยเรื่องตรวจเอดส์ PrEP PEP ซิฟิลิส หนองใน พร้อมตัวเลขจากกรมควบคุมโรค และลิงก์ไปบทความฉบับเต็มจาก testD"
        canonicalPath={localePath("/info/faq", locale)}
        lang={locale}
        jsonLd={jsonLd}
      />
      <PageContainer>
        <PageHeader title="คำถามที่พบบ่อย" subtitle="รวมคำถามจากบทความทั้งหมดของ testD" />

        <section aria-labelledby="ddc-stats" className="mb-6 rounded-2xl border border-border bg-card p-4">
          <h2 id="ddc-stats" className="mb-3 text-sm font-semibold text-foreground">
            สถานการณ์ในประเทศไทย
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {DDC_STATS.map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/50 p-3">
                <div className="text-xl font-bold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            ที่มา: กรมควบคุมโรค กระทรวงสาธารณสุข (รายงานสถานการณ์ HIV และโรคติดต่อทางเพศสัมพันธ์ล่าสุด)
          </p>
        </section>

        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาคำถาม เช่น PrEP, ตรวจเอดส์"
            className="h-12 rounded-2xl pl-12 text-base"
          />
        </div>

        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {[{ id: "", label: "ทั้งหมด" }, ...categories.map((c) => ({ id: c.id, label: `${c.icon} ${c.name_th}` }))].map(
            (c) => (
              <button
                key={c.id || "all"}
                onClick={() => setCat(c.id)}
                className={cn(
                  "min-h-[36px] flex-shrink-0 rounded-full border px-3 text-sm",
                  cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground",
                )}
              >
                {c.label}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted-foreground">{filtered.length} คำถาม</p>
            <Accordion type="multiple" className="rounded-2xl border border-border bg-card px-4">
              {filtered.map((r, i) => (
                <AccordionItem key={`${r.slug}-${i}`} value={`${r.slug}-${i}`}>
                  <AccordionTrigger className="text-left">{r.question}</AccordionTrigger>
                  <AccordionContent>
                    <p className="mb-2 text-foreground">{r.answer}</p>
                    <Link
                      to={localePath(`/info/article/${r.slug}`, locale)}
                      className="text-sm text-primary underline underline-offset-2"
                    >
                      อ่านต่อ: {r.title}
                    </Link>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </>
        )}
      </PageContainer>
    </>
  );
}
