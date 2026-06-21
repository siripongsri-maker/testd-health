/**
 * Thai National ID validation utilities.
 *
 * A valid Thai national ID is 13 digits. The 13th digit is a checksum:
 *   checksum = (11 - (sum_{i=1..12}(d_i * (14 - i)) mod 11)) mod 10
 *
 * These helpers are mirrored server-side by `public.is_valid_thai_id(text)`.
 */

/** Strip everything except digits. */
export function normalizeThaiId(input: string): string {
  return (input ?? "").replace(/\D/g, "");
}

/** Pretty format X-XXXX-XXXXX-XX-X (returns the raw digits when not 13 long). */
export function formatThaiId(input: string): string {
  const v = normalizeThaiId(input);
  if (v.length !== 13) return v;
  return `${v[0]}-${v.slice(1, 5)}-${v.slice(5, 10)}-${v.slice(10, 12)}-${v[12]}`;
}

/** Returns true when `input` (after stripping) is 13 digits and the checksum matches. */
export function isValidThaiId(input: string): boolean {
  const v = normalizeThaiId(input);
  if (v.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(v[i]!, 10) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(v[12]!, 10);
}
