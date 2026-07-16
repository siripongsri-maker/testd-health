// DOM-level translator for CLVM languages (km, lo, vi, my).
//
// Most of the codebase renders Thai/English strings inline (e.g.
// `isEn ? 'English' : 'ไทย'`) rather than routing through the i18n `t()`
// helper. That means switching to km/lo/vi/my via the language toggle only
// translates the small subset of keys wired to `t()` — everything else stays
// in Thai. This module fills the gap: when a CLVM language is active it
// walks the DOM, batches unique visible text into `translate-ui`, and swaps
// the text nodes in place (plus a few common attributes). It stops and
// restores originals when the language returns to th/en.
//
// Performance notes (why switching feels fast):
//   • Fires the first batch immediately on activation (no debounce).
//   • Sends up to MAX_PARALLEL batches concurrently.
//   • Indexes every seen text-node / attribute by its source ("core") string
//     so returned translations are applied by direct lookup, never by
//     re-walking the DOM.

import { supabase } from "@/integrations/supabase/client";

type CLVM = "km" | "lo" | "vi" | "my" | "ar" | "he" | "ur" | "fa";
const CLVM_SET = new Set<CLVM>(["km", "lo", "vi", "my", "ar", "he", "ur", "fa"]);
const CACHE_KEY = "testd-dom-translations";

type Cache = Partial<Record<CLVM, Record<string, string>>>;

let cache: Cache = load();
let currentLang: CLVM | null = null;
let observer: MutationObserver | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const pending = new Set<string>();
const inFlight = new Set<string>();
let activeRequests = 0;

const BATCH_SIZE = 80;
const MAX_PARALLEL = 4;
const DEBOUNCE_MS = 80;

// Preserve source strings so we can restore or re-translate.
const nodeOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();
// Reverse index: source-string → Set of nodes/attrs using it. Enables O(1)
// application of new translations without re-walking the DOM.
const nodesByCore = new Map<string, Set<Text>>();
type AttrRef = { el: Element; attr: string };
const attrsByCore = new Map<string, Set<AttrRef>>();
// Prevent our own mutations from being reprocessed forever.
const nodeSuppress = new WeakSet<Text>();

const IGNORE_TAGS = new Set([
  "SCRIPT", "STYLE", "CODE", "PRE", "NOSCRIPT", "SVG", "PATH",
  "MATH", "CANVAS", "TEXTAREA",
]);
const TRANSLATABLE_ATTRS = ["placeholder", "aria-label", "title", "alt"];

function load(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — ignore.
  }
}

function isTranslatable(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 2) return false;
  if (/^[\s\d\p{P}\p{S}]+$/u.test(t)) return false;
  return true;
}

