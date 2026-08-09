import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  Search, ArrowRight, ArrowLeft, AlertTriangle, HeartPulse, Pill, Syringe,
  Droplets, Moon, Users, ShieldCheck, Phone,
} from "lucide-react";

type Tone = "danger" | "warn" | "calm";

interface Topic {
  id: string;
  icon: typeof Pill;
  tone: Tone;
  title: string;
  summary: string;
  /** 3-5 very short bullets — designed for fast reading */
  points: string[];
  keywords: string[];
  cta?: { label: string; to: string };
}

const TOPICS: Topic[] = [
  {
    id: "ghb",
    icon: Droplets,
    tone: "danger",
    title: "GHB / GBL — លើសកម្រិត",
    summary: "គម្លាតរវាងកម្រិតធម្មតា និងកម្រិតគ្រោះថ្នាក់តូចណាស់។",
    points: [
      "រង់ចាំយ៉ាងតិច ២ ម៉ោង មុនប្រើដូសបន្ទាប់",
      "កុំលាយជាមួយស្រា ឬថ្នាំងងុយគេង — ប្រថុយឈប់ដកដង្ហើម",
      "ប្រើសឺរាុំង/ខ្នាតវាស់ជានិច្ច កុំវាស់ដោយភ្នែក",
      "បើដេកមិនដឹងខ្លួន៖ ដាក់ផ្អៀងខាងឆ្វេង ហៅ ១៦៦៩ ភ្លាម",
    ],
    keywords: ["ghb", "gbl", "g", "overdose", "លើសកម្រិត", "គេង"],
    cta: { label: "អានលម្អិត", to: "/th/ghb-overdose" },
  },
  {
    id: "meth",
    icon: Pill,
    tone: "warn",
    title: "Ice / Meth (គ្រីស្តាល់)",
    summary: "ភ្ញាក់យូរ ធ្វើឱ្យខ្សោះជាតិទឹក និងកើនហានិភ័យផ្លូវភេទ។",
    points: [
      "ផឹកទឹកម្តងបន្តិចៗ (មិនលើស ៥០០ ml/ម៉ោង)",
      "ញ៉ាំអាហារ និងគេងឱ្យបានទោះតែបន្តិច",
      "កុំចែករំលែកបំពង់ ឬម្ជុល",
      "រៀបចំស្រោមអនាម័យ និងសារធាតុរំអិលទុកជាមុន",
    ],
    keywords: ["ice", "meth", "គ្រីស្តាល់", "ការស្រវឹង", "chemsex"],
  },
  {
    id: "poppers",
    icon: HeartPulse,
    tone: "warn",
    title: "Poppers",
    summary: "បន្ថយសម្ពាធឈាមយ៉ាងលឿន។",
    points: [
      "ហាមប្រើជាមួយ Viagra/Cialis — ប្រថុយដួលសន្លប់",
      "ស្រូបតែតាមច្រមុះ ហាមផឹកដាច់ខាត",
      "ទុកឱ្យឆ្ងាយពីភ្លើង",
    ],
    keywords: ["poppers", "viagra", "សម្ពាធឈាម"],
  },
  {
    id: "injection",
    icon: Syringe,
    tone: "danger",
    title: "ការចាក់ (Slamming)",
    summary: "ហានិភ័យខ្ពស់បំផុតសម្រាប់ HIV និងរលាកថ្លើម C។",
    points: [
      "ប្រើម្ជុលថ្មីរាល់ដង មិនចែករំលែក",
      "សម្អាតស្បែកដោយ alcohol pad មុនចាក់",
      "ផ្លាស់ប្តូរកន្លែងចាក់ កុំចាក់កន្លែងឡើងក្រហម",
      "កុំចាក់ពេលនៅម្នាក់ឯង",
    ],
    keywords: ["slam", "inject", "ម្ជុល", "hepatitis", "hiv"],
  },
  {
    id: "mixing",
    icon: AlertTriangle,
    tone: "danger",
    title: "ការលាយសារធាតុ",
    summary: "ការលាយភាគច្រើនបង្កើនហានិភ័យច្រើនដង។",
    points: [
      "GHB + ស្រា = គ្រោះថ្នាក់បំផុត",
      "Meth + ថ្នាំបេះដូង/ថ្នាំធ្លាក់ទឹកចិត្ត = ត្រូវពិគ្រោះគ្រូពេទ្យ",
      "បើមិនច្បាស់ សូមពិនិត្យមុនប្រើ",
    ],
    keywords: ["mix", "interaction", "លាយ"],
    cta: { label: "ពិនិត្យការលាយសារធាតុ", to: "/th/interaction-checker" },
  },
  {
    id: "consent",
    icon: Users,
    tone: "calm",
    title: "ការយល់ព្រម និងសុវត្ថិភាពក្នុងក្រុម",
    summary: "ព្រមព្រៀងគ្នាមុន គឺជាការការពារល្អបំផុត។",
    points: [
      "ព្រមព្រៀងព្រំដែនមុនចាប់ផ្តើម",
      "ប្រាប់មិត្តម្នាក់ថាអ្នកនៅឯណា",
      "កំណត់ម៉ោងឈប់ជាមុន",
    ],
    keywords: ["consent", "safety plan", "ផែនការ"],
  },
  {
    id: "aftercare",
    icon: Moon,
    tone: "calm",
    title: "ក្រោយពេលប្រើ (Aftercare)",
    summary: "រាងកាយ និងអារម្មណ៍ត្រូវការពេលស្តារឡើងវិញ។",
    points: [
      "គេង ញ៉ាំអាហារ និងផឹកទឹកឱ្យបានគ្រប់គ្រាន់",
      "អារម្មណ៍ធ្លាក់ចុះ ២–៣ ថ្ងៃ ជារឿងធម្មតា",
      "បើមានគំនិតធ្វើបាបខ្លួន សូមទាក់ទងជំនួយភ្លាម",
    ],
    keywords: ["aftercare", "comedown", "ធ្លាក់ទឹកចិត្ត"],
    cta: { label: "និយាយជាមួយបុគ្គលិក", to: "/support-chat" },
  },
  {
    id: "prevention",
    icon: ShieldCheck,
    tone: "calm",
    title: "ការការពារ HIV",
    summary: "PrEP, PEP និងការធ្វើតេស្តជាប្រចាំ។",
    points: [
      "PEP ត្រូវចាប់ផ្តើមក្នុង ៧២ ម៉ោង",
      "PrEP ការពារបានលើសពី ៩០%",
      "ធ្វើតេស្តរៀងរាល់ ៣–៦ ខែ",
    ],
    keywords: ["prep", "pep", "test", "តេស្ត"],
    cta: { label: "សុំឈុតតេស្តឥតគិតថ្លៃ", to: "/th/hiv-selftest?branch=silom" },
  },
];

