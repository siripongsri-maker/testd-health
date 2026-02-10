/**
 * Normalizes raw gender values into 3 display categories.
 * Used ONLY at the display/aggregation level — never modifies DB data.
 */

const MALE_VALUES = new Set(["ชาย", "male", "m", "man", "ผู้ชาย"]);
const FEMALE_VALUES = new Set(["หญิง", "female", "f", "woman", "ผู้หญิง"]);
const UNSPECIFIED_VALUES = new Set([
  "ไม่ระบุ", "ไม่ประสงค์ระบุ", "ไม่ต้องการระบุ",
  "na", "n/a", "unknown", "unspecified", "prefer not to say",
  "prefer_not_to_say",
]);

export type NormalizedGender = "ชาย" | "หญิง" | "ไม่ระบุ";

export function normalizeGender(value: string | null | undefined): NormalizedGender {
  if (!value || value.trim() === "") return "ไม่ระบุ";

  const cleaned = value.trim().replace(/\s+/g, " ").toLowerCase();

  if (MALE_VALUES.has(cleaned)) return "ชาย";
  if (FEMALE_VALUES.has(cleaned)) return "หญิง";
  if (UNSPECIFIED_VALUES.has(cleaned)) return "ไม่ระบุ";

  return "ไม่ระบุ";
}

/** Re-groups an array of {gender, count} rows into normalized buckets */
export function aggregateGenderStats(
  rows: Array<{ gender: string; count: number }>
): Array<{ gender: NormalizedGender; count: number }> {
  const map = new Map<NormalizedGender, number>();

  for (const row of rows) {
    const key = normalizeGender(row.gender);
    map.set(key, (map.get(key) || 0) + row.count);
  }

  // Fixed order: male, female, unspecified
  const order: NormalizedGender[] = ["ชาย", "หญิง", "ไม่ระบุ"];
  return order
    .filter((g) => map.has(g))
    .map((g) => ({ gender: g, count: map.get(g)! }));
}
