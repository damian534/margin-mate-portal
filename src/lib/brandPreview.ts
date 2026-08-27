/**
 * Demo branding.
 *
 * Lets you walk a prospective brokerage through the platform using THEIR logo,
 * name and colours without creating records or touching live branding.
 *
 * Scoping rules (important):
 *  - The brand config is saved locally in this browser only (never uploaded).
 *  - It is only APPLIED in a demo context: a window opened with `?preview=true`,
 *    or the current tab after you explicitly click "Preview branding here".
 *  - Your normal workspace tabs — and every one of your team members — keep your
 *    real brand, always.
 */

export interface BrandPreview {
  name: string;
  logoUrl: string | null; // data URL (local only, never uploaded)
  primary_color: string;  // "H S% L%"
  accent_color: string;   // "H S% L%"
}

const CONFIG_KEY = 'brand_preview_config_v1';
const LEGACY_KEY = 'brand_preview_v1';
const TAB_ACTIVE_KEY = 'brand_preview_tab_active';

function isDemoWindow(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'true') return true;
    return sessionStorage.getItem(TAB_ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}

/** The saved brand config, regardless of whether it is currently applied. */
export function getBrandPreviewConfig(): BrandPreview | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as BrandPreview) : null;
  } catch {
    return null;
  }
}

/** The brand to actually render with — null unless this window is a demo window. */
export function getBrandPreview(): BrandPreview | null {
  if (!isDemoWindow()) return null;
  return getBrandPreviewConfig();
}

/** Save the config without skinning the current tab (used before opening a demo window). */
export function saveBrandPreviewConfig(p: BrandPreview) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(p));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* quota — logo too large */
  }
  window.dispatchEvent(new Event('brand-preview-change'));
}

/** Save the config AND skin this tab only. */
export function setBrandPreview(p: BrandPreview) {
  saveBrandPreviewConfig(p);
  try { sessionStorage.setItem(TAB_ACTIVE_KEY, '1'); } catch { /* ignore */ }
  window.dispatchEvent(new Event('brand-preview-change'));
}

/** Stop skinning this tab (config stays saved for the next demo). */
export function stopBrandPreviewInTab() {
  try { sessionStorage.removeItem(TAB_ACTIVE_KEY); } catch { /* ignore */ }
  window.dispatchEvent(new Event('brand-preview-change'));
}

/** Stop skinning and forget the saved demo brand entirely. */
export function clearBrandPreview() {
  try {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(TAB_ACTIVE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('brand-preview-change'));
}

export function onBrandPreviewChange(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONFIG_KEY || e.key === LEGACY_KEY) cb();
  };
  window.addEventListener('brand-preview-change', cb);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('brand-preview-change', cb);
    window.removeEventListener('storage', onStorage);
  };
}
