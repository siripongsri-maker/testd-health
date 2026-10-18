/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ArrowRight, Phone, MessageCircle, Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { openSupportChat } from "@/lib/openSupportChat";
import { trackEvent } from "@/hooks/useAnalytics";
import { clinicBookingHref, matchClinicService } from "@/lib/articleBookingMatch";

const CLINIC_TEL_HREF = "tel:+6626329501";
const CLINIC_TEL_LABEL = "02 632 9501";

/**
 * Real booking CTA for article pages: a "จองคลินิก" button that navigates to
 * testD's own clinic booking flow (internal route only), with the service that
 * fits the article preselected, plus call and LINE fallbacks.
 */
export function ArticleBookingCta({
  articleText,
  articleSlug,
  variant = "card",
}: {
  articleText: string | null;
  articleSlug: string;
  variant?: "card" | "compact";
}) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const th = language === "th";

  const service = useMemo(() => matchClinicService(articleText), [articleText]);
  const href = clinicBookingHref(service);

  const book = () => {
    void trackEvent("article_booking_cta_click", {
      article_slug: articleSlug,
      service_slug: service?.slug ?? null,
      target: href,
      surface: variant,
    });
    navigate(href);
  };

  if (variant === "compact") {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
        <Button onClick={book} size="sm" className="gap-2 h-11">
          <CalendarCheck className="h-4 w-4" />
          {th ? "จองคลินิก" : "Book clinic"}
        </Button>
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
          {service
            ? th
              ? `${service.icon} ${service.name_th} — เลือกใหม้ได้หน้าจอง`
              : `${service.icon} ${service.name_en} — change it while booking`
            : th
              ? "เลือกบริการและสาขาได้ในขั้ นตอนจอง"
              : "Pick a service and branch while booking"}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <CalendarCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {th ? "ขั้ นตอไป — ทำนัดกับเจ้าหน้าที่" : "Next step — book with the clinic"}
          </p>
          <h3 className="mt-1 text-base font-bold text-foreground">
            {th ? "จองคิกับ SWING Clinic ได้เลย" : "Book an appointment with SWING Clinic"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {service
              ? th
                ? `เลือก "${service.name_th}" ให้อตัโนมตัิจากบทความนี้ — จะเปลี่ยนบริการหรือสาขาใหม้ก็ได้`
                : `"${service.name_en}" is preselected from this article — you can still change it.`
              : th
                ? "เลือกบริการ สาขากวันเวลาเองได้ในขั้ นตอนจอง"
                : "Choose the service, branch and time yourself in the booking flow."}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={book} className="gap-2 w-full sm:w-auto">
              {th ? "จองคลินิก" : "Book clinic"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" asChild className="h-11">
              <a href={CLINIC_TEL_HREF} className="gap-2">
                <Phone className="h-4 w-4" />
                {th ? `โทร ${CLINIC_TEL_LABEL}` : `Call ${CLINIC_TEL_LABEL}`}
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={() => openSupportChat()}
              className="h-11 gap-2"
              haptic={false}
            >
              <MessageCircle className="h-4 w-4" />
              {th ? "ปรึกษาผ่าน LINE" : "Chat on LINE"}
            </Button>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {th
                ? "ข้อมูลของคุณจะถูกเก็บเป็นความลับ ปลอดภัย และใช้เพื่ อการให้บริการเท่านั้ น"
                : "Your information is kept confidential and used only to deliver the service."}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ArticleBookingCta;
