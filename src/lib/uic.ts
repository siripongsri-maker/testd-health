/**
 * UIC (Unique Identification Code) generator + validator.
 *
 * Pattern: XXDDMMYY (8 chars)
 *  - XX = first letter of first name + first letter of last name
 *  - DDMMYY = day, month, 2-digit year of birth
 *
 * Thai person:   Thai letters + Buddhist year (พ.ศ.), e.g. ศศ310835 (born 31/08/พ.ศ. 2535)
 * Foreigner:     English letters (uppercase) + Gregorian year, e.g. JS140895 (born 14/08/1995)
 *
 * IMPORTANT: The year is taken AS-TYPED for the chosen mode — no conversion is applied.
 * Thai mode expects พ.ศ. year input; Foreign mode expects ค.ศ. year input.
 */

export type UicNationality = 'thai' | 'foreign';

export interface UicInput {
  firstName: string;
  lastName: string;
  /** Birth day 1-31 */
  day: number | null;
  /** Birth month 1-12 */
  month: number | null;
  /** Birth year — พ.ศ. for Thai mode, ค.ศ. for Foreign mode (NO conversion applied) */
  year: number | null;
  nationality: UicNationality;
}

export interface UicResult {
  uic: string | null;
  reason?: 'incomplete' | 'invalid_name' | 'invalid_dob' | 'invalid_year_for_mode';
}

const THAI_CHAR_RE = /[\u0E00-\u0E7F]/;

/** First non-whitespace character of a name. */
const firstLetter = (raw: string): string | null => {
  const s = (raw || '').trim();
  if (!s) return null;
  const firstWord = s.split(/\s+/)[0] || '';
  const ch = Array.from(firstWord)[0];
  return ch || null;
};

/** Heuristic: detect nationality from name characters. Used as a default — user can override. */
export const detectNationality = (firstName: string, lastName: string): UicNationality => {
  const hasThai = THAI_CHAR_RE.test(firstName || '') || THAI_CHAR_RE.test(lastName || '');
  return hasThai ? 'thai' : 'foreign';
};

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Sensible plausible year ranges for each mode.
 * - Thai (พ.ศ.): 2400 .. current+543
 * - Foreign (ค.ศ.): 1900 .. current
 */
export const isYearPlausibleForMode = (year: number, nationality: UicNationality): boolean => {
  if (!Number.isFinite(year)) return false;
  const nowCe = new Date().getFullYear();
  if (nationality === 'thai') {
    return year >= 2400 && year <= nowCe + 543;
  }
  return year >= 1900 && year <= nowCe;
};

export const generateUic = ({ firstName, lastName, day, month, year, nationality }: UicInput): UicResult => {
  const fn = firstLetter(firstName);
  const ln = firstLetter(lastName);
  if (!fn || !ln) return { uic: null, reason: 'incomplete' };
  if (!day || !month || !year) return { uic: null, reason: 'incomplete' };

  if (!isYearPlausibleForMode(year, nationality)) {
    return { uic: null, reason: 'invalid_year_for_mode' };
  }

  // Convert Thai BE year to CE for date validity check
  const yearCe = nationality === 'thai' ? year - 543 : year;
  const d = new Date(Date.UTC(yearCe, month - 1, day));
  if (
    d.getUTCFullYear() !== yearCe ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return { uic: null, reason: 'invalid_dob' };
  }

  // Year part is taken AS-TYPED — last 2 digits, no further conversion.
  const yy = pad2(year % 100);

  // Letters
  let initials: string;
  if (nationality === 'foreign') {
    if (!/^[A-Za-z]$/.test(fn) || !/^[A-Za-z]$/.test(ln)) {
      return { uic: null, reason: 'invalid_name' };
    }
    initials = `${fn.toUpperCase()}${ln.toUpperCase()}`;
  } else {
    // Thai mode — require Thai characters
    if (!THAI_CHAR_RE.test(fn) || !THAI_CHAR_RE.test(ln)) {
      return { uic: null, reason: 'invalid_name' };
    }
    initials = `${fn}${ln}`;
  }

  const uic = `${initials}${pad2(day)}${pad2(month)}${yy}`;
  return { uic };
};

/** Validate UIC final string format. */
export const isValidUic = (uic: string): boolean => {
  const s = (uic || '').trim();
  if (!s) return false;
  if (/^[A-Z]{2}\d{6}$/.test(s)) return isUicDateValid(s);
  if (/^[\u0E00-\u0E7F]{2}\d{6}$/.test(s)) return isUicDateValid(s);
  return false;
};

const isUicDateValid = (s: string): boolean => {
  const tail = s.slice(-6);
  const day = parseInt(tail.slice(0, 2), 10);
  const month = parseInt(tail.slice(2, 4), 10);
  if (day < 1 || day > 31) return false;
  if (month < 1 || month > 12) return false;
  return true;
};

export const normalizeUic = (raw: string): string => {
  const s = (raw || '').trim().replace(/\s+/g, '');
  return s.replace(/[a-zA-Z]/g, c => c.toUpperCase());
};

/** For admin display — masks the digits portion. */
export const maskUic = (uic: string | null | undefined): string => {
  if (!uic) return '—';
  if (uic.length < 4) return uic;
  return `${uic.slice(0, 2)}****${uic.slice(-2)}`;
};
