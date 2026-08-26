/**
 * Session-only brand preview.
 *
 * Lets a super admin demo the platform to a prospective brokerage using THEIR logo,
 * name and colours without creating any records or touching live branding.
 * Everything lives in sessionStorage, so it disappears when the tab closes.
 */

export interface BrandPreview {
  name: string;
  logoUrl: string | null; // data URL (local only, never uploaded)
  primary_color: string;  // "H S% L%"
  accent_color: string;   // "H S% L%"
}

const KEY = 'brand_preview_v1';

export function getBrandPreview(): BrandPreview | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BrandPreview) : null;
  } catch {
    return null;
  }
}

export function setBrandPreview(p: BrandPreview) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota — logo too large */
  }
  window.dispatchEvent(new Event('brand-preview-change'));
}

export function clearBrandPreview() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event('brand-preview-change'));
}

export function onBrandPreviewChange(cb: () => void) {
  window.addEventListener('brand-preview-change', cb);
  return () => window.removeEventListener('brand-preview-change', cb);
}
