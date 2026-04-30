import { useEffect, useMemo, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  isSeoPath,
  stripLocalePrefix,
  withLocalePrefix,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  Locale,
} from "@/lib/seoLocalePrefix";
import { useLanguage } from "@/lib/i18n";

/**
 * LocaleRouter — wraps the app's <Routes>.
 *
 * 1) If pathname is a SEO route without /th or /en prefix, redirect to /th/...
 *    (Thai is the default. Uses replace so back-button stays clean.)
 * 2) If pathname starts with /th or /en, syncs the language store and exposes
 *    the stripped pathname to children via the React Router location override
 *    pattern: children render <Routes location={...}> using the value from
 *    useStrippedLocation() below — but to avoid a context, we simply rely on
 *    the existing routes; React Router can match against a custom location
 *    when we provide one to <Routes>. We do that here by patching the
 *    history-bound location object via a render prop pattern.
 *
 * Because rewriting the URL itself would defeat the SEO goal, we keep the
 * /th or /en in the address bar and only strip it for *route matching* via
 * the children prop, which expects the consumer to pass the stripped value.
 */
export function useStrippedLocation() {
  const location = useLocation();
  return useMemo(() => {
    const { locale, pathname } = stripLocalePrefix(location.pathname);
    return { ...location, pathname, _localePrefix: locale };
  }, [location]);
}

export function LocaleRedirector({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    const { locale, pathname: stripped } = stripLocalePrefix(location.pathname);

    // Sync language store when URL carries a locale prefix.
    if (locale && SUPPORTED_LOCALES.includes(locale)) {
      setLanguage(locale as Locale);
      return;
    }

    // No prefix → if it's a SEO route, redirect to /<default>/...
    if (isSeoPath(stripped)) {
      const target =
        withLocalePrefix(stripped, DEFAULT_LOCALE) +
        location.search +
        location.hash;
      navigate(target, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate, setLanguage]);

  return <>{children}</>;
}
