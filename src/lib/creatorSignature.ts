/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */
/**
 * Hidden creator signature. Not rendered on any page.
 * Visible only via developer console, page source, exported files and the
 * read-only `system_provenance` database record.
 */
export const CREATOR_NAME = "Siripong Srichau";
export const CREATOR_STATEMENT =
  "Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator of testD). All rights reserved.";

const ZW = ["\u200B", "\u200C", "\u200D", "\u2060"];

/** Encode text as invisible zero-width characters (base-4). */
export function toZeroWidth(input: string): string {
  return Array.from(new TextEncoder().encode(input))
    .flatMap((b) => [(b >> 6) & 3, (b >> 4) & 3, (b >> 2) & 3, b & 3])
    .map((d) => ZW[d])
    .join("");
}

/** Invisible fingerprint embedded in the shipped bundle. */
export const CREATOR_FINGERPRINT = toZeroWidth(`creator:${CREATOR_NAME}|sole`);

export function installCreatorSignature() {
  try {
    Object.defineProperty(window, "__testd_creator__", {
      value: Object.freeze({ creator: CREATOR_NAME, statement: CREATOR_STATEMENT, fp: CREATOR_FINGERPRINT }),
      enumerable: false,
    });
    console.info(`%c${CREATOR_STATEMENT}`, "color:#c0275e;font-weight:600");
  } catch {
    /* noop */
  }
}
