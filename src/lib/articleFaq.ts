/*! © 2026 Siripong Srichau — ผู้สร้างสรรค์แต่เพียงผู้เดียว (Sole Creator). All rights reserved. */

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Pull Q&A pairs out of an article's "คำถามที่พบบ่อย" / "FAQ" section.
 * Each question is a `###` heading; the answer is the text until the next heading.
 */
export function extractFaq(markdown: string | null | undefined): FaqItem[] {
  if (!markdown) return [];
  const start = markdown.search(/^#{1,3}\s*(คำถามที่พบบ่อย|FAQ|Frequently asked questions)/im);
  if (start < 0) return [];
  const section = markdown.slice(start).split("\n").slice(1).join("\n");
  const items: FaqItem[] = [];
  const parts = section.split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const [firstLine, ...rest] = part.split("\n");
    // Stop at the next H1/H2 — the FAQ section has ended.
    const body = rest.join("\n").split(/^#{1,2}\s/m)[0];
    const question = firstLine.trim();
    const answer = body
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (question && answer) items.push({ question, answer });
    if (/^#{1,2}\s/m.test(rest.join("\n"))) break;
  }
  return items;
}
