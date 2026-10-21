/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ADSENSE_CLIENT, isAdEligiblePath } from "@/lib/adsensePolicy";

const SCRIPT_ID = "adsbygoogle-loader";

/**
 * Loads the AdSense script only on content pages allowed by adsensePolicy.
 * Once loaded (SPA), navigating to a non-eligible page toggles `no-ads` on
 * <body>, which hides any auto-placed ad units via index.css.
 */
export function AdSenseRouteGate() {
  const { pathname } = useLocation();

  useEffect(() => {
    const eligible = isAdEligiblePath(pathname);
    document.body.classList.toggle("no-ads", !eligible);
    if (!eligible || document.getElementById(SCRIPT_ID)) return;
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  }, [pathname]);

  return null;
}
