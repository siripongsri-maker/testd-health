/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
import { describe, it, expect } from "vitest";
import { isAdEligiblePath } from "../adsensePolicy";

describe("AdSense placement policy", () => {
  it("allows article pages with locale prefix", () => {
    expect(isAdEligiblePath("/th/info/article/prep-guide")).toBe(true);
    expect(isAdEligiblePath("/en/info/faq")).toBe(true);
  });
  it("blocks drug-related harm reduction pages", () => {
    expect(isAdEligiblePath("/th/harm-reduction")).toBe(false);
    expect(isAdEligiblePath("/th/chemsex-cards/ghb")).toBe(false);
    expect(isAdEligiblePath("/th/interaction/ghb-alcohol")).toBe(false);
  });
  it("blocks screens without publisher content", () => {
    expect(isAdEligiblePath("/auth")).toBe(false);
    expect(isAdEligiblePath("/clinic/book")).toBe(false);
    expect(isAdEligiblePath("/admin")).toBe(false);
    expect(isAdEligiblePath("/th")).toBe(false);
    expect(isAdEligiblePath("/th/info/search")).toBe(false);
  });
});