function shouldSkipElement(el: Element | null): boolean {
  if (!el) return true;
  if (IGNORE_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  if (el.closest("[data-no-translate]")) return true;
  return false;
}

function indexNode(core: string, node: Text) {
  let set = nodesByCore.get(core);
  if (!set) { set = new Set(); nodesByCore.set(core, set); }
  set.add(node);
}
function indexAttr(core: string, ref: AttrRef) {
  let set = attrsByCore.get(core);
  if (!set) { set = new Set(); attrsByCore.set(core, set); }
  set.add(ref);
}

function scheduleFlush(immediate = false) {
  if (!currentLang) return;
  if (immediate) {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    void flush();
    return;
  }
  if (flushTimer) return;
  flushTimer = setTimeout(flush, DEBOUNCE_MS);
}

async function flush() {
  flushTimer = null;
  const lang = currentLang;
  if (!lang || pending.size === 0) return;

  // Fill parallelism budget with as many batches as we can.
  while (activeRequests < MAX_PARALLEL && pending.size > 0) {
    const batch: string[] = [];
    for (const text of pending) {
      if (inFlight.has(text)) continue;
      batch.push(text);
      if (batch.length >= BATCH_SIZE) break;
    }
    if (batch.length === 0) break;
    batch.forEach((t) => { pending.delete(t); inFlight.add(t); });
    activeRequests++;
    void sendBatch(lang, batch);
  }
}

async function sendBatch(lang: CLVM, batch: string[]) {
  const items = batch.map((text) => ({
    key: text,
    source_text: text,
    source_lang: /^[\x00-\x7F]+$/.test(text) ? "en" : "th",
  }));

  try {
    const { data, error } = await supabase.functions.invoke("translate-ui", {
      body: { target_lang: lang, items },
    });
    if (!error && data?.translations && currentLang === lang) {
      const bucket = (cache[lang] ||= {});
      Object.assign(bucket, data.translations);
      persist();
      // Apply targeted updates — no DOM re-walk.
      for (const key of Object.keys(data.translations)) {
        applyTranslationForCore(key);
      }
    }
  } catch {
    // Silent — will retry on next mutation.
  } finally {
    batch.forEach((t) => inFlight.delete(t));
    activeRequests--;
    if (pending.size > 0) scheduleFlush(true);
  }
}

function applyTranslationForCore(core: string) {
  if (!currentLang) return;
  const translated = cache[currentLang]?.[core];
  if (!translated) return;

  const nodes = nodesByCore.get(core);
  if (nodes) {
    nodes.forEach((node) => {
      if (!node.isConnected) { nodes.delete(node); return; }
      const raw = nodeOriginals.get(node) ?? node.nodeValue ?? "";
      const lead = (raw.match(/^\s*/) || [""])[0];
      const tail = (raw.match(/\s*$/) || [""])[0];
      const next = lead + translated + tail;
      if (node.nodeValue !== next) {
        nodeSuppress.add(node);
        node.nodeValue = next;
        queueMicrotask(() => nodeSuppress.delete(node));
      }
    });
  }

  const attrs = attrsByCore.get(core);
  if (attrs) {
    attrs.forEach((ref) => {
      if (!ref.el.isConnected) { attrs.delete(ref); return; }
      if (ref.el.getAttribute(ref.attr) !== translated) {
        ref.el.setAttribute(ref.attr, translated);
      }
    });
  }
}

function translateTextNode(node: Text) {
  if (!currentLang) return;
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const stored = nodeOriginals.get(node);
  const raw = stored ?? node.nodeValue ?? "";
  if (!isTranslatable(raw)) return;
  if (!stored) nodeOriginals.set(node, raw);

  const lead = (raw.match(/^\s*/) || [""])[0];
  const tail = (raw.match(/\s*$/) || [""])[0];
  const core = raw.slice(lead.length, raw.length - tail.length);
  indexNode(core, node);

  const translated = cache[currentLang]?.[core];
  if (translated) {
    const next = lead + translated + tail;
    if (node.nodeValue !== next) {
      nodeSuppress.add(node);
      node.nodeValue = next;
      queueMicrotask(() => nodeSuppress.delete(node));
    }
  } else {
    pending.add(core);
  }
}

function translateAttributes(el: Element) {
  if (!currentLang || shouldSkipElement(el)) return;
  for (const attr of TRANSLATABLE_ATTRS) {
    const raw = el.getAttribute(attr);
    if (!raw || !isTranslatable(raw)) continue;
    let map = attrOriginals.get(el);
    if (!map) { map = new Map(); attrOriginals.set(el, map); }
    const source = map.get(attr) ?? raw;
    if (!map.has(attr)) map.set(attr, source);
    const core = source.trim();
    indexAttr(core, { el, attr });
    const translated = cache[currentLang]?.[core];
    if (translated) {
      if (el.getAttribute(attr) !== translated) el.setAttribute(attr, translated);
    } else {
      pending.add(core);
    }
  }
}

function walkAndTranslate(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (shouldSkipElement(el)) return;
  translateAttributes(el);

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        return shouldSkipElement(n as Element)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP;
      }
      const parent = (n as Text).parentElement;
      if (shouldSkipElement(parent)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
  }
  el.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach((child) => {
    translateAttributes(child);
  });
}

function retranslateAll() {
  if (!document.body) return;
  walkAndTranslate(document.body);
}

function restoreAll() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const orig = nodeOriginals.get(node as Text);
    if (orig !== undefined && (node as Text).nodeValue !== orig) {
      (node as Text).nodeValue = orig;
    }
  }
  document.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title],[alt]").forEach((el) => {
    const map = attrOriginals.get(el);
    if (!map) return;
    map.forEach((val, attr) => {
      if (el.getAttribute(attr) !== val) el.setAttribute(attr, val);
    });
  });
}

function handleMutations(muts: MutationRecord[]) {
  if (!currentLang) return;
  for (const m of muts) {
    if (m.type === "characterData") {
      const t = m.target as Text;
      if (nodeSuppress.has(t)) continue;
      nodeOriginals.delete(t);
      translateTextNode(t);
    } else if (m.type === "childList") {
      m.addedNodes.forEach((n) => walkAndTranslate(n));
    } else if (m.type === "attributes" && m.target.nodeType === Node.ELEMENT_NODE) {
      const el = m.target as Element;
      const map = attrOriginals.get(el);
      if (map && m.attributeName) map.delete(m.attributeName);
      translateAttributes(el);
    }
  }
  if (pending.size > 0) scheduleFlush();
}

export function setDomTranslatorLanguage(lang: string) {
  const target = CLVM_SET.has(lang as CLVM) ? (lang as CLVM) : null;

  if (target === currentLang) return;

  if (!target) {
    if (observer) { observer.disconnect(); observer = null; }
    currentLang = null;
    pending.clear();
    inFlight.clear();
    nodesByCore.clear();
    attrsByCore.clear();
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (document.body) restoreAll();
    return;
  }

  currentLang = target;
  // Reset the reverse index so the new language builds its own mapping.
  nodesByCore.clear();
  attrsByCore.clear();
  if (document.body) retranslateAll();
  // Kick the first batch immediately for a snappier switch.
  if (pending.size > 0) scheduleFlush(true);
  if (!observer) {
    observer = new MutationObserver(handleMutations);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRS,
    });
  }
}
