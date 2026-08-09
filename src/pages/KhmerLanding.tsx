import { Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/hooks/useAnalytics";
import { KhmerPrepPepQuiz } from "@/components/km/KhmerPrepPepQuiz";
import {
  ShieldCheck, Pill, Syringe, MapPin, Phone, MessageCircle, ArrowRight, Languages,
  HeartPulse, BookOpen, AlertTriangle,
} from "lucide-react";

const track = (action: string) => {
  void trackEvent("lite_landing_cta", { language: "km", action });
};

interface Item {
  key: string;
  icon: typeof Pill;
  title: string;
  desc: string;
  cta: string;
  to: string;
}

const SERVICES: Item[] = [
  {
    key: "selftest",
    icon: ShieldCheck,
    title: "ឈុតធ្វើតេស្ត HIV ដោយខ្លួនឯង (ឥតគិតថ្លៃ)",
    desc: "សុំឈុតតេស្តផ្ញើដល់ផ្ទះ ឬ ទទួលនៅសាខា។ ព័ត៌មានរបស់អ្នកត្រូវរក្សាការសម្ងាត់។",
    cta: "សុំឈុតតេស្តឥតគិតថ្លៃ",
    to: "/th/hiv-selftest?branch=silom",
  },
  {
    key: "prep",
    icon: Pill,
    title: "PrEP — ថ្នាំការពារមុនប្រឈម",
    desc: "ការពារ HIV បានលើសពី ៩០% ។ ពិគ្រោះដោយឥតគិតថ្លៃ មិនចាំបាច់ប្រើឈ្មោះពិត។",
    cta: "ណាត់ពិគ្រោះ PrEP",
    to: "/clinic/book?service=prep-consultation",
  },
  {
    key: "pep",
    icon: Syringe,
    title: "PEP — ក្នុងរយៈពេល ៧២ ម៉ោង បន្ទាប់ពីប្រឈម",
    desc: "បើមានហានិភ័យរួចហើយ ត្រូវចាប់ផ្តើមថ្នាំឱ្យបានឆាប់ ក្នុង ៧២ ម៉ោង។",
    cta: "សុំ PEP បន្ទាន់",
    to: "/pep",
  },
];

const HARM_REDUCTION: Item[] = [
  {
    key: "hr_hub",
    icon: HeartPulse,
    title: "កាត់បន្ថយគ្រោះថ្នាក់ (Harm Reduction)",
    desc: "ចំណេះដឹងអំពីការប្រើសារធាតុឱ្យមានសុវត្ថិភាពជាងមុន ដោយគ្មានការវិនិច្ឆ័យ។",
    cta: "អានមគ្គុទ្ទេសក៍",
    to: "/th/harm-reduction",
  },
  {
    key: "chemsex",
    icon: BookOpen,
    title: "Chemsex ឱ្យមានសុវត្ថិភាពជាងមុន",
    desc: "គន្លឹះមុន កំឡុងពេល និងក្រោយពេល រួមទាំងការរៀបចំផែនការសុវត្ថិភាព។",
    cta: "អានបន្ថែម",
    to: "/th/chemsex-safety",
  },
  {
    key: "ghb",
    icon: AlertTriangle,
    title: "សញ្ញាគ្រោះថ្នាក់ GHB និងការលើសកម្រិត",
    desc: "របៀបសង្កេតសញ្ញាបន្ទាន់ និងជំហានជួយសង្គ្រោះជាបន្ទាន់។",
    cta: "មើលសញ្ញាបន្ទាន់",
    to: "/th/ghb-overdose",
  },
];

function ItemCard({ item }: { item: Item }) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <item.icon className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="font-semibold leading-snug">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        </div>
        <Button asChild variant="secondary" className="w-full" onClick={() => track(item.key)}>
          <Link to={item.to}>
            {item.cta} <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function KhmerLanding() {
  useEffect(() => {
    void trackEvent("lite_landing_view", { language: "km" });
  }, []);

  return (
    <>
      <SEOHead
        title="សេវា HIV, PrEP, PEP និង Harm Reduction សម្រាប់ជនជាតិខ្មែរ | testD"
        description="តេស្ត HIV ឥតគិតថ្លៃ ថ្នាំ PrEP/PEP និងចំណេះដឹងកាត់បន្ថយគ្រោះថ្នាក់ ជាភាសាខ្មែរ សម្រាប់ជនជាតិខ្មែរនៅប្រទេសថៃ។"
        canonicalPath="/km"
        lang="km"
        alternateLanguages={[
          { lang: "th", path: "/th" },
          { lang: "en", path: "/en" },
          { lang: "lo", path: "/lo" },
          { lang: "km", path: "/km" },
        ]}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 space-y-6">
        <header className="space-y-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Languages className="h-3.5 w-3.5" /> ភាសាខ្មែរ · ខ្មែរ
          </span>
          <h1 className="text-2xl font-bold leading-snug">
            តេស្ត HIV ឥតគិតថ្លៃ · PrEP · PEP<br />និងចំណេះដឹងកាត់បន្ថយគ្រោះថ្នាក់
          </h1>
          <p className="text-sm text-muted-foreground">
            មិនចាំបាច់ប្រើឈ្មោះពិត · មិនចាំបាច់មានធានារ៉ាប់រង · រក្សាការសម្ងាត់
          </p>
          <Button asChild size="lg" className="w-full h-12 text-base" onClick={() => track("start")}>
            <Link to="/th/hiv-selftest?branch=silom">
              ចាប់ផ្តើមនៅទីនេះ <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </header>

        <section aria-label="សេវាកម្ម" className="space-y-3">
          <h2 className="text-base font-semibold">ជ្រើសរើសអ្វីដែលអ្នកត្រូវការ</h2>
          {SERVICES.map((s) => <ItemCard key={s.key} item={s} />)}
        </section>

        <section aria-label="Harm Reduction" className="space-y-3">
          <h2 className="text-base font-semibold">អាន៖ កាត់បន្ថយគ្រោះថ្នាក់</h2>
          {HARM_REDUCTION.map((s) => <ItemCard key={s.key} item={s} />)}
        </section>

        <section aria-label="ទំនាក់ទំនង" className="space-y-3">
          <h2 className="text-base font-semibold">ទំនាក់ទំនង និងទីតាំង</h2>
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                SWING Clinic — ស៊ីឡម (បាងកក) និង ប៉ាតាយ៉ា
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+6626329501" className="underline" onClick={() => track("call")}>
                  +66 2 632 9501
                </a>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button asChild variant="outline" size="sm" onClick={() => track("book_clinic")}>
                  <Link to="/clinic/book">ណាត់ជួបគ្លីនិក</Link>
                </Button>
                <Button asChild variant="outline" size="sm" onClick={() => track("support")}>
                  <Link to="/support-chat">
                    <MessageCircle className="mr-1 h-4 w-4" /> សួរសំណួរ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground space-x-3">
          <Link to="/th" className="underline">ภาษาไทย</Link>
          <Link to="/en" className="underline">English</Link>
          <Link to="/lo" className="underline">ພາສາລາວ</Link>
        </footer>
      </main>
    </>
  );
}
