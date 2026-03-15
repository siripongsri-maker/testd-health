/**
 * Browser Security Hardening for sensitive admin pages.
 * - Clipboard/copy protection for PII fields
 * - Print watermarking
 * - Right-click prevention on sensitive areas
 * - Dev tools detection (best-effort)
 */

let printStyleInjected = false;

/** Inject a print watermark overlay via CSS */
export function injectPrintWatermark(actorEmail?: string) {
  if (printStyleInjected) return;
  printStyleInjected = true;

  const label = actorEmail
    ? `CONFIDENTIAL • ${actorEmail} • ${new Date().toISOString().slice(0, 10)}`
    : `CONFIDENTIAL • ${new Date().toISOString().slice(0, 10)}`;

  const style = document.createElement('style');
  style.id = 'pdpa-print-watermark';
  style.textContent = `
    @media print {
      body::after {
        content: '${label.replace(/'/g, "\\'")}';
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 4rem;
        color: rgba(0, 0, 0, 0.06);
        white-space: nowrap;
        pointer-events: none;
        z-index: 99999;
      }
    }
  `;
  document.head.appendChild(style);
}

/** Remove print watermark */
export function removePrintWatermark() {
  const el = document.getElementById('pdpa-print-watermark');
  if (el) el.remove();
  printStyleInjected = false;
}

/** Prevent copy on an element (use as onCopy handler) */
export function blockCopy(e: ClipboardEvent) {
  e.preventDefault();
  e.clipboardData?.setData('text/plain', '[Protected content — copying is not allowed]');
}

/** Prevent right-click context menu on an element */
export function blockContextMenu(e: MouseEvent) {
  e.preventDefault();
}

/** Add CSS to prevent text selection on sensitive elements */
export function preventSelection(element: HTMLElement) {
  element.style.userSelect = 'none';
  element.style.webkitUserSelect = 'none';
}

/**
 * Dev tools detection (best-effort, non-blocking).
 * Calls the callback if dev tools are likely open.
 * Returns a cleanup function.
 */
export function detectDevTools(onDetected: () => void): () => void {
  let detected = false;

  const check = () => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;

    if (widthDiff > threshold || heightDiff > threshold) {
      if (!detected) {
        detected = true;
        onDetected();
      }
    } else {
      detected = false;
    }
  };

  const interval = setInterval(check, 2000);
  return () => clearInterval(interval);
}

/** Log a print attempt via the PDPA audit system */
export function onPrintAttempt(logFn: (entry: any) => void) {
  const handler = () => {
    logFn({
      action_type: 'print_action',
      target_type: 'admin_page',
      target_classification: 'sensitive',
      result: 'allowed',
      metadata: { url: window.location.pathname },
    });
  };

  window.addEventListener('beforeprint', handler);
  return () => window.removeEventListener('beforeprint', handler);
}
