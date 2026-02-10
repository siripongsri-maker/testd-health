/**
 * Normalizes raw gender-identity and sexual-orientation values into
 * clean display categories.  Used ONLY at the display/aggregation level —
 * never modifies DB data.
 */

// ─── Gender Identity ────────────────────────────────────────────────

export type GenderIdentityKey =
  | "ชาย"
  | "หญิง"
  | "หญิงข้ามเพศ / สาวสอง"
  | "ชายข้ามเพศ"
  | "นอนไบนารี / Non-binary"
  | "อื่น ๆ"
  | "ไม่ระบุ";

const GENDER_IDENTITY_MAP: Array<{ match: Set<string>; key: GenderIdentityKey }> = [
  { match: new Set(["male", "m", "man", "ชาย", "ผู้ชาย"]), key: "ชาย" },
  { match: new Set(["female", "f", "woman", "หญิง", "ผู้หญิง"]), key: "หญิง" },
  {
    match: new Set([
      "transgender_female", "trans woman", "transwoman", "trans female",
      "หญิงข้ามเพศ", "สาวสอง", "กะเทย",
    ]),
    key: "หญิงข้ามเพศ / สาวสอง",
  },
  {
    match: new Set([
      "transgender_male", "trans man", "transman", "trans male",
      "ชายข้ามเพศ",
    ]),
    key: "ชายข้ามเพศ",
  },
  {
    match: new Set([
      "non_binary", "nonbinary", "non-binary", "นอนไบนารี",
      "ไม่ระบุเพศ / นอนไบนารี",
    ]),
    key: "นอนไบนารี / Non-binary",
  },
];

const UNSPECIFIED_GENDER: Set<string> = new Set([
  "ไม่ระบุ", "ไม่ประสงค์ระบุ", "ไม่ต้องการระบุ",
  "prefer_not_to_say", "prefer not to say",
  "na", "n/a", "unknown", "unspecified", "",
]);

export function normalizeGenderIdentity(
  value: string | null | undefined,
): GenderIdentityKey {
  if (!value || value.trim() === "") return "ไม่ระบุ";
  const cleaned = value.trim().replace(/\s+/g, " ").toLowerCase();

  if (UNSPECIFIED_GENDER.has(cleaned)) return "ไม่ระบุ";
  for (const entry of GENDER_IDENTITY_MAP) {
    if (entry.match.has(cleaned)) return entry.key;
  }
  return "อื่น ๆ";
}

/** Re-groups an array of {gender, count} rows into identity buckets */
export function aggregateIdentityStats(
  rows: Array<{ gender: string; count: number }>,
): Array<{ key: GenderIdentityKey; count: number }> {
  const map = new Map<GenderIdentityKey, number>();

  for (const row of rows) {
    const k = normalizeGenderIdentity(row.gender);
    map.set(k, (map.get(k) || 0) + row.count);
  }

  // fixed display order
  const order: GenderIdentityKey[] = [
    "ชาย",
    "หญิง",
    "หญิงข้ามเพศ / สาวสอง",
    "ชายข้ามเพศ",
    "นอนไบนารี / Non-binary",
    "อื่น ๆ",
    "ไม่ระบุ",
  ];

  return order
    .filter((k) => map.has(k))
    .map((k) => ({ key: k, count: map.get(k)! }));
}

// ─── Sexual Orientation ─────────────────────────────────────────────

export type OrientationKey =
  | "เกย์ / Gay"
  | "ไบ / Bisexual"
  | "เลสเบี้ยน / Lesbian"
  | "สเตรท / Heterosexual"
  | "เควียร์ / Queer"
  | "อื่น ๆ"
  | "ไม่ระบุ";

const ORIENTATION_MAP: Array<{ match: Set<string>; key: OrientationKey }> = [
  {
    match: new Set(["gay", "เกย์", "ชายรักชาย", "homosexual"]),
    key: "เกย์ / Gay",
  },
  {
    match: new Set(["bisexual", "bi", "ไบ", "สองเพศ", "ไบเซ็กชวล"]),
    key: "ไบ / Bisexual",
  },
  {
    match: new Set(["lesbian", "เลสเบี้ยน", "หญิงรักหญิง"]),
    key: "เลสเบี้ยน / Lesbian",
  },
  {
    match: new Set(["heterosexual", "straight", "สเตรท", "ตรง", "รักต่างเพศ"]),
    key: "สเตรท / Heterosexual",
  },
  {
    match: new Set(["queer", "เควียร์"]),
    key: "เควียร์ / Queer",
  },
];

