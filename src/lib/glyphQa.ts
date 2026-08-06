/**
 * Glyph / rendering QA utilities.
 *
 * Detects the class of rendering bugs we hit while generating PDFs and
 * multi-language pages:
 *  - Latin letters / digits that disappear (font has no glyph -> zero width or .notdef)
 *  - Emoji rendered as tofu boxes (□) because no emoji font is available
 *  - Unicode replacement characters (U+FFFD) from broken encoding
 *  - Empty rendered text (element has text but paints nothing)
 */

export type GlyphIssueType =
  | "missing_latin"
  | "missing_digit"
  | "missing_thai"
  | "emoji_tofu"
  | "replacement_char"
  | "invisible_text";

export interface GlyphIssue {
  type: GlyphIssueType;
  chars: string[];
  sample: string;
  selector: string;
  font: string;
}

export interface PageScanResult {
  path: string;
  label?: string;
  ok: boolean;
  error?: string;
  nodesScanned: number;
  issues: GlyphIssue[];
  durationMs: number;
}

const NOTDEF_PROBE = "\uFFFE"; // non-character: always renders as .notdef / tofu
const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}\u{2190}-\u{21FF}]/u;
const LATIN_RE = /[A-Za-z]/;
const DIGIT_RE = /[0-9]/;
const THAI_RE = /[\u0E00-\u0E7F]/;

type Ctx = CanvasRenderingContext2D;

function makeCtx(doc: Document): Ctx | null {
  const canvas = doc.createElement("canvas");
  return canvas.getContext("2d");
}

const widthCache = new Map<string, number>();

