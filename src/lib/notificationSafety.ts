/**
 * Notification Safety Layer
 * Scrubs PII from toast messages, push payloads, and display strings.
 */

/** Patterns that match common PII */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Thai National ID: 13 digits
  { pattern: /\b\d{1}-?\d{4}-?\d{5}-?\d{2}-?\d{1}\b/g, replacement: '***-****-*****' },
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '***@***' },
  // Thai phone numbers: 0xx-xxx-xxxx or 0xxxxxxxxx
  { pattern: /\b0[2-9]\d[\s-]?\d{3}[\s-]?\d{4}\b/g, replacement: '0**-***-****' },
  // International phone: +66xxxxxxxxx
  { pattern: /\+\d{2,3}[\s-]?\d{1,3}[\s-]?\d{3,4}[\s-]?\d{4}/g, replacement: '+**-***-****' },
  // Full names in Thai (basic: 2+ Thai character words separated by space)
  // Skipped — too broad and risks false positives
];

/** Scrub PII from a string */
export function scrubPii(text: string): string {
  if (!text) return text;
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Safe display name — show first char + masked rest */
export function safeDisplayName(name: string | null | undefined, maxReveal = 1): string {
  if (!name || name.length === 0) return '***';
  if (name.length <= maxReveal) return name[0] + '***';
  return name.slice(0, maxReveal) + '***';
}

/** Mask an email for notification display */
export function safeEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? local[0] + '***' : '***';
  return `${maskedLocal}@${domain}`;
}

/** Mask a phone for notification display */
export function safePhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 4) return '***';
  return phone.slice(0, 3) + '-***-' + phone.slice(-2);
}

/** Build a safe notification body from a template and data */
export function safeNotificationBody(
  template: string,
  data: Record<string, string | null | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    const safeValue = scrubPii(value || '');
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), safeValue);
  }
  return scrubPii(result);
}

/**
 * Wrapper around sonner toast that auto-scrubs PII.
 * Import and use instead of raw toast() in sensitive contexts.
 */
export function safePiiToast(
  toastFn: (message: string, options?: any) => void,
  message: string,
  options?: any
) {
  toastFn(scrubPii(message), options);
}
