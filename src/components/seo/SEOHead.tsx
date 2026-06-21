import { useEffect } from "react";
import {
  alternateLanguagePaths,
  canonicalPathFor,
  isSeoPath,
} from "@/lib/seoLocalePrefix";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: string;
  lang?: string;
  robots?: string;
  alternateLanguages?: { lang: string; path: string }[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_URL = "https://testd.website";
const DEFAULT_OG_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/KT2ExYhzQvVnbWOZrapb2296DWu1/social-images/social-1770910470399-testD_logo.png";

/**
 * SEOHead — dynamically sets document <head> metadata for SEO & AI discoverability.
 * Works in SPA context by imperatively updating meta tags.
 */
export function SEOHead({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = "website",
  lang = "th",
  robots,
  alternateLanguages,
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    // Title
    const fullTitle = title.includes("testD") ? title : `${title} | testD`;
    document.title = fullTitle;

    // Helper to set or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Standard meta
    setMeta("name", "description", description);
    setMeta("name", "language", lang);
    if (robots) {
      setMeta("name", "robots", robots);
    }

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:image", ogImage || DEFAULT_OG_IMAGE);
    if (canonicalPath) {
      setMeta("property", "og:url", `${BASE_URL}${canonicalPath}`);
    }
    setMeta("property", "og:locale", lang === "th" ? "th_TH" : "en_US");

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage || DEFAULT_OG_IMAGE);
    setMeta("name", "twitter:card", "summary_large_image");

    // Canonical link — for SEO routes, use the locale-prefixed canonical.
    if (canonicalPath) {
      const canonicalHref = isSeoPath(canonicalPath)
        ? canonicalPathFor(canonicalPath)
        : canonicalPath;
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${BASE_URL}${canonicalHref}`);
    }

    // hreflang alternates. If caller didn't pass any but it's a SEO route,
    // auto-derive distinct /th and /en URLs.
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    const alts =
      alternateLanguages && alternateLanguages.length > 0
        ? alternateLanguages
        : canonicalPath && isSeoPath(canonicalPath)
          ? alternateLanguagePaths(canonicalPath)
          : [];
    if (alts.length > 0) {
      alts.forEach(({ lang: hrefLang, path }) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", hrefLang);
        link.setAttribute("href", `${BASE_URL}${path}`);
        document.head.appendChild(link);
      });
    }

    // JSON-LD structured data
    document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((data) => {
        const script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-seo-jsonld", "true");
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }

    // Cleanup on unmount
    return () => {
      document.querySelectorAll('script[data-seo-jsonld]').forEach(el => el.remove());
    };
  }, [title, description, canonicalPath, ogImage, ogType, lang, alternateLanguages, jsonLd]);

  return null;
}

/**
 * Build MedicalWebPage JSON-LD for substance/interaction pages.
 */
export function buildMedicalPageJsonLd({
  name,
  description,
  url,
  about,
  lastReviewed,
}: {
  name: string;
  description: string;
  url: string;
  about?: string;
  lastReviewed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name,
    description,
    url,
    about: about || "Drug interaction risks and harm reduction information",
    inLanguage: ["th", "en"],
    ...(lastReviewed && { lastReviewed }),
    publisher: {
      "@type": "Organization",
      name: "SWING Foundation",
      url: "https://testd.website",
    },
    medicalAudience: {
      "@type": "MedicalAudience",
      audienceType: "Patient",
    },
  };
}

/**
 * Build FAQPage JSON-LD from question/answer pairs.
 */
export function buildFaqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Build BreadcrumbList JSON-LD for nested routes.
 * Pass an ordered list of crumbs from root → current page.
 * Paths are resolved against BASE_URL.
 *
 * Example:
 *   buildBreadcrumbJsonLd([
 *     { name: "Home", path: "/" },
 *     { name: "Harm Reduction", path: "/harm-reduction" },
 *     { name: "Chemsex Safety", path: "/chemsex-safety" },
 *   ])
 */
export function buildBreadcrumbJsonLd(
  crumbs: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.path.startsWith("/") ? crumb.path : `/${crumb.path}`}`,
    })),
  };
}
