import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  ArrowRight, ArrowLeft, ClipboardList, Syringe, Pill, ShieldCheck, HeartPulse, RotateCcw,
} from "lucide-react";

type Answers = Record<string, string>;

interface Choice {
  value: string;
  label: string;
  hint?: string;
}

interface Question {
  id: string;
  title: string;
  choices: Choice[];
  /** show this question only when the predicate passes */
  when?: (a: Answers) => boolean;
}

const QUESTIONS: Question[] = [
  {
    id: "exposure",
    title: "ក្នុងរយៈពេល ៧២ ម៉ោង (៣ ថ្ងៃ) កន្លងមក តើអ្នកមានហានិភ័យប្រឈមនឹង HIV ដែរឬទេ?",
    choices: [
      { value: "yes", label: "មាន", hint: "ដូចជា រួមភេទដោយគ្មានស្រោមអនាម័យ ស្រោមធ្លាយ ឬចែករំលែកម្ជុល" },
      { value: "no", label: "គ្មាន" },
      { value: "unsure", label: "មិនច្បាស់" },
    ],
  },
  {
    id: "recent_risk",
    title: "ក្នុងរយៈពេល ៣ ខែចុងក្រោយ តើអ្នកបានរួមភេទដោយគ្មានស្រោមអនាម័យប៉ុន្មានដង?",
    when: (a) => a.exposure !== "yes",
    choices: [
      { value: "often", label: "ញឹកញាប់ (លើសពី ២ ដង)" },
      { value: "sometimes", label: "ម្តងម្កាល (១–២ ដង)" },
      { value: "never", label: "គ្មានទេ" },
    ],
  },
  {
    id: "partners",
    title: "តើអ្នកមានដៃគូរួមភេទច្រើននាក់ ឬដៃគូដែលអ្នកមិនដឹងស្ថានភាព HIV ដែរឬទេ?",
    when: (a) => a.exposure !== "yes",
    choices: [
      { value: "yes", label: "មាន" },
      { value: "no", label: "គ្មាន / ដៃគូតែម្នាក់ដែលដឹងស្ថានភាព" },
    ],
  },
  {
    id: "chems",
    title: "តើអ្នកធ្លាប់ប្រើសារធាតុ (ដូចជា ice, GHB, poppers) ពេលរួមភេទដែរឬទេ?",
    when: (a) => a.exposure !== "yes",
    choices: [
      { value: "yes", label: "ធ្លាប់" },
      { value: "no", label: "មិនធ្លាប់" },
    ],
  },
  {
    id: "tested",
    title: "តើអ្នកបានធ្វើតេស្ត HIV លើកចុងក្រោយនៅពេលណា?",
    when: (a) => a.exposure !== "yes",
    choices: [
      { value: "never", label: "មិនធ្លាប់ធ្វើតេស្ត" },
      { value: "over3m", label: "លើសពី ៣ ខែមុន" },
      { value: "recent", label: "ក្នុងរយៈពេល ៣ ខែចុងក្រោយ" },
    ],
  },
];

interface Result {
  key: "pep" | "prep" | "test" | "info";
  icon: typeof Pill;
  tone: string;
  badge: string;
  title: string;
  body: string;
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
  extra?: string;
}

function buildResult(a: Answers): Result {
  if (a.exposure === "yes" || a.exposure === "unsure") {
    return {
      key: "pep",
      icon: Syringe,
      tone: "border-destructive/50 bg-destructive/5",
      badge: "បន្ទាន់",
      title: "អ្នកគួរពិគ្រោះ PEP ជាបន្ទាន់",
      body:
        "PEP ត្រូវចាប់ផ្តើមក្នុងរយៈពេល ៧២ ម៉ោង បន្ទាប់ពីប្រឈម ហើយកាន់តែឆាប់កាន់តែមានប្រសិទ្ធភាព។ សូមទាក់ទងគ្លីនិកឥឡូវនេះ។",
      primary: { label: "សុំ PEP បន្ទាន់", to: "/pep" },
      secondary: { label: "ទូរស័ព្ទទៅគ្លីនិក", to: "/clinic/book" },
      extra: "ទូរស័ព្ទ៖ +66 2 632 9501",
    };
  }

  const riskPoints =
    (a.recent_risk === "often" ? 2 : a.recent_risk === "sometimes" ? 1 : 0) +
    (a.partners === "yes" ? 2 : 0) +
    (a.chems === "yes" ? 1 : 0);

  if (riskPoints >= 2) {
    return {
      key: "prep",
      icon: Pill,
      tone: "border-primary/50 bg-primary/5",
      badge: "ណែនាំ",
      title: "PrEP សមស្របនឹងអ្នក",
      body:
        "ចម្លើយរបស់អ្នកបង្ហាញថាមានហានិភ័យបន្ត។ PrEP ជាថ្នាំការពារមុនប្រឈម ការពារបានលើសពី ៩០% ។ មុនចាប់ផ្តើម ត្រូវធ្វើតេស្ត HIV ជាមុនសិន។",
      primary: { label: "ណាត់ពិគ្រោះ PrEP", to: "/clinic/book?service=prep-consultation" },
      secondary: { label: "សុំឈុតតេស្តឥតគិតថ្លៃ", to: "/th/hiv-selftest?branch=silom" },
      extra: a.chems === "yes" ? "អ្នកក៏អាចអានផ្នែកកាត់បន្ថយគ្រោះថ្នាក់សម្រាប់ chemsex ផងដែរ។" : undefined,
    };
  }

  if (a.tested === "never" || a.tested === "over3m" || riskPoints === 1) {
    return {
      key: "test",
      icon: ShieldCheck,
      tone: "border-primary/40 bg-muted/40",
      badge: "ជំហានទី១",
      title: "ចាប់ផ្តើមដោយធ្វើតេស្ត HIV",
      body:
        "ហានិភ័យរបស់អ្នកមិនខ្ពស់ទេ ប៉ុន្តែការដឹងស្ថានភាពជាជំហានដំបូង។ សុំឈុតតេស្តឥតគិតថ្លៃ ធ្វើនៅផ្ទះ ដោយរក្សាការសម្ងាត់។",
      primary: { label: "សុំឈុតតេស្តឥតគិតថ្លៃ", to: "/th/hiv-selftest?branch=silom" },
      secondary: { label: "សួរបុគ្គលិក", to: "/support-chat" },
    };
  }

  return {
    key: "info",
    icon: HeartPulse,
    tone: "border-border/60 bg-muted/30",
    badge: "រក្សាសុវត្ថិភាព",
    title: "បន្តការការពារដូចសព្វថ្ងៃ",
    body:
      "ឥឡូវនេះហានិភ័យរបស់អ្នកទាប។ សូមធ្វើតេស្តជាប្រចាំ (រៀងរាល់ ៦ ខែ) និងអានចំណេះដឹងកាត់បន្ថយគ្រោះថ្នាក់ ដើម្បីត្រៀមខ្លួន។",
    primary: { label: "អានមគ្គុទ្ទេសក៍", to: "/th/harm-reduction" },
    secondary: { label: "សុំឈុតតេស្តឥតគិតថ្លៃ", to: "/th/hiv-selftest?branch=silom" },
  };
}