const UNSPECIFIED_ORIENTATION: Set<string> = new Set([
  "ไม่ระบุ", "ไม่ประสงค์ระบุ", "ไม่ต้องการระบุ",
  "prefer_not_to_say", "prefer not to say",
  "na", "n/a", "unknown", "unspecified", "",
]);

export function normalizeOrientation(
  value: string | null | undefined,
): OrientationKey {
  if (!value || value.trim() === "") return "ไม่ระบุ";
  const cleaned = value.trim().replace(/\s+/g, " ").toLowerCase();

  if (UNSPECIFIED_ORIENTATION.has(cleaned)) return "ไม่ระบุ";
  for (const entry of ORIENTATION_MAP) {
    if (entry.match.has(cleaned)) return entry.key;
  }
  return "อื่น ๆ";
}

export function aggregateOrientationStats(
  rows: Array<{ orientation: string; count: number }>,
): Array<{ key: OrientationKey; count: number }> {
  const map = new Map<OrientationKey, number>();

  for (const row of rows) {
    const k = normalizeOrientation(row.orientation);
    map.set(k, (map.get(k) || 0) + row.count);
  }

  const order: OrientationKey[] = [
    "เกย์ / Gay",
    "ไบ / Bisexual",
    "เลสเบี้ยน / Lesbian",
    "สเตรท / Heterosexual",
    "เควียร์ / Queer",
    "อื่น ๆ",
    "ไม่ระบุ",
  ];

  return order
    .filter((k) => map.has(k))
    .map((k) => ({ key: k, count: map.get(k)! }));
}

// ─── Bilingual labels ───────────────────────────────────────────────

export const IDENTITY_LABELS: Record<GenderIdentityKey, { th: string; en: string }> = {
  "ชาย": { th: "ชาย", en: "Male" },
  "หญิง": { th: "หญิง", en: "Female" },
  "หญิงข้ามเพศ / สาวสอง": { th: "หญิงข้ามเพศ / สาวสอง", en: "Trans Woman" },
  "ชายข้ามเพศ": { th: "ชายข้ามเพศ", en: "Trans Man" },
  "นอนไบนารี / Non-binary": { th: "นอนไบนารี", en: "Non-binary" },
  "อื่น ๆ": { th: "อื่น ๆ", en: "Other" },
  "ไม่ระบุ": { th: "ไม่ระบุ", en: "Not specified" },
};

export const IDENTITY_COLORS: Record<GenderIdentityKey, string> = {
  "ชาย": "hsl(221, 83%, 53%)",
  "หญิง": "hsl(330, 81%, 60%)",
  "หญิงข้ามเพศ / สาวสอง": "hsl(280, 70%, 60%)",
  "ชายข้ามเพศ": "hsl(173, 80%, 40%)",
  "นอนไบนารี / Non-binary": "hsl(45, 93%, 47%)",
  "อื่น ๆ": "hsl(24, 95%, 53%)",
  "ไม่ระบุ": "hsl(220, 9%, 46%)",
};

export const ORIENTATION_LABELS: Record<OrientationKey, { th: string; en: string }> = {
  "เกย์ / Gay": { th: "เกย์", en: "Gay" },
  "ไบ / Bisexual": { th: "ไบเซ็กชวล", en: "Bisexual" },
  "เลสเบี้ยน / Lesbian": { th: "เลสเบี้ยน", en: "Lesbian" },
  "สเตรท / Heterosexual": { th: "สเตรท", en: "Heterosexual" },
  "เควียร์ / Queer": { th: "เควียร์", en: "Queer" },
  "อื่น ๆ": { th: "อื่น ๆ", en: "Other" },
  "ไม่ระบุ": { th: "ไม่ระบุ", en: "Not specified" },
};

export const ORIENTATION_COLORS: Record<OrientationKey, string> = {
  "เกย์ / Gay": "hsl(221, 83%, 53%)",
  "ไบ / Bisexual": "hsl(280, 70%, 60%)",
  "เลสเบี้ยน / Lesbian": "hsl(330, 81%, 60%)",
  "สเตรท / Heterosexual": "hsl(142, 71%, 45%)",
  "เควียร์ / Queer": "hsl(45, 93%, 47%)",
  "อื่น ๆ": "hsl(24, 95%, 53%)",
  "ไม่ระบุ": "hsl(220, 9%, 46%)",
};
