import { useCallback, useEffect, useState } from 'react';

const KEY = 'crm.nav.favourites';
const EVENT = 'crm-favourites-changed';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Favourite ids are namespaced so any nav destination can be starred:
 *  - `tab:leads`      → a CRM tab
 *  - `tool:funds-position` → a tool
 *  - `link:/admin/settlements` → a standalone page
 */
export function useFavourites() {
  const [favourites, setFavourites] = useState<string[]>(read);

  useEffect(() => {
    const sync = () => setFavourites(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const persist = useCallback((next: string[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setFavourites(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const isFavourite = useCallback((id: string) => favourites.includes(id), [favourites]);

  const toggleFavourite = useCallback(
    (id: string) => {
      const current = read();
      persist(current.includes(id) ? current.filter(f => f !== id) : [...current, id]);
    },
    [persist],
  );

  return { favourites, isFavourite, toggleFavourite };
}
