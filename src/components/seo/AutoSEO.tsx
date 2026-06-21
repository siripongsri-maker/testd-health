import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteSEO, getRobotsDirective } from "@/lib/seoConfig";
import { useLanguage } from "@/lib/i18n";
import {
  alternateLanguagePaths,
  canonicalPathFor,
  isSeoPath,
  stripLocalePrefix,
} from "@/lib/seoLocalePrefix";

const BASE_URL = "https://testd.website";

/**
 * AutoSEO — placed once inside BrowserRouter.
 * On every route change, applies the correct metadata from seoConfig.
 * Pages that use their own <SEOHead> will override these defaults.
 *
 * Emits canonical + hreflang alternates against locale-prefixed URLs
 * (/th/... and /en/...) for SEO routes so each language has a distinct URL.
 */
export function AutoSEO() {
  const { pathname } = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    const { pathname: stripped } = stripLocalePrefix(pathname);
    const seo = getRouteSEO(stripped);
    const isEn = language === "en";
    const title = isEn ? seo.titleEn : seo.titleTh;
    const desc = isEn ? seo.descEn : seo.descTh;
    const robots = getRobotsDirective(seo.routeClass);

    document.title = title;
    document.documentElement.lang = isEn ? "en" : "th";

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", desc);
    setMeta("name", "robots", robots);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:locale", isEn ? "en_US" : "th_TH");
    setMeta("property", "og:url", `${BASE_URL}${pathname}`);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);

    if (seo.ogImage) {
      setMeta("property", "og:image", seo.ogImage);
      setMeta("name", "twitter:image", seo.ogImage);
    }

    // Canonical — prefer locale-prefixed canonical for SEO routes.
    const baseCanonical = seo.canonicalPath || stripped;
    const canonical = isSeoPath(baseCanonical)
      ? canonicalPathFor(baseCanonical)
      : baseCanonical;

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `${BASE_URL}${canonical}`);
    }

    // hreflang alternates — only for SEO routes; use distinct /th & /en URLs.
    document
      .querySelectorAll('link[rel="alternate"][hreflang][data-auto-seo]')
      .forEach((el) => el.remove());

    if (isSeoPath(baseCanonical)) {
      for (const alt of alternateLanguagePaths(baseCanonical)) {
        const l = document.createElement("link");
        l.setAttribute("rel", "alternate");
        l.setAttribute("hreflang", alt.lang);
        l.setAttribute("href", `${BASE_URL}${alt.path}`);
        l.setAttribute("data-auto-seo", "true");
        document.head.appendChild(l);
      }
    }
  }, [pathname, language]);

  return null;
}