const TONE_CLASS: Record<Tone, string> = {
  danger: "border-destructive/50 bg-destructive/5",
  warn: "border-primary/40 bg-primary/5",
  calm: "border-border/60",
};

const QUICK: { label: string; term: string }[] = [
  { label: "GHB", term: "ghb" },
  { label: "Ice", term: "ice" },
  { label: "ម្ជុល", term: "ម្ជុល" },
  { label: "លាយសារធាតុ", term: "លាយ" },
  { label: "PrEP / PEP", term: "prep" },
];

export default function KhmerHarmReduction() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");

  useEffect(() => {
    void trackEvent("lite_hr_view", { language: "km" });
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.filter((t) =>
      [t.title, t.summary, ...t.points, ...t.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const applyQuick = (term: string) => {
    setQuery(term);
    void trackEvent("lite_hr_search", { language: "km", term });
  };

  return (
    <>
      <SEOHead
        title="កាត់បន្ថយគ្រោះថ្នាក់ ជាភាសាខ្មែរ — ខ្លី ងាយអាន | testD"
        description="ចំណេះដឹងកាត់បន្ថយគ្រោះថ្នាក់ជាភាសាខ្មែរ៖ GHB, Ice, poppers, ការចាក់, ការលាយសារធាតុ, PrEP/PEP — ខ្លី ងាយអាន និងស្វែងរកបាន។"
        canonicalPath="/km/harm-reduction"
        lang="km"
        alternateLanguages={[
          { lang: "th", path: "/th/harm-reduction" },
          { lang: "km", path: "/km/harm-reduction" },
        ]}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 space-y-5">
        <header className="space-y-2">
          <Link to="/km" className="inline-flex items-center text-xs text-muted-foreground underline">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> ត្រឡប់ទៅទំព័រដើម
          </Link>
          <h1 className="text-2xl font-bold leading-snug">កាត់បន្ថយគ្រោះថ្នាក់ — ខ្លី ងាយអាន</h1>
          <p className="text-sm text-muted-foreground">
            គ្មានការវិនិច្ឆ័យ · អានតែ ១–២ នាទី · ស្វែងរកប្រធានបទដែលអ្នកត្រូវការ
          </p>
        </header>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ស្វែងរក៖ GHB, ice, ម្ជុល, PrEP…"
              className="h-11 pl-9"
              aria-label="ស្វែងរកប្រធានបទ"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button
                key={q.term}
                type="button"
                onClick={() => applyQuick(q.term)}
                className="rounded-full border border-border/70 px-3 py-1 text-xs transition-colors hover:border-primary hover:bg-primary/5"
              >
                {q.label}
              </button>
            ))}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                សម្អាត
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          រកឃើញ {results.length} ប្រធានបទ
        </p>

        <section className="space-y-3">
          {results.map((t) => (
            <Card key={t.id} className={TONE_CLASS[t.tone]}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-background/70 p-2 text-primary">
                    <t.icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h2 className="font-semibold leading-snug">{t.title}</h2>
                    <p className="text-sm text-muted-foreground">{t.summary}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 pl-1 text-sm">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                {t.cta && (
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => void trackEvent("lite_hr_cta", { language: "km", topic: t.id })}
                  >
                    <Link to={t.cta.to}>
                      {t.cta.label} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {results.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  រកមិនឃើញប្រធានបទនេះទេ។ សូមសាកសួរបុគ្គលិកដោយផ្ទាល់។
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to="/support-chat">សួរបុគ្គលិក</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" /> ពេលមានអាសន្ន
            </p>
            <p className="text-muted-foreground">
              សន្លប់ ដកដង្ហើមខុសប្រក្រតី ប្រកាច់ — ហៅ ១៦៦៩ ភ្លាម ហើយដាក់អ្នកជំងឺផ្អៀងខាងឆ្វេង។
            </p>
            <a href="tel:+6626329501" className="flex items-center gap-2 underline">
              <Phone className="h-4 w-4" /> SWING Clinic +66 2 632 9501
            </a>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
