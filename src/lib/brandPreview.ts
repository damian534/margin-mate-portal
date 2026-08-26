/**
 * Demo branding.
 *
 * Lets you walk a prospective brokerage through the platform using THEIR logo,
 * name and colours without creating records or touching live branding.
 * Stored locally in the browser only (never uploaded), and shared across tabs so
 * the demo app can be opened in its own window.
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
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BrandPreview) : null;
  } catch {
    return null;
  }
}

export function setBrandPreview(p: BrandPreview) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* quota — logo too large */
  }
  window.dispatchEvent(new Event('brand-preview-change'));
}

export function clearBrandPreview() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event('brand-preview-change'));
}

export function onBrandPreviewChange(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener('brand-preview-change', cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('brand-preview-change', cb);
    window.removeEventListener('storage', onStorage);
  };
}
