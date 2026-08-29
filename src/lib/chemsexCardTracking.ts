import { trackEvent } from "@/hooks/useAnalytics";
import type { ChemsexFactCard } from "@/data/chemsexFactCards";

/**
 * Tracking helpers for the 20 Chemsex fact cards.
 * Answers: which card sent the user to which service, and did they arrive by QR scan?
 */

export type CardEntrySource = "qr" | "print" | "direct" | "internal";

const SESSION_PREFIX = "chemsex_card_src:";
const QR_SEEN_PREFIX = "chemsex_card_qr_seen:";

/** Read the entry source from the URL (?src=qr / ?utm_source=qr / ?qr=1). */
export function detectCardEntrySource(search: string): CardEntrySource {
  const params = new URLSearchParams(search);
  const raw = (params.get("src") || params.get("utm_source") || "").toLowerCase();
  if (params.get("qr") === "1" || raw === "qr" || raw === "qrcode") return "qr";
  if (raw === "print" || raw === "card" || raw === "factcard") return "print";
  if (typeof document !== "undefined" && document.referrer.includes(window.location.host)) {
    return "internal";
  }
  return "direct";
}

function sessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Source remembered for this card in the current session (survives in-app navigation). */
export function getRememberedSource(slug: string): CardEntrySource {
  return (sessionGet(SESSION_PREFIX + slug) as CardEntrySource) || "direct";
}

function baseMeta(card: ChemsexFactCard, language: string) {
  return {
    card_slug: card.slug,
    card_number: card.number,
    card_group: card.group,
    card_title: card.titleTh,
    language,
  };
}

/** Fire on card detail mount. Also fires a dedicated QR-scan event once per session. */
export function trackCardView(
  card: ChemsexFactCard,
  language: string,
  search: string,
  campaign?: string | null,
) {
  const detected = detectCardEntrySource(search);
  const source =
    detected === "internal" ? getRememberedSource(card.slug) : detected;
  if (detected !== "internal") sessionSet(SESSION_PREFIX + card.slug, detected);

  trackEvent("chemsex_card_view", {
    ...baseMeta(card, language),
    entry_source: source,
    campaign: campaign || null,
  });

  if (detected === "qr") {
    const qrKey = QR_SEEN_PREFIX + card.slug;
    if (!sessionGet(qrKey)) {
      sessionSet(qrKey, "1");
      trackEvent("chemsex_card_qr_scan", {
        ...baseMeta(card, language),
        campaign: campaign || null,
      });
    }
  }
}

/** Fire when a service link on the card is opened. */
export function trackCardServiceOpen(
  card: ChemsexFactCard,
  language: string,
  cta: { to: string; service: string; labelTh: string; labelEn: string },
  placement: "card_back" | "lightbox" = "card_back",
) {
  trackEvent("chemsex_card_service_open", {
    ...baseMeta(card, language),
    entry_source: getRememberedSource(card.slug),
    service: cta.service,
    service_label: cta.labelTh,
    target_path: cta.to,
    link_type: cta.to.startsWith("tel:") ? "phone" : "internal_link",
    placement,
  });

  // Keep the legacy event so existing dashboards continue to work.
  trackEvent("chemsex_card_cta_click", {
    card_slug: card.slug,
    card_number: card.number,
    target_path: cta.to,
    service: cta.service,
  });
}

/** Fire when the printed artwork is opened in the lightbox. */
export function trackCardArtworkZoom(
  card: ChemsexFactCard,
  language: string,
  side: "front" | "back",
) {
  trackEvent("chemsex_card_artwork_zoom", {
    ...baseMeta(card, language),
    side,
    entry_source: getRememberedSource(card.slug),
  });
}
