/**
 * Deterministic safe display name for leaderboard privacy.
 * Detects real-name patterns and replaces them with "Anonymous #XXXX".
 */

/**
 * Simple hash of a string to produce a deterministic 4-digit suffix.
 */
function hashToFourDigits(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit int
  }
  const positive = Math.abs(hash);
  return String(positive % 10000).padStart(4, '0');
}

/**
 * Detect if a display name looks like a real name (unsafe for public display).
 * 
 * Criteria:
 * - Contains 2+ capitalized words (e.g. "John Smith")
 * - Contains spaces AND each word starts with uppercase
 * - Looks like Thai full name (multiple Thai word segments with spaces)
 */
function looksLikeRealName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;

  // Check for multiple words with spaces
  const words = trimmed.split(/\s+/);
  if (words.length < 2) return false;

  // Check if it looks like a Latin full name (2+ capitalized words)
  const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));
  if (capitalizedWords.length >= 2) return true;

  // Check if words are all Thai characters with spaces (Thai full name pattern)
  const thaiWords = words.filter(w => /^[\u0E00-\u0E7F]+$/.test(w));
  if (thaiWords.length >= 2) return true;

  // Check mixed: "Firstname นามสกุล" or similar
  if (words.length >= 2) {
    const hasLatin = words.some(w => /^[A-Z][a-z]+$/.test(w));
    const hasThai = words.some(w => /^[\u0E00-\u0E7F]+$/.test(w));
    if (hasLatin && hasThai) return true;
  }

  return false;
}

/**
 * Returns a safe display name for leaderboard use.
 * If the name looks like a real name, returns "Anonymous #XXXX" (deterministic).
 * Otherwise returns the name as-is.
 * 
 * @param displayName - The user's display name from the database
 * @param userId - The user's ID (used for deterministic hash)
 * @param fallbackLabel - Fallback label if name is null/empty (e.g. "User" or "ผู้ใช้")
 */
export function getSafeDisplayName(
  displayName: string | null | undefined,
  userId: string,
  fallbackLabel: string = 'User'
): string {
  if (!displayName || !displayName.trim()) {
    return `Anonymous #${hashToFourDigits(userId)}`;
  }

  if (looksLikeRealName(displayName)) {
    return `Anonymous #${hashToFourDigits(userId)}`;
  }

  return displayName;
}
