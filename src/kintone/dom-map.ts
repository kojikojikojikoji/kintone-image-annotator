/**
 * All selector- or kintone-DOM-dependent access lives here so a kintone UI
 * change has a single repair point (common spec 4).
 */

/** Field element via the official getter. Returns null when the field is gone. */
export function getFieldElement(fieldCode: string): HTMLElement | null {
  try {
    return kintone.app.record.getFieldElement(fieldCode);
  } catch {
    return null;
  }
}

/**
 * Show a discreet, one-time admin notice near the top of the record screen when
 * a configured field is missing or mistyped (common spec 4 behavior). Kept
 * dependency-free and idempotent by id.
 */
export function showAdminNotice(id: string, message: string): void {
  const noticeId = `kp-ia-notice-${id}`;
  if (document.getElementById(noticeId)) return;
  const notice = document.createElement("div");
  notice.id = noticeId;
  notice.className = "kp-ia-admin-notice";
  notice.textContent = message;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 8000);
}
