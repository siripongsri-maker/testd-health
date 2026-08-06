/**
 * Standardised social share image handling.
 *
 * Every og:image / twitter:image across the site is normalised to the same
 * 1200x630 (1.91:1) rendition so previews look identical on Facebook, X,
 * LINE, WhatsApp, Slack, Telegram and LinkedIn. When a cover image is
 * missing, unusable (relative path, blob/data URL) or not yet processed, we
 * fall back to the branded default card shipped in /public.
 */

export const BASE_URL = "https://testd.website";

/** Standard share-card dimensions required by all major platforms. */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/** Branded fallback card (1200x630) served from the project's own domain. */
export const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`;

/** Supabase Storage public object URL → transformable render URL. */
const STORAGE_PUBLIC = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

function isUsable(url?: string | null): url is string {
  if (!url) return false;
  const value = url.trim();
  if (!value) return false;
  if (value.startsWith("data:") || value.startsWith("blob:")) return false;
  // Crawlers require absolute URLs; resolve site-relative paths against BASE_URL.
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/");
}

/**
 * Normalise any cover image into a 1200x630 absolute URL.
 * Supabase-hosted images are resized/cropped server-side; other hosts are
 * passed through as-is (still absolute), and anything unusable falls back to
 * the branded default card.
 */
export function resolveOgImage(src?: string | null): string {
  if (!isUsable(src)) return DEFAULT_OG_IMAGE;

  let url = src.trim();
  if (url.startsWith("/")) url = `${BASE_URL}${url}`;
  if (url.startsWith("http://")) url = url.replace("http://", "https://");

  if (url.includes(STORAGE_PUBLIC)) {
    const [base, query] = url.split("?");
    const rendered = base.replace(STORAGE_PUBLIC, STORAGE_RENDER);
    const params = new URLSearchParams(query);
    params.set("width", String(OG_IMAGE_WIDTH));
    params.set("height", String(OG_IMAGE_HEIGHT));
    params.set("resize", "cover");
    params.set("quality", "80");
    return `${rendered}?${params.toString()}`;
  }

  return url;
}

/** Best-guess MIME type for og:image:type. */
export function ogImageType(url: string): string {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
