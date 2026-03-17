import { useEffect } from "react";

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

const BASE_URL = "https://testd-health.lovable.app";
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

    // Canonical link
    if (canonicalPath) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${BASE_URL}${canonicalPath}`);
    }

    // hreflang alternate links
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
    if (alternateLanguages) {
      alternateLanguages.forEach(({ lang: hrefLang, path }) => {
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
      url: "https://testd-health.lovable.app",
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
