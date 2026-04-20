/**
 * UIC (Unique Identification Code) generator + validator.
 *
 * Pattern: XXDDMMYY (8 chars)
 *  - XX = first letter of first name + first letter of last name
 *  - DDMMYY = day, month, 2-digit year of birth
 *
 * Thai person:   Thai letters + Buddhist year (พ.ศ. = ค.ศ. + 543), e.g. สจ140838
 * Foreigner:     English letters (uppercase) + Gregorian year, e.g. JS140895
 *
 * Detection: if either first/last name contains a Thai character → treat as Thai.
 */

export type UicNationality = 'thai' | 'foreign';

export interface UicInput {
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD (Gregorian / ค.ศ.) */
  dob: string;
}

export interface UicResult {
  uic: string | null;
  nationality: UicNationality;
  /** Reason why UIC could not be generated, if uic === null */
  reason?: 'incomplete' | 'invalid_name' | 'invalid_dob';
}

const THAI_CHAR_RE = /[\u0E00-\u0E7F]/;

/** First non-whitespace character of a name; for Thai, skips leading vowels/marks if any. */
const firstLetter = (raw: string): string | null => {
  const s = (raw || '').trim();
  if (!s) return null;
  // Take the first word
  const firstWord = s.split(/\s+/)[0] || '';
  // Skip combining/leading-vowel marks for Thai (เ แ โ ใ ไ are leading vowels but commonly kept; keep first char as-is)
  const ch = Array.from(firstWord)[0];
  return ch || null;
};

export const detectNationality = (firstName: string, lastName: string): UicNationality => {
  const hasThai = THAI_CHAR_RE.test(firstName || '') || THAI_CHAR_RE.test(lastName || '');
  return hasThai ? 'thai' : 'foreign';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

export const generateUic = ({ firstName, lastName, dob }: UicInput): UicResult => {
  const nationality = detectNationality(firstName, lastName);

  const fn = firstLetter(firstName);
  const ln = firstLetter(lastName);
  if (!fn || !ln) return { uic: null, nationality, reason: 'incomplete' };

  if (!dob) return { uic: null, nationality, reason: 'incomplete' };

  // dob expected as YYYY-MM-DD (Gregorian)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob.trim());
  if (!m) return { uic: null, nationality, reason: 'invalid_dob' };
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);

  // Validate real calendar date
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return { uic: null, nationality, reason: 'invalid_dob' };
  }

  // Year part: Thai = พ.ศ. (year + 543), Foreign = ค.ศ. — both take last 2 digits
  const yearForUic = nationality === 'thai' ? year + 543 : year;
  const yy = pad2(yearForUic % 100);

  // Letters
  let initials: string;
  if (nationality === 'foreign') {
    // Force Latin uppercase. If non-letter, fail.
    if (!/^[A-Za-z]$/.test(fn) || !/^[A-Za-z]$/.test(ln)) {
      return { uic: null, nationality, reason: 'invalid_name' };
    }
    initials = `${fn.toUpperCase()}${ln.toUpperCase()}`;
  } else {
    // Thai — keep characters as-is (already a single grapheme each)
    initials = `${fn}${ln}`;
  }

  const uic = `${initials}${pad2(day)}${pad2(month)}${yy}`;
  return { uic, nationality };
};

/** Validate UIC final string format. */
export const isValidUic = (uic: string): boolean => {
  const s = (uic || '').trim();
  if (!s) return false;
  // Foreign: 2 Latin uppercase + 6 digits
  if (/^[A-Z]{2}\d{6}$/.test(s)) return isUicDateValid(s);
  // Thai: 2 Thai chars + 6 digits
  if (/^[\u0E00-\u0E7F]{2}\d{6}$/.test(s)) return isUicDateValid(s);
  return false;
};

const isUicDateValid = (s: string): boolean => {
  // Last 6 chars: DDMMYY
  const tail = s.slice(-6);
  const day = parseInt(tail.slice(0, 2), 10);
  const month = parseInt(tail.slice(2, 4), 10);
  // Year (last 2 digits) — we accept any 00-99 since we don't know century certainly here
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  return true;
};

export const normalizeUic = (raw: string): string => {
  const s = (raw || '').trim().replace(/\s+/g, '');
  // Uppercase Latin letters only (preserve Thai)
  return s.replace(/[a-zA-Z]/g, c => c.toUpperCase());
};

/** For admin display — masks the digits portion. */
export const maskUic = (uic: string | null | undefined): string => {
  if (!uic) return '—';
  if (uic.length < 4) return uic;
  return `${uic.slice(0, 2)}****${uic.slice(-2)}`;
};
