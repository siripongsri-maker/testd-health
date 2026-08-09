import { Link } from "react-router-dom";
import { useEffect } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/hooks/useAnalytics";
import {
  ShieldCheck, Pill, Syringe, MapPin, Phone, MessageCircle, ArrowRight, Languages,
} from "lucide-react";

const track = (action: string) => {
  void trackEvent("lite_landing_cta", { language: "lo", action });
};

interface Path {
  key: string;
  icon: typeof Pill;
  title: string;
  desc: string;
  cta: string;
  to: string;
}

const PATHS: Path[] = [
  {
    key: "prep",
    icon: Pill,
    title: "PrEP — ຢາປ້ອງກັນກ່ອນສຳຜັດເຊື້ອ",
    desc: "ກິນກ່ອນມີຄວາມສ່ຽງ ຊ່ວຍປ້ອງກັນ HIV ໄດ້ຫຼາຍກວ່າ 90%. ປຶກສາຟຣີ ບໍ່ຕ້ອງໃຊ້ຊື່ຈິງ.",
    cta: "ນັດປຶກສາ PrEP",
    to: "/clinic/book?service=prep-consultation",
  },
  {
    key: "pep",
    icon: Syringe,
    title: "PEP — ຫຼັງມີຄວາມສ່ຽງ ພາຍໃນ 72 ຊົ່ວໂມງ",
    desc: "ຖ້າມີຄວາມສ່ຽງແລ້ວ ຕ້ອງເລີ່ມຢາໄວທີ່ສຸດ ພາຍໃນ 72 ຊົ່ວໂມງ.",
    cta: "ຂໍ PEP ດ່ວນ",
    to: "/pep",
  },
  {
    key: "selftest",
    icon: ShieldCheck,
    title: "ຊຸດກວດ HIV ດ້ວຍຕົນເອງ (ຟຣີ)",
    desc: "ຂໍຊຸດກວດສົ່ງເຖິງບ້ານ ຫຼື ຮັບທີ່ສາຂາ ຄວາມລັບ 100%.",
    cta: "ຂໍຊຸດກວດຟຣີ",
    to: "/th/hiv-selftest?branch=silom",
  },
];

export default function LaoLanding() {
  useEffect(() => {
    void trackEvent("lite_landing_view", { language: "lo" });
  }, []);

  return (
    <>
      <SEOHead
        title="ບໍລິການ HIV, PrEP ແລະ PEP ສຳລັບຄົນລາວໃນປະເທດໄທ | testD"
        description="ບໍລິການກວດ HIV ຟຣີ, ຢາ PrEP ແລະ PEP ສຳລັບຄົນລາວທີ່ຢູ່ໃນປະເທດໄທ. ບໍ່ຕ້ອງໃຊ້ຊື່ຈິງ ຄວາມລັບ 100%."
        canonicalPath="/lo"
        lang="lo"
        alternateLanguages={[
          { lang: "th", path: "/th" },
          { lang: "en", path: "/en" },
          { lang: "lo", path: "/lo" },
        ]}
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 space-y-6">
        <header className="space-y-3 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Languages className="h-3.5 w-3.5" /> ພາສາລາວ · ລາວ
          </span>
          <h1 className="text-2xl font-bold leading-snug">
            ກວດ HIV ຟຣີ · PrEP · PEP<br />ສຳລັບຄົນລາວໃນປະເທດໄທ
          </h1>
          <p className="text-sm text-muted-foreground">
            ບໍ່ຕ້ອງໃຊ້ຊື່ຈິງ · ບໍ່ຕ້ອງມີບັດປະກັນສັງຄົມ · ຂໍ້ມູນຂອງທ່ານເປັນຄວາມລັບ
          </p>
          <Button
            asChild
            size="lg"
            className="w-full h-12 text-base"
            onClick={() => track("start")}
          >
            <Link to="/th/hiv-selftest?branch=silom">
              ເລີ່ມຕົ້ນທີ່ນີ້ <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </Button>
        </header>

        <section aria-label="ເສັ້ນທາງບໍລິການ" className="space-y-3">
          <h2 className="text-base font-semibold">ເລືອກສິ່ງທີ່ທ່ານຕ້ອງການ</h2>
          {PATHS.map((p) => (
            <Card key={p.key} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-snug">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
                <Button asChild variant="secondary" className="w-full" onClick={() => track(p.key)}>
                  <Link to={p.to}>
                    {p.cta} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section aria-label="ຕິດຕໍ່" className="space-y-3">
          <h2 className="text-base font-semibold">ຕິດຕໍ່ ແລະ ສະຖານທີ່</h2>
          <Card>
            <CardContent className="p-4 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                SWING Clinic — ສີລົມ (ກຸງເທບ) ແລະ ພັດທະຍາ
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+6626329501" className="underline" onClick={() => track("call")}>
                  +66 2 632 9501
                </a>
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button asChild variant="outline" size="sm" onClick={() => track("book_clinic")}>
                  <Link to="/clinic/book">ນັດໝາຍຄລີນິກ</Link>
                </Button>
                <Button asChild variant="outline" size="sm" onClick={() => track("support")}>
                  <Link to="/support-chat">
                    <MessageCircle className="mr-1 h-4 w-4" /> ສອບຖາມ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground space-x-3">
          <Link to="/th" className="underline">ภาษาไทย</Link>
          <Link to="/en" className="underline">English</Link>
        </footer>
      </main>
    </>
  );
}