export function KhmerPrepPepQuiz() {
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const visible = useMemo(
    () => QUESTIONS.filter((q) => !q.when || q.when(answers)),
    [answers],
  );
  const current = visible[Math.min(index, visible.length - 1)];
  const result = done ? buildResult(answers) : null;

  const start = () => {
    setStarted(true);
    void trackEvent("km_triage_started", { language: "km" });
  };

  const pick = (value: string) => {
    const next = { ...answers, [current.id]: value };
    setAnswers(next);
    const nextVisible = QUESTIONS.filter((q) => !q.when || q.when(next));
    if (index + 1 >= nextVisible.length) {
      setDone(true);
      void trackEvent("km_triage_completed", {
        language: "km",
        recommendation: buildResult(next).key,
      });
    } else {
      setIndex(index + 1);
    }
  };

  const reset = () => {
    setAnswers({});
    setIndex(0);
    setDone(false);
    setStarted(true);
  };

  if (!started) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-primary/15 p-2 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold leading-snug">
                សំណួរខ្លីៗ ៖ តើ PrEP ឬ PEP សមនឹងអ្នក?
              </h3>
              <p className="text-sm text-muted-foreground">
                ៤–៥ សំណួរ ក្នុងរយៈពេលមិនដល់ ១ នាទី។ គ្មានការសួរឈ្មោះ គ្មានការរក្សាទុកចម្លើយ។
              </p>
            </div>
          </div>
          <Button className="w-full h-11" onClick={start}>
            ចាប់ផ្តើមឆ្លើយសំណួរ <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    const Icon = result.icon;
    return (
      <Card className={result.tone}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-background/70 p-2 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                {result.badge}
              </span>
              <h3 className="font-semibold leading-snug">{result.title}</h3>
              <p className="text-sm text-muted-foreground">{result.body}</p>
              {result.extra && (
                <p className="text-sm font-medium text-foreground">{result.extra}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Button
              asChild
              className="w-full h-11"
              onClick={() => void trackEvent("km_triage_cta", { language: "km", recommendation: result.key, action: "primary" })}
            >
              <Link to={result.primary.to}>
                {result.primary.label} <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            {result.secondary && (
              <Button
                asChild
                variant="secondary"
                className="w-full"
                onClick={() => void trackEvent("km_triage_cta", { language: "km", recommendation: result.key, action: "secondary" })}
              >
                <Link to={result.secondary.to}>{result.secondary.label}</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
              <RotateCcw className="mr-1 h-4 w-4" /> ឆ្លើយម្តងទៀត
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            លទ្ធផលនេះជាការណែនាំបឋមប៉ុណ្ណោះ មិនមែនជាការវិនិច្ឆ័យវេជ្ជសាស្ត្រទេ។
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>សំណួរ {index + 1} / {visible.length}</span>
            <span>{Math.round(((index + 1) / visible.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((index + 1) / visible.length) * 100}%` }}
            />
          </div>
        </div>

        <h3 className="font-semibold leading-snug">{current.title}</h3>

        <div className="space-y-2">
          {current.choices.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => pick(c.value)}
              className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 min-h-[44px]"
            >
              <span className="block text-sm font-medium">{c.label}</span>
              {c.hint && <span className="block text-xs text-muted-foreground">{c.hint}</span>}
            </button>
          ))}
        </div>

        {index > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setIndex(index - 1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> ត្រឡប់ក្រោយ
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default KhmerPrepPepQuiz;