function widthOf(ctx: Ctx, font: string, text: string): number {
  const key = `${font}\u0000${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  widthCache.set(key, w);
  return w;
}

/** True when the font stack cannot render `char` (renders tofu or nothing). */
export function isGlyphMissing(ctx: Ctx, font: string, char: string): boolean {
  const w = widthOf(ctx, font, char);
  if (w === 0) return true;
  const notdef = widthOf(ctx, font, NOTDEF_PROBE);
  // .notdef box width match (within sub-pixel tolerance) => glyph unavailable
  return notdef > 0 && Math.abs(w - notdef) < 0.01;
}

function cssSelector(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  let depth = 0;
  while (node && depth < 4) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }
    const cls = (node.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2);
    if (cls.length) part += `.${cls.join(".")}`;
    parts.unshift(part);
    node = node.parentElement;
    depth++;
  }
  return parts.join(" > ");
}

function pushIssue(map: Map<string, GlyphIssue>, issue: GlyphIssue) {
  const key = `${issue.type}|${issue.selector}|${issue.chars.join("")}`;
  if (!map.has(key)) map.set(key, issue);
}

/** Scan a document (current page or a same-origin iframe) for glyph issues. */
export function scanDocument(doc: Document, maxNodes = 4000): { issues: GlyphIssue[]; nodesScanned: number } {
  const ctx = makeCtx(doc);
  const issues = new Map<string, GlyphIssue>();
  if (!ctx) return { issues: [], nodesScanned: 0 };

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue?.trim();
      if (!text) return NodeFilter.FILTER_REJECT;
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let nodesScanned = 0;
  let current: Node | null;
  while ((current = walker.nextNode()) && nodesScanned < maxNodes) {
    nodesScanned++;
    const el = (current as Text).parentElement!;
    const view = doc.defaultView;
    if (!view) break;
    const cs = view.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.fontSize === "0px") continue;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    const text = current.nodeValue || "";
    const sample = text.trim().slice(0, 80);
    const selector = cssSelector(el);

    if (text.includes("\uFFFD")) {
      pushIssue(issues, { type: "replacement_char", chars: ["\uFFFD"], sample, selector, font });
    }

    const missing: Record<GlyphIssueType, Set<string>> = {
      missing_latin: new Set(),
      missing_digit: new Set(),
      missing_thai: new Set(),
      emoji_tofu: new Set(),
      replacement_char: new Set(),
      invisible_text: new Set(),
    };

    for (const char of Array.from(text)) {
      if (!char.trim()) continue;
      if (char === "\uFFFD") continue;
      let bucket: GlyphIssueType | null = null;
      if (EMOJI_RE.test(char)) bucket = "emoji_tofu";
      else if (LATIN_RE.test(char)) bucket = "missing_latin";
      else if (DIGIT_RE.test(char)) bucket = "missing_digit";
      else if (THAI_RE.test(char)) bucket = "missing_thai";
      if (!bucket) continue;
      if (missing[bucket].size >= 6) continue;
      if (isGlyphMissing(ctx, font, char)) missing[bucket].add(char);
    }

    (Object.keys(missing) as GlyphIssueType[]).forEach((type) => {
      const chars = Array.from(missing[type]);
      if (chars.length) pushIssue(issues, { type, chars, sample, selector, font });
    });

    // Text present but painted with zero width (e.g. broken webfont swap)
    if (sample.length > 2) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && cs.position !== "fixed" && el.offsetParent !== null) {
        pushIssue(issues, { type: "invisible_text", chars: [], sample, selector, font });
      }
    }
  }

  return { issues: Array.from(issues.values()), nodesScanned };
}

/** Load a route in a hidden same-origin iframe and scan it. */
export function scanRoute(path: string, label?: string, timeoutMs = 15000): Promise<PageScanResult> {
  const started = performance.now();
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;left:-10000px;top:0;width:1280px;height:1400px;border:0;opacity:0;pointer-events:none;";
    let settled = false;

    const finish = (result: Omit<PageScanResult, "path" | "label" | "durationMs">) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      iframe.remove();
      resolve({ path, label, durationMs: Math.round(performance.now() - started), ...result });
    };

    const timer = window.setTimeout(
      () => finish({ ok: false, error: "timeout", nodesScanned: 0, issues: [] }),
      timeoutMs,
    );

    iframe.onload = () => {
      // give React + fonts a moment to settle
      window.setTimeout(async () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc || !doc.body) return finish({ ok: false, error: "no document", nodesScanned: 0, issues: [] });
          try {
            await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
          } catch {
            /* ignore */
          }
          const { issues, nodesScanned } = scanDocument(doc);
          finish({ ok: true, nodesScanned, issues });
        } catch (e) {
          finish({
            ok: false,
            error: e instanceof Error ? e.message : String(e),
            nodesScanned: 0,
            issues: [],
          });
        }
      }, 2200);
    };

    iframe.src = path;
    document.body.appendChild(iframe);
  });
}

export const ISSUE_LABELS_TH: Record<GlyphIssueType, string> = {
  missing_latin: "ตัวอักษรละตินหาย",
  missing_digit: "ตัวเลขหาย",
  missing_thai: "ตัวอักษรไทยหาย",
  emoji_tofu: "Emoji เป็นกล่อง (tofu)",
  replacement_char: "อักขระเสีย (�)",
  invisible_text: "ข้อความมองไม่เห็น",
};

export function resultsToCsv(results: PageScanResult[]): string {
  const rows: string[][] = [
    ["path", "label", "status", "issue_type", "issue_label", "chars", "selector", "sample", "font"],
  ];
  results.forEach((r) => {
    if (!r.issues.length) {
      rows.push([r.path, r.label || "", r.ok ? "ok" : `error: ${r.error || ""}`, "", "", "", "", "", ""]);
      return;
    }
    r.issues.forEach((i) => {
      rows.push([
        r.path,
        r.label || "",
        "issue",
        i.type,
        ISSUE_LABELS_TH[i.type],
        i.chars.join(" "),
        i.selector,
        i.sample,
        i.font,
      ]);
    });
  });
  return (
    "\uFEFF" +
    rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n")
  );
}
