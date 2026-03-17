import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getRouteSEO, getRobotsDirective } from "@/lib/seoConfig";
import { useLanguage } from "@/lib/i18n";

/**
 * AutoSEO — placed once inside BrowserRouter.
 * On every route change, applies the correct metadata from seoConfig.
 * Pages that use their own <SEOHead> will override these defaults.
 */
export function AutoSEO() {
  const { pathname } = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    const seo = getRouteSEO(pathname);
    const isEn = language === "en";
    const title = isEn ? seo.titleEn : seo.titleTh;
    const desc = isEn ? seo.descEn : seo.descTh;
    const robots = getRobotsDirective(seo.routeClass);

    // Set title
    document.title = title;

    // Helper
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
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);

    // Canonical
    if (seo.canonicalPath) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", `https://testd-health.lovable.app${seo.canonicalPath}`);
    }
  }, [pathname, language]);

  return null;
}
